Datagram = {};

Datagram.sockets = [];
Datagram.acceptsockets = [];

Datagram.Init = function()
{
	if (COM.CheckParm('-noudp') != null)
		return;

	var i, newsocket;
	for (i = 0; i < SV.svs.maxclientslimit; ++i)
	{
		newsocket = Node.dgram.createSocket('udp4');
		Datagram.sockets[i] = newsocket;
		newsocket.bind();
		newsocket.on('listening', Datagram.DgramOnListening);
		newsocket.on('message', Datagram.DgramOnMessage);
	}

	var local = Node.os.networkInterfaces(), j, k, addr;
	for (i in local)
	{
		j = local[i];
		for (k = 0; k < j.length; ++k)
		{
			addr = j[k];
			if ((addr.family !== 'IPv4') || (addr.internal === true))
				continue;
			Datagram.myAddr = addr.address;
			break;
		}
		if (Datagram.myAddr != null)
			break;
	}
	if (Datagram.myAddr == null)
		Datagram.myAddr = '127.0.0.1';

	return true;
};

Datagram.Listen = function()
{
	if (NET.listening !== true)
	{
		if (Datagram.controlsocket == null)
			return;
		Datagram.controlsocket.close();
		Datagram.controlsocket = null;
		return;
	}
	var controlsocket = Node.dgram.createSocket('udp4');
	try
	{
		controlsocket.bind(NET.hostport);
	}
	catch (e)
	{
		Con.Print('Unable to bind to ' + Datagram.myAddr + ':' + NET.hostport + '\n');
		controlsocket.close();
		return;
	}
	controlsocket.on('message', Datagram.ControlOnMessage);
	Datagram.controlsocket = controlsocket;
};

Datagram.CheckNewConnections = function()
{
	if (Datagram.acceptsockets.length === 0)
		return;
	var sock = NET.NewQSocket();
	var address = Datagram.acceptsockets.shift();
	var i, newsocket;
	for (i = 0; i < Datagram.sockets.length; ++i)
	{
		newsocket = Datagram.sockets[i];
		if ((newsocket.data_port != null) && (newsocket.data_socket == null))
			break;
	}
	if (i === Datagram.sockets.length)
		return;
	newsocket.data_socket = sock;
	sock.lastSendTime = NET.time;
	sock.canSend = true;
	sock.driverdata = newsocket;
	sock.ackSequence = 0;
	sock.sendSequence = 0;
	sock.unreliableSendSequence = 0;
	sock.sendMessageLength = 0;
	sock.sendMessage = new Buffer(8192);
	sock.receiveSequence = 0;
	sock.unreliableReceiveSequence = 0;
	sock.receiveMessageLength = 0;
	sock.receiveMessage = new Buffer(8192);
	sock.addr = address;
	sock.address = address[0] + ':' + address[1];
	sock.messages = [];
	var buf = new Buffer(1032);
	buf.writeUInt32LE(0x09000080, 0);
	buf[4] = 0x81;
	buf.writeUInt32LE(newsocket.data_port, 5);
	Datagram.controlsocket.send(buf, 0, 9, address[1], address[0]);
	return sock;
};

