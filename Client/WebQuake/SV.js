SV = {};

SV.movetype = {
	none: 0,
	anglenoclip: 1,
	angleclip: 2,
	walk: 3,
	step: 4,
	fly: 5,
	toss: 6,
	push: 7,
	noclip: 8,
	flymissile: 9,
	bounce: 10
};

SV.solid = {
	not: 0,
	trigger: 1,
	bbox: 2,
	slidebox: 3,
	bsp: 4
};

SV.damage = {
	no: 0,
	yes: 1,
	aim: 2
};

SV.fl = {
	fly: 1,
	swim: 2,
	conveyor: 4,
	client: 8,
	inwater: 16,
	monster: 32,
	godmode: 64,
	notarget: 128,
	item: 256,
	onground: 512,
	partialground: 1024,
	waterjump: 2048,
	jumpreleased: 4096
};

// main

SV.server = {
	num_edicts: 0,
	datagram: {data: new ArrayBuffer(1024), cursize: 0},
	reliable_datagram: {data: new ArrayBuffer(1024), cursize: 0},
	signon: {data: new ArrayBuffer(8192), cursize: 0}
};

SV.svs = {};

SV.Init = function()
{
	SV.maxvelocity = Cvar.RegisterVariable('sv_maxvelocity', '2000');
	SV.gravity = Cvar.RegisterVariable('sv_gravity', '800', false, true);
	SV.friction = Cvar.RegisterVariable('sv_friction', '4', false, true);
	SV.edgefriction = Cvar.RegisterVariable('edgefriction', '2');
	SV.stopspeed = Cvar.RegisterVariable('sv_stopspeed', '100');
	SV.maxspeed = Cvar.RegisterVariable('sv_maxspeed', '320', false, true);
	SV.accelerate = Cvar.RegisterVariable('sv_accelerate', '10');
	SV.idealpitchscale = Cvar.RegisterVariable('sv_idealpitchscale', '0.8');
	SV.aim = Cvar.RegisterVariable('sv_aim', '0.93');
	SV.nostep = Cvar.RegisterVariable('sv_nostep', '0');

	SV.nop = {data: new ArrayBuffer(4), cursize: 1};
	(new Uint8Array(SV.nop.data))[0] = Protocol.svc.nop;
	SV.reconnect = {data: new ArrayBuffer(128), cursize: 0};
	MSG.WriteByte(SV.reconnect, Protocol.svc.stufftext);
	MSG.WriteString(SV.reconnect, 'reconnect\n');

	SV.InitBoxHull();
};

SV.StartParticle = function(org, dir, color, count)
{
	var datagram = SV.server.datagram;
	if (datagram.cursize >= 1009)
		return;
	MSG.WriteByte(datagram, Protocol.svc.particle);
	MSG.WriteCoord(datagram, org[0]);
	MSG.WriteCoord(datagram, org[1]);
	MSG.WriteCoord(datagram, org[2]);
	var i, v;
	for (i = 0; i <= 2; ++i)
	{
		v = (dir[i] * 16.0) >> 0;
		if (v > 127)
			v = 127;
		else if (v < -128)
			v = -128;
		MSG.WriteChar(datagram, v);
	}
	MSG.WriteByte(datagram, count);
	MSG.WriteByte(datagram, color);
};

SV.StartSound = function(entity, channel, sample, volume, attenuation)
{
	if ((volume < 0) || (volume > 255))
		Sys.Error('SV.StartSound: volume = ' + volume);
	if ((attenuation < 0.0) || (attenuation > 4.0))
		Sys.Error('SV.StartSound: attenuation = ' + attenuation);
	if ((channel < 0) || (channel > 7))
		Sys.Error('SV.StartSound: channel = ' + channel);

	var datagram = SV.server.datagram;
	if (datagram.cursize >= 1009)
		return;

	var i;
	for (i = 1; i < SV.server.sound_precache.length; ++i)
	{
		if (sample === SV.server.sound_precache[i])
			break;
	}
	if (i >= SV.server.sound_precache.length)
	{
		Con.Print('SV.StartSound: ' + sample + ' not precached\n');
		return;
	}

	var field_mask = 0;
	if (volume !== 255)
		field_mask += 1;
	if (attenuation !== 1.0)
		field_mask += 2;

	MSG.WriteByte(datagram, Protocol.svc.sound);
	MSG.WriteByte(datagram, field_mask);
	if ((field_mask & 1) !== 0)
		MSG.WriteByte(datagram, volume);
	if ((field_mask & 2) !== 0)
		MSG.WriteByte(datagram, Math.floor(attenuation * 64.0));
	MSG.WriteShort(datagram, (entity.num << 3) + channel);
	MSG.WriteByte(datagram, i);
	MSG.WriteCoord(datagram, entity.v_float[PR.entvars.origin] + 0.5 *
		(entity.v_float[PR.entvars.mins] + entity.v_float[PR.entvars.maxs]));
	MSG.WriteCoord(datagram, entity.v_float[PR.entvars.origin1] + 0.5 *
		(entity.v_float[PR.entvars.mins1] + entity.v_float[PR.entvars.maxs1]));
	MSG.WriteCoord(datagram, entity.v_float[PR.entvars.origin2] + 0.5 *
		(entity.v_float[PR.entvars.mins2] + entity.v_float[PR.entvars.maxs2]));
};

SV.SendServerinfo = function(client)
{
	var message = client.message;
	MSG.WriteByte(message, Protocol.svc.print);
	MSG.WriteString(message, '\2\nVERSION 1.09 SERVER (' + PR.crc + ' CRC)');
	MSG.WriteByte(message, Protocol.svc.serverinfo);
	MSG.WriteLong(message, Protocol.version);
	MSG.WriteByte(message, SV.svs.maxclients);
	MSG.WriteByte(message, ((Host.coop.value === 0) && (Host.deathmatch.value !== 0)) ? 1 : 0);
	MSG.WriteString(message, PR.GetString(SV.server.edicts[0].v_int[PR.entvars.message]));
	var i;
	for (i = 1; i < SV.server.model_precache.length; ++i)
		MSG.WriteString(message, SV.server.model_precache[i]);
	MSG.WriteByte(message, 0);
	for (i = 1; i < SV.server.sound_precache.length; ++i)
		MSG.WriteString(message, SV.server.sound_precache[i]);
	MSG.WriteByte(message, 0);
	MSG.WriteByte(message, Protocol.svc.cdtrack);
	MSG.WriteByte(message, SV.server.edicts[0].v_float[PR.entvars.sounds]);
	MSG.WriteByte(message, SV.server.edicts[0].v_float[PR.entvars.sounds]);
	MSG.WriteByte(message, Protocol.svc.setview);
	MSG.WriteShort(message, client.edict.num);
	MSG.WriteByte(message, Protocol.svc.signonnum);
	MSG.WriteByte(message, 1);
	client.sendsignon = true;
	client.spawned = false;
};

SV.ConnectClient = function(clientnum)
{
	var client = SV.svs.clients[clientnum];
	var i, spawn_parms;
	if (SV.server.loadgame === true)
	{
		spawn_parms = [];
		if (client.spawn_parms == null)
		{
			client.spawn_parms = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
				0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
		}
		for (i = 0; i <= 15; ++i)
			spawn_parms[i] = client.spawn_parms[i];
	}
	Con.DPrint('Client ' + client.netconnection.address + ' connected\n');
	client.active = true;
	client.dropasap = false;
	client.last_message = 0.0;
	client.cmd = {forwardmove: 0.0, sidemove: 0.0, upmove: 0.0};
	client.wishdir = [0.0, 0.0, 0.0];
	client.message.cursize = 0;
	client.edict = SV.server.edicts[clientnum + 1];
	client.edict.v_int[PR.entvars.netname] = PR.netnames + (clientnum << 5);
	SV.SetClientName(client, 'unconnected');
	client.colors = 0;
	client.ping_times = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
		0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
	client.num_pings = 0;
	if (SV.server.loadgame !== true)
	{
		client.spawn_parms = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
			0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
	}
	client.old_frags = 0;
	if (SV.server.loadgame === true)
	{
		for (i = 0; i <= 15; ++i)
			client.spawn_parms[i] = spawn_parms[i];
	}
	else
	{
		PR.ExecuteProgram(PR.globals_int[PR.globalvars.SetNewParms]);
		for (i = 0; i <= 15; ++i)
			client.spawn_parms[i] = PR.globals_float[PR.globalvars.parms + i];
	}
	SV.SendServerinfo(client);
};

SV.fatpvs = [];

SV.CheckForNewClients = function()
{
	var ret, i;
	for (;;)
	{
		ret = NET.CheckNewConnections();
		if (ret == null)
			return;
		for (i = 0; i < SV.svs.maxclients; ++i)
		{
			if (SV.svs.clients[i].active !== true)
				break;
		}
		if (i === SV.svs.maxclients)
			Sys.Error('SV.CheckForNewClients: no free clients');
		SV.svs.clients[i].netconnection = ret;
		SV.ConnectClient(i);
		++NET.activeconnections;
	}
};

SV.AddToFatPVS = function(org, node)
{
	var pvs, i, normal, d;
	for (;;)
	{
		if (node.contents < 0)
		{
			if (node.contents !== Mod.contents.solid)
			{
				pvs = Mod.LeafPVS(node, SV.server.worldmodel);
				for (i = 0; i < SV.fatbytes; ++i)
					SV.fatpvs[i] |= pvs[i];
			}
			return;
		}
		normal = node.plane.normal;
		d = org[0] * normal[0] + org[1] * normal[1] + org[2] * normal[2] - node.plane.dist;
		if (d > 8.0)
			node = node.children[0];
		else
		{
			if (d >= -8.0)
				SV.AddToFatPVS(org, node.children[0]);
			node = node.children[1];
		}
	}
};

SV.FatPVS = function(org)
{
	SV.fatbytes = (SV.server.worldmodel.leafs.length + 31) >> 3;
	var i;
	for (i = 0; i < SV.fatbytes; ++i)
		SV.fatpvs[i] = 0;
	SV.AddToFatPVS(org, SV.server.worldmodel.nodes[0]);
};

SV.WriteEntitiesToClient = function(clent, msg)
{
	SV.FatPVS([
		clent.v_float[PR.entvars.origin] + clent.v_float[PR.entvars.view_ofs],
		clent.v_float[PR.entvars.origin1] + clent.v_float[PR.entvars.view_ofs1],
		clent.v_float[PR.entvars.origin2] + clent.v_float[PR.entvars.view_ofs2]
	]);
	var pvs = SV.fatpvs, ent, e, i, bits, miss;
	for (e = 1; e < SV.server.num_edicts; ++e)
	{
		ent = SV.server.edicts[e];
		if (ent !== clent)
		{
			if ((ent.v_float[PR.entvars.modelindex] === 0.0) || (PR.strings[ent.v_int[PR.entvars.model]] === 0))
				continue;
			for (i = 0; i < ent.leafnums.length; ++i)
			{
				if ((pvs[ent.leafnums[i] >> 3] & (1 << (ent.leafnums[i] & 7))) !== 0)
					break;
			}
			if (i === ent.leafnums.length)
				continue;
		}
		if ((msg.data.byteLength - msg.cursize) < 16)
		{
			Con.Print('packet overflow\n');
			return;
		}

		bits = 0;
		for (i = 0; i <= 2; ++i)
		{
			miss = ent.v_float[PR.entvars.origin + i] - ent.baseline.origin[i];
			if ((miss < -0.1) || (miss > 0.1))
				bits += Protocol.u.origin1 << i;
		}
		if (ent.v_float[PR.entvars.angles] !== ent.baseline.angles[0])
			bits += Protocol.u.angle1;
		if (ent.v_float[PR.entvars.angles1] !== ent.baseline.angles[1])
			bits += Protocol.u.angle2;
		if (ent.v_float[PR.entvars.angles2] !== ent.baseline.angles[2])
			bits += Protocol.u.angle3;
		if (ent.v_float[PR.entvars.movetype] === SV.movetype.step)
			bits += Protocol.u.nolerp;
		if (ent.baseline.colormap !== ent.v_float[PR.entvars.colormap])
			bits += Protocol.u.colormap;
		if (ent.baseline.skin !== ent.v_float[PR.entvars.skin])
			bits += Protocol.u.skin;
		if (ent.baseline.frame !== ent.v_float[PR.entvars.frame])
			bits += Protocol.u.frame;
		if (ent.baseline.effects !== ent.v_float[PR.entvars.effects])
			bits += Protocol.u.effects;
		if (ent.baseline.modelindex !== ent.v_float[PR.entvars.modelindex])
			bits += Protocol.u.model;
		if (e >= 256)
			bits += Protocol.u.longentity;
		if (bits >= 256)
			bits += Protocol.u.morebits;

		MSG.WriteByte(msg, bits + Protocol.u.signal);
		if ((bits & Protocol.u.morebits) !== 0)
			MSG.WriteByte(msg, bits >> 8);
		if ((bits & Protocol.u.longentity) !== 0)
			MSG.WriteShort(msg, e);
		else
			MSG.WriteByte(msg, e);
		if ((bits & Protocol.u.model) !== 0)
			MSG.WriteByte(msg, ent.v_float[PR.entvars.modelindex]);
		if ((bits & Protocol.u.frame) !== 0)
			MSG.WriteByte(msg, ent.v_float[PR.entvars.frame]);
		if ((bits & Protocol.u.colormap) !== 0)
			MSG.WriteByte(msg, ent.v_float[PR.entvars.colormap]);
		if ((bits & Protocol.u.skin) !== 0)
			MSG.WriteByte(msg, ent.v_float[PR.entvars.skin]);
		if ((bits & Protocol.u.effects) !== 0)
			MSG.WriteByte(msg, ent.v_float[PR.entvars.effects]);
		if ((bits & Protocol.u.origin1) !== 0)
			MSG.WriteCoord(msg, ent.v_float[PR.entvars.origin]);
		if ((bits & Protocol.u.angle1) !== 0)
			MSG.WriteAngle(msg, ent.v_float[PR.entvars.angles]);
		if ((bits & Protocol.u.origin2) !== 0)
			MSG.WriteCoord(msg, ent.v_float[PR.entvars.origin1]);
		if ((bits & Protocol.u.angle2) !== 0)
			MSG.WriteAngle(msg, ent.v_float[PR.entvars.angles1]);
		if ((bits & Protocol.u.origin3) !== 0)
			MSG.WriteCoord(msg, ent.v_float[PR.entvars.origin2]);
		if ((bits & Protocol.u.angle3) !== 0)
			MSG.WriteAngle(msg, ent.v_float[PR.entvars.angles2]);
	}
};

