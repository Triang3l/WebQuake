Loop = {};

Loop.Init = function()
{
	return true;
};

Loop.Connect = function(host)
{
	if (host !== 'local')
		return;

	Loop.localconnectpending = true;

	if (Loop.client == null)
	{
		Loop.client = NET.NewQSocket();
		Loop.client.receiveMessage = new Uint8Array(new ArrayBuffer(8192));
		Loop.client.address = 'localhost';
	}
	Loop.client.receiveMessageLength = 0;
	Loop.client.canSend = true;

	if (Loop.server == null)
	{
		Loop.server = NET.NewQSocket();
		Loop.server.receiveMessage = new Uint8Array(new ArrayBuffer(8192));
		Loop.server.address = 'LOCAL';
	}
	Loop.server.receiveMessageLength = 0;
	Loop.server.canSend = true;

	Loop.client.driverdata = Loop.server;
	Loop.server.driverdata = Loop.client;

	return Loop.client;
};

Loop.CheckNewConnections = function()
{
	if (Loop.localconnectpending !== true)
		return;
	Loop.localconnectpending = false;
	Loop.server.receiveMessageLength = 0;
	Loop.server.canSend = true;
	Loop.client.receiveMessageLength = 0;
	Loop.client.canSend = true;
	return Loop.server;
};

Loop.GetMessage = function(sock)
{
	if (sock.receiveMessageLength === 0)
		return 0;
	var ret = sock.receiveMessage[0];
	var length = sock.receiveMessage[1] + (sock.receiveMessage[2] << 8);
	if (length > NET.message.data.byteLength)
		Sys.Error('Loop.GetMessage: overflow');
	NET.message.cursize = length;
	(new Uint8Array(NET.message.data)).set(sock.receiveMessage.subarray(3, length + 3));
	sock.receiveMessageLength -= length;
	if (sock.receiveMessageLength >= 4)
	{
		var i;
		for (i = 0; i < sock.receiveMessageLength; ++i)
			sock.receiveMessage[i] = sock.receiveMessage[length + 3 + i];
	}
	sock.receiveMessageLength -= 3;
	if ((sock.driverdata != null) && (ret === 1))
		sock.driverdata.canSend = true;
	return ret;
};

Loop.SendMessage = function(sock, data)
{
	if (sock.driverdata == null)
		return -1;
	var bufferLength = sock.driverdata.receiveMessageLength;
	sock.driverdata.receiveMessageLength += data.cursize + 3;
	if (sock.driverdata.receiveMessageLength > 8192)
		Sys.Error('Loop.SendMessage: overflow');
	var buffer = sock.driverdata.receiveMessage;
	buffer[bufferLength] = 1;
	buffer[bufferLength + 1] = data.cursize & 0xff;
	buffer[bufferLength + 2] = data.cursize >> 8;
	buffer.set(new Uint8Array(data.data, 0, data.cursize), bufferLength + 3);
	sock.canSend = false;
	return 1;
};

Loop.SendUnreliableMessage = function(sock, data)
{
	if (sock.driverdata == null)
		return -1;
	var bufferLength = sock.driverdata.receiveMessageLength;
	sock.driverdata.receiveMessageLength += data.cursize + 3;
	if (sock.driverdata.receiveMessageLength > 8192)
		Sys.Error('Loop.SendMessage: overflow');
	var buffer = sock.driverdata.receiveMessage;
	buffer[bufferLength] = 2;
	buffer[bufferLength + 1] = data.cursize & 0xff;
	buffer[bufferLength + 2] = data.cursize >> 8;
	buffer.set(new Uint8Array(data.data, 0, data.cursize), bufferLength + 3);
	return 1;
};

Loop.CanSendMessage = function(sock)
{
	if (sock.driverdata != null)
		return sock.canSend;
};

Loop.Close = function(sock)
{
	if (sock.driverdata != null)
		sock.driverdata.driverdata = null;
	sock.receiveMessageLength = 0;
	sock.canSend = false;
	if (sock === Loop.client)
		Loop.client = null;
	else
		Loop.server = null;
};