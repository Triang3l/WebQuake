CL = {};

CL.cshift = {
	contents: 0,
	damage: 1,
	bonus: 2,
	powerup: 3
};

CL.active = {
	disconnected: 0,
	connecting: 1,
	connected: 2
};

// demo

CL.StopPlayback = function()
{
	if (CL.cls.demoplayback !== true)
		return;
	CL.cls.demoplayback = false;
	CL.cls.demofile = null;
	CL.cls.state = CL.active.disconnected;
	if (CL.cls.timedemo === true)
		CL.FinishTimeDemo();
};

CL.WriteDemoMessage = function()
{
	var len = CL.cls.demoofs + 16 + NET.message.cursize;
	if (CL.cls.demofile.byteLength < len)
	{
		var src = new Uint8Array(CL.cls.demofile, 0, CL.cls.demoofs);
		CL.cls.demofile = new ArrayBuffer(CL.cls.demofile.byteLength + 16384);
		(new Uint8Array(CL.cls.demofile)).set(src);
	}
	var f = new DataView(CL.cls.demofile, CL.cls.demoofs, 16);
	f.setInt32(0, NET.message.cursize, true);
	f.setFloat32(4, CL.state.viewangles[0], true);
	f.setFloat32(8, CL.state.viewangles[1], true);
	f.setFloat32(12, CL.state.viewangles[2], true);
	(new Uint8Array(CL.cls.demofile)).set(new Uint8Array(NET.message.data, 0, NET.message.cursize), CL.cls.demoofs + 16);
	CL.cls.demoofs = len;
};

CL.GetMessage = function()
{
	if (CL.cls.demoplayback === true)
	{
		if (CL.cls.signon === 4)
		{
			if (CL.cls.timedemo === true)
			{
				if (Host.framecount === CL.cls.td_lastframe)
					return 0;
				CL.cls.td_lastframe = Host.framecount;
				if (Host.framecount === (CL.cls.td_startframe + 1))
					CL.cls.td_starttime = Host.realtime;
			}
			else if (CL.state.time <= CL.state.mtime[0])
				return 0;
		}
		if ((CL.cls.demoofs + 16) >= CL.cls.demosize)
		{
			CL.StopPlayback();
			return 0;
		}
		var view = new DataView(CL.cls.demofile);
		NET.message.cursize = view.getUint32(CL.cls.demoofs, true);
		if (NET.message.cursize > 8000)
			Sys.Error('Demo message > MAX_MSGLEN');
		CL.state.mviewangles[1] = CL.state.mviewangles[0];
		CL.state.mviewangles[0] = [view.getFloat32(CL.cls.demoofs + 4, true), view.getFloat32(CL.cls.demoofs + 8, true), view.getFloat32(CL.cls.demoofs + 12, true)];
		CL.cls.demoofs += 16;
		if ((CL.cls.demoofs + NET.message.cursize) > CL.cls.demosize)
		{
			CL.StopPlayback();
			return 0;
		}
		var src = new Uint8Array(CL.cls.demofile, CL.cls.demoofs, NET.message.cursize);
		var dest = new Uint8Array(NET.message.data, 0, NET.message.cursize);
		var i;
		for (i = 0; i < NET.message.cursize; ++i)
			dest[i] = src[i];
		CL.cls.demoofs += NET.message.cursize;
		return 1;
	};

	var r;
	for (;;)
	{
		r = NET.GetMessage(CL.cls.netcon);
		if ((r !== 1) && (r !== 2))
			return r;
		if ((NET.message.cursize === 1) && ((new Uint8Array(NET.message.data, 0, 1))[0] === Protocol.svc.nop))
			Con.Print('<-- server to client keepalive\n');
		else
			break;
	}

	if (CL.cls.demorecording === true)
		CL.WriteDemoMessage();

	return r;
};

CL.Stop_f = function()
{
	if (Cmd.client === true)
		return;
	if (CL.cls.demorecording !== true)
	{
		Con.Print('Not recording a demo.\n');
		return;
	}
	NET.message.cursize = 0;
	MSG.WriteByte(NET.message, Protocol.svc.disconnect);
	CL.WriteDemoMessage();
	if (COM.WriteFile(CL.cls.demoname, new Uint8Array(CL.cls.demofile), CL.cls.demoofs) !== true)
		Con.Print('ERROR: couldn\'t open.\n');
	CL.cls.demofile = null;
	CL.cls.demorecording = false;
	Con.Print('Completed demo\n');
};

CL.Record_f = function()
{
	var c = Cmd.argv.length;
	if ((c <= 1) || (c >= 5))
	{
		Con.Print('record <demoname> [<map> [cd track]]\n');
		return;
	}
	if (Cmd.argv[1].indexOf('..') !== -1)
	{
		Con.Print('Relative pathnames are not allowed.\n');
		return;
	}
	if ((c === 2) && (CL.cls.state === CL.active.connected))
	{
		Con.Print('Can not record - already connected to server\nClient demo recording must be started before connecting\n');
		return;
	}
	if (c === 4)
	{
		CL.cls.forcetrack = Q.atoi(Cmd.argv[3]);
		Con.Print('Forcing CD track to ' + CL.cls.forcetrack);
	}
	else
		CL.cls.forcetrack = -1;
	CL.cls.demoname = COM.DefaultExtension(Cmd.argv[1], '.dem');
	if (c >= 3)
		Cmd.ExecuteString('map ' + Cmd.argv[2]);
	Con.Print('recording to ' + CL.cls.demoname + '.\n');
	CL.cls.demofile = new ArrayBuffer(16384);
	var track = CL.cls.forcetrack.toString() + '\n';
	var i, dest = new Uint8Array(CL.cls.demofile, 0, track.length);
	for (i = 0; i < track.length; ++i)
		dest[i] = track.charCodeAt(i);
	CL.cls.demoofs = track.length;
	CL.cls.demorecording = true;
};

CL.PlayDemo_f = function()
{
	if (Cmd.client === true)
		return;
	if (Cmd.argv.length !== 2)
	{
		Con.Print('playdemo <demoname> : plays a demo\n');
		return;
	}
	CL.Disconnect();
	var name = COM.DefaultExtension(Cmd.argv[1], '.dem');
	Con.Print('Playing demo from ' + name + '.\n');
	var demofile = COM.LoadFile(name);
	if (demofile == null)
	{
		Con.Print('ERROR: couldn\'t open.\n');
		CL.cls.demonum = -1;
		SCR.disabled_for_loading = false;
		return;
	}
	CL.cls.demofile = demofile;
	demofile = new Uint8Array(demofile);
	CL.cls.demosize = demofile.length;
	CL.cls.demoplayback = true;
	CL.cls.state = CL.active.connected;
	CL.cls.forcetrack = 0;
	var i, c, neg;
	for (i = 0; i < demofile.length; ++i)
	{
		c = demofile[i];
		if (c === 10)
			break;
		if (c === 45)
			neg = true;
		else
			CL.cls.forcetrack = CL.cls.forcetrack * 10 + c - 48;
	}
	if (neg === true)
		CL.cls.forcetrack = -CL.cls.forcetrack;
	CL.cls.demoofs = i + 1;
};

CL.FinishTimeDemo = function()
{
	CL.cls.timedemo = false;
	var frames = Host.framecount - CL.cls.td_startframe - 1;
	var time = Host.realtime - CL.cls.td_starttime;
	if (time === 0.0)
		time = 1.0;
	Con.Print(frames + ' frames ' + time.toFixed(1) + ' seconds ' + (frames / time).toFixed(1) + ' fps\n');
};

CL.TimeDemo_f = function()
{
	if (Cmd.client === true)
		return;
	if (Cmd.argv.length !== 2)
	{
		Con.Print('timedemo <demoname> : gets demo speeds\n');
		return;
	}
	CL.PlayDemo_f();
	CL.cls.timedemo = true;
	CL.cls.td_startframe = Host.framecount;
	CL.cls.td_lastframe = -1;
};