SV.WriteClientdataToMessage = function(ent, msg)
{
	if ((ent.v_float[PR.entvars.dmg_take] !== 0.0) || (ent.v_float[PR.entvars.dmg_save] !== 0.0))
	{
		var other = SV.server.edicts[ent.v_int[PR.entvars.dmg_inflictor]];
		MSG.WriteByte(msg, Protocol.svc.damage);
		MSG.WriteByte(msg, ent.v_float[PR.entvars.dmg_save]);
		MSG.WriteByte(msg, ent.v_float[PR.entvars.dmg_take]);
		MSG.WriteCoord(msg, other.v_float[PR.entvars.origin] + 0.5 * (other.v_float[PR.entvars.mins] + other.v_float[PR.entvars.maxs]));
		MSG.WriteCoord(msg, other.v_float[PR.entvars.origin1] + 0.5 * (other.v_float[PR.entvars.mins1] + other.v_float[PR.entvars.maxs1]));
		MSG.WriteCoord(msg, other.v_float[PR.entvars.origin2] + 0.5 * (other.v_float[PR.entvars.mins2] + other.v_float[PR.entvars.maxs2]));
		ent.v_float[PR.entvars.dmg_take] = 0.0;
		ent.v_float[PR.entvars.dmg_save] = 0.0;
	}

	SV.SetIdealPitch();

	if (ent.v_float[PR.entvars.fixangle] !== 0.0)
	{
		MSG.WriteByte(msg, Protocol.svc.setangle);
		MSG.WriteAngle(msg, ent.v_float[PR.entvars.angles]);
		MSG.WriteAngle(msg, ent.v_float[PR.entvars.angles1]);
		MSG.WriteAngle(msg, ent.v_float[PR.entvars.angles2]);
		ent.v_float[PR.entvars.fixangle] = 0.0;
	};

	var bits = Protocol.su.items + Protocol.su.weapon;
	if (ent.v_float[PR.entvars.view_ofs2] !== Protocol.default_viewheight)
		bits += Protocol.su.viewheight;
	if (ent.v_float[PR.entvars.idealpitch] !== 0.0)
		bits += Protocol.su.idealpitch;

	var val = PR.entvars.items2, items;
	if (val != null)
	{
		if (ent.v_float[val] !== 0.0)
			items = (ent.v_float[PR.entvars.items] >> 0) + ((ent.v_float[val] << 23) >>> 0);
		else
			items = (ent.v_float[PR.entvars.items] >> 0) + ((PR.globals_float[PR.globalvars.serverflags] << 28) >>> 0);
	}
	else
		items = (ent.v_float[PR.entvars.items] >> 0) + ((PR.globals_float[PR.globalvars.serverflags] << 28) >>> 0);

	if (ent.v_float[PR.entvars.flags] & SV.fl.onground)
		bits += Protocol.su.onground;
	if (ent.v_float[PR.entvars.waterlevel] >= 2.0)
		bits += Protocol.su.inwater;

	if (ent.v_float[PR.entvars.punchangle] !== 0.0)
		bits += Protocol.su.punch1;
	if (ent.v_float[PR.entvars.velocity] !== 0.0)
		bits += Protocol.su.velocity1;
	if (ent.v_float[PR.entvars.punchangle1] !== 0.0)
		bits += Protocol.su.punch2;
	if (ent.v_float[PR.entvars.velocity1] !== 0.0)
		bits += Protocol.su.velocity2;
	if (ent.v_float[PR.entvars.punchangle2] !== 0.0)
		bits += Protocol.su.punch3;
	if (ent.v_float[PR.entvars.velocity2] !== 0.0)
		bits += Protocol.su.velocity3;

	if (ent.v_float[PR.entvars.weaponframe] !== 0.0)
		bits += Protocol.su.weaponframe;
	if (ent.v_float[PR.entvars.armorvalue] !== 0.0)
		bits += Protocol.su.armor;

	MSG.WriteByte(msg, Protocol.svc.clientdata);
	MSG.WriteShort(msg, bits);
	if ((bits & Protocol.su.viewheight) !== 0)
		MSG.WriteChar(msg, ent.v_float[PR.entvars.view_ofs2]);
	if ((bits & Protocol.su.idealpitch) !== 0)
		MSG.WriteChar(msg, ent.v_float[PR.entvars.idealpitch]);

	if ((bits & Protocol.su.punch1) !== 0)
		MSG.WriteChar(msg, ent.v_float[PR.entvars.punchangle]);
	if ((bits & Protocol.su.velocity1) !== 0)
		MSG.WriteChar(msg, ent.v_float[PR.entvars.velocity] * 0.0625);
	if ((bits & Protocol.su.punch2) !== 0)
		MSG.WriteChar(msg, ent.v_float[PR.entvars.punchangle1]);
	if ((bits & Protocol.su.velocity2) !== 0)
		MSG.WriteChar(msg, ent.v_float[PR.entvars.velocity1] * 0.0625);
	if ((bits & Protocol.su.punch3) !== 0)
		MSG.WriteChar(msg, ent.v_float[PR.entvars.punchangle2]);
	if ((bits & Protocol.su.velocity3) !== 0)
		MSG.WriteChar(msg, ent.v_float[PR.entvars.velocity2] * 0.0625);

	MSG.WriteLong(msg, items);
	if ((bits & Protocol.su.weaponframe) !== 0)
		MSG.WriteByte(msg, ent.v_float[PR.entvars.weaponframe]);
	if ((bits & Protocol.su.armor) !== 0)
		MSG.WriteByte(msg, ent.v_float[PR.entvars.armorvalue]);
	MSG.WriteByte(msg, SV.ModelIndex(PR.GetString(ent.v_int[PR.entvars.weaponmodel])));
	MSG.WriteShort(msg, ent.v_float[PR.entvars.health]);
	MSG.WriteByte(msg, ent.v_float[PR.entvars.currentammo]);
	MSG.WriteByte(msg, ent.v_float[PR.entvars.ammo_shells]);
	MSG.WriteByte(msg, ent.v_float[PR.entvars.ammo_nails]);
	MSG.WriteByte(msg, ent.v_float[PR.entvars.ammo_rockets]);
	MSG.WriteByte(msg, ent.v_float[PR.entvars.ammo_cells]);
	if (COM.standard_quake === true)
		MSG.WriteByte(msg, ent.v_float[PR.entvars.weapon]);
	else
	{
		var i, weapon = ent.v_float[PR.entvars.weapon];
		for (i = 0; i <= 31; ++i)
		{
			if ((weapon & (1 << i)) !== 0)
			{
				MSG.WriteByte(msg, i);
				break;
			}
		}
	}
};

SV.clientdatagram = {data: new ArrayBuffer(1024), cursize: 0};
SV.SendClientDatagram = function()
{
	var client = Host.client;
	var msg = SV.clientdatagram;
	msg.cursize = 0;
	MSG.WriteByte(msg, Protocol.svc.time);
	MSG.WriteFloat(msg, SV.server.time);
	SV.WriteClientdataToMessage(client.edict, msg);
	SV.WriteEntitiesToClient(client.edict, msg);
	if ((msg.cursize + SV.server.datagram.cursize) < msg.data.byteLength)
		SZ.Write(msg, new Uint8Array(SV.server.datagram.data), SV.server.datagram.cursize);
	if (NET.SendUnreliableMessage(client.netconnection, msg) === -1)
	{
		Host.DropClient(true);
		return;
	}
	return true;
};

SV.UpdateToReliableMessages = function()
{
	var i, frags, j, client;

	for (i = 0; i < SV.svs.maxclients; ++i)
	{
		Host.client = SV.svs.clients[i];
		Host.client.edict.v_float[PR.entvars.frags] >>= 0;
		frags = Host.client.edict.v_float[PR.entvars.frags];
		if (Host.client.old_frags === frags)
			continue;
		for (j = 0; j < SV.svs.maxclients; ++j)
		{
			client = SV.svs.clients[j];
			if (client.active !== true)
				continue;
			MSG.WriteByte(client.message, Protocol.svc.updatefrags);
			MSG.WriteByte(client.message, i);
			MSG.WriteShort(client.message, frags);
		}
		Host.client.old_frags = frags;
	}

	for (i = 0; i < SV.svs.maxclients; ++i)
	{
		client = SV.svs.clients[i];
		if (client.active === true)
			SZ.Write(client.message, new Uint8Array(SV.server.reliable_datagram.data), SV.server.reliable_datagram.cursize);
	}

	SV.server.reliable_datagram.cursize = 0;
};

SV.SendClientMessages = function()
{
	SV.UpdateToReliableMessages();
	var i, client;
	for (i = 0; i < SV.svs.maxclients; ++i)
	{
		Host.client = client = SV.svs.clients[i];
		if (client.active !== true)
			continue;
		if (client.spawned === true)
		{
			if (SV.SendClientDatagram() !== true)
				continue;
		}
		else if (client.sendsignon !== true)
		{
			if ((Host.realtime - client.last_message) > 5.0)
			{
				if (NET.SendUnreliableMessage(client.netconnection, SV.nop) === -1)
					Host.DropClient(true);
				client.last_message = Host.realtime;
			}
			continue;
		}
		if (client.message.overflowed === true)
		{
			Host.DropClient(true);
			client.message.overflowed = false;
			continue;
		}
		if (client.dropasap === true)
		{
			if (NET.CanSendMessage(client.netconnection) === true)
				Host.DropClient();
		}
		else if (client.message.cursize !== 0)
		{
			if (NET.CanSendMessage(client.netconnection) !== true)
				continue;
			if (NET.SendMessage(client.netconnection, client.message) === -1)
				Host.DropClient(true);
			client.message.cursize = 0;
			client.last_message = Host.realtime;
			client.sendsignon = false;
		}
	}

	for (i = 1; i < SV.server.num_edicts; ++i)
		SV.server.edicts[i].v_float[PR.entvars.effects] &= (~Mod.effects.muzzleflash >>> 0);
};

SV.ModelIndex = function(name)
{
	if (name == null)
		return 0;
	if (name.length === 0)
		return 0;
	var i;
	for (i = 0; i < SV.server.model_precache.length; ++i)
	{
		if (SV.server.model_precache[i] === name)
			return i;
	}
	Sys.Error('SV.ModelIndex: model ' + name + ' not precached');
};

SV.CreateBaseline = function()
{
	var i, svent, baseline;
	var player = SV.ModelIndex('progs/player.mdl');
	var signon = SV.server.signon;
	for (i = 0; i < SV.server.num_edicts; ++i)
	{
		svent = SV.server.edicts[i];
		if (svent.free === true)
			continue;
		if ((i > SV.svs.maxclients) && (svent.v_int[PR.entvars.modelindex] === 0))
			continue;
		baseline = svent.baseline;
		baseline.origin = ED.Vector(svent, PR.entvars.origin);
		baseline.angles = ED.Vector(svent, PR.entvars.angles);
		baseline.frame = svent.v_float[PR.entvars.frame] >> 0;
		baseline.skin = svent.v_float[PR.entvars.skin] >> 0;
		if ((i > 0) && (i <= SV.server.maxclients))
		{
			baseline.colormap = entnum;
			baseline.modelindex = player;
		}
		else
		{
			baseline.colormap = 0;
			baseline.modelindex = SV.ModelIndex(PR.GetString(svent.v_int[PR.entvars.model]));
		}
		MSG.WriteByte(signon, Protocol.svc.spawnbaseline);
		MSG.WriteShort(signon, i);
		MSG.WriteByte(signon, baseline.modelindex);
		MSG.WriteByte(signon, baseline.frame);
		MSG.WriteByte(signon, baseline.colormap);
		MSG.WriteByte(signon, baseline.skin);
		MSG.WriteCoord(signon, baseline.origin[0]);
		MSG.WriteAngle(signon, baseline.angles[0]);
		MSG.WriteCoord(signon, baseline.origin[1]);
		MSG.WriteAngle(signon, baseline.angles[1]);
		MSG.WriteCoord(signon, baseline.origin[2]);
		MSG.WriteAngle(signon, baseline.angles[2]);
	}
};

