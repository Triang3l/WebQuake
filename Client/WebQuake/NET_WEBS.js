WEBS = {};

WEBS.Init = function()
{
	if ((window.WebSocket == null) || (document.location.protocol === 'https:'))
		return;
	WEBS.available = true;
	return true;
};

WEBS.Connect = function(host)
{
	if (host.length <= 5)
		return;
	if (host.charCodeAt(5) === 47)
		return;
	if (host.substring(0, 5) !== 'ws://')
		return;
	host = 'ws://' + host.split('/')[2];
	var sock = NET.NewQSocket();
	sock.disconnected = true;
	sock.receiveMessage = [];
	sock.address = host;
	try
	{
		sock.driverdata = new WebSocket(host, 'quake');
	}
	catch (e)
	{
		return;
	}
	sock.driverdata.data_socket = sock;
	sock.driverdata.binaryType = 'arraybuffer';
	sock.driverdata.onerror = WEBS.OnError;
	sock.driverdata.onmessage = WEBS.OnMessage;
	NET.newsocket = sock;
	return 0;
};

WEBS.CheckNewConnections = function()
{
};

WEBS.GetMessage = function(sock)
{
	if (sock.driverdata == null)
		return -1;
	if (sock.driverdata.readyState !== 1)
		return -1;
	if (sock.receiveMessage.length === 0)
		return 0;
	var message = sock.receiveMessage.shift();
	NET.message.cursize = message.length - 1;
	(new Uint8Array(NET.message.data)).set(message.subarray(1));
	return message[0];
};

WEBS.SendMessage = function(sock, data)
{
	if (sock.driverdata == null)
		return -1;
	if (sock.driverdata.readyState !== 1)
		return -1;
	var buf = new ArrayBuffer(data.cursize + 1), dest = new Uint8Array(buf);
	dest[0] = 1;
	dest.set(new Uint8Array(data.data, 0, data.cursize), 1);
	sock.driverdata.send(buf);
	return 1;
};

WEBS.SendUnreliableMessage = function(sock, data)
{
	if (sock.driverdata == null)
		return -1;
	if (sock.driverdata.readyState !== 1)
		return -1;
	var buf = new ArrayBuffer(data.cursize + 1), dest = new Uint8Array(buf);
	dest[0] = 2;
	dest.set(new Uint8Array(data.data, 0, data.cursize), 1);
	sock.driverdata.send(buf);
	return 1;
};

WEBS.CanSendMessage = function(sock)
{
	if (sock.driverdata == null)
		return;
	if (sock.driverdata.readyState === 1)
		return true;
};

WEBS.Close = function(sock)
{
	if (sock.driverdata != null)
		sock.driverdata.close(1000);
};

WEBS.CheckForResend = function()
{
	if (NET.newsocket.driverdata.readyState === 1)
		return 1;
	if (NET.newsocket.driverdata.readyState !== 0)
		return -1;
};

WEBS.OnError = function()
{
	NET.Close(this.data_socket);
};

WEBS.OnMessage = function(message)
{
	var data = message.data;
	if (typeof(data) === 'string')
		return;
	if (data.byteLength > 8000)
		return;
	this.data_socket.receiveMessage.push(new Uint8Array(data));
};