// input

CL.kbutton = {
	mlook: 0,
	klook: 1,
	left: 2,
	right: 3,
	forward: 4,
	back: 5,
	lookup: 6,
	lookdown: 7,
	moveleft: 8,
	moveright: 9,
	strafe: 10,
	speed: 11,
	use: 12,
	jump: 13,
	attack: 14,
	moveup: 15,
	movedown: 16,
	num: 17
};
CL.kbuttons = [];

CL.KeyDown = function()
{
	var b = CL.kbutton[Cmd.argv[0].substring(1)];
	if (b == null)
		return;
	b = CL.kbuttons[b];

	var k;
	if (Cmd.argv[1] != null)
		k = Q.atoi(Cmd.argv[1]);
	else
		k = -1;

	if ((k === b.down[0]) || (k === b.down[1]))
		return;

	if (b.down[0] === 0)
		b.down[0] = k;
	else if (b.down[1] === 0)
		b.down[1] = k;
	else
	{
		Con.Print('Three keys down for a button!\n');
		return;
	}

	if ((b.state & 1) === 0)
		b.state |= 3;
};

CL.KeyUp = function()
{
	var b = CL.kbutton[Cmd.argv[0].substring(1)];
	if (b == null)
		return;
	b = CL.kbuttons[b];

	var k;
	if (Cmd.argv[1] != null)
		k = Q.atoi(Cmd.argv[1]);
	else
	{
		b.down[0] = b.down[1] = 0;
		b.state = 4;
		return;
	}

	if (b.down[0] === k)
		b.down[0] = 0;
	else if (b.down[1] === k)
		b.down[1] = 0;
	else
		return;
	if ((b.down[0] !== 0) || (b.down[1] !== 0))
		return;

	if ((b.state & 1) !== 0)
		b.state = (b.state - 1) | 4;
};

CL.MLookUp = function()
{
	CL.KeyUp();
	if (((CL.kbuttons[CL.kbutton.mlook].state & 1) === 0) && (CL.lookspring.value !== 0))
		V.StartPitchDrift();
};

CL.Impulse = function()
{
	CL.impulse = Q.atoi(Cmd.argv[1]);
};

CL.KeyState = function(key)
{
	key = CL.kbuttons[key];
	var down = key.state & 1;
	key.state &= 1;
	if ((key.state & 2) !== 0)
	{
		if ((key.state & 4) !== 0)
			return (down !== 0) ? 0.75 : 0.25;
		return (down !== 0) ? 0.5 : 0.0;
	}
	if ((key.state & 4) !== 0)
		return 0.0;
	return (down !== 0) ? 1.0 : 0.0;
};

CL.AdjustAngles = function()
{
	var speed = Host.frametime;
	if ((CL.kbuttons[CL.kbutton.speed].state & 1) !== 0)
		speed *= CL.anglespeedkey.value;

	var angles = CL.state.viewangles;

	if ((CL.kbuttons[CL.kbutton.strafe].state & 1) === 0)
	{
		angles[1] += speed * CL.yawspeed.value * (CL.KeyState(CL.kbutton.left) - CL.KeyState(CL.kbutton.right));
		angles[1] = Vec.Anglemod(angles[1]);
	}
	if ((CL.kbuttons[CL.kbutton.klook].state & 1) !== 0)
	{
		V.StopPitchDrift();
		angles[0] += speed * CL.pitchspeed.value * (CL.KeyState(CL.kbutton.back) - CL.KeyState(CL.kbutton.forward));
	}

	var up = CL.KeyState(CL.kbutton.lookup), down = CL.KeyState(CL.kbutton.lookdown);
	if ((up !== 0.0) || (down !== 0.0))
	{
		angles[0] += speed * CL.pitchspeed.value * (down - up);
		V.StopPitchDrift();
	}

	if (angles[0] > 80.0)
		angles[0] = 80.0;
	else if (angles[0] < -70.0)
		angles[0] = -70.0;

	if (angles[2] > 50.0)
		angles[2] = 50.0;
	else if (angles[2] < -50.0)
		angles[2] = -50.0;
};

CL.BaseMove = function()
{
	if (CL.cls.signon !== 4)
		return;

	CL.AdjustAngles();

	var cmd = CL.state.cmd;

	cmd.sidemove = CL.sidespeed.value * (CL.KeyState(CL.kbutton.moveright) - CL.KeyState(CL.kbutton.moveleft));
	if ((CL.kbuttons[CL.kbutton.strafe].state & 1) !== 0)
		cmd.sidemove += CL.sidespeed.value * (CL.KeyState(CL.kbutton.right) - CL.KeyState(CL.kbutton.left));

	cmd.upmove = CL.upspeed.value * (CL.KeyState(CL.kbutton.moveup) - CL.KeyState(CL.kbutton.movedown));

	if ((CL.kbuttons[CL.kbutton.klook].state & 1) === 0)
		cmd.forwardmove = CL.forwardspeed.value * CL.KeyState(CL.kbutton.forward) - CL.backspeed.value * CL.KeyState(CL.kbutton.back);
	else
		cmd.forwardmove = 0.0;

	if ((CL.kbuttons[CL.kbutton.speed].state & 1) !== 0)
	{
		cmd.forwardmove *= CL.movespeedkey.value;
		cmd.sidemove *= CL.movespeedkey.value;
		cmd.upmove *= CL.movespeedkey.value;
	}
};

CL.sendmovebuf = {data: new ArrayBuffer(16), cursize: 0};
CL.SendMove = function()
{
	var buf = CL.sendmovebuf;
	buf.cursize = 0;
	MSG.WriteByte(buf, Protocol.clc.move);
	MSG.WriteFloat(buf, CL.state.mtime[0]);
	MSG.WriteAngle(buf, CL.state.viewangles[0]);
	MSG.WriteAngle(buf, CL.state.viewangles[1]);
	MSG.WriteAngle(buf, CL.state.viewangles[2]);
	MSG.WriteShort(buf, CL.state.cmd.forwardmove);
	MSG.WriteShort(buf, CL.state.cmd.sidemove);
	MSG.WriteShort(buf, CL.state.cmd.upmove);
	var bits = 0;
	if ((CL.kbuttons[CL.kbutton.attack].state & 3) !== 0)
		bits += 1;
	CL.kbuttons[CL.kbutton.attack].state &= 5;
	if ((CL.kbuttons[CL.kbutton.jump].state & 3) !== 0)
		bits += 2;
	CL.kbuttons[CL.kbutton.jump].state &= 5;
	MSG.WriteByte(buf, bits);
	MSG.WriteByte(buf, CL.impulse);
	CL.impulse = 0;
	if (CL.cls.demoplayback === true)
		return;
	if (++CL.state.movemessages <= 2)
		return;
	if (NET.SendUnreliableMessage(CL.cls.netcon, buf) === -1)
	{
		Con.Print('CL.SendMove: lost server connection\n');
		CL.Disconnect();
	}
};

CL.InitInput = function()
{
	var i;

	var commands = ['moveup', 'movedown', 'left', 'right',
		'forward', 'back', 'lookup', 'lookdown',
		'strafe', 'moveleft', 'moveright', 'speed',
		'attack', 'use', 'jump', 'klook'
	];
	for (i = 0; i < commands.length; ++i)
	{
		Cmd.AddCommand('+' + commands[i], CL.KeyDown);
		Cmd.AddCommand('-' + commands[i], CL.KeyUp);
	}
	Cmd.AddCommand('impulse', CL.Impulse);
	Cmd.AddCommand('+mlook', CL.KeyDown);
	Cmd.AddCommand('-mlook', CL.MLookUp);

	for (i = 0; i < CL.kbutton.num; ++i)
		CL.kbuttons[i] = {down: [0, 0], state: 0};
};