SV.SaveSpawnparms = function()
{
	SV.svs.serverflags = PR.globals_float[PR.globalvars.serverflags];
	var i, j;
	for (i = 0; i < SV.svs.maxclients; ++i)
	{
		Host.client = SV.svs.clients[i];
		if (Host.client.active !== true)
			continue;
		PR.globals_int[PR.globalvars.self] = Host.client.edict.num;
		PR.ExecuteProgram(PR.globals_int[PR.globalvars.SetChangeParms]);
		for (j = 0; j <= 15; ++j)
			Host.client.spawn_parms[j] = PR.globals_float[PR.globalvars.parms + j];
	}
};

SV.SpawnServer = function(server)
{
	var i;

	if (NET.hostname.string.length === 0)
		Cvar.Set('hostname', 'UNNAMED');

	SCR.centertime_off = 0.0;

	Con.DPrint('SpawnServer: ' + server + '\n');
	SV.svs.changelevel_issued = false;

	if (SV.server.active === true)
	{
		NET.SendToAll(SV.reconnect);
		Cmd.ExecuteString('reconnect\n');
	}

	if (Host.coop.value !== 0)
		Cvar.SetValue('deathmatch', 0);
	Host.current_skill = Math.floor(Host.skill.value + 0.5);
	if (Host.current_skill < 0)
		Host.current_skill = 0;
	else if (Host.current_skill > 3)
		Host.current_skill = 3;
	Cvar.SetValue('skill', Host.current_skill);

	Con.DPrint('Clearing memory\n');
	Mod.ClearAll();

	PR.LoadProgs();

	SV.server.edicts = [];
	var ed;
	for (i = 0; i < Def.max_edicts; ++i)
	{
		ed = {
			num: i,
			free: false,
			area: {},
			leafnums: [],
			baseline: {
				origin: [0.0, 0.0, 0.0],
				angles: [0.0, 0.0, 0.0],
				modelindex: 0,
				frame: 0,
				colormap: 0,
				skin: 0,
				effects: 0
			},
			freetime: 0.0,
			v: new ArrayBuffer(PR.entityfields << 2)
		};
		ed.area.ent = ed;
		ed.v_float = new Float32Array(ed.v);
		ed.v_int = new Int32Array(ed.v);
		SV.server.edicts[i] = ed;
	}

	SV.server.datagram.cursize = 0;
	SV.server.reliable_datagram.cursize = 0;
	SV.server.signon.cursize = 0;
	SV.server.num_edicts = SV.svs.maxclients + 1;
	for (i = 0; i < SV.svs.maxclients; ++i)
		SV.svs.clients[i].edict = SV.server.edicts[i + 1];
	SV.server.loading = true;
	SV.server.paused = false;
	SV.server.loadgame = false;
	SV.server.time = 1.0;
	SV.server.lastcheck = 0;
	SV.server.lastchecktime = 0.0;
	SV.server.modelname = 'maps/' + server + '.bsp';
	SV.server.worldmodel = Mod.ForName(SV.server.modelname);
	if (SV.server.worldmodel == null)
	{
		Con.Print('Couldn\'t spawn server ' + SV.server.modelname + '\n');
		SV.server.active = false;
		return;
	}
	SV.server.models = [];
	SV.server.models[1] = SV.server.worldmodel;

	SV.areanodes = [];
	SV.CreateAreaNode(0, SV.server.worldmodel.mins, SV.server.worldmodel.maxs);

	SV.server.sound_precache = [''];
	SV.server.model_precache = ['', SV.server.modelname];
	for (i = 1; i <= SV.server.worldmodel.submodels.length; ++i)
	{
		SV.server.model_precache[i + 1] = '*' + i;
		SV.server.models[i + 1] = Mod.ForName('*' + i);
	}

	SV.server.lightstyles = [];
	for (i = 0; i <= 63; ++i)
		SV.server.lightstyles[i] = '';

	var ent = SV.server.edicts[0];
	ent.v_int[PR.entvars.model] = PR.NewString(SV.server.modelname, 64);
	ent.v_float[PR.entvars.modelindex] = 1.0;
	ent.v_float[PR.entvars.solid] = SV.solid.bsp;
	ent.v_float[PR.entvars.movetype] = SV.movetype.push;

	if (Host.coop.value !== 0)
		PR.globals_float[PR.globalvars.coop] = Host.coop.value;
	else
		PR.globals_float[PR.globalvars.deathmatch] = Host.deathmatch.value;

	PR.globals_int[PR.globalvars.mapname] = PR.NewString(server, 64);
	PR.globals_float[PR.globalvars.serverflags] = SV.svs.serverflags;
	ED.LoadFromFile(SV.server.worldmodel.entities);
	SV.server.active = true;
	SV.server.loading = false;
	Host.frametime = 0.1;
	SV.Physics();
	SV.Physics();
	SV.CreateBaseline();
	for (i = 0; i < SV.svs.maxclients; ++i)
	{
		Host.client = SV.svs.clients[i];
		if (Host.client.active !== true)
			continue;
		Host.client.edict.v_int[PR.entvars.netname] = PR.netnames + (i << 5);
		SV.SendServerinfo(Host.client);
	}
	Con.DPrint('Server spawned.\n');
};

SV.GetClientName = function(client)
{
	return PR.GetString(PR.netnames + (client.num << 5));
};

SV.SetClientName = function(client, name)
{
	var ofs = PR.netnames + (client.num << 5), i;
	for (i = 0; i < name.length; ++i)
		PR.strings[ofs + i] = name.charCodeAt(i);
	PR.strings[ofs + i] = 0;
};

// move

SV.CheckBottom = function(ent)
{
	var mins = [
		ent.v_float[PR.entvars.origin] + ent.v_float[PR.entvars.mins],
		ent.v_float[PR.entvars.origin1] + ent.v_float[PR.entvars.mins1],
		ent.v_float[PR.entvars.origin2] + ent.v_float[PR.entvars.mins2]
	];
	var maxs = [
		ent.v_float[PR.entvars.origin] + ent.v_float[PR.entvars.maxs],
		ent.v_float[PR.entvars.origin1] + ent.v_float[PR.entvars.maxs1],
		ent.v_float[PR.entvars.origin2] + ent.v_float[PR.entvars.maxs2]
	];
	for (;;)
	{
		if (SV.PointContents([mins[0], mins[1], mins[2] - 1.0]) !== Mod.contents.solid)
			break;
		if (SV.PointContents([mins[0], maxs[1], mins[2] - 1.0]) !== Mod.contents.solid)
			break;
		if (SV.PointContents([maxs[0], mins[1], mins[2] - 1.0]) !== Mod.contents.solid)
			break;
		if (SV.PointContents([maxs[0], maxs[1], mins[2] - 1.0]) !== Mod.contents.solid)
			break;
		return true;
	}
	var start = [(mins[0] + maxs[0]) * 0.5, (mins[1] + maxs[1]) * 0.5, mins[2]];
	var stop = [start[0], start[1], start[2] - 36.0];
	var trace = SV.Move(start, Vec.origin, Vec.origin, stop, 1, ent);
	if (trace.fraction === 1.0)
		return;
	var mid, bottom;
	mid = bottom = trace.endpos[2];
	var x, y;
	for (x = 0; x <= 1; ++x)
	{
		for (y = 0; y <= 1; ++y)
		{
			start[0] = stop[0] = (x !== 0) ? maxs[0] : mins[0];
			start[1] = stop[1] = (y !== 0) ? maxs[1] : mins[1];
			trace = SV.Move(start, Vec.origin, Vec.origin, stop, 1, ent);
			if ((trace.fraction !== 1.0) && (trace.endpos[2] > bottom))
				bottom = trace.endpos[2];
			if ((trace.fraction === 1.0) || ((mid - trace.endpos[2]) > 18.0))
				return;
		}
	}
	return true;
};

SV.movestep = function(ent, move, relink)
{
	var oldorg = ED.Vector(ent, PR.entvars.origin);
	var neworg = [];
	var mins = ED.Vector(ent, PR.entvars.mins), maxs = ED.Vector(ent, PR.entvars.maxs);
	var trace;
	if ((ent.v_float[PR.entvars.flags] & (SV.fl.swim + SV.fl.fly)) !== 0)
	{
		var i, enemy = ent.v_int[PR.entvars.enemy], dz;
		for (i = 0; i <= 1; ++i)
		{
			neworg[0] = ent.v_float[PR.entvars.origin] + move[0];
			neworg[1] = ent.v_float[PR.entvars.origin1] + move[1];
			neworg[2] = ent.v_float[PR.entvars.origin2];
			if ((i === 0) && (enemy !== 0))
			{
				dz = ent.v_float[PR.entvars.origin2] - SV.server.edicts[enemy].v_float[PR.entvars.origin2];
				if (dz > 40.0)
					neworg[2] -= 8.0;
				else if (dz < 30.0)
					neworg[2] += 8.0;
			}
			trace = SV.Move(ED.Vector(ent, PR.entvars.origin), mins, maxs, neworg, 0, ent);
			if (trace.fraction === 1.0)
			{
				if (((ent.v_float[PR.entvars.flags] & SV.fl.swim) !== 0) && (SV.PointContents(trace.endpos) === Mod.contents.empty))
					return 0;
				ent.v_float[PR.entvars.origin] = trace.endpos[0];
				ent.v_float[PR.entvars.origin1] = trace.endpos[1];
				ent.v_float[PR.entvars.origin2] = trace.endpos[2];
				if (relink === true)
					SV.LinkEdict(ent, true);
				return 1;
			}
			if (enemy === 0)
				return 0;
		}
		return 0;
	}
	neworg[0] = ent.v_float[PR.entvars.origin] + move[0];
	neworg[1] = ent.v_float[PR.entvars.origin1] + move[1];
	neworg[2] = ent.v_float[PR.entvars.origin2] + 18.0;
	var end = [neworg[0], neworg[1], neworg[2] - 36.0];
	trace = SV.Move(neworg, mins, maxs, end, 0, ent);
	if (trace.allsolid === true)
		return 0;
	if (trace.startsolid === true)
	{
		neworg[2] -= 18.0;
		trace = SV.Move(neworg, mins, maxs, end, 0, ent);
		if ((trace.allsolid === true) || (trace.startsolid === true))
			return 0;
	}
	if (trace.fraction === 1.0)
	{
		if ((ent.v_float[PR.entvars.flags] & SV.fl.partialground) === 0)
			return 0;
		ent.v_float[PR.entvars.origin] += move[0];
		ent.v_float[PR.entvars.origin1] += move[1];
		if (relink === true)
			SV.LinkEdict(ent, true);
		ent.v_float[PR.entvars.flags] &= (~SV.fl.onground >>> 0);
		return 1;
	}
	ent.v_float[PR.entvars.origin] = trace.endpos[0];
	ent.v_float[PR.entvars.origin1] = trace.endpos[1];
	ent.v_float[PR.entvars.origin2] = trace.endpos[2];
	if (SV.CheckBottom(ent) !== true)
	{
		if ((ent.v_float[PR.entvars.flags] & SV.fl.partialground) !== 0)
		{
			if (relink === true)
				SV.LinkEdict(ent, true);
			return 1;
		}
		ent.v_float[PR.entvars.origin] = oldorg[0];
		ent.v_float[PR.entvars.origin1] = oldorg[1];
		ent.v_float[PR.entvars.origin2] = oldorg[2];
		return 0;
	}
	ent.v_float[PR.entvars.flags] &= (~SV.fl.partialground >>> 0);
	ent.v_int[PR.entvars.groundentity] = trace.ent.num;
	if (relink === true)
		SV.LinkEdict(ent, true);
	return 1;
};

SV.StepDirection = function(ent, yaw, dist)
{
	ent.v_float[PR.entvars.ideal_yaw] = yaw;
	PF.changeyaw();
	yaw *= Math.PI / 180.0;
	var oldorigin = ED.Vector(ent, PR.entvars.origin);
	if (SV.movestep(ent, [Math.cos(yaw) * dist, Math.sin(yaw) * dist], false) === 1)
	{
		var delta = ent.v_float[PR.entvars.angles1] - ent.v_float[PR.entvars.ideal_yaw];
		if ((delta > 45.0) && (delta < 315.0))
			ED.SetVector(ent, PR.entvars.origin, oldorigin);
		SV.LinkEdict(ent, true);
		return true;
	}
	SV.LinkEdict(ent, true);
};

