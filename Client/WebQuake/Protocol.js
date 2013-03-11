Protocol = {};

Protocol.version = 15;

Protocol.u = {
	morebits: 1,
	origin1: 1 << 1,
	origin2: 1 << 2,
	origin3: 1 << 3,
	angle2: 1 << 4,
	nolerp: 1 << 5,
	frame: 1 << 6,
	signal: 1 << 7,

	angle1: 1 << 8,
	angle3: 1 << 9,
	model: 1 << 10,
	colormap: 1 << 11,
	skin: 1 << 12,
	effects: 1 << 13,
	longentity: 1 << 14
};

Protocol.su = {
	viewheight: 1,
	idealpitch: 1 << 1,
	punch1: 1 << 2,
	punch2: 1 << 3,
	punch3: 1 << 4,
	velocity1: 1 << 5,
	velocity2: 1 << 6,
	velocity3: 1 << 7,
	items: 1 << 9,
	onground: 1 << 10,
	inwater: 1 << 11,
	weaponframe: 1 << 12,
	armor: 1 << 13,
	weapon: 1 << 14
};

Protocol.default_viewheight = 22;

Protocol.svc = {
	nop: 1,
	disconnect: 2,
	updatestat: 3,
	version: 4,
	setview: 5,
	sound: 6,
	time: 7,
	print: 8,
	stufftext: 9,
	setangle: 10,
	serverinfo: 11,
	lightstyle: 12,
	updatename: 13,
	updatefrags: 14,
	clientdata: 15,
	stopsound: 16,
	updatecolors: 17,
	particle: 18,
	damage: 19,
	spawnstatic: 20,
	spawnbaseline: 22,
	temp_entity: 23,
	setpause: 24,
	signonnum: 25,
	centerprint: 26,
	killedmonster: 27,
	foundsecret: 28,
	spawnstaticsound: 29,
	intermission: 30,
	finale: 31,
	cdtrack: 32,
	sellscreen: 33,
	cutscene: 34
};

Protocol.clc = {
	nop: 1,
	disconnect: 2,
	move: 3,
	stringcmd: 4
};

Protocol.te = {
	spike: 0,
	superspike: 1,
	gunshot: 2,
	explosion: 3,
	tarexplosion: 4,
	lightning1: 5,
	lightning2: 6,
	wizspike: 7,
	knightspike: 8,
	lightning3: 9,
	lavasplash: 10,
	teleport: 11,
	explosion2: 12,
	beam: 13
};