// main

CL.cls = {
	state: 0,
	spawnparms: '',
	demonum: 0,
	message: {data: new ArrayBuffer(8192), cursize: 0}
};

CL.static_entities = [];
CL.visedicts = [];

CL.Rcon_f = function()
{
	if (CL.rcon_password.string.length === 0)
	{
		Con.Print('You must set \'rcon_password\' before\nissuing an rcon command.\n');
		return;
	}
	var to;
	if ((CL.cls.state === CL.active.connected) && (CL.cls.netcon != null))
	{
		if (NET.drivers[CL.cls.netcon.driver] === WEBS)
			to = CL.cls.netcon.address.substring(5);
	}
	if (to == null)
	{
		if (CL.rcon_address.string.length === 0)
		{
			Con.Print('You must either be connected,\nor set the \'rcon_address\' cvar\nto issue rcon commands\n');
			return;
		}
		to = CL.rcon_address.string;
	}
	var pw;
	try
	{
		pw = btoa('quake:' + CL.rcon_password.string);
	}
	catch (e)
	{
		return;
	}
	var message = '', i;
	for (i = 1; i < Cmd.argv.length; ++i)
		message += Cmd.argv[i] + ' ';
	try
	{
		message = encodeURIComponent(message);
	}
	catch (e)
	{
		return;
	}
	var xhr = new XMLHttpRequest();
	xhr.open('HEAD', 'http://' + to + '/rcon/' + message);
	xhr.setRequestHeader('Authorization', 'Basic ' + pw);
	xhr.send();
};

CL.ClearState = function()
{
	if (SV.server.active !== true)
	{
		Con.DPrint('Clearing memory\n');
		Mod.ClearAll();
		CL.cls.signon = 0;
	}

	CL.state = {
		movemessages: 0,
		cmd: {
			forwardmove: 0.0,
			sidemove: 0.0,
			upmove: 0.0
		},
		stats: [
			0, 0, 0, 0, 0, 0, 0, 0,
			0, 0, 0, 0, 0, 0, 0, 0,
			0, 0, 0, 0, 0, 0, 0, 0,
			0, 0, 0, 0, 0, 0, 0, 0
		],
		items: 0,
		item_gettime: [
			0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
			0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
			0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
			0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
		],
		faceanimtime: 0.0,
		cshifts: [[0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0]],
		mviewangles: [[0.0, 0.0, 0.0], [0.0, 0.0, 0.0]],
		viewangles: [0.0, 0.0, 0.0],
		mvelocity: [[0.0, 0.0, 0.0], [0.0, 0.0, 0.0]],
		velocity: [0.0, 0.0, 0.0],
		punchangle: [0.0, 0.0, 0.0],
		idealpitch: 0.0,
		pitchvel: 0.0,
		driftmove: 0.0,
		laststop: 0.0,
		crouch: 0.0,
		intermission: 0,
		completed_time: 0,
		mtime: [0.0, 0.0],
		time: 0.0,
		oldtime: 0.0,
		last_received_message: 0.0,
		viewentity: 0,
		num_statics: 0,
		viewent: {num: -1, origin: [0.0, 0.0, 0.0], angles: [0.0, 0.0, 0.0], skinnum: 0},
		cdtrack: 0,
		looptrack: 0
	};

	CL.cls.message.cursize = 0;

	CL.entities = [];
	
	var i;

	CL.dlights = [];
	for (i = 0; i <= 31; ++i)
		CL.dlights[i] = {radius: 0.0, die: 0.0};

	CL.lightstyle = [];
	for (i = 0; i <= 63; ++i)
		CL.lightstyle[i] = '';

	CL.beams = [];
	for (i = 0; i <= 23; ++i)
		CL.beams[i] = {endtime: 0.0};
};

CL.Disconnect = function()
{
	S.StopAllSounds();
	if (CL.cls.demoplayback === true)
		CL.StopPlayback();
	else if (CL.cls.state === CL.active.connected)
	{
		if (CL.cls.demorecording === true)
			CL.Stop_f();
		Con.DPrint('Sending clc_disconnect\n');
		CL.cls.message.cursize = 0;
		MSG.WriteByte(CL.cls.message, Protocol.clc.disconnect);
		NET.SendUnreliableMessage(CL.cls.netcon, CL.cls.message);
		CL.cls.message.cursize = 0;
		NET.Close(CL.cls.netcon);
		CL.cls.state = CL.active.disconnected;
		if (SV.server.active === true)
			Host.ShutdownServer();
	}
	CL.cls.demoplayback = CL.cls.timedemo = false;
	CL.cls.signon = 0;
};

CL.Connect = function(sock)
{
	CL.cls.netcon = sock;
	Con.DPrint('CL.Connect: connected to ' + CL.host + '\n');
	CL.cls.demonum = -1;
	CL.cls.state = CL.active.connected;
	CL.cls.signon = 0;
};

CL.EstablishConnection = function(host)
{
	if (CL.cls.demoplayback === true)
		return;
	CL.Disconnect();
	CL.host = host;
	var sock = NET.Connect(host);
	if (sock == null)
		Host.Error('CL.EstablishConnection: connect failed\n');
	CL.Connect(sock);
};

CL.SignonReply = function()
{
	Con.DPrint('CL.SignonReply: ' + CL.cls.signon + '\n');
	switch (CL.cls.signon)
	{
	case 1:
		MSG.WriteByte(CL.cls.message, Protocol.clc.stringcmd);
		MSG.WriteString(CL.cls.message, 'prespawn');
		return;
	case 2:
		MSG.WriteByte(CL.cls.message, Protocol.clc.stringcmd);
		MSG.WriteString(CL.cls.message, 'name "' + CL.name.string + '"\n');
		MSG.WriteByte(CL.cls.message, Protocol.clc.stringcmd);
		MSG.WriteString(CL.cls.message, 'color ' + (CL.color.value >> 4) + ' ' + (CL.color.value & 15) + '\n');
		MSG.WriteByte(CL.cls.message, Protocol.clc.stringcmd);
		MSG.WriteString(CL.cls.message, 'spawn ' + CL.cls.spawnparms);
		return;
	case 3:
		MSG.WriteByte(CL.cls.message, Protocol.clc.stringcmd);
		MSG.WriteString(CL.cls.message, 'begin');
		return;
	case 4:
		SCR.EndLoadingPlaque();
	}
};

CL.NextDemo = function()
{
	if (CL.cls.demonum === -1)
		return;
	SCR.BeginLoadingPlaque();
	if (CL.cls.demonum >= CL.cls.demos.length)
	{
		if (CL.cls.demos.length === 0)
		{
			Con.Print('No demos listed with startdemos\n');
			CL.cls.demonum = -1;
			return;
		}
		CL.cls.demonum = 0;
	}
	Cmd.text = 'playdemo ' + CL.cls.demos[CL.cls.demonum++] + '\n' + Cmd.text;
};

CL.PrintEntities_f = function()
{
	var i, ent;
	for (i = 0; i < CL.entities.length; ++i)
	{
		ent = CL.entities[i];
		if (i <= 9)
			Con.Print('  ' + i + ':');
		else if (i <= 99)
			Con.Print(' ' + i + ':');
		else
			Con.Print(i + ':');
		if (ent.model == null)
		{
			Con.Print('EMPTY\n');
			continue;
		}
		Con.Print(ent.model.name + (ent.frame <= 9 ? ': ' : ':') + ent.frame +
			'  (' + ent.origin[0].toFixed(1) + ',' + ent.origin[1].toFixed(1) + ',' + ent.origin[2].toFixed(1) +
			') [' + ent.angles[0].toFixed(1) + ' ' + ent.angles[1].toFixed(1) + ' ' + ent.angles[2].toFixed(1) + ']\n');
	}
};