SV.NewChaseDir = function(actor, enemy, dist)
{
	var olddir = Vec.Anglemod(((actor.v_float[PR.entvars.ideal_yaw] / 45.0) >> 0) * 45.0);
	var turnaround = Vec.Anglemod(olddir - 180.0);
	var deltax = enemy.v_float[PR.entvars.origin] - actor.v_float[PR.entvars.origin];
	var deltay = enemy.v_float[PR.entvars.origin1] - actor.v_float[PR.entvars.origin1];
	var dx, dy;
	if (deltax > 10.0)
		dx = 0.0;
	else if (deltax < -10.0)
		dx = 180.0;
	else
		dx = -1;
	if (deltay < -10.0)
		dy = 270.0;
	else if (deltay > 10.0)
		dy = 90.0;
	else
		dy = -1;
	var tdir;
	if ((dx !== -1) && (dy !== -1))
	{
		if (dx === 0.0)
			tdir = (dy === 90.0) ? 45.0 : 315.0;
		else
			tdir = (dy === 90.0) ? 135.0 : 215.0;
		if ((tdir !== turnaround) && (SV.StepDirection(actor, tdir, dist) === true))
			return;
	}
	if ((Math.random() >= 0.25) || (Math.abs(deltay) > Math.abs(deltax)))
	{
		tdir = dx;
		dx = dy;
		dy = tdir;
	}
	if ((dx !== -1) && (dx !== turnaround) && (SV.StepDirection(actor, dx, dist) === true))
		return;
	if ((dy !== -1) && (dy !== turnaround) && (SV.StepDirection(actor, dy, dist) === true))
		return;
	if ((olddir !== -1) && (SV.StepDirection(actor, olddir, dist) === true))
		return;
	if (Math.random() >= 0.5)
	{
		for (tdir = 0.0; tdir <= 315.0; tdir += 45.0)
		{
			if ((tdir !== turnaround) && (SV.StepDirection(actor, tdir, dist) === true))
				return;
		}
	}
	else
	{
		for (tdir = 315.0; tdir >= 0.0; tdir -= 45.0)
		{
			if ((tdir !== turnaround) && (SV.StepDirection(actor, tdir, dist) === true))
				return;
		}
	}
	if ((turnaround !== -1) && (SV.StepDirection(actor, turnaround, dist) === true))
		return;
	actor.v_float[PR.entvars.ideal_yaw] = olddir;
	if (SV.CheckBottom(actor) !== true)
		actor.v_float[PR.entvars.flags] |= SV.fl.partialground;
};

SV.CloseEnough = function(ent, goal, dist)
{
	var i;
	for (i = 0; i <= 2; ++i)
	{
		if (goal.v_float[PR.entvars.absmin + i] > (ent.v_float[PR.entvars.absmax + i] + dist))
			return;
		if (goal.v_float[PR.entvars.absmax + i] < (ent.v_float[PR.entvars.absmin + i] - dist))
			return;
	}
	return true;
};

// phys

SV.CheckAllEnts = function()
{
	var e, check, movetype;
	for (e = 1; e < SV.server.num_edicts; ++e)
	{
		check = SV.server.edicts[e];
		if (check.free === true)
			continue;
		switch (check.v_float[PR.entvars.movetype])
		{
		case SV.movetype.push:
		case SV.movetype.none:
		case SV.movetype.noclip:
			continue;
		}
		if (SV.TestEntityPosition(check) === true)
			Con.Print('entity in invalid position\n');
	}
};

SV.CheckVelocity = function(ent)
{
	var i, velocity;
	for (i = 0; i <= 2; ++i)
	{
		velocity = ent.v_float[PR.entvars.velocity + i];
		if (Q.isNaN(velocity) === true)
		{
			Con.Print('Got a NaN velocity on ' + PR.GetString(ent.v_int[PR.entvars.classname]) + '\n');
			velocity = 0.0;
		}
		if (Q.isNaN(ent.v_float[PR.entvars.origin + i]) === true)
		{
			Con.Print('Got a NaN origin on ' + PR.GetString(ent.v_int[PR.entvars.classname]) + '\n');
			ent.v_float[PR.entvars.origin + i] = 0.0;
		}
		if (velocity > SV.maxvelocity.value)
			velocity = SV.maxvelocity.value;
		else if (velocity < -SV.maxvelocity.value)
			velocity = -SV.maxvelocity.value;
		ent.v_float[PR.entvars.velocity + i] = velocity;
	}
};

SV.RunThink = function(ent)
{
	var thinktime = ent.v_float[PR.entvars.nextthink];
	if ((thinktime <= 0.0) || (thinktime > (SV.server.time + Host.frametime)))
		return true;
	if (thinktime < SV.server.time)
		thinktime = SV.server.time;
	ent.v_float[PR.entvars.nextthink] = 0.0;
	PR.globals_float[PR.globalvars.time] = thinktime;
	PR.globals_int[PR.globalvars.self] = ent.num;
	PR.globals_int[PR.globalvars.other] = 0;
	PR.ExecuteProgram(ent.v_int[PR.entvars.think]);
	return (ent.free !== true);
};

SV.Impact = function(e1, e2)
{
	var old_self = PR.globals_int[PR.globalvars.self];
	var old_other = PR.globals_int[PR.globalvars.other];
	PR.globals_float[PR.globalvars.time] = SV.server.time;

	if ((e1.v_int[PR.entvars.touch] !== 0) && (e1.v_float[PR.entvars.solid] !== SV.solid.not))
	{
		PR.globals_int[PR.globalvars.self] = e1.num;
		PR.globals_int[PR.globalvars.other] = e2.num;
		PR.ExecuteProgram(e1.v_int[PR.entvars.touch]);
	}
	if ((e2.v_int[PR.entvars.touch] !== 0) && (e2.v_float[PR.entvars.solid] !== SV.solid.not))
	{
		PR.globals_int[PR.globalvars.self] = e2.num;
		PR.globals_int[PR.globalvars.other] = e1.num;
		PR.ExecuteProgram(e2.v_int[PR.entvars.touch]);
	}

	PR.globals_int[PR.globalvars.self] = old_self;
	PR.globals_int[PR.globalvars.other] = old_other;
};

SV.ClipVelocity = function(vec, normal, out, overbounce)
{
	var backoff = (vec[0] * normal[0] + vec[1] * normal[1] + vec[2] * normal[2]) * overbounce;

	out[0] = vec[0] - normal[0] * backoff;
	if ((out[0] > -0.1) && (out[0] < 0.1))
		out[0] = 0.0;
	out[1] = vec[1] - normal[1] * backoff;
	if ((out[1] > -0.1) && (out[1] < 0.1))
		out[1] = 0.0;
	out[2] = vec[2] - normal[2] * backoff;
	if ((out[2] > -0.1) && (out[2] < 0.1))
		out[2] = 0.0;
};

SV.FlyMove = function(ent, time)
{
	var bumpcount;
	var numplanes = 0;
	var dir, d;
	var planes = [], plane;
	var primal_velocity = ED.Vector(ent, PR.entvars.velocity);
	var original_velocity = ED.Vector(ent, PR.entvars.velocity);
	var new_velocity = [];
	var i, j;
	var trace;
	var end = [];
	var time_left = time;
	var blocked = 0;
	for (bumpcount = 0; bumpcount <= 3; ++bumpcount)
	{
		if ((ent.v_float[PR.entvars.velocity] === 0.0) &&
			(ent.v_float[PR.entvars.velocity1] === 0.0) &&
			(ent.v_float[PR.entvars.velocity2] === 0.0))
			break;
		end[0] = ent.v_float[PR.entvars.origin] + time_left * ent.v_float[PR.entvars.velocity];
		end[1] = ent.v_float[PR.entvars.origin1] + time_left * ent.v_float[PR.entvars.velocity1];
		end[2] = ent.v_float[PR.entvars.origin2] + time_left * ent.v_float[PR.entvars.velocity2];
		trace = SV.Move(ED.Vector(ent, PR.entvars.origin), ED.Vector(ent, PR.entvars.mins), ED.Vector(ent, PR.entvars.maxs), end, 0, ent);
		if (trace.allsolid === true)
		{
			ED.SetVector(ent, PR.entvars.velocity, Vec.origin);
			return 3;
		}
		if (trace.fraction > 0.0)
		{
			ED.SetVector(ent, PR.entvars.origin, trace.endpos);
			original_velocity = ED.Vector(ent, PR.entvars.velocity);
			numplanes = 0;
			if (trace.fraction === 1.0)
				break;
		}
		if (trace.ent == null)
			Sys.Error('SV.FlyMove: !trace.ent');
		if (trace.plane.normal[2] > 0.7)
		{
			blocked |= 1;
			if (trace.ent.v_float[PR.entvars.solid] === SV.solid.bsp)
			{
				ent.v_float[PR.entvars.flags] |= SV.fl.onground;
				ent.v_int[PR.entvars.groundentity] = trace.ent.num;
			}
		}
		else if (trace.plane.normal[2] === 0.0)
		{
			blocked |= 2;
			SV.steptrace = trace;
		}
		SV.Impact(ent, trace.ent);
		if (ent.free === true)
			break;
		time_left -= time_left * trace.fraction;
		if (numplanes >= 5)
		{
			ED.SetVector(ent, PR.entvars.velocity, Vec.origin);
			return 3;
		}
		planes[numplanes++] = [trace.plane.normal[0], trace.plane.normal[1], trace.plane.normal[2]];
		for (i = 0; i < numplanes; ++i)
		{
			SV.ClipVelocity(original_velocity, planes[i], new_velocity, 1.0);
			for (j = 0; j < numplanes; ++j)
			{
				if (j !== i)
				{
					plane = planes[j];
					if ((new_velocity[0] * plane[0] + new_velocity[1] * plane[1] + new_velocity[2] * plane[2]) < 0.0)
						break;
				}
			}
			if (j === numplanes)
				break;
		}
		if (i !== numplanes)
			ED.SetVector(ent, PR.entvars.velocity, new_velocity);
		else
		{
			if (numplanes !== 2)
			{
				ED.SetVector(ent, PR.entvars.velocity, Vec.origin);
				return 7;
			}
			dir = Vec.CrossProduct(planes[0], planes[1]);
			d = dir[0] * ent.v_float[PR.entvars.velocity] +
				dir[1] * ent.v_float[PR.entvars.velocity1] +
				dir[2] * ent.v_float[PR.entvars.velocity2];
			ent.v_float[PR.entvars.velocity] = dir[0] * d;
			ent.v_float[PR.entvars.velocity1] = dir[1] * d;
			ent.v_float[PR.entvars.velocity2] = dir[2] * d;
		}
		if ((ent.v_float[PR.entvars.velocity] * primal_velocity[0] +
			ent.v_float[PR.entvars.velocity1] * primal_velocity[1] +
			ent.v_float[PR.entvars.velocity2] * primal_velocity[2]) <= 0.0)
		{
			ED.SetVector(ent, PR.entvars.velocity, Vec.origin);
			return blocked;
		}
	}
	return blocked;
};

SV.AddGravity = function(ent)
{
	var val = PR.entvars.gravity, ent_gravity;
	if (val != null)
		ent_gravity = (ent.v_float[val] !== 0.0) ? ent.v_float[val] : 1.0;
	else
		ent_gravity = 1.0;
	ent.v_float[PR.entvars.velocity2] -= ent_gravity * SV.gravity.value * Host.frametime;
};

SV.PushEntity = function(ent, push)
{
	var end = [
		ent.v_float[PR.entvars.origin] + push[0],
		ent.v_float[PR.entvars.origin1] + push[1],
		ent.v_float[PR.entvars.origin2] + push[2]
	];
	var nomonsters;
	var solid = ent.v_float[PR.entvars.solid];
	if (ent.v_float[PR.entvars.movetype] === SV.movetype.flymissile)
		nomonsters = SV.move.missile;
	else if ((solid === SV.solid.trigger) || (solid === SV.solid.not))
		nomonsters = SV.move.nomonsters
	else
		nomonsters = SV.move.normal;
	var trace = SV.Move(ED.Vector(ent, PR.entvars.origin), ED.Vector(ent, PR.entvars.mins),
		ED.Vector(ent, PR.entvars.maxs), end, nomonsters, ent);
	ED.SetVector(ent, PR.entvars.origin, trace.endpos);
	SV.LinkEdict(ent, true);
	if (trace.ent != null)
		SV.Impact(ent, trace.ent);
	return trace;
};

