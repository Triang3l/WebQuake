WEBS = {};

WEBS.acceptsockets = [];
WEBS.colors = [];

WEBS.Init = function()
{
	var palette = COM.LoadFile('gfx/palette.lmp');
	if (palette == null)
		Sys.Error('Couldn\'t load gfx/palette.lmp');
	var pal = new Uint8Array(palette), i, src = 24, c;
	for (i = 0; i <= 13; ++i)
	{
		WEBS.colors[i] = pal[src].toString() + ',' + pal[src + 1].toString() + ',' + pal[src + 2].toString();
		src += 48;
	}

	WEBS.server = new Node.websocket.server;
	WEBS.server.on('request', WEBS.ServerOnRequest);

	return true;
};

WEBS.Listen = function()
{
	if (NET.listening !== true)
	{
		WEBS.server.unmount();
		if (WEBS.http == null)
			return;
		WEBS.http.close();
		WEBS.http = null;
		return;
	}
	try
	{
		WEBS.http = Node.http.createServer();
		WEBS.http.listen(NET.hostport);
		WEBS.http.on('request', WEBS.HTTPOnRequest);
		WEBS.server.mount({httpServer: WEBS.http, maxReceivedMessageSize: 8192});
	}
	catch (e)
	{
		NET.listening = false;
		return;
	}
};

WEBS.CheckNewConnections = function()
{
	if (WEBS.acceptsockets.length === 0)
		return;
	var sock = NET.NewQSocket();
	var connection = WEBS.acceptsockets.shift();
	sock.driverdata = connection;
	sock.receiveMessage = [];
	sock.address = connection.socket.remoteAddress;
	connection.data_socket = sock;
	connection.on('message', WEBS.ConnectionOnMessage);
	connection.on('close', WEBS.ConnectionOnClose);
	return sock;
};

WEBS.GetMessage = function(sock)
{
	if (sock.driverdata == null)
		return -1;
	if (sock.driverdata.closeReasonCode !== -1)
		return -1;
	if (sock.receiveMessage.length === 0)
		return 0;
	var src = sock.receiveMessage.shift(), dest = new Uint8Array(NET.message.data);
	NET.message.cursize = src.length - 1;
	var i;
	for (i = 1; i < src.length; ++i)
		dest[i - 1] = src[i];
	return src[0];
};

WEBS.SendMessage = function(sock, data)
{
	if (sock.driverdata == null)
		return -1;
	if (sock.driverdata.closeReasonCode !== -1)
		return -1;
	var src = new Uint8Array(data.data), dest = new Buffer(data.cursize + 1), i;
	dest[0] = 1;
	var i;
	for (i = 0; i < data.cursize; ++i)
		dest[i + 1] = src[i];
	sock.driverdata.sendBytes(dest);
	return 1;
};

WEBS.SendUnreliableMessage = function(sock, data)
{
	if (sock.driverdata == null)
		return -1;
	if (sock.driverdata.closeReasonCode !== -1)
		return -1;
	var src = new Uint8Array(data.data), dest = new Buffer(data.cursize + 1), i;
	dest[0] = 2;
	var i;
	for (i = 0; i < data.cursize; ++i)
		dest[i + 1] = src[i];
	sock.driverdata.sendBytes(dest);
	return 1;
};

WEBS.CanSendMessage = function(sock)
{
	if (sock.driverdata == null)
		return;
	if (sock.driverdata.closeReasonCode === -1)
		return true;
};

WEBS.Close = function(sock)
{
	if (sock.driverdata == null)
		return;
	if (sock.driverdata.closeReasonCode !== -1)
		return;
	sock.driverdata.drop(1000);
	sock.driverdata = null;
};

WEBS.ConnectionOnMessage = function(message)
{
	if (message.type !== 'binary')
		return;
	if (message.binaryData.length > 8000)
		return;
	this.data_socket.receiveMessage.push(message.binaryData);
};

WEBS.ConnectionOnClose = function()
{
	NET.Close(this.data_socket);
};

WEBS.HTMLSpecialChars = function(str)
{
	var out = [], i, c;
	for (i = 0; i < str.length; ++i)
	{
		c = str.charCodeAt(i);
		switch (c)
		{
			case 38: out[out.length] = '&amp;'; continue;
			case 60: out[out.length] = '&lt;'; continue;
			case 62: out[out.length] = '&gt;'; continue;
		}
		out[out.length] = String.fromCharCode(c);
	}
	return out.join('');
};