Datagram.GetMessage = function(sock)
{
	if (sock.driverdata == null)
		return -1;
	if ((sock.canSend !== true) && ((NET.time - sock.lastSendTime) > 1.0))
		Datagram.SendMessageNext(sock, true);
	var message, length, flags, ret = 0, sequence, i;
	for (; sock.messages.length > 0; )
	{
		message = sock.messages.shift();
		length = (message[2] << 8) + message[3] - 8;
		flags = message[1];
		sequence = message.readUInt32BE(4);
		if ((flags & 16) !== 0)
		{
			if (sequence < sock.unreliableReceiveSequence)
			{
				Con.DPrint('Got a stale datagram\n');
				ret = 0;
				break;
			}
			if (sequence !== sock.unreliableReceiveSequence)
				Con.DPrint('Dropped ' + (sequence - sock.unreliableReceiveSequence) + ' datagram(s)\n');
			sock.unreliableReceiveSequence = sequence + 1;
			NET.message.cursize = length;
			for (i = 0; i < length; ++i)
				NET.message.data[i] = message[8 + i];
			ret = 2;
			break;
		}
		if ((flags & 2) !== 0)
		{
			if (sequence !== (sock.sendSequence - 1))
			{
				Con.DPrint('Stale ACK received\n');
				continue;
			}
			if (sequence === sock.ackSequence)
			{
				if (++sock.ackSequence !== sock.sendSequence)
					Con.DPrint('ack sequencing error\n');
			}
			else
			{
				Con.DPrint('Duplicate ACK received\n');
				continue;
			}
			sock.sendMessageLength -= 1024;
			if (sock.sendMessageLength > 0)
			{
				sock.sendMessage.copy(sock.sendMessage, 0, 1024, 1024 + sock.sendMessageLength);
				sock.sendNext = true;
				continue;
			}
			sock.sendMessageLength = 0;
			sock.canSend = true;
			continue;
		}
		if ((flags & 1) !== 0)
		{
			sock.driverdata.send(new Buffer([0, 2, 0, 8, sequence >>> 24, (sequence & 0xff0000) >>> 16, (sequence & 0xff00) >>> 8, (sequence & 0xff) >>> 0]),
				0, 8, sock.addr[1], sock.addr[0]);
			if (sequence !== sock.receiveSequence)
				continue;
			++sock.receiveSequence;
			if ((flags & 8) === 0)
			{
				message.copy(sock.receiveMessage, sock.receiveMessageLength, 8, 8 + length);
				sock.receiveMessageLength += length;
				continue;
			}
			var data = new Uint8Array(NET.message.data);
			for (i = 0; i < sock.receiveMessageLength; ++i)
				data[i] = sock.receiveMessage[i];
			for (i = 0; i < length; ++i)
				data[sock.receiveMessageLength + i] = message[8 + i];
			NET.message.cursize = sock.receiveMessageLength + length;
			sock.receiveMessageLength = 0;
			ret = 1;
			break;
		}
	}
	if (sock.sendNext === true)
		Datagram.SendMessageNext(sock);
	return ret;
};

Datagram.SendMessage = function(sock, data)
{
	if (sock.driverdata == null)
		return -1;
	var i, src = new Uint8Array(data.data);
	for (i = 0; i < data.cursize; ++i)
		sock.sendMessage[i] = src[i];
	sock.sendMessageLength = data.cursize;
	var buf = new Buffer(1032);
	buf[0] = 0;
	var dataLen;
	if (data.cursize <= 1024)
	{
		dataLen = data.cursize;
		buf[1] = 9;
	}
	else
	{
		dataLen = 1024;
		buf[1] = 1;
	}
	buf.writeUInt16BE(dataLen + 8, 2);
	buf.writeUInt32BE(sock.sendSequence++, 4);
	sock.sendMessage.copy(buf, 8, 0, dataLen);
	sock.canSend = false;
	sock.driverdata.send(buf, 0, dataLen + 8, sock.addr[1], sock.addr[0]);
	sock.lastSendTime = NET.time;
	return 1;
};

Datagram.SendMessageNext = function(sock, resend)
{
	var buf = new Buffer(1032);
	buf[0] = 0;
	var dataLen;
	if (sock.sendMessageLength <= 1024)
	{
		dataLen = sock.sendMessageLength;
		buf[1] = 9;
	}
	else
	{
		dataLen = 1024;
		buf[1] = 1;
	}
	buf.writeUInt16BE(dataLen + 8, 2);
	if (resend !== true)
		buf.writeUInt32BE(sock.sendSequence++, 4);
	else
		buf.writeUInt32BE(sock.sendSequence - 1, 4);
	sock.sendMessage.copy(buf, 8, 0, dataLen);
	sock.sendNext = false;
	sock.driverdata.send(buf, 0, dataLen + 8, sock.addr[1], sock.addr[0]);
	sock.lastSendTime = NET.time;
};