CL.AllocDlight = function(key)
{
	var i, dl;
	if (key !== 0)
	{
		for (i = 0; i <= 31; ++i)
		{
			if (CL.dlights[i].key === key)
			{
				dl = CL.dlights[i];
				break;
			}
		}
	}
	if (dl == null)
	{
		for (i = 0; i <= 31; ++i)
		{
			if (CL.dlights[i].die < CL.state.time)
			{
				dl = CL.dlights[i];
				break;
			}
		}
		if (dl == null)
			dl = CL.dlights[0];
	}
	dl.origin = [0.0, 0.0, 0.0];
	dl.radius = 0.0;
	dl.die = 0.0;
	dl.decay = 0.0;
	dl.minlight = 0.0;
	dl.key = key;
	return dl;
};

CL.DecayLights = function()
{
	var i, dl, time = CL.state.time - CL.state.oldtime;
	for (i = 0; i <= 31; ++i)
	{
		dl = CL.dlights[i];
		if ((dl.die < CL.state.time) || (dl.radius === 0.0))
			continue;
		dl.radius -= time * dl.decay;
		if (dl.radius < 0.0)
			dl.radius = 0.0;
	}
}

CL.LerpPoint = function()
{
	var f = CL.state.mtime[0] - CL.state.mtime[1];
	if ((f === 0.0) || (CL.nolerp.value !== 0) || (CL.cls.timedemo === true) || (SV.server.active === true))
	{
		CL.state.time = CL.state.mtime[0];
		return 1.0;
	}
	if (f > 0.1)
	{
		CL.state.mtime[1] = CL.state.mtime[0] - 0.1;
		f = 0.1;
	}
	var frac = (CL.state.time - CL.state.mtime[1]) / f;
	if (frac < 0.0)
	{
		if (frac < -0.01)
			CL.state.time = CL.state.mtime[1];
		return 0.0;
	}
	if (frac > 1.0)
	{
		if (frac > 1.01)
			CL.state.time = CL.state.mtime[0];
		return 1.0;
	}
	return frac;
};

CL.RelinkEntities = function()
{
	var i, j;
	var frac = CL.LerpPoint(), f, d, delta = [];

	CL.numvisedicts = 0;

	CL.state.velocity[0] = CL.state.mvelocity[1][0] + frac * (CL.state.mvelocity[0][0] - CL.state.mvelocity[1][0]);
	CL.state.velocity[1] = CL.state.mvelocity[1][1] + frac * (CL.state.mvelocity[0][1] - CL.state.mvelocity[1][1]);
	CL.state.velocity[2] = CL.state.mvelocity[1][2] + frac * (CL.state.mvelocity[0][2] - CL.state.mvelocity[1][2]);

	if (CL.cls.demoplayback === true)
	{
		for (i = 0; i <= 2; ++i)
		{
			d = CL.state.mviewangles[0][i] - CL.state.mviewangles[1][i];
			if (d > 180.0)
				d -= 360.0;
			else if (d < -180.0)
				d += 360.0;
			CL.state.viewangles[i] = CL.state.mviewangles[1][i] + frac * d;
		}
	}

	var bobjrotate = Vec.Anglemod(100.0 * CL.state.time);
	var ent, oldorg = [], dl;
	for (i = 1; i < CL.entities.length; ++i)
	{
		ent = CL.entities[i];
		if (ent.model == null)
			continue;
		if (ent.msgtime !== CL.state.mtime[0])
		{
			ent.model = null;
			continue;
		}
		oldorg[0] = ent.origin[0];
		oldorg[1] = ent.origin[1];
		oldorg[2] = ent.origin[2];
		if (ent.forcelink === true)
		{
			Vec.Copy(ent.msg_origins[0], ent.origin);
			Vec.Copy(ent.msg_angles[0], ent.angles);
		}
		else
		{
			f = frac;
			for (j = 0; j <= 2; ++j)
			{
				delta[j] = ent.msg_origins[0][j] - ent.msg_origins[1][j];
				if ((delta[j] > 100.0) || (delta[j] < -100.0))
					f = 1.0;
			}
			for (j = 0; j <= 2; ++j)
			{
				ent.origin[j] = ent.msg_origins[1][j] + f * delta[j];
				d = ent.msg_angles[0][j] - ent.msg_angles[1][j];
				if (d > 180.0)
					d -= 360.0;
				else if (d < -180.0)
					d += 360.0;
				ent.angles[j] = ent.msg_angles[1][j] + f * d;
			}
		}

		if ((ent.model.flags & Mod.flags.rotate) !== 0)
			ent.angles[1] = bobjrotate;
		if ((ent.effects & Mod.effects.brightfield) !== 0)
			R.EntityParticles(ent);
		if ((ent.effects & Mod.effects.muzzleflash) !== 0)
		{
			dl = CL.AllocDlight(i);
			var fv = [];
			Vec.AngleVectors(ent.angles, fv);
			dl.origin = [
				ent.origin[0] + 18.0 * fv[0],
				ent.origin[1] + 18.0 * fv[1],
				ent.origin[2] + 16.0 + 18.0 * fv[2]
			];
			dl.radius = 200.0 + Math.random() * 32.0;
			dl.minlight = 32.0;
			dl.die = CL.state.time + 0.1;
		}
		if ((ent.effects & Mod.effects.brightlight) !== 0)
		{
			dl = CL.AllocDlight(i);
			dl.origin = [ent.origin[0], ent.origin[1], ent.origin[2] + 16.0];
			dl.radius = 400.0 + Math.random() * 32.0;
			dl.die = CL.state.time + 0.001;
		}
		if ((ent.effects & Mod.effects.dimlight) !== 0)
		{
			dl = CL.AllocDlight(i);
			dl.origin = [ent.origin[0], ent.origin[1], ent.origin[2] + 16.0];
			dl.radius = 200.0 + Math.random() * 32.0;
			dl.die = CL.state.time + 0.001;
		}
		if ((ent.model.flags & Mod.flags.gib) !== 0)
			R.RocketTrail(oldorg, ent.origin, 2);
		else if ((ent.model.flags & Mod.flags.zomgib) !== 0)
			R.RocketTrail(oldorg, ent.origin, 4);
		else if ((ent.model.flags & Mod.flags.tracer) !== 0)
			R.RocketTrail(oldorg, ent.origin, 3);
		else if ((ent.model.flags & Mod.flags.tracer2) !== 0)
			R.RocketTrail(oldorg, ent.origin, 5);
		else if ((ent.model.flags & Mod.flags.rocket) !== 0)
		{
			R.RocketTrail(oldorg, ent.origin, 0);
			dl = CL.AllocDlight(i)
			dl.origin = [ent.origin[0], ent.origin[1], ent.origin[2]];
			dl.radius = 200.0;
			dl.die = CL.state.time + 0.01;
		}
		else if ((ent.model.flags & Mod.flags.grenade) !== 0)
			R.RocketTrail(oldorg, ent.origin, 1);
		else if ((ent.model.flags & Mod.flags.tracer3) !== 0)
			R.RocketTrail(oldorg, ent.origin, 6);

		ent.forcelink = false;
		if ((i !== CL.state.viewentity) || (Chase.active.value !== 0))
			CL.visedicts[CL.numvisedicts++] = ent;
	}
};

CL.ReadFromServer = function()
{
	CL.state.oldtime = CL.state.time;
	CL.state.time += Host.frametime;
	var ret;
	for (;;)
	{
		ret = CL.GetMessage();
		if (ret === -1)
			Host.Error('CL.ReadFromServer: lost server connection');
		if (ret === 0)
			break;
		CL.state.last_received_message = Host.realtime;
		CL.ParseServerMessage();
		if (CL.cls.state !== CL.active.connected)
			break;
	}
	if (CL.shownet.value !== 0)
		Con.Print('\n');
	CL.RelinkEntities();
	CL.UpdateTEnts();
};