WEBS.HTTPOnRequest = function(request, response)
{
	if (request.method === 'OPTIONS')
	{
		response.statusCode = 200;
		response.setHeader('Access-Control-Allow-Origin', '*');
		response.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
		response.setHeader('Access-Control-Allow-Headers', 'Authorization');
		response.end();
		return;
	}
	var head = request.method === 'HEAD';
	if ((request.method !== 'GET') && (head !== true))
	{
		response.statusCode = 501;
		response.end();
		return;
	}
	var pathname = Node.url.parse(request.url).pathname.split('/');
	var path = '';
	if (pathname.length >= 2)
		path = pathname[1].toLowerCase();
	var i, text;
	if (path.length === 0)
	{
		if (SV.server.active !== true)
		{
			response.statusCode = 503;
			response.end();
			return;
		}
		response.statusCode = 200;
		response.setHeader('Content-Type', 'text/html; charset=UTF-8');
		if (head === true)
		{
			response.end();
			return;
		}
		var hostname = WEBS.HTMLSpecialChars(NET.hostname.string);
		response.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>');
		response.write(hostname);
		response.write('</title>');
		if (Host.rcon_password.string.length !== 0)
		{
			response.write('<script type="text/javascript">function rcon() {\n');
			response.write('var rcon = document.getElementById(\'rcon\').value, password = document.getElementById(\'password\').value;\n');
			response.write('if ((rcon.length === 0) || (password.length === 0)) {return;}\n');
			response.write('try {rcon = encodeURIComponent(rcon); password = \'Basic \' + btoa(\'quake:\' + password);} catch (e) {return;}\n');
			response.write('var xhr = new XMLHttpRequest(); xhr.open(\'HEAD\', \'/rcon/\' + rcon); xhr.setRequestHeader(\'Authorization\', password); xhr.send();\n');
			response.write('}</script>');
		}
		response.write('</head><body><h1>');
		response.write(hostname);
		response.write(' - ');
		response.write(WEBS.HTMLSpecialChars(PR.GetString(PR.globals_int[PR.globalvars.mapname])));
		response.write(' (');
		response.write(NET.activeconnections.toString());
		response.write('/');
		response.write(SV.svs.maxclients.toString());
		response.write(')</h1><table border="1"><tr><th>Name</th><th>Shirt</th><th>Pants</th><th>Frags</th><th>Time</th></tr>');
		var client, time = Sys.FloatTime(), seconds;
		for (i = 0; i < SV.svs.maxclients; ++i)
		{
			client = SV.svs.clients[i];
			if (client.active !== true)
				continue;
			response.write('<tr><td>');
			response.write(WEBS.HTMLSpecialChars(SV.GetClientName(client)))
			response.write('</td><td style="background-color: rgb(');
			response.write(WEBS.colors[client.colors >> 4]);
			response.write('); color: white;">');
			response.write((client.colors >> 4).toString());
			response.write('</td><td style="background-color: rgb(');
			response.write(WEBS.colors[client.colors & 15]);
			response.write('); color: white;">');
			response.write((client.colors & 15).toString());
			response.write('</td><td>');
			response.write(client.edict.v_float[PR.entvars.frags].toFixed(0));
			response.write('</td><td>');
			seconds = Math.floor(time - client.netconnection.connecttime);
			response.write(Math.floor(seconds / 60.0).toString());
			response.write(':');
			seconds = Math.floor(seconds % 60.0).toString();
			if (seconds.length === 1)
				response.write('0');
			response.write(seconds);
			response.write('</td></tr>');
		}
		response.write('</table>');
		if (Host.rcon_password.string.length !== 0)
			response.write('<p>Rcon: <input type="text" id="rcon"> <input type="password" id="password"> <input type="button" value="Send" onclick="rcon()"></p>');
		response.end('</body></html>');
		return;
	}
	if (path === 'server_info')
	{
		if (SV.server.active !== true)
		{
			response.statusCode = 503;
			response.end();
			return;
		}
		response.statusCode = 200;
		response.setHeader('Content-Type', 'application/json; charset=UTF-8');
		if (head === true)
			response.end();
		else
		{
			response.end(JSON.stringify({
				hostName: NET.hostname.string,
				levelName: PR.GetString(PR.globals_int[PR.globalvars.mapname]),
				currentPlayers: NET.activeconnections,
				maxPlayers: SV.svs.maxclients,
				protocolVersion: 2
			}));
		}
		return;
	}
	if (path === 'player_info')
	{
		if (SV.server.active !== true)
		{
			response.statusCode = 503;
			response.end();
			return;
		}
		var client;
		if ((pathname.length <= 2) || (pathname[2] === ''))
		{
			response.statusCode = 200;
			response.setHeader('Content-Type', 'application/json; charset=UTF-8');
			response.write('[');
			text = [];
			for (i = 0; i < SV.svs.maxclients; ++i)
			{
				client = SV.svs.clients[i];
				if (client.active !== true)
					continue;
				text[text.length] = JSON.stringify({
					name: SV.GetClientName(client),
					colors: client.colors,
					frags: (client.edict.v_float[PR.entvars.frags]) >> 0,
					connectTime: Sys.FloatTime() - client.netconnection.connecttime,
					address: client.netconnection.address
				});
			}
			response.write(text.join(','));
			response.end(']');
			return;
		}
		var playerNumber = Q.atoi(pathname[2]);
		var activeNumber = -1;
		for (i = 0; i < SV.svs.maxclients; ++i)
		{
			client = SV.svs.clients[i];
			if (client.active !== true)
				continue;
			if (++activeNumber === playerNumber)
				break;
		}
		if (i === SV.svs.maxclients)
		{
			response.statusCode = 404;
			response.end();
			return;
		}
		response.statusCode = 200;
		response.setHeader('Content-Type', 'application/json; charset=UTF-8');
		if (head === true)
		{
			response.end();
			return;
		}
		response.end(JSON.stringify({
			name: SV.GetClientName(client),
			colors: client.colors,
			frags: (client.edict.v_float[PR.entvars.frags]) >> 0,
			connectTime: Sys.FloatTime() - client.netconnection.connecttime,
			address: client.netconnection.address
		}));
		return;
	}
	if (path === 'rule_info')
	{
		var name, v;
		if (pathname.length >= 3)
		{
			name = pathname[2].toLowerCase();
			if (name.length !== 0)
			{
				for (i = 0; i < Cvar.vars.length; ++i)
				{
					v = Cvar.vars[i];
					if (v.server !== true)
						continue;
					if (v.name !== name)
						continue;
					response.statusCode = 200;
					response.setHeader('Content-Type', 'application/json; charset=UTF-8');
					if (head === true)
						response.end();
					else
						response.end(JSON.stringify({rule: v.name, value: v.string}));
					return;
				}
				response.statusCode = 404;
				response.end();
				return;
			}
		}
		response.statusCode = 200;
		response.setHeader('Content-Type', 'application/json; charset=UTF-8');
		if (head === true)
		{
			response.end();
			return;
		}
		response.write('[');
		text = [];
		for (i = 0; i < Cvar.vars.length; ++i)
		{
			v = Cvar.vars[i];
			if (v.server === true)
				text[text.length] = JSON.stringify({rule: v.name, value: v.string});
		}
		response.write(text.join(','));
		response.end(']');
		return;
	}
	if (path === 'rcon')
	{
		var data;
		try
		{
			data = decodeURIComponent(pathname.slice(2).join('/')).split('\n')[0];
		}
		catch (e)
		{
			response.statusCode = 400;
			response.end();
			return;
		}
		if (data.length === 0)
		{
			response.statusCode = 400;
			response.end();
			return;
		}
		if (request.headers.authorization == null)
		{
			response.statusCode = 401;
			response.setHeader('WWW-Authenticate', 'Basic realm="Quake"');
			response.end();
			return;
		}
		var password = request.headers.authorization;
		if (password.substring(0, 6) !== 'Basic ')
		{
			response.statusCode = 403;
			response.end();
			return;
		}
		try
		{
			password = (new Buffer(password.substring(6), 'base64')).toString('ascii');
		}
		catch (e)
		{
			response.statusCode = 403;
			response.end();
			return;
		}
		if (password.substring(0, 6) !== 'quake:')
		{
			response.statusCode = 403;
			response.end();
			return;
		}
		response.statusCode = (Host.RemoteCommand(request.connection.remoteAddress, data, password.substring(6)) === true) ? 200 : 403;
		response.end();
		return;
	};
	response.statusCode = 404;
	response.end();
};

WEBS.ServerOnRequest = function(request)
{
	if (SV.server.active !== true)
	{
		request.reject();
		return;
	}
	if (request.requestedProtocols[0] !== 'quake')
	{
		request.reject();
		return;
	}
	if ((NET.activeconnections + WEBS.acceptsockets.length) >= SV.svs.maxclients)
	{
		request.reject();
		return;
	}
	var i, s;
	for (i = 0; i < NET.activeSockets.length; ++i)
	{
		s = NET.activeSockets[i];
		if (s.disconnected === true)
			continue;
		if (NET.drivers[s.driver] !== WEBS)
			continue;
		if (request.remoteAddress !== s.address)
			continue;
		NET.Close(s);
		break;
	}
	WEBS.acceptsockets.push(request.accept('quake', request.origin));
};