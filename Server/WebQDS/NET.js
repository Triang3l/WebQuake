NET = {};

NET.activeSockets = [];
NET.message = {data: new ArrayBuffer(8192), cursize: 0};
NET.activeconnections = 0;

NET.hostport = 26000;

NET.NewQSocket = function()
{
	var i;
	for (i = 0; i < NET.activeSockets.length; ++i)
	{
		if (NET.activeSockets[i].disconnected === true)
			break;
	}
	NET.activeSockets[i] = {
		connecttime: NET.time,
		lastMessageTime: NET.time,
		driver: NET.driverlevel,
		address: 'UNSET ADDRESS'
	};
	return NET.activeSockets[i];
};

NET.Listen_f = function()
{
	if (Cmd.argv.length !== 2)
	{
		Con.Print('"listen" is "' + (NET.listening === true ? 1 : 0) + '"\n');
		return;
	}
	var listening = (Q.atoi(Cmd.argv[1]) !== 0);
	if (NET.listening === listening)
		return;
	NET.listening = listening;
	var dfunc;
	for (NET.driverlevel = 0; NET.driverlevel < NET.drivers.length; ++NET.driverlevel)
	{
		dfunc = NET.drivers[NET.driverlevel];
		if (dfunc.initialized === true)
			dfunc.Listen();
	}
};

NET.MaxPlayers_f = function()
{
	if (Cmd.argv.length !== 2)
	{
		Con.Print('"maxplayers" is "' + SV.svs.maxclients + '"\n');
		return;
	}
	if (SV.server.active === true)
	{
		Con.Print('maxplayers can not be changed while a server is running.\n');
		return;
	}
	var n = Q.atoi(Cmd.argv[1]);
	if (n <= 0)
		n = 1;
	else if (n > SV.svs.maxclientslimit)
	{
		n = SV.svs.maxclientslimit;
		Con.Print('"maxplayers" set to "' + n + '"\n');
	}
	if ((n === 1) && (NET.listening === true))
		Cmd.text += 'listen 0\n';
	else if ((n >= 2) && (NET.listening !== true))
		Cmd.text += 'listen 1\n';
	SV.svs.maxclients = n;
	if (n === 1)
		Cvar.Set('deathmatch', '0');
	else
		Cvar.Set('deathmatch', '1');
};

NET.Port_f = function()
{
	if (Cmd.argv.length !== 2)
	{
		Con.Print('"port" is "' + NET.hostport + '"\n');
		return;
	}
	var n = Q.atoi(Cmd.argv[1]);
	if ((n <= 0) || (n >= 65535))
	{
		Con.Print('Bad value, must be between 1 and 65534\n');
		return;
	}
	NET.hostport = n;
	if (NET.listening === true)
		Cmd.text += 'listen 0\nlisten 1\n';
};

NET.CheckNewConnections = function()
{
	NET.time = Sys.FloatTime();
	var dfunc, ret;
	for (NET.driverlevel = 0; NET.driverlevel < NET.drivers.length; ++NET.driverlevel)
	{
		dfunc = NET.drivers[NET.driverlevel];
		if (dfunc.initialized !== true)
			continue;
		ret = dfunc.CheckNewConnections();
		if (ret != null)
			return ret;
	}
};

NET.Close = function(sock)
{
	if (sock == null)
		return;
	if (sock.disconnected === true)
		return;
	NET.time = Sys.FloatTime();
	NET.drivers[sock.driver].Close(sock);
	sock.disconnected = true;
};

NET.GetMessage = function(sock)
{
	if (sock == null)
		return -1;
	if (sock.disconnected === true)
	{
		Con.Print('NET.GetMessage: disconnected socket\n');
		return -1;
	}
	NET.time = Sys.FloatTime();
	var ret = NET.drivers[sock.driver].GetMessage(sock);
	if (ret === 0)
	{
		if ((NET.time - sock.lastMessageTime) > NET.messagetimeout.value)
		{
			NET.Close(sock);
			return -1;
		}
	}
	else if (ret > 0)
		sock.lastMessageTime = NET.time;
	return ret;
};

NET.SendMessage = function(sock, data)
{
	if (sock == null)
		return -1;
	if (sock.disconnected === true)
	{
		Con.Print('NET.SendMessage: disconnected socket\n');
		return -1;
	}
	NET.time = Sys.FloatTime();
	return NET.drivers[sock.driver].SendMessage(sock, data);
};

NET.SendUnreliableMessage = function(sock, data)
{
	if (sock == null)
		return -1;
	if (sock.disconnected === true)
	{
		Con.Print('NET.SendUnreliableMessage: disconnected socket\n');
		return -1;
	}
	NET.time = Sys.FloatTime();
	return NET.drivers[sock.driver].SendUnreliableMessage(sock, data);
};

NET.CanSendMessage = function(sock)
{
	if (sock == null)
		return;
	if (sock.disconnected === true)
		return;
	NET.time = Sys.FloatTime();
	return NET.drivers[sock.driver].CanSendMessage(sock);
};

NET.SendToAll = function(data)
{
	var i, count = 0, state1 = [], state2 = [];
	for (i = 0; i < SV.svs.maxclients; ++i)
	{
		Host.client = SV.svs.clients[i];
		if (Host.client.netconnection == null)
			continue;
		if (Host.client.active !== true)
		{
			state1[i] = state2[i] = true;
			continue;
		}
		++count;
		state1[i] = state2[i] = false;
	}
	var start = Sys.FloatTime();
	for (; count !== 0; )
	{
		count = 0;
		for (i = 0; i < SV.svs.maxclients; ++i)
		{
			Host.client = SV.svs.clients[i];
			if (state1[i] !== true)
			{
				if (NET.CanSendMessage(Host.client.netconnection) === true)
				{
					state1[i] = true;
					NET.SendMessage(Host.client.netconnection, data);
				}
				else
					NET.GetMessage(Host.client.netconnection);
				++count;
				continue;
			}
			if (state2[i] !== true)
			{
				if (NET.CanSendMessage(Host.client.netconnection) === true)
					state2[i] = true;
				else
					NET.GetMessage(Host.client.netconnection);
				++count;
			}
		}
		if ((Sys.FloatTime() - start) > 5.0)
			return count;
	}
	return count;
};

NET.Init = function()
{
	var i = COM.CheckParm('-port');
	if (i != null)
	{
		i = Q.atoi(COM.argv[i + 1]);
		if ((i > 0) && (i <= 65534))
			NET.hostport = i;
	}

	NET.listening = true;

	NET.time = Sys.FloatTime();

	NET.messagetimeout = Cvar.RegisterVariable('net_messagetimeout', '300');
	var buff = Node.os.hostname().substring(0, 15), local = [];
	for (i = 0; i < buff.length; ++i)
		local[i] = String.fromCharCode(buff.charCodeAt(i) & 255);
	NET.hostname = Cvar.RegisterVariable('hostname', local.join(''));
	Cmd.AddCommand('listen', NET.Listen_f);
	Cmd.AddCommand('maxplayers', NET.MaxPlayers_f);
	Cmd.AddCommand('port', NET.Port_f);

	NET.drivers = [Datagram, WEBS];
	var dfunc;
	for (NET.driverlevel = 0; NET.driverlevel < NET.drivers.length; ++NET.driverlevel)
	{
		dfunc = NET.drivers[NET.driverlevel];
		dfunc.initialized = dfunc.Init();
		if (dfunc.initialized === true)
			dfunc.Listen();
	}
};