CL.SendCmd = function()
{
	if (CL.cls.state !== CL.active.connected)
		return;

	if (CL.cls.signon === 4)
	{
		CL.BaseMove();
		IN.Move();
		CL.SendMove();
	}

	if (CL.cls.demoplayback === true)
	{
		CL.cls.message.cursize = 0;
		return;
	}

	if (CL.cls.message.cursize === 0)
		return;

	if (NET.CanSendMessage(CL.cls.netcon) !== true)
	{
		Con.DPrint('CL.SendCmd: can\'t send\n');
		return;
	}

	if (NET.SendMessage(CL.cls.netcon, CL.cls.message) === -1)
		Host.Error('CL.SendCmd: lost server connection');

	CL.cls.message.cursize = 0;
};

CL.Init = function()
{
	CL.ClearState();
	CL.InitInput();
	CL.InitTEnts();
	CL.name = Cvar.RegisterVariable('_cl_name', 'player', true);
	CL.color = Cvar.RegisterVariable('_cl_color', '0', true);
	CL.upspeed = Cvar.RegisterVariable('cl_upspeed', '200');
	CL.forwardspeed = Cvar.RegisterVariable('cl_forwardspeed', '200', true);
	CL.backspeed = Cvar.RegisterVariable('cl_backspeed', '200', true);
	CL.sidespeed = Cvar.RegisterVariable('cl_sidespeed', '350');
	CL.movespeedkey = Cvar.RegisterVariable('cl_movespeedkey', '2.0');
	CL.yawspeed = Cvar.RegisterVariable('cl_yawspeed', '140');
	CL.pitchspeed = Cvar.RegisterVariable('cl_pitchspeed', '150');
	CL.anglespeedkey = Cvar.RegisterVariable('cl_anglespeedkey', '1.5');
	CL.shownet = Cvar.RegisterVariable('cl_shownet', '0');
	CL.nolerp = Cvar.RegisterVariable('cl_nolerp', '0');
	CL.lookspring = Cvar.RegisterVariable('lookspring', '0', true);
	CL.lookstrafe = Cvar.RegisterVariable('lookstrafe', '0', true);
	CL.sensitivity = Cvar.RegisterVariable('sensitivity', '3', true);
	CL.m_pitch = Cvar.RegisterVariable('m_pitch', '0.022', true);
	CL.m_yaw = Cvar.RegisterVariable('m_yaw', '0.022', true);
	CL.m_forward = Cvar.RegisterVariable('m_forward', '1', true);
	CL.m_side = Cvar.RegisterVariable('m_side', '0.8', true);
	CL.rcon_password = Cvar.RegisterVariable('rcon_password', '');
	CL.rcon_address = Cvar.RegisterVariable('rcon_address', '');
	Cmd.AddCommand('entities', CL.PrintEntities_f);
	Cmd.AddCommand('disconnect', CL.Disconnect);
	Cmd.AddCommand('record', CL.Record_f);
	Cmd.AddCommand('stop', CL.Stop_f);
	Cmd.AddCommand('playdemo', CL.PlayDemo_f);
	Cmd.AddCommand('timedemo', CL.TimeDemo_f);
	Cmd.AddCommand('rcon', CL.Rcon_f);
};

// parse

CL.svc_strings = [
	'bad',
	'nop',
	'disconnect',
	'updatestat',
	'version',
	'setview',
	'sound',
	'time',
	'print',
	'stufftext',
	'setangle',
	'serverinfo',
	'lightstyle',
	'updatename',
	'updatefrags',
	'clientdata',
	'stopsound',
	'updatecolors',
	'particle',
	'damage',
	'spawnstatic',
	'OBSOLETE spawnbinary',
	'spawnbaseline',
	'temp_entity',
	'setpause',
	'signonnum',
	'centerprint',
	'killedmonster',
	'foundsecret',
	'spawnstaticsound',
	'intermission',
	'finale',
	'cdtrack',
	'sellscreen',
	'cutscene'
];

CL.EntityNum = function(num)
{
	if (num < CL.entities.length)
		return CL.entities[num];
	for (; CL.entities.length <= num; )
	{
		CL.entities[CL.entities.length] = {
			num: num,
			update_type: 0,
			baseline: {
				origin: [0.0, 0.0, 0.0],
				angles: [0.0, 0.0, 0.0],
				modelindex: 0,
				frame: 0,
				colormap: 0,
				skin: 0,
				effects: 0
			},
			msgtime: 0.0,
			msg_origins: [[0.0, 0.0, 0.0], [0.0, 0.0, 0.0]],
			origin: [0.0, 0.0, 0.0],
			msg_angles: [[0.0, 0.0, 0.0], [0.0, 0.0, 0.0]],
			angles: [0.0, 0.0, 0.0],
			frame: 0,
			syncbase: 0.0,
			effects: 0,
			skinnum: 0,
			visframe: 0,
			dlightframe: 0,
			dlightbits: 0
		};
	}
	return CL.entities[num];
};

CL.ParseStartSoundPacket = function()
{
	var field_mask = MSG.ReadByte();
	var volume = ((field_mask & 1) !== 0) ? MSG.ReadByte() : 255;
	var attenuation = ((field_mask & 2) !== 0) ? MSG.ReadByte() * 0.015625 : 1.0;
	var channel = MSG.ReadShort();
	var sound_num = MSG.ReadByte();
	var ent = channel >> 3;
	channel &= 7;
	var pos = [MSG.ReadCoord(), MSG.ReadCoord(), MSG.ReadCoord()];
	S.StartSound(ent, channel, CL.state.sound_precache[sound_num], pos, volume / 255.0, attenuation);
};

CL.lastmsg = 0.0;
CL.KeepaliveMessage = function()
{
	if ((SV.server.active === true) || (CL.cls.demoplayback === true))
		return;
	var oldsize = NET.message.cursize;
	var olddata = new Uint8Array(8192);
	olddata.set(new Uint8Array(NET.message.data, 0, oldsize));
	var ret;
	for (;;)
	{
		ret = CL.GetMessage();
		switch (ret)
		{
		case 0:
			break;
		case 1:
			Host.Error('CL.KeepaliveMessage: received a message');
		case 2:
			if (MSG.ReadByte() !== Protocol.svc.nop)
				Host.Error('CL.KeepaliveMessage: datagram wasn\'t a nop');
		default:
			Host.Error('CL.KeepaliveMessage: CL.GetMessage failed');
		}
		if (ret === 0)
			break;
	}
	NET.message.cursize = oldsize;
	(new Uint8Array(NET.message.data, 0, oldsize)).set(olddata.subarray(0, oldsize));
	var time = Sys.FloatTime();
	if ((time - CL.lastmsg) < 5.0)
		return;
	CL.lastmsg = time;
	Con.Print('--> client to server keepalive\n');
	MSG.WriteByte(CL.cls.message, Protocol.clc.nop);
	NET.SendMessage(CL.cls.netcon, CL.cls.message);
	CL.cls.message.cursize = 0;
};