SV.PushMove = function(pusher, movetime)
{
	if ((pusher.v_float[PR.entvars.velocity] === 0.0) &&
		(pusher.v_float[PR.entvars.velocity1] === 0.0) &&
		(pusher.v_float[PR.entvars.velocity2] === 0.0))
	{
		pusher.v_float[PR.entvars.ltime] += movetime;
		return;
	}
	var move = [
		pusher.v_float[PR.entvars.velocity] * movetime,
		pusher.v_float[PR.entvars.velocity1] * movetime,
		pusher.v_float[PR.entvars.velocity2] * movetime
	];
	var mins = [
		pusher.v_float[PR.entvars.absmin] + move[0],
		pusher.v_float[PR.entvars.absmin1] + move[1],
		pusher.v_float[PR.entvars.absmin2] + move[2]
	];
	var maxs = [
		pusher.v_float[PR.entvars.absmax] + move[0],
		pusher.v_float[PR.entvars.absmax1] + move[1],
		pusher.v_float[PR.entvars.absmax2] + move[2]
	];
	var pushorig = ED.Vector(pusher, PR.entvars.origin);
	pusher.v_float[PR.entvars.origin] += move[0];
	pusher.v_float[PR.entvars.origin1] += move[1];
	pusher.v_float[PR.entvars.origin2] += move[2];
	pusher.v_float[PR.entvars.ltime] += movetime;
	SV.LinkEdict(pusher);
	var e, check, movetype;
	var entorig, moved = [], moved_edict, i;
	for (e = 1; e < SV.server.num_edicts; ++e)
	{
		check = SV.server.edicts[e];
		if (check.free === true)
			continue;
		movetype = check.v_float[PR.entvars.movetype];
		if ((movetype === SV.movetype.push)
			|| (movetype === SV.movetype.none)
			|| (movetype === SV.movetype.noclip))
			continue;
		if (((check.v_float[PR.entvars.flags] & SV.fl.onground) === 0) ||
			(check.v_int[PR.entvars.groundentity] !== pusher.num))
		{
			if ((check.v_float[PR.entvars.absmin] >= maxs[0])
				|| (check.v_float[PR.entvars.absmin1] >= maxs[1])
				|| (check.v_float[PR.entvars.absmin2] >= maxs[2])
				|| (check.v_float[PR.entvars.absmax] <= mins[0])
				|| (check.v_float[PR.entvars.absmax1] <= mins[1])
				|| (check.v_float[PR.entvars.absmax2] <= mins[2]))
				continue;
			if (SV.TestEntityPosition(check) !== true)
				continue;
		}
		if (movetype !== SV.movetype.walk)
			check.v_float[PR.entvars.flags] &= (~SV.fl.onground) >>> 0;
		entorig = ED.Vector(check, PR.entvars.origin);
		moved[moved.length] = [entorig[0], entorig[1], entorig[2], check];
		pusher.v_float[PR.entvars.solid] = SV.solid.not;
		SV.PushEntity(check, move);
		pusher.v_float[PR.entvars.solid] = SV.solid.bsp;
		if (SV.TestEntityPosition(check) === true)
		{
			if (check.v_float[PR.entvars.mins] === check.v_float[PR.entvars.maxs])
				continue;
			if ((check.v_float[PR.entvars.solid] === SV.solid.not) || (check.v_float[PR.entvars.solid] === SV.solid.trigger))
			{
				check.v_float[PR.entvars.mins] = check.v_float[PR.entvars.maxs] = 0.0;
				check.v_float[PR.entvars.mins1] = check.v_float[PR.entvars.maxs1] = 0.0;
				check.v_float[PR.entvars.maxs2] = check.v_float[PR.entvars.mins2];
				continue;
			}
			check.v_float[PR.entvars.origin] = entorig[0];
			check.v_float[PR.entvars.origin1] = entorig[1];
			check.v_float[PR.entvars.origin2] = entorig[2];
			SV.LinkEdict(check, true);
			pusher.v_float[PR.entvars.origin] = pushorig[0];
			pusher.v_float[PR.entvars.origin1] = pushorig[1];
			pusher.v_float[PR.entvars.origin2] = pushorig[2];
			SV.LinkEdict(pusher);
			pusher.v_float[PR.entvars.ltime] -= movetime;
			if (pusher.v_int[PR.entvars.blocked] !== 0)
			{
				PR.globals_int[PR.globalvars.self] = pusher.num;
				PR.globals_int[PR.globalvars.other] = check.num;
				PR.ExecuteProgram(pusher.v_int[PR.entvars.blocked]);
			}
			for (i = 0; i < moved.length; ++i)
			{
				moved_edict = moved[i];
				moved_edict[3].v_float[PR.entvars.origin] = moved_edict[0];
				moved_edict[3].v_float[PR.entvars.origin1] = moved_edict[1];
				moved_edict[3].v_float[PR.entvars.origin2] = moved_edict[2];
				SV.LinkEdict(moved_edict[3]);
			}
			return;
		}
	}
};

SV.Physics_Pusher = function(ent)
{
	var oldltime = ent.v_float[PR.entvars.ltime];
	var thinktime = ent.v_float[PR.entvars.nextthink];
	var movetime;
	if (thinktime < (oldltime + Host.frametime))
	{
		movetime = thinktime - oldltime;
		if (movetime < 0.0)
			movetime = 0.0;
	}
	else
		movetime = Host.frametime;
	if (movetime !== 0.0)
		SV.PushMove(ent, movetime);
	if ((thinktime <= oldltime) || (thinktime > ent.v_float[PR.entvars.ltime]))
		return;
	ent.v_float[PR.entvars.nextthink] = 0.0;
	PR.globals_float[PR.globalvars.time] = SV.server.time;
	PR.globals_int[PR.globalvars.self] = ent.num;
	PR.globals_int[PR.globalvars.other] = 0;
	PR.ExecuteProgram(ent.v_int[PR.entvars.think]);
};

SV.CheckStuck = function(ent)
{
	if (SV.TestEntityPosition(ent) !== true)
	{
		ent.v_float[PR.entvars.oldorigin] = ent.v_float[PR.entvars.origin];
		ent.v_float[PR.entvars.oldorigin1] = ent.v_float[PR.entvars.origin1];
		ent.v_float[PR.entvars.oldorigin2] = ent.v_float[PR.entvars.origin2];
		return;
	}
	var org = ED.Vector(ent, PR.entvars.origin);
	ent.v_float[PR.entvars.origin] = ent.v_float[PR.entvars.oldorigin];
	ent.v_float[PR.entvars.origin1] = ent.v_float[PR.entvars.oldorigin1];
	ent.v_float[PR.entvars.origin2] = ent.v_float[PR.entvars.oldorigin2];
	if (SV.TestEntityPosition(ent) !== true)
	{
		Con.DPrint('Unstuck.\n');
		SV.LinkEdict(ent, true);
		return;
	}
	var z, i, j;
	for (z = 0.0; z <= 17.0; ++z)
	{
		for (i = -1.0; i <= 1.0; ++i)
		{
			for (j = -1.0; j <= 1.0; ++j)
			{
				ent.v_float[PR.entvars.origin] = org[0] + i;
				ent.v_float[PR.entvars.origin1] = org[1] + j;
				ent.v_float[PR.entvars.origin2] = org[2] + z;
				if (SV.TestEntityPosition(ent) !== true)
				{
					Con.DPrint('Unstuck.\n');
					SV.LinkEdict(ent, true);
					return;
				}
			}
		}
	}
	ED.SetVector(ent, PR.entvars.origin, org);
	Con.DPrint('player is stuck.\n');
};

SV.CheckWater = function(ent)
{
	var point = [
		ent.v_float[PR.entvars.origin],
		ent.v_float[PR.entvars.origin1],
		ent.v_float[PR.entvars.origin2] + ent.v_float[PR.entvars.mins2] + 1.0
	];
	ent.v_float[PR.entvars.waterlevel] = 0.0;
	ent.v_float[PR.entvars.watertype] = Mod.contents.empty;
	var cont = SV.PointContents(point);
	if (cont > Mod.contents.water)
		return;
	ent.v_float[PR.entvars.watertype] = cont;
	ent.v_float[PR.entvars.waterlevel] = 1.0;
	point[2] = ent.v_float[PR.entvars.origin2] + (ent.v_float[PR.entvars.mins2] + ent.v_float[PR.entvars.maxs2]) * 0.5;
	cont = SV.PointContents(point);
	if (cont <= Mod.contents.water)
	{
		ent.v_float[PR.entvars.waterlevel] = 2.0;
		point[2] = ent.v_float[PR.entvars.origin2] + ent.v_float[PR.entvars.view_ofs2];
		cont = SV.PointContents(point);
		if (cont <= Mod.contents.water)
			ent.v_float[PR.entvars.waterlevel] = 3.0;
	}
	return ent.v_float[PR.entvars.waterlevel] > 1.0;
};

SV.WallFriction = function(ent, trace)
{
	var forward = [];
	Vec.AngleVectors(ED.Vector(ent, PR.entvars.v_angle), forward);
	var normal = trace.plane.normal;
	var d = normal[0] * forward[0] + normal[1] * forward[1] + normal[2] * forward[2] + 0.5;
	if (d >= 0.0)
		return;
	d += 1.0;
	var i = normal[0] * ent.v_float[PR.entvars.velocity]
		+ normal[1] * ent.v_float[PR.entvars.velocity1]
		+ normal[2] * ent.v_float[PR.entvars.velocity2];
	ent.v_float[PR.entvars.velocity] = (ent.v_float[PR.entvars.velocity] - normal[0] * i) * d; 
	ent.v_float[PR.entvars.velocity1] = (ent.v_float[PR.entvars.velocity1] - normal[1] * i) * d; 
};

SV.TryUnstick = function(ent, oldvel)
{
	var oldorg = ED.Vector(ent, PR.entvars.origin);
	var dir = [2.0, 0.0, 0.0];
	var i, clip;
	for (i = 0; i <= 7; ++i)
	{
		switch (i)
		{
		case 1: dir[0] = 0.0; dir[1] = 2.0; break;
		case 2: dir[0] = -2.0; dir[1] = 0.0; break;
		case 3: dir[0] = 0.0; dir[1] = -2.0; break;
		case 4: dir[0] = 2.0; dir[1] = 2.0; break;
		case 5: dir[0] = -2.0; dir[1] = 2.0; break;
		case 6: dir[0] = 2.0; dir[1] = -2.0; break;
		case 7: dir[0] = -2.0; dir[1] = -2.0;
		}
		SV.PushEntity(ent, dir);
		ent.v_float[PR.entvars.velocity] = oldvel[0];
		ent.v_float[PR.entvars.velocity1] = oldvel[1];
		ent.v_float[PR.entvars.velocity2] = 0.0;
		clip = SV.FlyMove(ent, 0.1);
		if ((Math.abs(oldorg[1] - ent.v_float[PR.entvars.origin1]) > 4.0)
			|| (Math.abs(oldorg[0] - ent.v_float[PR.entvars.origin]) > 4.0))
			return clip;
		ED.SetVector(ent, PR.entvars.origin, oldorg);
	}
	ED.SetVector(ent, PR.entvars.velocity, Vec.origin);
	return 7;
};

SV.WalkMove = function(ent)
{
	var oldonground = ent.v_float[PR.entvars.flags] & SV.fl.onground;
	ent.v_float[PR.entvars.flags] ^= oldonground;
	var oldorg = ED.Vector(ent, PR.entvars.origin);
	var oldvel = ED.Vector(ent, PR.entvars.velocity);
	var clip = SV.FlyMove(ent, Host.frametime);
	if ((clip & 2) === 0)
		return;
	if ((oldonground === 0) && (ent.v_float[PR.entvars.waterlevel] === 0.0))
		return;
	if (ent.v_float[PR.entvars.movetype] !== SV.movetype.walk)
		return;
	if (SV.nostep.value !== 0)
		return;
	if ((SV.player.v_float[PR.entvars.flags] & SV.fl.waterjump) !== 0)
		return;
	var nosteporg = ED.Vector(ent, PR.entvars.origin);
	var nostepvel = ED.Vector(ent, PR.entvars.velocity);
	ED.SetVector(ent, PR.entvars.origin, oldorg);
	SV.PushEntity(ent, [0.0, 0.0, 18.0]);
	ent.v_float[PR.entvars.velocity] = oldvel[0];
	ent.v_float[PR.entvars.velocity1] = oldvel[1];
	ent.v_float[PR.entvars.velocity2] = 0.0;
	clip = SV.FlyMove(ent, Host.frametime);
	if (clip !== 0)
	{
		if ((Math.abs(oldorg[1] - ent.v_float[PR.entvars.origin1]) < 0.03125)
			&& (Math.abs(oldorg[0] - ent.v_float[PR.entvars.origin]) < 0.03125))
			clip = SV.TryUnstick(ent, oldvel);
		if ((clip & 2) !== 0)
			SV.WallFriction(ent, SV.steptrace);
	}
	var downtrace = SV.PushEntity(ent, [0.0, 0.0, oldvel[2] * Host.frametime - 18.0]);
	if (downtrace.plane.normal[2] > 0.7)
	{
		if (ent.v_float[PR.entvars.solid] === SV.solid.bsp)
		{
			ent.v_float[PR.entvars.flags] |= SV.fl.onground;
			ent.v_int[PR.entvars.groundentity] = downtrace.ent.num;
		}
		return;
	}
	ED.SetVector(ent, PR.entvars.origin, nosteporg);
	ED.SetVector(ent, PR.entvars.velocity, nostepvel);
};

SV.Physics_Client = function(ent)
{
	if (SV.svs.clients[ent.num - 1].active !== true)
		return;
	PR.globals_float[PR.globalvars.time] = SV.server.time;
	PR.globals_int[PR.globalvars.self] = ent.num;
	PR.ExecuteProgram(PR.globals_int[PR.globalvars.PlayerPreThink]);
	SV.CheckVelocity(ent);
	var movetype = ent.v_float[PR.entvars.movetype] >> 0;
	if ((movetype === SV.movetype.toss) || (movetype === SV.movetype.bounce))
		SV.Physics_Toss(ent);
	else
	{
		if (SV.RunThink(ent) !== true)
			return;
		switch (movetype)
		{
		case SV.movetype.none:
			break;
		case SV.movetype.walk:
			if ((SV.CheckWater(ent) !== true) && ((ent.v_float[PR.entvars.flags] & SV.fl.waterjump) === 0))
				SV.AddGravity(ent);
			SV.CheckStuck(ent);
			SV.WalkMove(ent);
			break;
		case SV.movetype.fly:
			SV.FlyMove(ent, Host.frametime);
			break;
		case SV.movetype.noclip:
			ent.v_float[PR.entvars.origin] += Host.frametime * ent.v_float[PR.entvars.velocity];
			ent.v_float[PR.entvars.origin1] += Host.frametime * ent.v_float[PR.entvars.velocity1];
			ent.v_float[PR.entvars.origin2] += Host.frametime * ent.v_float[PR.entvars.velocity2];
			break;
		default:
			Sys.Error('SV.Physics_Client: bad movetype ' + movetype);
		}
	}
	SV.LinkEdict(ent, true);
	PR.globals_float[PR.globalvars.time] = SV.server.time;
	PR.globals_int[PR.globalvars.self] = ent.num;
	PR.ExecuteProgram(PR.globals_int[PR.globalvars.PlayerPostThink]);
};

