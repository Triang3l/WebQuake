Node = {
	dgram: require('dgram'),
	fs: require('fs'),
	http: require('http'),
	os: require('os'),
	url: require('url'),
	websocket: require('websocket')
};
require('./WebQDS/Cmd.js');
require('./WebQDS/COM.js');
require('./WebQDS/Console.js');
require('./WebQDS/CRC.js');
require('./WebQDS/Cvar.js');
require('./WebQDS/Def.js');
require('./WebQDS/ED.js');
require('./WebQDS/Host.js');
require('./WebQDS/Mod.js');
require('./WebQDS/MSG.js');
require('./WebQDS/NET.js');
require('./WebQDS/NET_Datagram.js');
require('./WebQDS/NET_WEBS.js');
require('./WebQDS/PF.js');
require('./WebQDS/PR.js');
require('./WebQDS/Protocol.js');
require('./WebQDS/Q.js');
require('./WebQDS/SV.js');
require('./WebQDS/Sys.js');
require('./WebQDS/SZ.js');
require('./WebQDS/V.js');
require('./WebQDS/Vec.js');
Sys.main();