CL.ParseServerInfo = function()
{
	Con.DPrint('Serverinfo packet received.\n');
	CL.ClearState();
	var i = MSG.ReadLong();
	if (i !== Protocol.version)
	{
		Con.Print('Server returned version ' + i + ', not ' + Protocol.version + '\n');
		return;
	}
	CL.state.maxclients = MSG.ReadByte();
	if ((CL.state.maxclients <= 0) || (CL.state.maxclients > 16))
	{
		Con.Print('Bad maxclients (' + CL.state.maxclients + ') from server\n');
		return;
	}
	CL.state.scores = [];
	for (i = 0; i < CL.state.maxclients; ++i)
	{
		CL.state.scores[i] = {
			name: '',
			entertime: 0.0,
			frags: 0,
			colors: 0
		};
	}
	CL.state.gametype = MSG.ReadByte();
	CL.state.levelname = MSG.ReadString();
	Con.Print('\n\n\35\36\36\36\36\36\36\36\36\36\36\36\36\36\36\36\36\36\36\36\36\36\36\36\36\36\36\36\36\36\36\36\36\36\36\36\37\n\n');
	Con.Print('\2' + CL.state.levelname + '\n');

	var str;
	var nummodels, model_precache = [];
	for (nummodels = 1; ; ++nummodels)
	{
		str = MSG.ReadString();
		if (str.length === 0)
			break;
		model_precache[nummodels] = str;
	}
	var numsounds, sound_precache = [];
	for (numsounds = 1; ; ++numsounds)
	{
		str = MSG.ReadString();
		if (str.length === 0)
			break;
		sound_precache[numsounds] = str;
	}

	CL.state.model_precache = [];
	for (i = 1; i < nummodels; ++i)
	{
		CL.state.model_precache[i] = Mod.ForName(model_precache[i]);
		if (CL.state.model_precache[i] == null)
		{
			Con.Print('Model ' + model_precache[i] + ' not found\n');
			return;
		}
		CL.KeepaliveMessage();
	}
	CL.state.sound_precache = [];
	for (i = 1; i < numsounds; ++i)
	{
		CL.state.sound_precache[i] = S.PrecacheSound(sound_precache[i]);
		CL.KeepaliveMessage();
	}

	CL.state.worldmodel = CL.state.model_precache[1];
	CL.EntityNum(0).model = CL.state.worldmodel;
	R.NewMap();
	Host.noclip_anglehack = false;
};

CL.ParseUpdate = function(bits)
{
	if (CL.cls.signon === 3)
	{
		CL.cls.signon = 4;
		CL.SignonReply();
	}

	if ((bits & Protocol.u.morebits) !== 0)
		bits += (MSG.ReadByte() << 8);

	var ent = CL.EntityNum(((bits & Protocol.u.longentity) !== 0) ? MSG.ReadShort() : MSG.ReadByte());

	var forcelink = ent.msgtime !== CL.state.mtime[1];
	ent.msgtime = CL.state.mtime[0];

	var model = CL.state.model_precache[((bits & Protocol.u.model) !== 0) ? MSG.ReadByte() : ent.baseline.modelindex];
	if (model !== ent.model)
	{
		ent.model = model;
		if (model != null)
			ent.syncbase = (model.random === true) ? Math.random() : 0.0;
		else
			forcelink = true;
	}

	ent.frame = ((bits & Protocol.u.frame) !== 0) ? MSG.ReadByte() : ent.baseline.frame;
	ent.colormap = ((bits & Protocol.u.colormap) !== 0) ? MSG.ReadByte() : ent.baseline.colormap;
	if (ent.colormap > CL.state.maxclients)
		Sys.Error('i >= cl.maxclients');
	ent.skinnum = ((bits & Protocol.u.skin) !== 0) ? MSG.ReadByte() : ent.baseline.skin;
	ent.effects = ((bits & Protocol.u.effects) !== 0) ? MSG.ReadByte() : ent.baseline.effects;

	Vec.Copy(ent.msg_origins[0], ent.msg_origins[1]);
	Vec.Copy(ent.msg_angles[0], ent.msg_angles[1]);
	ent.msg_origins[0][0] = ((bits & Protocol.u.origin1) !== 0) ? MSG.ReadCoord() : ent.baseline.origin[0];
	ent.msg_angles[0][0] = ((bits & Protocol.u.angle1) !== 0) ? MSG.ReadAngle() : ent.baseline.angles[0];
	ent.msg_origins[0][1] = ((bits & Protocol.u.origin2) !== 0) ? MSG.ReadCoord() : ent.baseline.origin[1];
	ent.msg_angles[0][1] = ((bits & Protocol.u.angle2) !== 0) ? MSG.ReadAngle() : ent.baseline.angles[1];
	ent.msg_origins[0][2] = ((bits & Protocol.u.origin3) !== 0) ? MSG.ReadCoord() : ent.baseline.origin[2];
	ent.msg_angles[0][2] = ((bits & Protocol.u.angle3) !== 0) ? MSG.ReadAngle() : ent.baseline.angles[2];

	if ((bits & Protocol.u.nolerp) !== 0)
		ent.forcelink = true;

	if (forcelink === true)
	{
		Vec.Copy(ent.msg_origins[0], ent.origin);
		Vec.Copy(ent.origin, ent.msg_origins[1]);
		Vec.Copy(ent.msg_angles[0], ent.angles);
		Vec.Copy(ent.angles, ent.msg_angles[1]);
		ent.forcelink = true;
	}
};

CL.ParseBaseline = function(ent)
{
	ent.baseline.modelindex = MSG.ReadByte();
	ent.baseline.frame = MSG.ReadByte();
	ent.baseline.colormap = MSG.ReadByte();
	ent.baseline.skin = MSG.ReadByte();
	ent.baseline.origin[0] = MSG.ReadCoord();
	ent.baseline.angles[0] = MSG.ReadAngle();
	ent.baseline.origin[1] = MSG.ReadCoord();
	ent.baseline.angles[1] = MSG.ReadAngle();
	ent.baseline.origin[2] = MSG.ReadCoord();
	ent.baseline.angles[2] = MSG.ReadAngle();
};

CL.ParseClientdata = function(bits)
{
	var i;

	CL.state.viewheight = ((bits & Protocol.su.viewheight) !== 0) ? MSG.ReadChar() : Protocol.default_viewheight;
	CL.state.idealpitch = ((bits & Protocol.su.idealpitch) !== 0) ? MSG.ReadChar() : 0.0;

	CL.state.mvelocity[1] = [CL.state.mvelocity[0][0], CL.state.mvelocity[0][1], CL.state.mvelocity[0][2]];
	for (i = 0; i <= 2; ++i)
	{
		if ((bits & (Protocol.su.punch1 << i)) !== 0)
			CL.state.punchangle[i] = MSG.ReadChar();
		else
			CL.state.punchangle[i] = 0.0;
		if ((bits & (Protocol.su.velocity1 << i)) !== 0)
			CL.state.mvelocity[0][i] = MSG.ReadChar() * 16.0;
		else
			CL.state.mvelocity[0][i] = 0.0;
	}

	i = MSG.ReadLong();
	var j;
	if (CL.state.items !== i)
	{
		for (j = 0; j <= 31; ++j)
		{
			if ((((i >>> j) & 1) !== 0) && (((CL.state.items >>> j) & 1) === 0))
				CL.state.item_gettime[j] = CL.state.time;
		}
		CL.state.items = i;
	}

	CL.state.onground = (bits & Protocol.su.onground) !== 0;
	CL.state.inwater = (bits & Protocol.su.inwater) !== 0;

	CL.state.stats[Def.stat.weaponframe] = ((bits & Protocol.su.weaponframe) !== 0) ? MSG.ReadByte() : 0;
	CL.state.stats[Def.stat.armor] = ((bits & Protocol.su.armor) !== 0) ? MSG.ReadByte() : 0;
	CL.state.stats[Def.stat.weapon] = ((bits & Protocol.su.weapon) !== 0) ? MSG.ReadByte() : 0;
	CL.state.stats[Def.stat.health] = MSG.ReadShort();
	CL.state.stats[Def.stat.ammo] = MSG.ReadByte();
	CL.state.stats[Def.stat.shells] = MSG.ReadByte();
	CL.state.stats[Def.stat.nails] = MSG.ReadByte();
	CL.state.stats[Def.stat.rockets] = MSG.ReadByte();
	CL.state.stats[Def.stat.cells] = MSG.ReadByte();
	if (COM.standard_quake === true)
		CL.state.stats[Def.stat.activeweapon] = MSG.ReadByte();
	else
		CL.state.stats[Def.stat.activeweapon] = 1 << MSG.ReadByte();
};