Datagram.SendUnreliableMessage = function(sock, data)
{
	if (sock.driverdata == null)
		return -1;
	var buf = new Buffer(1032);
	buf.writeUInt32BE(data.cursize + 0x00100008, 0);
	buf.writeUInt32BE(sock.unreliableSendSequence++, 4);
	var i, src = new Uint8Array(data.data);
	for (i = 0; i < data.cursize; ++i)
		buf[8 + i] = src[i];
	sock.driverdata.send(buf, 0, data.cursize + 8, sock.addr[1], sock.addr[0]);
	return 1;
};

Datagram.CanSendMessage = function(sock)
{
	if (sock.driverdata == null)
		return;
	if (sock.sendNext === true)
		Datagram.SendMessageNext(sock);
	return sock.canSend;
};

Datagram.Close = function(sock)
{
	if (sock.driverdata == null)
		return;
	sock.driverdata.data_socket = null;
	sock.driverdata = null;
};

Datagram.ControlOnMessage = function(msg, rinfo)
{
	if (SV.server.active !== true)
		return;
	if (rinfo.size < 4)
		return;
	if ((msg[0] !== 0x80) || (msg[1] !== 0))
		return;
	if (((msg[2] << 8) + msg[3]) !== rinfo.size)
		return;
	var command = msg[4];
	var buf = new Buffer(1032), str, cursize;
	buf[0] = 0x80;
	buf[1] = 0;

	if (command === 2)
	{
		if (msg.toString('ascii', 5, 11) !== 'QUAKE\0')
			return;
		buf[4] = 0x83;
		str = Datagram.myAddr + ':' + NET.hostport;
		buf.write(str, 5, str.length, 'ascii');
		cursize = str.length + 5;
		buf[cursize++] = 0;
		str = NET.hostname.string.substring(0, 15);
		buf.write(str, cursize, str.length, 'ascii');
		cursize += str.length;
		buf[cursize++] = 0;
		str = PR.GetString(PR.globals_int[PR.globalvars.mapname]);
		buf.write(str, cursize, str.length, 'ascii');
		cursize += str.length;
		buf[cursize++] = 0;
		buf[cursize++] = NET.activeconnections;
		buf[cursize++] = SV.svs.maxclients;
		buf[cursize++] = 3;
		buf[2] = cursize >> 8;
		buf[3] = cursize & 255;
		Datagram.controlsocket.send(buf, 0, cursize, rinfo.port, rinfo.address);
		return;
	}

	var i;

	if (command === 3)
	{
		var playerNumber = msg[5];
		if (playerNumber == null)
			return;
		var activeNumber = -1, client;
		for (i = 0; i < SV.svs.maxclients; ++i)
		{
			client = SV.svs.clients[i];
			if (client.active !== true)
				continue;
			if (++activeNumber === playerNumber)
				break;
		}
		if (i === SV.svs.maxclients)
			return;
		buf[4] = 0x84;
		buf[5] = playerNumber;
		str = SV.GetClientName(client);
		buf.write(str, 6, str.length, 'ascii');
		cursize = str.length + 6;
		buf[cursize++] = 0;
		buf.writeUInt32LE(client.colors, cursize);
		buf.writeInt32LE(client.edict.v_float[PR.entvars.frags] >> 0, cursize + 4);
		buf.writeInt32LE((Sys.FloatTime() - client.netconnection.connecttime) >> 0, cursize + 8);
		cursize += 12;
		str = client.netconnection.address;
		buf.write(str, cursize, str.length, 'ascii');
		cursize += str.length;
		buf[cursize++] = 0;
		buf[2] = cursize >> 8;
		buf[3] = cursize & 255;
		Datagram.controlsocket.send(buf, 0, cursize, rinfo.port, rinfo.address);
		return;
	}

	if (command === 4)
	{
		var prevCvarName = msg.toString('ascii', 5).slice('\0')[0];
		if (prevCvarName.length !== 0)
		{
			for (i = 0; i < Cvar.vars.length; ++i)
			{
				if (Cvar.vars[i].name === prevCvarName)
					break;
			}
			if (i === Cvar.vars.length)
				return;
			++i;
		}
		else
			i = 0;
		var v;
		for (; i < Cvar.vars.length; ++i)
		{
			v = Cvar.vars[i];
			if (v.server === true)
				break;
		}
		buf[4] = 0x85;
		if (i >= Cvar.vars.length)
		{
			buf[2] = 0;
			buf[3] = 5;
			Datagram.controlsocket.send(buf, 0, 5, rinfo.port, rinfo.address);
			return;
		}
		str = v.name;
		buf.write(str, 5, str.length, 'ascii');
		cursize = str.length + 5;
		buf[cursize++] = 0;
		str = v.string;
		buf.write(str, cursize, str.length, 'ascii');
		cursize += str.length;
		buf[cursize++] = 0;
		buf[2] = cursize >> 8;
		buf[3] = cursize & 255;
		Datagram.controlsocket.send(buf, 0, cursize, rinfo.port, rinfo.address);
		return;
	}

	if (command !== 1)
		return;
	if (msg.toString('ascii', 5, 11) !== 'QUAKE\0')
		return;

	if (msg[11] !== 3)
	{
		buf[2] = 0;
		buf[3] = 28;
		buf[4] = 0x82;
		buf.write('Incompatible version.\n\0', 5, 23);
		Datagram.controlsocket.send(buf, 0, 28, rinfo.port, rinfo.address);
		return;
	}
	var s;
	for (i = 0; i < NET.activeSockets.length; ++i)
	{
		s = NET.activeSockets[i];
		if (s.disconnected === true)
			continue;
		if (NET.drivers[s.driver] !== Datagram)
			continue;
		if (rinfo.address !== s.addr[0])
			continue;
		if ((rinfo.port !== s.addr[1]) || ((Sys.FloatTime() - s.connecttime) >= 2.0))
		{
			NET.Close(s);
			return;
		}
		buf[2] = 0;
		buf[3] = 9;
		buf[4] = 0x81;
		buf.writeUInt32LE(s.driverdata.data_port, 5);
		Datagram.controlsocket.send(buf, 0, 9, rinfo.port, rinfo.address);
		return;
	}
	for (i = 0; i < Datagram.sockets.length; ++i)
	{
		s = Datagram.sockets[i];
		if ((s.data_port != null) && (s.data_socket == null))
			break;
	}
	if ((i === Datagram.sockets.length) || ((NET.activeconnections + Datagram.acceptsockets.length) >= SV.svs.maxclients))
	{
		buf[2] = 0;
		buf[3] = 22;
		buf[4] = 0x82;
		buf.write('Server is full.\n\0', 5, 17);
		Datagram.controlsocket.send(buf, 0, 22, rinfo.port, rinfo.address);
		return;
	}
	Datagram.acceptsockets.push([rinfo.address, rinfo.port]);
};

Datagram.DgramOnError = function(e)
{
	this.data_port = null;
	if (this.data_socket != null)
		NET.Close(this.data_socket);
};

Datagram.DgramOnListening = function()
{
	this.data_port = this.address().port;
};

Datagram.DgramOnMessage = function(msg, rinfo)
{
	if (this.data_socket == null)
		return;
	var addr = this.data_socket.addr;
	if ((rinfo.address !== addr[0]) || (rinfo.port !== addr[1]))
		return;
	if (rinfo.size < 8)
		return;
	if ((msg[0] & 0x80) !== 0)
		return;
	this.data_socket.messages.push(msg);
};