SV.Physics_Noclip = function(ent)
{
	if (SV.RunThink(ent) !== true)
		return;
	ent.v_float[PR.entvars.angles] += Host.frametime * ent.v_float[PR.entvars.avelocity];
	ent.v_float[PR.entvars.angles1] += Host.frametime * ent.v_float[PR.entvars.avelocity1];
	ent.v_float[PR.entvars.angles2] += Host.frametime * ent.v_float[PR.entvars.avelocity2];
	ent.v_float[PR.entvars.origin] += Host.frametime * ent.v_float[PR.entvars.velocity];
	ent.v_float[PR.entvars.origin1] += Host.frametime * ent.v_float[PR.entvars.velocity1];
	ent.v_float[PR.entvars.origin2] += Host.frametime * ent.v_float[PR.entvars.velocity2];
	SV.LinkEdict(ent);
};

SV.CheckWaterTransition = function(ent)
{
	var cont = SV.PointContents(ED.Vector(ent, PR.entvars.origin));
	if (ent.v_float[PR.entvars.watertype] === 0.0)
	{
		ent.v_float[PR.entvars.watertype] = cont;
		ent.v_float[PR.entvars.waterlevel] = 1.0;
		return;
	}
	if (cont <= Mod.contents.water)
	{
		if (ent.v_float[PR.entvars.watertype] === Mod.contents.empty)
			SV.StartSound(ent, 0, 'misc/h2ohit1.wav', 255, 1.0);
		ent.v_float[PR.entvars.watertype] = cont;
		ent.v_float[PR.entvars.waterlevel] = 1.0;
		return;
	}
	if (ent.v_float[PR.entvars.watertype] !== Mod.contents.empty)
		SV.StartSound(ent, 0, 'misc/h2ohit1.wav', 255, 1.0);
	ent.v_float[PR.entvars.watertype] = Mod.contents.empty;
	ent.v_float[PR.entvars.waterlevel] = cont;
};

SV.Physics_Toss = function(ent)
{
	if (SV.RunThink(ent) !== true)
		return;
	if ((ent.v_float[PR.entvars.flags] & SV.fl.onground) !== 0)
		return;
	SV.CheckVelocity(ent);
	var movetype = ent.v_float[PR.entvars.movetype];
	if ((movetype !== SV.movetype.fly) && (movetype !== SV.movetype.flymissile))
		SV.AddGravity(ent);
	ent.v_float[PR.entvars.angles] += Host.frametime * ent.v_float[PR.entvars.avelocity];
	ent.v_float[PR.entvars.angles1] += Host.frametime * ent.v_float[PR.entvars.avelocity1];
	ent.v_float[PR.entvars.angles2] += Host.frametime * ent.v_float[PR.entvars.avelocity2];
	var trace = SV.PushEntity(ent,
		[
			ent.v_float[PR.entvars.velocity] * Host.frametime,
			ent.v_float[PR.entvars.velocity1] * Host.frametime,
			ent.v_float[PR.entvars.velocity2] * Host.frametime
		]);
	if ((trace.fraction === 1.0) || (ent.free === true))
		return;
	var velocity = [];
	SV.ClipVelocity(ED.Vector(ent, PR.entvars.velocity), trace.plane.normal, velocity, (movetype === SV.movetype.bounce) ? 1.5 : 1.0);
	ED.SetVector(ent, PR.entvars.velocity, velocity);
	if (trace.plane.normal[2] > 0.7)
	{
		if ((ent.v_float[PR.entvars.velocity2] < 60.0) || (movetype !== SV.movetype.bounce))
		{
			ent.v_float[PR.entvars.flags] |= SV.fl.onground;
			ent.v_int[PR.entvars.groundentity] = trace.ent.num;
			ent.v_float[PR.entvars.velocity] = ent.v_float[PR.entvars.velocity1] = ent.v_float[PR.entvars.velocity2] = 0.0;
			ent.v_float[PR.entvars.avelocity] = ent.v_float[PR.entvars.avelocity1] = ent.v_float[PR.entvars.avelocity2] = 0.0;
		}
	}
	SV.CheckWaterTransition(ent);
};

SV.Physics_Step = function(ent)
{
	if ((ent.v_float[PR.entvars.flags] & (SV.fl.onground + SV.fl.fly + SV.fl.swim)) === 0)
	{
		var hitsound = (ent.v_float[PR.entvars.velocity2] < (SV.gravity.value * -0.1));
		SV.AddGravity(ent);
		SV.CheckVelocity(ent);
		SV.FlyMove(ent, Host.frametime);
		SV.LinkEdict(ent, true);
		if (((ent.v_float[PR.entvars.flags] & SV.fl.onground) !== 0) && (hitsound === true))
			SV.StartSound(ent, 0, 'demon/dland2.wav', 255, 1.0);
	}
	SV.RunThink(ent);
	SV.CheckWaterTransition(ent);
};

SV.Physics = function()
{
	PR.globals_int[PR.globalvars.self] = 0;
	PR.globals_int[PR.globalvars.other] = 0;
	PR.globals_float[PR.globalvars.time] = SV.server.time;
	PR.ExecuteProgram(PR.globals_int[PR.globalvars.StartFrame]);
	var i, ent;
	for (i = 0; i < SV.server.num_edicts; ++i)
	{
		ent = SV.server.edicts[i];
		if (ent.free === true)
			continue;
		if (PR.globals_float[PR.globalvars.force_retouch] !== 0.0)
			SV.LinkEdict(ent, true);
		if ((i > 0) && (i <= SV.svs.maxclients))
		{
			SV.Physics_Client(ent);
			continue;
		}
		switch (ent.v_float[PR.entvars.movetype])
		{
		case SV.movetype.push:
			SV.Physics_Pusher(ent);
			continue;
		case SV.movetype.none:
			SV.RunThink(ent);
			continue;
		case SV.movetype.noclip:
			SV.RunThink(ent);
			continue;
		case SV.movetype.step:
			SV.Physics_Step(ent);
			continue;
		case SV.movetype.toss:
		case SV.movetype.bounce:
		case SV.movetype.fly:
		case SV.movetype.flymissile:
			SV.Physics_Toss(ent);
			continue;
		}
		Sys.Error('SV.Physics: bad movetype ' + (ent.v_float[PR.entvars.movetype] >> 0));
	}
	if (PR.globals_float[PR.globalvars.force_retouch] !== 0.0)
		--PR.globals_float[PR.globalvars.force_retouch];
	SV.server.time += Host.frametime;
};

// user

SV.SetIdealPitch = function()
{
	var ent = SV.player;
	if ((ent.v_float[PR.entvars.flags] & SV.fl.onground) === 0)
		return;
	var angleval = ent.v_float[PR.entvars.angles1] * (Math.PI / 180.0);
	var sinval = Math.sin(angleval);
	var cosval = Math.cos(angleval);
	var top = [0.0, 0.0, ent.v_float[PR.entvars.origin2] + ent.v_float[PR.entvars.view_ofs2]];
	var bottom = [0.0, 0.0, top[2] - 160.0];
	var i, tr, z = [];
	for (i = 0; i < 6; ++i)
	{
		top[0] = bottom[0] = ent.v_float[PR.entvars.origin] + cosval * (i + 3) * 12.0;
		top[1] = bottom[1] = ent.v_float[PR.entvars.origin1] + sinval * (i + 3) * 12.0;
		tr = SV.Move(top, Vec.origin, Vec.origin, bottom, 1, ent);
		if ((tr.allsolid === true) || (tr.fraction === 1.0))
			return;
		z[i] = top[2] - tr.fraction * 160.0;
	}
	var dir = 0.0, step, steps = 0;
	for (i = 1; i < 6; ++i)
	{
		step = z[i] - z[i - 1];
		if ((step > -0.1) && (step < 0.1))
			continue;
		if ((dir !== 0.0) && (((step - dir) > 0.1) || ((step - dir) < -0.1)))
			return;
		++steps;
		dir = step;
	}
	if (dir === 0.0)
	{
		ent.v_float[PR.entvars.idealpitch] = 0.0;
		return;
	}
	if (steps >= 2)
		ent.v_float[PR.entvars.idealpitch] = -dir * SV.idealpitchscale.value;
};

SV.UserFriction = function()
{
	var ent = SV.player;
	var vel0 = ent.v_float[PR.entvars.velocity], vel1 = ent.v_float[PR.entvars.velocity1];
	var speed = Math.sqrt(vel0 * vel0 + vel1 * vel1);
	if (speed === 0.0)
		return;
	var start = [
		ent.v_float[PR.entvars.origin] + vel0 / speed * 16.0,
		ent.v_float[PR.entvars.origin1] + vel1 / speed * 16.0,
		ent.v_float[PR.entvars.origin2] + ent.v_float[PR.entvars.mins2]
	];
	var friction = SV.friction.value;
	if (SV.Move(start, Vec.origin, Vec.origin, [start[0], start[1], start[2] - 34.0], 1, ent).fraction === 1.0)
		friction *= SV.edgefriction.value;
	var newspeed = speed - Host.frametime * (speed < SV.stopspeed.value ? SV.stopspeed.value : speed) * friction;
	if (newspeed < 0.0)
		newspeed = 0.0;
	newspeed /= speed;
	ent.v_float[PR.entvars.velocity] *= newspeed;
	ent.v_float[PR.entvars.velocity1] *= newspeed;
	ent.v_float[PR.entvars.velocity2] *= newspeed;
};

SV.Accelerate = function(wishvel, air)
{
	var ent = SV.player;
	var wishdir = [wishvel[0], wishvel[1], wishvel[2]];
	var wishspeed = Vec.Normalize(wishdir);
	if ((air === true) && (wishspeed > 30.0))
		wishspeed = 30.0;
	var addspeed = wishspeed - (ent.v_float[PR.entvars.velocity] * wishdir[0]
		+ ent.v_float[PR.entvars.velocity1] * wishdir[1]
		+ ent.v_float[PR.entvars.velocity2] * wishdir[2]
	);
	if (addspeed <= 0.0)
		return;
	var accelspeed = SV.accelerate.value * Host.frametime * wishspeed;
	if (accelspeed > addspeed)
		accelspeed = addspeed;
	ent.v_float[PR.entvars.velocity] += accelspeed * wishdir[0];
	ent.v_float[PR.entvars.velocity1] += accelspeed * wishdir[1];
	ent.v_float[PR.entvars.velocity2] += accelspeed * wishdir[2];
};

SV.WaterMove = function()
{
	var ent = SV.player, cmd = Host.client.cmd;
	var forward = [], right = [];
	Vec.AngleVectors(ED.Vector(ent, PR.entvars.v_angle), forward, right);
	var wishvel = [
		forward[0] * cmd.forwardmove + right[0] * cmd.sidemove,
		forward[1] * cmd.forwardmove + right[1] * cmd.sidemove,
		forward[2] * cmd.forwardmove + right[2] * cmd.sidemove
	];
	if ((cmd.forwardmove === 0.0) && (cmd.sidemove === 0.0) && (cmd.upmove === 0.0))
		wishvel[2] -= 60.0;
	else
		wishvel[2] += cmd.upmove;
	var wishspeed = Math.sqrt(wishvel[0] * wishvel[0] + wishvel[1] * wishvel[1] + wishvel[2] * wishvel[2]);
	var scale;
	if (wishspeed > SV.maxspeed.value)
	{
		scale = SV.maxspeed.value / wishspeed;
		wishvel[0] *= scale;
		wishvel[1] *= scale;
		wishvel[2] *= scale;
		wishspeed = SV.maxspeed.value;
	}
	wishspeed *= 0.7;
	var speed = Math.sqrt(ent.v_float[PR.entvars.velocity] * ent.v_float[PR.entvars.velocity]
		+ ent.v_float[PR.entvars.velocity1] * ent.v_float[PR.entvars.velocity1]
		+ ent.v_float[PR.entvars.velocity2] * ent.v_float[PR.entvars.velocity2]
	), newspeed;
	if (speed !== 0.0)
	{
		newspeed = speed - Host.frametime * speed * SV.friction.value;
		if (newspeed < 0.0)
			newspeed = 0.0;
		scale = newspeed / speed;
		ent.v_float[PR.entvars.velocity] *= scale;
		ent.v_float[PR.entvars.velocity1] *= scale;
		ent.v_float[PR.entvars.velocity2] *= scale;
	}
	else
		newspeed = 0.0;
	if (wishspeed === 0.0)
		return;
	var addspeed = wishspeed - newspeed;
	if (addspeed <= 0.0)
		return;
	var accelspeed = SV.accelerate.value * wishspeed * Host.frametime;
	if (accelspeed > addspeed)
		accelspeed = addspeed;
	ent.v_float[PR.entvars.velocity] += accelspeed * (wishvel[0] / wishspeed);
	ent.v_float[PR.entvars.velocity1] += accelspeed * (wishvel[1] / wishspeed);
	ent.v_float[PR.entvars.velocity2] += accelspeed * (wishvel[2] / wishspeed);
};