CL.ParseStatic = function()
{
	var ent = {
		num: -1,
		update_type: 0,
		baseline: {origin: [], angles: []},
		msgtime: 0.0,
		msg_origins: [[0.0, 0.0, 0.0], [0.0, 0.0, 0.0]],
		msg_angles: [[0.0, 0.0, 0.0], [0.0, 0.0, 0.0]],
		syncbase: 0.0,
		visframe: 0,
		dlightframe: 0,
		dlightbits: 0,
		leafs: []
	};
	CL.static_entities[CL.state.num_statics++] = ent;
	CL.ParseBaseline(ent);
	ent.model = CL.state.model_precache[ent.baseline.modelindex];
	ent.frame = ent.baseline.frame;
	ent.skinnum = ent.baseline.skin;
	ent.effects = ent.baseline.effects;
	ent.origin = [ent.baseline.origin[0], ent.baseline.origin[1], ent.baseline.origin[2]];
	ent.angles = [ent.baseline.angles[0], ent.baseline.angles[1], ent.baseline.angles[2]];
	R.currententity = ent;
	R.emins = [ent.origin[0] + ent.model.mins[0], ent.origin[1] + ent.model.mins[1], ent.origin[2] + ent.model.mins[2]];
	R.emaxs = [ent.origin[0] + ent.model.maxs[0], ent.origin[1] + ent.model.maxs[1], ent.origin[2] + ent.model.maxs[2]];
	R.SplitEntityOnNode(CL.state.worldmodel.nodes[0]);
};

CL.ParseStaticSound = function()
{
	var org = [MSG.ReadCoord(), MSG.ReadCoord(), MSG.ReadCoord()];
	var sound_num = MSG.ReadByte();
	var vol = MSG.ReadByte();
	var atten = MSG.ReadByte();
	S.StaticSound(CL.state.sound_precache[sound_num], org, vol / 255.0, atten);
};

CL.Shownet = function(x)
{
	if (CL.shownet.value === 2)
	{
		Con.Print((MSG.readcount <= 99 ? (MSG.readcount <= 9 ? '  ' : ' ') : '')
			+ (MSG.readcount - 1) + ':' + x + '\n');
	}
};

CL.ParseServerMessage = function()
{
	if (CL.shownet.value === 1)
		Con.Print(NET.message.cursize + ' ');
	else if (CL.shownet.value === 2)
		Con.Print('------------------\n');

	CL.state.onground = false;

	MSG.BeginReading();

	var cmd, i;
	for (;;)
	{
		if (MSG.badread === true)
			Host.Error('CL.ParseServerMessage: Bad server message');

		cmd = MSG.ReadByte();

		if (cmd === -1)
		{
			CL.Shownet('END OF MESSAGE');
			return;
		}

		if ((cmd & 128) !== 0)
		{
			CL.Shownet('fast update');
			CL.ParseUpdate(cmd & 127);
			continue;
		}

		CL.Shownet('svc_' + CL.svc_strings[cmd]);
		switch (cmd)
		{
		case Protocol.svc.nop:
			continue;
		case Protocol.svc.time:
			CL.state.mtime[1] = CL.state.mtime[0];
			CL.state.mtime[0] = MSG.ReadFloat();
			continue;
		case Protocol.svc.clientdata:
			CL.ParseClientdata(MSG.ReadShort());
			continue;
		case Protocol.svc.version:
			i = MSG.ReadLong();
			if (i !== Protocol.version)
				Host.Error('CL.ParseServerMessage: Server is protocol ' + i + ' instead of ' + Protocol.version + '\n');
			continue;
		case Protocol.svc.disconnect:
			Host.EndGame('Server disconnected\n');
		case Protocol.svc.print:
			Con.Print(MSG.ReadString());
			continue;
		case Protocol.svc.centerprint:
			SCR.CenterPrint(MSG.ReadString());
			continue;
		case Protocol.svc.stufftext:
			Cmd.text += MSG.ReadString();
			continue;
		case Protocol.svc.damage:
			V.ParseDamage();
			continue;
		case Protocol.svc.serverinfo:
			CL.ParseServerInfo();
			SCR.recalc_refdef = true;
			continue;
		case Protocol.svc.setangle:
			CL.state.viewangles[0] = MSG.ReadAngle();
			CL.state.viewangles[1] = MSG.ReadAngle();
			CL.state.viewangles[2] = MSG.ReadAngle();
			continue;
		case Protocol.svc.setview:
			CL.state.viewentity = MSG.ReadShort();
			continue;
		case Protocol.svc.lightstyle:
			i = MSG.ReadByte();
			if (i >= 64)
				Sys.Error('svc_lightstyle > MAX_LIGHTSTYLES');
			CL.lightstyle[i] = MSG.ReadString();
			continue;
		case Protocol.svc.sound:
			CL.ParseStartSoundPacket();
			continue;
		case Protocol.svc.stopsound:
			i = MSG.ReadShort();
			S.StopSound(i >> 3, i & 7);
			continue;
		case Protocol.svc.updatename:
			i = MSG.ReadByte();
			if (i >= CL.state.maxclients)
				Host.Error('CL.ParseServerMessage: svc_updatename > MAX_SCOREBOARD');
			CL.state.scores[i].name = MSG.ReadString();
			continue;
		case Protocol.svc.updatefrags:
			i = MSG.ReadByte();
			if (i >= CL.state.maxclients)
				Host.Error('CL.ParseServerMessage: svc_updatefrags > MAX_SCOREBOARD');
			CL.state.scores[i].frags = MSG.ReadShort();
			continue;
		case Protocol.svc.updatecolors:
			i = MSG.ReadByte();
			if (i >= CL.state.maxclients)
				Host.Error('CL.ParseServerMessage: svc_updatecolors > MAX_SCOREBOARD');
			CL.state.scores[i].colors = MSG.ReadByte();
			continue;
		case Protocol.svc.particle:
			R.ParseParticleEffect();
			continue;
		case Protocol.svc.spawnbaseline:
			CL.ParseBaseline(CL.EntityNum(MSG.ReadShort()));
			continue;
		case Protocol.svc.spawnstatic:
			CL.ParseStatic();
			continue;
		case Protocol.svc.temp_entity:
			CL.ParseTEnt();
			continue;
		case Protocol.svc.setpause:
			CL.state.paused = MSG.ReadByte() !== 0;
			if (CL.state.paused === true)
				CDAudio.Pause();
			else
				CDAudio.Resume();
			continue;
		case Protocol.svc.signonnum:
			i = MSG.ReadByte();
			if (i <= CL.cls.signon)
				Host.Error('Received signon ' + i + ' when at ' + CL.cls.signon);
			CL.cls.signon = i;
			CL.SignonReply();
			continue;
		case Protocol.svc.killedmonster:
			++CL.state.stats[Def.stat.monsters];
			continue;
		case Protocol.svc.foundsecret:
			++CL.state.stats[Def.stat.secrets];
			continue;
		case Protocol.svc.updatestat:
			i = MSG.ReadByte();
			if (i >= 32)
				Sys.Error('svc_updatestat: ' + i + ' is invalid');
			CL.state.stats[i] = MSG.ReadLong();
			continue;
		case Protocol.svc.spawnstaticsound:
			CL.ParseStaticSound();
			continue;
		case Protocol.svc.cdtrack:
			CL.state.cdtrack = MSG.ReadByte();
			MSG.ReadByte();
			if (((CL.cls.demoplayback === true) || (CL.cls.demorecording === true)) && (CL.cls.forcetrack !== -1))
				CDAudio.Play(CL.cls.forcetrack, true);
			else
				CDAudio.Play(CL.state.cdtrack, true);
			continue;
		case Protocol.svc.intermission:
			CL.state.intermission = 1;
			CL.state.completed_time = CL.state.time;
			SCR.recalc_refdef = true;
			continue;
		case Protocol.svc.finale:
			CL.state.intermission = 2;
			CL.state.completed_time = CL.state.time;
			SCR.recalc_refdef = true;
			SCR.CenterPrint(MSG.ReadString());
			continue;
		case Protocol.svc.cutscene:
			CL.state.intermission = 3;
			CL.state.completed_time = CL.state.time;
			SCR.recalc_refdef = true;
			SCR.CenterPrint(MSG.ReadString());
			continue;
		case Protocol.svc.sellscreen:
			Cmd.ExecuteString('help');
			continue;
		}
		Host.Error('CL.ParseServerMessage: Illegible server message\n');
	}
};

