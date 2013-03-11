NET = {};

NET.activeSockets = [];
NET.message = {data: new ArrayBuffer(8192), cursize: 0};
NET.activeconnections = 0;

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

NET.Connect = function(host)
{
	NET.time = Sys.FloatTime();

	if (host === 'local')
	{
		NET.driverlevel = 0;
		return Loop.Connect(host);
	}

	var dfunc, ret;
	for (NET.driverlevel = 1; NET.driverlevel < NET.drivers.length; ++NET.driverlevel)
	{
		dfunc = NET.drivers[NET.driverlevel];
		if (dfunc.initialized !== true)
			continue;
		ret = dfunc.Connect(host);
		if (ret === 0)
		{
			CL.cls.state = CL.active.connecting;
			Con.Print('trying...\n');
			NET.start_time = NET.time;
			NET.reps = 0;
			throw 'NET.Connect';
		}
		if (ret != null)
			return ret;
	}
};

NET.CheckForResend = function()
{
	NET.time = Sys.FloatTime();
	var dfunc = NET.drivers[NET.newsocket.driver];
	if (NET.reps <= 2)
	{
		if ((NET.time - NET.start_time) >= (2.5 * (NET.reps + 1)))
		{
			Con.Print('still trying...\n');
			++NET.reps;
		}
	}
	else if (NET.reps === 3)
	{
		if ((NET.time - NET.start_time) >= 10.0)
		{
			NET.Close(NET.newsocket);
			CL.cls.state = CL.active.disconnected;
			Con.Print('No Response\n');
			Host.Error('NET.CheckForResend: connect failed\n');
		}
	}
	var ret = dfunc.CheckForResend();
	if (ret === 1)
	{
		NET.newsocket.disconnected = false;
		CL.Connect(NET.newsocket);
	}
	else if (ret === -1)
	{
		NET.newsocket.disconnected = false;
		NET.Close(NET.newsocket);
		CL.cls.state = CL.active.disconnected;
		Con.Print('Network Error\n');
		Host.Error('NET.CheckForResend: connect failed\n');
	}
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
	if (sock.driver !== 0)
	{
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
	}
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
		if (Host.client.netconnection.driver === 0)
		{
			NET.SendMessage(Host.client.netconnection, data);
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
	NET.time = Sys.FloatTime();

	NET.messagetimeout = Cvar.RegisterVariable('net_messagetimeout', '300');
	NET.hostname = Cvar.RegisterVariable('hostname', 'UNNAMED');

	NET.drivers = [Loop, WEBS];
	for (NET.driverlevel = 0; NET.driverlevel < NET.drivers.length; ++NET.driverlevel)
		NET.drivers[NET.driverlevel].initialized = NET.drivers[NET.driverlevel].Init();
};

NET.Shutdown = function()
{
	NET.time = Sys.FloatTime();
	for (i = 0; i < NET.activeSockets.length; ++i)
		NET.Close(NET.activeSockets[i]);
};