SV.WaterJump = function()
{
	var ent = SV.player;
	if ((SV.server.time > ent.v_float[PR.entvars.teleport_time]) || (ent.v_float[PR.entvars.waterlevel] === 0.0))
	{
		ent.v_float[PR.entvars.flags] &= (~SV.fl.waterjump >>> 0);
		ent.v_float[PR.entvars.teleport_time] = 0.0;
	}
	ent.v_float[PR.entvars.velocity] = ent.v_float[PR.entvars.movedir];
	ent.v_float[PR.entvars.velocity1] = ent.v_float[PR.entvars.movedir1];
};

SV.AirMove = function()
{
	var ent = SV.player;
	var cmd = Host.client.cmd;
	var forward = [], right = [];
	Vec.AngleVectors(ED.Vector(ent, PR.entvars.angles), forward, right);
	var fmove = cmd.forwardmove;
	var smove = cmd.sidemove;
	if ((SV.server.time < ent.v_float[PR.entvars.teleport_time]) && (fmove < 0.0))
		fmove = 0.0;
	var wishvel = [
		forward[0] * fmove + right[0] * smove,
		forward[1] * fmove + right[1] * smove,
		((ent.v_float[PR.entvars.movetype] >> 0) !== SV.movetype.walk) ? cmd.upmove : 0.0];
	var wishdir = [wishvel[0], wishvel[1], wishvel[2]];
	if (Vec.Normalize(wishdir) > SV.maxspeed.value)
	{
		wishvel[0] = wishdir[0] * SV.maxspeed.value;
		wishvel[1] = wishdir[1] * SV.maxspeed.value;
		wishvel[2] = wishdir[2] * SV.maxspeed.value;
	}
	if (ent.v_float[PR.entvars.movetype] === SV.movetype.noclip)
		ED.SetVector(ent, PR.entvars.velocity, wishvel);
	else if ((ent.v_float[PR.entvars.flags] & SV.fl.onground) !== 0)
	{
		SV.UserFriction(wishvel);
		SV.Accelerate(wishvel);
	}
	else
		SV.Accelerate(wishvel, true);
};

SV.ClientThink = function()
{
	var ent = SV.player;

	if (ent.v_float[PR.entvars.movetype] === SV.movetype.none)
		return;

	var punchangle = ED.Vector(ent, PR.entvars.punchangle);
	var len = Vec.Normalize(punchangle) - 10.0 * Host.frametime;
	if (len < 0.0)
		len = 0.0;
	ent.v_float[PR.entvars.punchangle] = punchangle[0] * len;
	ent.v_float[PR.entvars.punchangle1] = punchangle[1] * len;
	ent.v_float[PR.entvars.punchangle2] = punchangle[2] * len;

	if (ent.v_float[PR.entvars.health] <= 0.0)
		return;

	ent.v_float[PR.entvars.angles2] = V.CalcRoll(ED.Vector(ent, PR.entvars.angles), ED.Vector(ent, PR.entvars.velocity)) * 4.0;
	if (SV.player.v_float[PR.entvars.fixangle] === 0.0)
	{
		ent.v_float[PR.entvars.angles] = (ent.v_float[PR.entvars.v_angle] + ent.v_float[PR.entvars.punchangle]) / -3.0;
		ent.v_float[PR.entvars.angles1] = ent.v_float[PR.entvars.v_angle1] + ent.v_float[PR.entvars.punchangle1];
	}

	if ((ent.v_float[PR.entvars.flags] & SV.fl.waterjump) !== 0)
		SV.WaterJump();
	else if ((ent.v_float[PR.entvars.waterlevel] >= 2.0) && (ent.v_float[PR.entvars.movetype] !== SV.movetype.noclip))
		SV.WaterMove();
	else
		SV.AirMove();
};

SV.ReadClientMove = function()
{
	var client = Host.client;
	client.ping_times[client.num_pings++ & 15] = SV.server.time - MSG.ReadFloat();
	client.edict.v_float[PR.entvars.v_angle] = MSG.ReadAngle();
	client.edict.v_float[PR.entvars.v_angle1] = MSG.ReadAngle();
	client.edict.v_float[PR.entvars.v_angle2] = MSG.ReadAngle();
	client.cmd.forwardmove = MSG.ReadShort();
	client.cmd.sidemove = MSG.ReadShort();
	client.cmd.upmove = MSG.ReadShort();
	var i = MSG.ReadByte();
	client.edict.v_float[PR.entvars.button0] = i & 1;
	client.edict.v_float[PR.entvars.button2] = (i & 2) >> 1;
	i = MSG.ReadByte();
	if (i !== 0)
		client.edict.v_float[PR.entvars.impulse] = i;
};

SV.ReadClientMessage = function()
{
	var ret, cmd, s, i;
	var cmds = [
		'status',
		'god', 
		'notarget',
		'fly',
		'name',
		'noclip',
		'say',
		'say_team',
		'tell',
		'color',
		'kill',
		'pause',
		'spawn',
		'begin',
		'prespawn',
		'kick',
		'ping',
		'give',
		'ban'
	];
	do
	{
		ret = NET.GetMessage(Host.client.netconnection);
		if (ret === -1)
		{
			Sys.Print('SV.ReadClientMessage: NET.GetMessage failed\n');
			return;
		}
		if (ret === 0)
			return true;
		MSG.BeginReading();
		for (;;)
		{
			if (Host.client.active !== true)
				return;
			if (MSG.badread === true)
			{
				Sys.Print('SV.ReadClientMessage: badread\n');
				return;
			}
			cmd = MSG.ReadChar();
			if (cmd === -1)
			{
				ret = 1;
				break;
			}
			if (cmd === Protocol.clc.nop)
				continue;
			if (cmd === Protocol.clc.stringcmd)
			{
				s = MSG.ReadString();
				for (i = 0; i < cmds.length; ++i)
				{
					if (s.substring(0, cmds[i].length).toLowerCase() !== cmds[i])
						continue;
					Cmd.ExecuteString(s, true);
					break;
				}
				if (i === cmds.length)
					Con.DPrint(SV.GetClientName(Host.client) + ' tried to ' + s);
			}
			else if (cmd === Protocol.clc.disconnect)
				return;
			else if (cmd === Protocol.clc.move)
				SV.ReadClientMove();
			else
			{
				Sys.Print('SV.ReadClientMessage: unknown command char\n');
				return;
			}
		}
	} while (ret === 1);
};

SV.RunClients = function()
{
	var i;
	for (i = 0; i < SV.svs.maxclients; ++i)
	{
		Host.client = SV.svs.clients[i];
		if (Host.client.active !== true)
			continue;
		SV.player = Host.client.edict;
		if (SV.ReadClientMessage() !== true)
		{
			Host.DropClient();
			continue;
		}
		if (Host.client.spawned !== true)
		{
			Host.client.cmd.forwardmove = 0.0;
			Host.client.cmd.sidemove = 0.0;
			Host.client.cmd.upmove = 0.0;
			continue;
		}
		SV.ClientThink();
	}
};

// world

SV.move = {
	normal: 0,
	nomonsters: 1,
	missile: 2
};

SV.InitBoxHull = function()
{
	SV.box_clipnodes = [];
	SV.box_planes = [];
	SV.box_hull = {
		clipnodes: SV.box_clipnodes,
		planes: SV.box_planes,
		firstclipnode: 0,
		lastclipnode: 5
	};
	var i, node, plane;
	for (i = 0; i <= 5; ++i)
	{
		node = {};
		SV.box_clipnodes[i] = node;
		node.planenum = i;
		node.children = [];
		node.children[i & 1] = Mod.contents.empty;
		if (i !== 5)
			node.children[1 - (i & 1)] = i + 1;
		else
			node.children[1 - (i & 1)] = Mod.contents.solid;
		plane = {};
		SV.box_planes[i] = plane;
		plane.type = i >> 1;
		plane.normal = [0.0, 0.0, 0.0];
		plane.normal[i >> 1] = 1.0;
		plane.dist = 0.0;
	}
};

SV.HullForEntity = function(ent, mins, maxs, offset)
{
	if (ent.v_float[PR.entvars.solid] !== SV.solid.bsp)
	{
		SV.box_planes[0].dist = ent.v_float[PR.entvars.maxs] - mins[0];
		SV.box_planes[1].dist = ent.v_float[PR.entvars.mins] - maxs[0];
		SV.box_planes[2].dist = ent.v_float[PR.entvars.maxs1] - mins[1];
		SV.box_planes[3].dist = ent.v_float[PR.entvars.mins1] - maxs[1];
		SV.box_planes[4].dist = ent.v_float[PR.entvars.maxs2] - mins[2];
		SV.box_planes[5].dist = ent.v_float[PR.entvars.mins2] - maxs[2];
		offset[0] = ent.v_float[PR.entvars.origin];
		offset[1] = ent.v_float[PR.entvars.origin1];
		offset[2] = ent.v_float[PR.entvars.origin2];
		return SV.box_hull;
	}
	if (ent.v_float[PR.entvars.movetype] !== SV.movetype.push)
		Sys.Error('SOLID_BSP without MOVETYPE_PUSH');
	var model = SV.server.models[ent.v_float[PR.entvars.modelindex] >> 0];
	if (model == null)
		Sys.Error('MOVETYPE_PUSH with a non bsp model');
	if (model.type !== Mod.type.brush)
		Sys.Error('MOVETYPE_PUSH with a non bsp model');
	var size = maxs[0] - mins[0];
	var hull;
	if (size < 3.0)
		hull = model.hulls[0];
	else if (size <= 32.0)
		hull = model.hulls[1];
	else
		hull = model.hulls[2];
	offset[0] = hull.clip_mins[0] - mins[0] + ent.v_float[PR.entvars.origin];
	offset[1] = hull.clip_mins[1] - mins[1] + ent.v_float[PR.entvars.origin1];
	offset[2] = hull.clip_mins[2] - mins[2] + ent.v_float[PR.entvars.origin2];
	return hull;
};

SV.CreateAreaNode = function(depth, mins, maxs)
{
	var anode = {};
	SV.areanodes[SV.areanodes.length++] = anode;

	anode.trigger_edicts = {};
	anode.trigger_edicts.prev = anode.trigger_edicts.next = anode.trigger_edicts;
	anode.solid_edicts = {};
	anode.solid_edicts.prev = anode.solid_edicts.next = anode.solid_edicts;

	if (depth === 4)
	{
		anode.axis = -1;
		anode.children = [];
		return anode;
	}

	anode.axis = (maxs[0] - mins[0]) > (maxs[1] - mins[1]) ? 0 : 1;
	anode.dist = 0.5 * (maxs[anode.axis] + mins[anode.axis]);

	var maxs1 = [maxs[0], maxs[1], maxs[2]];
	var mins2 = [mins[0], mins[1], mins[2]];
	maxs1[anode.axis] = mins2[anode.axis] = anode.dist;
	anode.children = [SV.CreateAreaNode(depth + 1, mins2, maxs), SV.CreateAreaNode(depth + 1, mins, maxs1)];
	return anode;
};

SV.UnlinkEdict = function(ent)
{
	if (ent.area.prev != null)
		ent.area.prev.next = ent.area.next;
	if (ent.area.next != null)
		ent.area.next.prev = ent.area.prev;
	ent.area.prev = ent.area.next = null;
};

SV.TouchLinks = function(ent, node)
{
	var l, next, touch, old_self, old_other;
	for (l = node.trigger_edicts.next; l !== node.trigger_edicts; l = next)
	{
		next = l.next;
		touch = l.ent;
		if (touch === ent)
			continue;
		if ((touch.v_int[PR.entvars.touch] === 0) || (touch.v_float[PR.entvars.solid] !== SV.solid.trigger))
			continue;
		if ((ent.v_float[PR.entvars.absmin] > touch.v_float[PR.entvars.absmax]) ||
			(ent.v_float[PR.entvars.absmin1] > touch.v_float[PR.entvars.absmax1]) || 
			(ent.v_float[PR.entvars.absmin2] > touch.v_float[PR.entvars.absmax2]) ||
			(ent.v_float[PR.entvars.absmax] < touch.v_float[PR.entvars.absmin]) ||
			(ent.v_float[PR.entvars.absmax1] < touch.v_float[PR.entvars.absmin1]) ||
			(ent.v_float[PR.entvars.absmax2] < touch.v_float[PR.entvars.absmin2]))
			continue;
		old_self = PR.globals_int[PR.globalvars.self];
		old_other = PR.globals_int[PR.globalvars.other];
		PR.globals_int[PR.globalvars.self] = touch.num;
		PR.globals_int[PR.globalvars.other] = ent.num;
		PR.globals_float[PR.globalvars.time] = SV.server.time;
		PR.ExecuteProgram(touch.v_int[PR.entvars.touch]);
		PR.globals_int[PR.globalvars.self] = old_self;
		PR.globals_int[PR.globalvars.other] = old_other;
	}
	if (node.axis === -1)
		return;
	if (ent.v_float[PR.entvars.absmax + node.axis] > node.dist)
		SV.TouchLinks(ent, node.children[0]);
	if (ent.v_float[PR.entvars.absmin + node.axis] < node.dist)
		SV.TouchLinks(ent, node.children[1]);
};

