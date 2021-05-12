Node = {
	dgram: require('dgram'),
	fs: require('fs'),
	http: require('http'),
	os: require('os'),
	url: require('url'),
	websocket: require('websocket')
};
require('./Server/WebQDS/Cmd.js');
require('./Server/WebQDS/COM.js');
require('./Server/WebQDS/Console.js');
require('./Client/WebQuake/CRC.js');
require('./Client/WebQuake/Cvar.js');
require('./Client/WebQuake/Def.js');
require('./Client/WebQuake/ED.js');
require('./Server/WebQDS/Host.js');
require('./Server/WebQDS/Mod.js');
require('./Server/WebQDS/MSG.js');
require('./Server/WebQDS/NET.js');
require('./Server/WebQDS/NET_Datagram.js');
require('./Server/WebQDS/NET_WEBS.js');
require('./Server/WebQDS/PF.js');
require('./Server/WebQDS/PR.js');
require('./Client/WebQuake/Protocol.js');
require('./Server/WebQDS/Q.js');
require('./Server/WebQDS/SV.js');
require('./Server/WebQDS/Sys.js');
require('./Server/WebQDS/SZ.js');
require('./Server/WebQDS/V.js');
require('./Server/WebQDS/Vec.js');
Sys.main();