// tent

CL.temp_entities = [];

CL.InitTEnts = function()
{
	CL.sfx_wizhit = S.PrecacheSound('wizard/hit.wav');
	CL.sfx_knighthit = S.PrecacheSound('hknight/hit.wav');
	CL.sfx_tink1 = S.PrecacheSound('weapons/tink1.wav');
	CL.sfx_ric1 = S.PrecacheSound('weapons/ric1.wav');
	CL.sfx_ric2 = S.PrecacheSound('weapons/ric2.wav');
	CL.sfx_ric3 = S.PrecacheSound('weapons/ric3.wav');
	CL.sfx_r_exp3 = S.PrecacheSound('weapons/r_exp3.wav');
};

CL.ParseBeam = function(m)
{
	var ent = MSG.ReadShort();
	var start = [MSG.ReadCoord(), MSG.ReadCoord(), MSG.ReadCoord()];
	var end = [MSG.ReadCoord(), MSG.ReadCoord(), MSG.ReadCoord()];
	var i, b;
	for (i = 0; i <= 23; ++i)
	{
		b = CL.beams[i];
		if (b.entity !== ent)
			continue;
		b.model = m;
		b.endtime = CL.state.time + 0.2;
		b.start = [start[0], start[1], start[2]];
		b.end = [end[0], end[1], end[2]];
		return;
	}
	for (i = 0; i <= 23; ++i)
	{
		b = CL.beams[i];
		if ((b.model != null) && (b.endtime >= CL.state.time))
			continue;
		b.entity = ent;
		b.model = m;
		b.endtime = CL.state.time + 0.2;
		b.start = [start[0], start[1], start[2]];
		b.end = [end[0], end[1], end[2]];
		return;
	}
	Con.Print('beam list overflow!\n');
};

CL.ParseTEnt = function()
{
	var type = MSG.ReadByte();

	switch (type)
	{
	case Protocol.te.lightning1:
		CL.ParseBeam(Mod.ForName('progs/bolt.mdl', true));
		return;
	case Protocol.te.lightning2:
		CL.ParseBeam(Mod.ForName('progs/bolt2.mdl', true));
		return;
	case Protocol.te.lightning3:
		CL.ParseBeam(Mod.ForName('progs/bolt3.mdl', true));
		return;
	case Protocol.te.beam:
		CL.ParseBeam(Mod.ForName('progs/beam.mdl', true));
		return;
	}

	var pos = [MSG.ReadCoord(), MSG.ReadCoord(), MSG.ReadCoord()];
	var dl;
	switch (type)
	{
	case Protocol.te.wizspike:
		R.RunParticleEffect(pos, Vec.origin, 20, 20);
		S.StartSound(-1, 0, CL.sfx_wizhit, pos, 1.0, 1.0);
		return;
	case Protocol.te.knightspike:
		R.RunParticleEffect(pos, Vec.origin, 226, 20);
		S.StartSound(-1, 0, CL.sfx_knighthit, pos, 1.0, 1.0);
		return;
	case Protocol.te.spike:
		R.RunParticleEffect(pos, Vec.origin, 0, 10);
		return;
	case Protocol.te.superspike:
		R.RunParticleEffect(pos, Vec.origin, 0, 20);
		return;
	case Protocol.te.gunshot:
		R.RunParticleEffect(pos, Vec.origin, 0, 20);
		return;
	case Protocol.te.explosion:
		R.ParticleExplosion(pos);
		dl = CL.AllocDlight(0);
		dl.origin = [pos[0], pos[1], pos[2]];
		dl.radius = 350.0;
		dl.die = CL.state.time + 0.5;
		dl.decay = 300.0;
		S.StartSound(-1, 0, CL.sfx_r_exp3, pos, 1.0, 1.0);
		return;
	case Protocol.te.tarexplosion:
		R.BlobExplosion(pos);
		S.StartSound(-1, 0, CL.sfx_r_exp3, pos, 1.0, 1.0);
		return;
	case Protocol.te.lavasplash:
		R.LavaSplash(pos);
		return;
	case Protocol.te.teleport:
		R.TeleportSplash(pos);
		return;
	case Protocol.te.explosion2:
		var colorStart = MSG.ReadByte();
		var colorLength = MSG.ReadByte();
		R.ParticleExplosion2(pos, colorStart, colorLength);
		dl = CL.AllocDlight(0);
		dl.origin = [pos[0], pos[1], pos[2]];
		dl.radius = 350.0;
		dl.die = CL.state.time + 0.5;
		dl.decay = 300.0;
		S.StartSound(-1, 0, CL.sfx_r_exp3, pos, 1.0, 1.0);
		return;
	}

	Sys.Error('CL.ParseTEnt: bad type');
};

CL.NewTempEntity = function()
{
	var ent = {frame: 0, syncbase: 0.0, skinnum: 0};
	CL.temp_entities[CL.num_temp_entities++] = ent;
	CL.visedicts[CL.numvisedicts++] = ent;
	return ent;
};

CL.UpdateTEnts = function()
{
	CL.num_temp_entities = 0;
	var i, b, dist = [], yaw, pitch, org = [], d, ent;
	for (i = 0; i <= 23; ++i)
	{
		b = CL.beams[i];
		if ((b.model == null) || (b.endtime < CL.state.time))
			continue;
		if (b.entity === CL.state.viewentity)
			Vec.Copy(CL.entities[CL.state.viewentity].origin, b.start);
		dist[0] = b.end[0] - b.start[0];
		dist[1] = b.end[1] - b.start[1];
		dist[2] = b.end[2] - b.start[2];
		if ((dist[0] === 0.0) && (dist[1] === 0.0))
		{
			yaw = 0;
			pitch = dist[2] > 0.0 ? 90 : 270;
		}
		else
		{
			yaw = (Math.atan2(dist[1], dist[0]) * 180.0 / Math.PI) >> 0;
			if (yaw < 0)
				yaw += 360;
			pitch = (Math.atan2(dist[2], Math.sqrt(dist[0] * dist[0] + dist[1] * dist[1])) * 180.0 / Math.PI) >> 0;
			if (pitch < 0)
				pitch += 360;
		}
		org[0] = b.start[0];
		org[1] = b.start[1];
		org[2] = b.start[2];
		d = Math.sqrt(dist[0] * dist[0] + dist[1] * dist[1] + dist[2] * dist[2]);
		if (d !== 0.0)
		{
			dist[0] /= d;
			dist[1] /= d;
			dist[2] /= d;
		}
		for (; d > 0.0; )
		{
			ent = CL.NewTempEntity();
			ent.origin = [org[0], org[1], org[2]];
			ent.model = b.model;
			ent.angles = [pitch, yaw, Math.random() * 360.0];
			org[0] += dist[0] * 30.0;
			org[1] += dist[1] * 30.0;
			org[2] += dist[2] * 30.0;
			d -= 30.0;
		}
	}
};