SV.FindTouchedLeafs = function(ent, node)
{
	if (node.contents === Mod.contents.solid)
		return;

	if (node.contents < 0)
	{
		if (ent.leafnums.length === 16)
			return;
		ent.leafnums[ent.leafnums.length] = node.num - 1;
		return;
	}

	var sides = Vec.BoxOnPlaneSide([ent.v_float[PR.entvars.absmin], ent.v_float[PR.entvars.absmin1], ent.v_float[PR.entvars.absmin2]],
		[ent.v_float[PR.entvars.absmax], ent.v_float[PR.entvars.absmax1], ent.v_float[PR.entvars.absmax2]], node.plane);
	if ((sides & 1) !== 0)
		SV.FindTouchedLeafs(ent, node.children[0]);
	if ((sides & 2) !== 0)
		SV.FindTouchedLeafs(ent, node.children[1]);
};

SV.LinkEdict = function(ent, touch_triggers)
{
	if ((ent === SV.server.edicts[0]) || (ent.free === true))
		return;

	SV.UnlinkEdict(ent);

	ent.v_float[PR.entvars.absmin] = ent.v_float[PR.entvars.origin] + ent.v_float[PR.entvars.mins] - 1.0;
	ent.v_float[PR.entvars.absmin1] = ent.v_float[PR.entvars.origin1] + ent.v_float[PR.entvars.mins1] - 1.0;
	ent.v_float[PR.entvars.absmin2] = ent.v_float[PR.entvars.origin2] + ent.v_float[PR.entvars.mins2];
	ent.v_float[PR.entvars.absmax] = ent.v_float[PR.entvars.origin] + ent.v_float[PR.entvars.maxs] + 1.0;
	ent.v_float[PR.entvars.absmax1] = ent.v_float[PR.entvars.origin1] + ent.v_float[PR.entvars.maxs1] + 1.0;
	ent.v_float[PR.entvars.absmax2] = ent.v_float[PR.entvars.origin2] + ent.v_float[PR.entvars.maxs2];

	if ((ent.v_float[PR.entvars.flags] & SV.fl.item) !== 0)
	{
		ent.v_float[PR.entvars.absmin] -= 14.0;
		ent.v_float[PR.entvars.absmin1] -= 14.0;
		ent.v_float[PR.entvars.absmax] += 14.0;
		ent.v_float[PR.entvars.absmax1] += 14.0;
	}
	else
	{
		ent.v_float[PR.entvars.absmin2] -= 1.0;
		ent.v_float[PR.entvars.absmax2] += 1.0;
	}

	ent.leafnums = [];
	if (ent.v_float[PR.entvars.modelindex] !== 0.0)
		SV.FindTouchedLeafs(ent, SV.server.worldmodel.nodes[0]);

	if (ent.v_float[PR.entvars.solid] === SV.solid.not)
		return;

	var node = SV.areanodes[0];
	for (;;)
	{
		if (node.axis === -1)
			break;
		if (ent.v_float[PR.entvars.absmin + node.axis] > node.dist)
			node = node.children[0];
		else if (ent.v_float[PR.entvars.absmax + node.axis] < node.dist)
			node = node.children[1];
		else
			break;
	}

	var before = (ent.v_float[PR.entvars.solid] === SV.solid.trigger) ? node.trigger_edicts : node.solid_edicts;
	ent.area.next = before;
	ent.area.prev = before.prev;
	ent.area.prev.next = ent.area;
	ent.area.next.prev = ent.area;
	ent.area.ent = ent;

	if (touch_triggers === true)
		SV.TouchLinks(ent, SV.areanodes[0]);
};

SV.HullPointContents = function(hull, num, p)
{
	var d, node, plane;
	for (; num >= 0; )
	{
		if ((num < hull.firstclipnode) || (num > hull.lastclipnode))
			Sys.Error('SV.HullPointContents: bad node number');
		node = hull.clipnodes[num];
		plane = hull.planes[node.planenum];
		if (plane.type <= 2)
			d = p[plane.type] - plane.dist;
		else
			d = plane.normal[0] * p[0] + plane.normal[1] * p[1] + plane.normal[2] * p[2] - plane.dist;
		if (d >= 0.0)
			num = node.children[0];
		else
			num = node.children[1];
	}
	return num;
};

SV.PointContents = function(p)
{
	var cont = SV.HullPointContents(SV.server.worldmodel.hulls[0], 0, p);
	if ((cont <= Mod.contents.current_0) && (cont >= Mod.contents.current_down))
		return Mod.contents.water;
	return cont;
};

SV.TestEntityPosition = function(ent)
{
	var origin = ED.Vector(ent, PR.entvars.origin);
	return SV.Move(origin, ED.Vector(ent, PR.entvars.mins), ED.Vector(ent, PR.entvars.maxs), origin, 0, ent).startsolid;
};

SV.RecursiveHullCheck = function(hull, num, p1f, p2f, p1, p2, trace)
{
	if (num < 0)
	{
		if (num !== Mod.contents.solid)
		{
			trace.allsolid = false;
			if (num === Mod.contents.empty)
				trace.inopen = true;
			else
				trace.inwater = true;
		}
		else
			trace.startsolid = true;
		return true;
	}

	if ((num < hull.firstclipnode) || (num > hull.lastclipnode))
		Sys.Error('SV.RecursiveHullCheck: bad node number');

	var node = hull.clipnodes[num];
	var plane = hull.planes[node.planenum];
	var t1, t2;

	if (plane.type <= 2)
	{
		t1 = p1[plane.type] - plane.dist;
		t2 = p2[plane.type] - plane.dist;
	}
	else
	{
		t1 = plane.normal[0] * p1[0] + plane.normal[1] * p1[1] + plane.normal[2] * p1[2] - plane.dist;
		t2 = plane.normal[0] * p2[0] + plane.normal[1] * p2[1] + plane.normal[2] * p2[2] - plane.dist;
	}

	if ((t1 >= 0.0) && (t2 >= 0.0))
		return SV.RecursiveHullCheck(hull, node.children[0], p1f, p2f, p1, p2, trace);
	if ((t1 < 0.0) && (t2 < 0.0))
		return SV.RecursiveHullCheck(hull, node.children[1], p1f, p2f, p1, p2, trace);

	var frac = (t1 + (t1 < 0.0 ? 0.03125 : -0.03125)) / (t1 - t2);
	if (frac < 0.0)
		frac = 0.0;
	else if (frac > 1.0)
		frac = 1.0;

	var midf = p1f + (p2f - p1f) * frac;
	var mid = [
		p1[0] + frac * (p2[0] - p1[0]),
		p1[1] + frac * (p2[1] - p1[1]),
		p1[2] + frac * (p2[2] - p1[2])
	];
	var side = t1 < 0.0 ? 1 : 0;

	if (SV.RecursiveHullCheck(hull, node.children[side], p1f, midf, p1, mid, trace) !== true)
		return;

	if (SV.HullPointContents(hull, node.children[1 - side], mid) !== Mod.contents.solid)
		return SV.RecursiveHullCheck(hull, node.children[1 - side], midf, p2f, mid, p2, trace);

	if (trace.allsolid === true)
		return;

	if (side === 0)
	{
		trace.plane.normal = [plane.normal[0], plane.normal[1], plane.normal[2]];
		trace.plane.dist = plane.dist;
	}
	else
	{
		trace.plane.normal = [-plane.normal[0], -plane.normal[1], -plane.normal[2]];
		trace.plane.dist = -plane.dist;
	}

	while (SV.HullPointContents(hull, hull.firstclipnode, mid) === Mod.contents.solid)
	{
		frac -= 0.1;
		if (frac < 0.0)
		{
			trace.fraction = midf;
			trace.endpos = [mid[0], mid[1], mid[2]];
			Con.DPrint('backup past 0\n');
			return;
		}
		midf = p1f + (p2f - p1f) * frac;
		mid[0] = p1[0] + frac * (p2[0] - p1[0]);
		mid[1] = p1[1] + frac * (p2[1] - p1[1]);
		mid[2] = p1[2] + frac * (p2[2] - p1[2]);
	}

	trace.fraction = midf;
	trace.endpos = [mid[0], mid[1], mid[2]];
};

SV.ClipMoveToEntity = function(ent, start, mins, maxs, end)
{
	var trace = {
		fraction: 1.0,
		allsolid: true,
		endpos: [end[0], end[1], end[2]],
		plane: {normal: [0.0, 0.0, 0.0], dist: 0.0}
	};
	var offset = [];
	var hull = SV.HullForEntity(ent, mins, maxs, offset);
	SV.RecursiveHullCheck(hull, hull.firstclipnode, 0.0, 1.0,
		[start[0] - offset[0], start[1] - offset[1], start[2] - offset[2]],
		[end[0] - offset[0], end[1] - offset[1], end[2] - offset[2]], trace);
	if (trace.fraction !== 1.0)
	{
		trace.endpos[0] += offset[0];
		trace.endpos[1] += offset[1];
		trace.endpos[2] += offset[2];
	}
	if ((trace.fraction < 1.0) || (trace.startsolid === true))
		trace.ent = ent;
	return trace;
};

SV.ClipToLinks = function(node, clip)
{
	var l, next, touch, solid, trace;
	for (l = node.solid_edicts.next; l !== node.solid_edicts; l = l.next)
	{
		touch = l.ent;
		solid = touch.v_float[PR.entvars.solid];
		if ((solid === SV.solid.not) || (touch === clip.passedict))
			continue;
		if (solid === SV.solid.trigger)
			Sys.Error('Trigger in clipping list');
		if ((clip.type === SV.move.nomonsters) && (solid !== SV.solid.bsp))
			continue;
		if ((clip.boxmins[0] > touch.v_float[PR.entvars.absmax]) ||
			(clip.boxmins[1] > touch.v_float[PR.entvars.absmax1]) ||
			(clip.boxmins[2] > touch.v_float[PR.entvars.absmax2]) ||
			(clip.boxmaxs[0] < touch.v_float[PR.entvars.absmin]) ||
			(clip.boxmaxs[1] < touch.v_float[PR.entvars.absmin1]) ||
			(clip.boxmaxs[2] < touch.v_float[PR.entvars.absmin2]))
			continue;
		if (clip.passedict != null)
		{
			if ((clip.passedict.v_float[PR.entvars.size] !== 0.0) && (touch.v_float[PR.entvars.size] === 0.0))
				continue;
		}
		if (clip.trace.allsolid === true)
			return;
		if (clip.passedict != null)
		{
			if (SV.server.edicts[touch.v_int[PR.entvars.owner]] === clip.passedict)
				continue;
			if (SV.server.edicts[clip.passedict.v_int[PR.entvars.owner]] === touch)
				continue;
		}
		if ((touch.v_float[PR.entvars.flags] & SV.fl.monster) !== 0)
			trace = SV.ClipMoveToEntity(touch, clip.start, clip.mins2, clip.maxs2, clip.end);
		else
			trace = SV.ClipMoveToEntity(touch, clip.start, clip.mins, clip.maxs, clip.end);
		if ((trace.allsolid === true) || (trace.startsolid === true) || (trace.fraction < clip.trace.fraction))
		{
			trace.ent = touch;
			clip.trace = trace;
			if (trace.startsolid === true)
				clip.trace.startsolid = true;
		}
	}
	if (node.axis === -1)
		return;
	if (clip.boxmaxs[node.axis] > node.dist)
		SV.ClipToLinks(node.children[0], clip);
	if (clip.boxmins[node.axis] < node.dist)
		SV.ClipToLinks(node.children[1], clip);
};

SV.Move = function(start, mins, maxs, end, type, passedict)
{
	var clip = {
		trace: SV.ClipMoveToEntity(SV.server.edicts[0], start, mins, maxs, end),
		start: start,
		end: end,
		mins: mins,
		maxs: maxs,
		type: type,
		passedict: passedict,
		boxmins: [],
		boxmaxs: []
	};
	if (type === SV.move.missile)
	{
		clip.mins2 = [-15.0, -15.0, -15.0];
		clip.maxs2 = [15.0, 15.0, 15.0];
	}
	else
	{
		clip.mins2 = [mins[0], mins[1], mins[2]];
		clip.maxs2 = [maxs[0], maxs[1], maxs[2]];
	}
	var i;
	for (i = 0; i <= 2; ++i)
	{
		if (end[i] > start[i])
		{
			clip.boxmins[i] = start[i] + clip.mins2[i] - 1.0;
			clip.boxmaxs[i] = end[i] + clip.maxs2[i] + 1.0;
			continue;
		}
		clip.boxmins[i] = end[i] + clip.mins2[i] - 1.0;
		clip.boxmaxs[i] = start[i] + clip.maxs2[i] + 1.0;
	}
	SV.ClipToLinks(SV.areanodes[0], clip);
	return clip.trace;
};