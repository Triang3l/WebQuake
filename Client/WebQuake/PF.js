PF = {};

PF.VarString = function(first)
{
	var i, out = '';
	for (i = first; i < PR.argc; ++i)
		out += PR.GetString(PR.globals_int[4 + i * 3]);
	return out;
};

PF.error = function()
{
	Con.Print('======SERVER ERROR in ' + PR.GetString(PR.xfunction.name) + '\n' + PF.VarString(0) + '\n');
	ED.Print(SV.server.edicts[PR.globals_int[PR.globalvars.self]]);
	Host.Error('Program error');
};

PF.objerror = function()
{
	Con.Print('======OBJECT ERROR in ' + PR.GetString(PR.xfunction.name) + '\n' + PF.VarString(0) + '\n');
	ED.Print(SV.server.edicts[PR.globals_int[PR.globalvars.self]]);
	Host.Error('Program error');
};

PF.makevectors = function()
{
	var forward = [], right = [], up = [];
	Vec.AngleVectors([PR.globals_float[4], PR.globals_float[5], PR.globals_float[6]], forward, right, up);
	var i;
	for (i = 0; i <= 2; ++i)
	{
		PR.globals_float[PR.globalvars.v_forward + i] = forward[i];
		PR.globals_float[PR.globalvars.v_right + i] = right[i];
		PR.globals_float[PR.globalvars.v_up + i] = up[i];
	}
};

PF.setorigin = function()
{
	var e = SV.server.edicts[PR.globals_int[4]];
	e.v_float[PR.entvars.origin] = PR.globals_float[7];
	e.v_float[PR.entvars.origin1] = PR.globals_float[8];
	e.v_float[PR.entvars.origin2] = PR.globals_float[9];
	SV.LinkEdict(e);
};

PF.SetMinMaxSize = function(e, min, max)
{
	if ((min[0] > max[0]) || (min[1] > max[1]) || (min[2] > max[2]))
		PR.RunError('backwards mins/maxs');
	ED.SetVector(e, PR.entvars.mins, min);
	ED.SetVector(e, PR.entvars.maxs, max);
	e.v_float[PR.entvars.size] = max[0] - min[0];
	e.v_float[PR.entvars.size1] = max[1] - min[1];
	e.v_float[PR.entvars.size2] = max[2] - min[2];
	SV.LinkEdict(e);
};

PF.setsize = function()
{
	PF.SetMinMaxSize(SV.server.edicts[PR.globals_int[4]],
		[PR.globals_float[7], PR.globals_float[8], PR.globals_float[9]],
		[PR.globals_float[10], PR.globals_float[11], PR.globals_float[12]]);
};

PF.setmodel = function()
{
	var e = SV.server.edicts[PR.globals_int[4]];
	var m = PR.GetString(PR.globals_int[7]);
	var i;
	for (i = 0; i < SV.server.model_precache.length; ++i)
	{
		if (SV.server.model_precache[i] === m)
			break;
	}
	if (i === SV.server.model_precache.length)
		PR.RunError('no precache: ' + m + '\n');

	e.v_int[PR.entvars.model] = PR.globals_int[7];
	e.v_float[PR.entvars.modelindex] = i;
	var mod = SV.server.models[i];
	if (mod != null)
		PF.SetMinMaxSize(e, mod.mins, mod.maxs);
	else
		PF.SetMinMaxSize(e, Vec.origin, Vec.origin);
};

PF.bprint = function()
{
	Host.BroadcastPrint(PF.VarString(0));
};

PF.sprint = function()
{
	var entnum = PR.globals_int[4];
	if ((entnum <= 0) || (entnum > SV.svs.maxclients))
	{
		Con.Print('tried to sprint to a non-client\n');
		return;
	}
	var client = SV.svs.clients[entnum - 1];
	MSG.WriteByte(client.message, Protocol.svc.print);
	MSG.WriteString(client.message, PF.VarString(1));
};

PF.centerprint = function()
{
	var entnum = PR.globals_int[4];
	if ((entnum <= 0) || (entnum > SV.svs.maxclients))
	{
		Con.Print('tried to sprint to a non-client\n');
		return;
	}
	var client = SV.svs.clients[entnum - 1];
	MSG.WriteByte(client.message, Protocol.svc.centerprint);
	MSG.WriteString(client.message, PF.VarString(1));
};

PF.normalize = function()
{
	var newvalue = [PR.globals_float[4], PR.globals_float[5], PR.globals_float[6]];
	Vec.Normalize(newvalue);
	PR.globals_float[1] = newvalue[0];
	PR.globals_float[2] = newvalue[1];
	PR.globals_float[3] = newvalue[2];
};

PF.vlen = function()
{
	PR.globals_float[1] = Math.sqrt(PR.globals_float[4] * PR.globals_float[4] + PR.globals_float[5] * PR.globals_float[5] + PR.globals_float[6] * PR.globals_float[6]);
};

PF.vectoyaw = function()
{
	var value1 = PR.globals_float[4], value2 = PR.globals_float[5];
	if ((value1 === 0.0) && (value2 === 0.0))
	{
		PR.globals_float[1] = 0.0;
		return;
	}
	var yaw = (Math.atan2(value2, value1) * 180.0 / Math.PI) >> 0;
	if (yaw < 0)
		yaw += 360;
	PR.globals_float[1] = yaw;
};

PF.vectoangles = function()
{
	PR.globals_float[3] = 0.0;
	var value1 = [PR.globals_float[4], PR.globals_float[5], PR.globals_float[6]];
	if ((value1[0] === 0.0) && (value1[1] === 0.0))
	{
		if (value1[2] > 0.0)
			PR.globals_float[1] = 90.0;
		else
			PR.globals_float[1] = 270.0;
		PR.globals_float[2] = 0.0;
		return;
	}

	var yaw = (Math.atan2(value1[1], value1[0]) * 180.0 / Math.PI) >> 0;
	if (yaw < 0)
		yaw += 360;
	var pitch = (Math.atan2(value1[2], Math.sqrt(value1[0] * value1[0] + value1[1] * value1[1])) * 180.0 / Math.PI) >> 0;
	if (pitch < 0)
		pitch += 360;
	PR.globals_float[1] = pitch;
	PR.globals_float[2] = yaw;
};

PF.random = function()
{
	PR.globals_float[1] = Math.random();
};

PF.particle = function()
{
	SV.StartParticle([PR.globals_float[4], PR.globals_float[5], PR.globals_float[6]],
		[PR.globals_float[7], PR.globals_float[8], PR.globals_float[9]],
		PR.globals_float[10] >> 0, PR.globals_float[13] >> 0);
};

PF.ambientsound = function()
{
	var samp = PR.GetString(PR.globals_int[7]), i;
	for (i = 0; i < SV.server.sound_precache.length; ++i)
	{
		if (SV.server.sound_precache[i] === samp)
			break;
	}
	if (i === SV.server.sound_precache.length)
	{
		Con.Print('no precache: ' + samp + '\n');
		return;
	}
	var signon = SV.server.signon;
	MSG.WriteByte(signon, Protocol.svc.spawnstaticsound);
	MSG.WriteCoord(signon, PR.globals_float[4]);
	MSG.WriteCoord(signon, PR.globals_float[5]);
	MSG.WriteCoord(signon, PR.globals_float[6]);
	MSG.WriteByte(signon, i);
	MSG.WriteByte(signon, PR.globals_float[10] * 255.0);
	MSG.WriteByte(signon, PR.globals_float[13] * 64.0);
};

PF.sound = function()
{
	SV.StartSound(SV.server.edicts[PR.globals_int[4]],
		PR.globals_float[7] >> 0,
		PR.GetString(PR.globals_int[10]),
		(PR.globals_float[13] * 255.0) >> 0,
		PR.globals_float[16]);
};

PF.breakstatement = function()
{
	Con.Print('break statement\n');
};

PF.traceline = function()
{
	var trace = SV.Move([PR.globals_float[4], PR.globals_float[5], PR.globals_float[6]],
		Vec.origin, Vec.origin, [PR.globals_float[7], PR.globals_float[8], PR.globals_float[9]],
		PR.globals_float[10] >> 0, SV.server.edicts[PR.globals_int[13]]);
	PR.globals_float[PR.globalvars.trace_allsolid] = (trace.allsolid === true) ? 1.0 : 0.0;
	PR.globals_float[PR.globalvars.trace_startsolid] = (trace.startsolid === true) ? 1.0 : 0.0;
	PR.globals_float[PR.globalvars.trace_fraction] = trace.fraction;
	PR.globals_float[PR.globalvars.trace_inwater] = (trace.inwater === true) ? 1.0 : 0.0;
	PR.globals_float[PR.globalvars.trace_inopen] = (trace.inopen === true) ? 1.0 : 0.0;
	PR.globals_float[PR.globalvars.trace_endpos] = trace.endpos[0];
	PR.globals_float[PR.globalvars.trace_endpos1] = trace.endpos[1];
	PR.globals_float[PR.globalvars.trace_endpos2] = trace.endpos[2];
	var plane = trace.plane;
	PR.globals_float[PR.globalvars.trace_plane_normal] = plane.normal[0];
	PR.globals_float[PR.globalvars.trace_plane_normal1] = plane.normal[1];
	PR.globals_float[PR.globalvars.trace_plane_normal2] = plane.normal[2];
	PR.globals_float[PR.globalvars.trace_plane_dist] = plane.dist;
	PR.globals_int[PR.globalvars.trace_ent] = (trace.ent != null) ? trace.ent.num : 0;
};

PF.newcheckclient = function(check)
{
	if (check <= 0)
		check = 1;
	else if (check > SV.svs.maxclients)
		check = SV.svs.maxclients;
	var i = 1;
	if (check !== SV.svs.maxclients)
		i += check;
	var ent;
	for (; ; ++i)
	{
		if (i === SV.svs.maxclients + 1)
			i = 1;
		ent = SV.server.edicts[i];
		if (i === check)
			break;
		if (ent.free === true)
			continue;
		if ((ent.v_float[PR.entvars.health] <= 0.0) || ((ent.v_float[PR.entvars.flags] & SV.fl.notarget) !== 0))
			continue;
		break;
	}
	PF.checkpvs = Mod.LeafPVS(Mod.PointInLeaf([
			ent.v_float[PR.entvars.origin] + ent.v_float[PR.entvars.view_ofs],
			ent.v_float[PR.entvars.origin1] + ent.v_float[PR.entvars.view_ofs1],
			ent.v_float[PR.entvars.origin2] + ent.v_float[PR.entvars.view_ofs2]
		], SV.server.worldmodel), SV.server.worldmodel);
	return i;
};

PF.checkclient = function()
{
	if ((SV.server.time - SV.server.lastchecktime) >= 0.1)
	{
		SV.server.lastcheck = PF.newcheckclient(SV.server.lastcheck);
		SV.server.lastchecktime = SV.server.time;
	}
	var ent = SV.server.edicts[SV.server.lastcheck];
	if ((ent.free === true) || (ent.v_float[PR.entvars.health] <= 0.0))
	{
		PR.globals_int[1] = 0;
		return;
	}
	var self = SV.server.edicts[PR.globals_int[PR.globalvars.self]];
	var l = Mod.PointInLeaf([
			self.v_float[PR.entvars.origin] + self.v_float[PR.entvars.view_ofs],
			self.v_float[PR.entvars.origin1] + self.v_float[PR.entvars.view_ofs1],
			self.v_float[PR.entvars.origin2] + self.v_float[PR.entvars.view_ofs2]
		], SV.server.worldmodel).num - 1;
	if ((l < 0) || ((PF.checkpvs[l >> 3] & (1 << (l & 7))) === 0))
	{
		PR.globals_int[1] = 0;
		return;
	}
	PR.globals_int[1] = ent.num;
};

PF.stuffcmd = function()
{
	var entnum = PR.globals_int[4];
	if ((entnum <= 0) || (entnum > SV.svs.maxclients))
		PR.RunError('Parm 0 not a client');
	var client = SV.svs.clients[entnum - 1];
	MSG.WriteByte(client.message, Protocol.svc.stufftext);
	MSG.WriteString(client.message, PR.GetString(PR.globals_int[7]));
};

PF.localcmd = function()
{
	Cmd.text += PR.GetString(PR.globals_int[4]);
};

PF.cvar = function()
{
	var v = Cvar.FindVar(PR.GetString(PR.globals_int[4]));
	PR.globals_float[1] = v != null ? v.value : 0.0;
};

PF.cvar_set = function()
{
	Cvar.Set(PR.GetString(PR.globals_int[4]), PR.GetString(PR.globals_int[7]));
};

PF.findradius = function()
{
	var chain = 0;
	var org = [PR.globals_float[4], PR.globals_float[5], PR.globals_float[6]], eorg = [];
	var rad = PR.globals_float[7];
	var i, ent;
	for (i = 1; i < SV.server.num_edicts; ++i)
	{
		ent = SV.server.edicts[i];
		if (ent.free === true)
			continue;
		if (ent.v_float[PR.entvars.solid] === SV.solid.not)
			continue;
		eorg[0] = org[0] - (ent.v_float[PR.entvars.origin] + (ent.v_float[PR.entvars.mins] + ent.v_float[PR.entvars.maxs]) * 0.5);
		eorg[1] = org[1] - (ent.v_float[PR.entvars.origin1] + (ent.v_float[PR.entvars.mins1] + ent.v_float[PR.entvars.maxs1]) * 0.5);
		eorg[2] = org[2] - (ent.v_float[PR.entvars.origin2] + (ent.v_float[PR.entvars.mins2] + ent.v_float[PR.entvars.maxs2]) * 0.5);
		if (Math.sqrt(eorg[0] * eorg[0] + eorg[1] * eorg[1] + eorg[2] * eorg[2]) > rad)
			continue;
		ent.v_int[PR.entvars.chain] = chain;
		chain = i;
	}
	PR.globals_int[1] = chain;
};

PF.dprint = function()
{
	Con.DPrint(PF.VarString(0));
};

PF.ftos = function()
{
	var v = PR.globals_float[4];
	if (v === Math.floor(v))
		PR.TempString(v.toString());
	else
		PR.TempString(v.toFixed(1));
	PR.globals_int[1] = PR.string_temp;
};

PF.fabs = function()
{
	PR.globals_float[1] = Math.abs(PR.globals_float[4]);
};

PF.vtos = function()
{
	PR.TempString(PR.globals_float[4].toFixed(1)
		+ ' ' + PR.globals_float[5].toFixed(1)
		+ ' ' + PR.globals_float[6].toFixed(1));
	PR.globals_int[1] = PR.string_temp;
};

PF.Spawn = function()
{
	PR.globals_int[1] = ED.Alloc().num;
};

PF.Remove = function()
{
	ED.Free(SV.server.edicts[PR.globals_int[4]]);
};

PF.Find = function()
{
	var e = PR.globals_int[4];
	var f = PR.globals_int[7];
	var s = PR.GetString(PR.globals_int[10]);
	var ed;
	for (++e; e < SV.server.num_edicts; ++e)
	{
		ed = SV.server.edicts[e];
		if (ed.free === true)
			continue;
		if (PR.GetString(ed.v_int[f]) === s)
		{
			PR.globals_int[1] = ed.num;
			return;
		}
	}
	PR.globals_int[1] = 0;
};

PF.MoveToGoal = function()
{
	var ent = SV.server.edicts[PR.globals_int[PR.globalvars.self]];
	if ((ent.v_float[PR.entvars.flags] & (SV.fl.onground + SV.fl.fly + SV.fl.swim)) === 0)
	{
		PR.globals_float[1] = 0.0;
		return;
	}
	var goal = SV.server.edicts[ent.v_int[PR.entvars.goalentity]];
	var dist = PR.globals_float[4];
	if ((ent.v_int[PR.entvars.enemy] !== 0) && (SV.CloseEnough(ent, goal, dist) === true))
		return;
	if ((Math.random() >= 0.75) || (SV.StepDirection(ent, ent.v_float[PR.entvars.ideal_yaw], dist) !== true))
		SV.NewChaseDir(ent, goal, dist);
};

PF.precache_file = function()
{
	PR.globals_int[1] = PR.globals_int[4];
};

PF.precache_sound = function()
{
	var s = PR.GetString(PR.globals_int[4]);
	PR.globals_int[1] = PR.globals_int[4];
	PR.CheckEmptyString(s);
	var i;
	for (i = 0; i < SV.server.sound_precache.length; ++i)
	{
		if (SV.server.sound_precache[i] === s)
			return;
	}
	SV.server.sound_precache[i] = s;
};

PF.precache_model = function()
{
	if (SV.server.loading !== true)
		PR.RunError('PF.Precache_*: Precache can only be done in spawn functions');
	var s = PR.GetString(PR.globals_int[4]);
	PR.globals_int[1] = PR.globals_int[4];
	PR.CheckEmptyString(s);
	var i;
	for (i = 0; i < SV.server.model_precache.length; ++i)
	{
		if (SV.server.model_precache[i] === s)
			return;
	}
	SV.server.model_precache[i] = s;
	SV.server.models[i] = Mod.ForName(s, true);
};

PF.coredump = function()
{
	ED.PrintEdicts();
};

PF.traceon = function()
{
	PR.trace = true;
};

PF.traceoff = function()
{
	PR.trace = false;
};

PF.eprint = function()
{
	ED.Print(SV.server.edicts[PR.globals_float[4]]);
};

PF.walkmove = function()
{
	var ent = SV.server.edicts[PR.globals_int[PR.globalvars.self]];
	if ((ent.v_float[PR.entvars.flags] & (SV.fl.onground + SV.fl.fly + SV.fl.swim)) === 0)
	{
		PR.globals_float[1] = 0.0;
		return;
	}
	var yaw = PR.globals_float[4] * Math.PI / 180.0;
	var dist = PR.globals_float[7];
	var oldf = PR.xfunction;
	PR.globals_float[1] = SV.movestep(ent, [Math.cos(yaw) * dist, Math.sin(yaw) * dist], true);
	PR.xfunction = oldf;
	PR.globals_int[PR.globalvars.self] = ent.num;
};

PF.droptofloor = function()
{
	var ent = SV.server.edicts[PR.globals_int[PR.globalvars.self]];
	var trace = SV.Move(ED.Vector(ent, PR.entvars.origin),
		ED.Vector(ent, PR.entvars.mins), ED.Vector(ent, PR.entvars.maxs),
		[ent.v_float[PR.entvars.origin], ent.v_float[PR.entvars.origin1], ent.v_float[PR.entvars.origin2] - 256.0], 0, ent);
	if ((trace.fraction === 1.0) || (trace.allsolid === true))
	{
		PR.globals_float[1] = 0.0;
		return;
	}
	ED.SetVector(ent, PR.entvars.origin, trace.endpos);
	SV.LinkEdict(ent);
	ent.v_float[PR.entvars.flags] |= SV.fl.onground;
	ent.v_int[PR.entvars.groundentity] = trace.ent.num;
	PR.globals_float[1] = 1.0;
};

PF.lightstyle = function()
{
	var style = PR.globals_float[4] >> 0;
	var val = PR.GetString(PR.globals_int[7]);
	SV.server.lightstyles[style] = val;
	if (SV.server.loading === true)
		return;
	var i, client;
	for (i = 0; i < SV.svs.maxclients; ++i)
	{
		client = SV.svs.clients[i];
		if ((client.active !== true) && (client.spawned !== true))
			continue;
		MSG.WriteByte(client.message, Protocol.svc.lightstyle);
		MSG.WriteByte(client.message, style);
		MSG.WriteString(client.message, val);
	}
};

PF.rint = function()
{
	var f = PR.globals_float[4];
	PR.globals_float[1] = (f >= 0.0 ? f + 0.5 : f - 0.5) >> 0;
};

PF.floor = function()
{
	PR.globals_float[1] = Math.floor(PR.globals_float[4]);
};

PF.ceil = function()
{
	PR.globals_float[1] = Math.ceil(PR.globals_float[4]);
};

PF.checkbottom = function()
{
	PR.globals_float[1] = SV.CheckBottom(SV.server.edicts[PR.globals_int[4]]);
};

PF.pointcontents = function()
{
	PR.globals_float[1] = SV.PointContents([PR.globals_float[4], PR.globals_float[5], PR.globals_float[6]]);
};

PF.nextent = function()
{
	var i;
	for (i = PR.globals_int[4] + 1; i < SV.server.num_edicts; ++i)
	{
		if (SV.server.edicts[i].free !== true)
		{
			PR.globals_int[1] = i;
			return;
		}
	}
	PR.globals_int[1] = 0;
};

PF.aim = function()
{
	var ent = SV.server.edicts[PR.globals_int[4]];
	var start = [ent.v_float[PR.entvars.origin], ent.v_float[PR.entvars.origin1], ent.v_float[PR.entvars.origin2] + 20.0];
	var dir = [PR.globals_float[PR.globalvars.v_forward], PR.globals_float[PR.globalvars.v_forward1], PR.globals_float[PR.globalvars.v_forward2]];
	var end = [start[0] + 2048.0 * dir[0], start[1] + 2048.0 * dir[1], start[2] + 2048.0 * dir[2]];
	var tr = SV.Move(start, Vec.origin, Vec.origin, end, 0, ent);
	if (tr.ent != null)
	{
		if ((tr.ent.v_float[PR.entvars.takedamage] === SV.damage.aim) &&
			((Host.teamplay.value === 0) || (ent.v_float[PR.entvars.team] <= 0) ||
			(ent.v_float[PR.entvars.team] !== tr.ent.v_float[PR.entvars.team])))
		{
			PR.globals_float[1] = dir[0];
			PR.globals_float[2] = dir[1];
			PR.globals_float[3] = dir[2];
			return;
		}
	}
	var bestdir = [dir[0], dir[1], dir[2]];
	var bestdist = SV.aim.value;
	var bestent, i, check, dist, end = [];
	for (i = 1; i < SV.server.num_edicts; ++i)
	{
		check = SV.server.edicts[i];
		if (check.v_float[PR.entvars.takedamage] !== SV.damage.aim)
			continue;
		if (check === ent)
			continue;
		if ((Host.teamplay.value !== 0) && (ent.v_float[PR.entvars.team] > 0) && (ent.v_float[PR.entvars.team] === check.v_float[PR.entvars.team]))
			continue;
		end[0] = check.v_float[PR.entvars.origin] + 0.5 * (check.v_float[PR.entvars.mins] + check.v_float[PR.entvars.maxs]);
		end[1] = check.v_float[PR.entvars.origin1] + 0.5 * (check.v_float[PR.entvars.mins1] + check.v_float[PR.entvars.maxs1]);
		end[2] = check.v_float[PR.entvars.origin2] + 0.5 * (check.v_float[PR.entvars.mins2] + check.v_float[PR.entvars.maxs2]);
		dir[0] = end[0] - start[0];
		dir[1] = end[1] - start[1];
		dir[2] = end[2] - start[2];
		Vec.Normalize(dir);
		dist = dir[0] * bestdir[0] + dir[1] * bestdir[1] + dir[2] * bestdir[2];
		if (dist < bestdist)
			continue;
		tr = SV.Move(start, Vec.origin, Vec.origin, end, 0, ent);
		if (tr.ent === check)
		{
			bestdist = dist;
			bestent = check;
		}
	}
	if (bestent != null)
	{
		dir[0] = bestent.v_float[PR.entvars.origin] - ent.v_float[PR.entvars.origin];
		dir[1] = bestent.v_float[PR.entvars.origin1] - ent.v_float[PR.entvars.origin1];
		dir[2] = bestent.v_float[PR.entvars.origin2] - ent.v_float[PR.entvars.origin2];
		dist = dir[0] * bestdir[0] + dir[1] * bestdir[1] + dir[2] * bestdir[2];
		end[0] = bestdir[0] * dist;
		end[1] = bestdir[1] * dist;
		end[2] = dir[2];
		Vec.Normalize(end);
		PR.globals_float[1] = end[0];
		PR.globals_float[2] = end[1];
		PR.globals_float[3] = end[2];
		return;
	}
	PR.globals_float[1] = bestdir[0];
	PR.globals_float[2] = bestdir[1];
	PR.globals_float[3] = bestdir[2];
};

PF.changeyaw = function()
{
	var ent = SV.server.edicts[PR.globals_int[PR.globalvars.self]];
	var current = Vec.Anglemod(ent.v_float[PR.entvars.angles1]);
	var ideal = ent.v_float[PR.entvars.ideal_yaw];
	if (current === ideal)
		return;
	var move = ideal - current;
	if (ideal > current)
	{
		if (move >= 180.0)
			move -= 360.0;
	}
	else if (move <= -180.0)
		move += 360.0;
	var speed = ent.v_float[PR.entvars.yaw_speed];
	if (move > 0.0)
	{
		if (move > speed)
			move = speed;
	}
	else if (move < -speed)
		move = -speed;
	ent.v_float[PR.entvars.angles1] = Vec.Anglemod(current + move);
};

PF.WriteDest = function()
{
	switch (PR.globals_float[4] >> 0)
	{
	case 0: // broadcast
		return SV.server.datagram;
	case 1: // one
		var entnum = PR.globals_int[PR.globalvars.msg_entity];
		if ((entnum <= 0) || (entnum > SV.svs.maxclients))
			PR.RunError('WriteDest: not a client');
		return SV.svs.clients[entnum - 1].message;
	case 2: // all
		return SV.server.reliable_datagram;
	case 3: // init
		return SV.server.signon;
	}
	PR.RunError('WriteDest: bad destination');
};

PF.WriteByte = function() {MSG.WriteByte(PF.WriteDest(), PR.globals_float[7]);};
PF.WriteChar = function() {MSG.WriteChar(PF.WriteDest(), PR.globals_float[7]);};
PF.WriteShort = function() {MSG.WriteShort(PF.WriteDest(), PR.globals_float[7]);};
PF.WriteLong = function() {MSG.WriteLong(PF.WriteDest(), PR.globals_float[7]);};
PF.WriteAngle = function() {MSG.WriteAngle(PF.WriteDest(), PR.globals_float[7]);};
PF.WriteCoord = function() {MSG.WriteCoord(PF.WriteDest(), PR.globals_float[7]);};
PF.WriteString = function() {MSG.WriteString(PF.WriteDest(), PR.GetString(PR.globals_int[7]));};
PF.WriteEntity = function() {MSG.WriteShort(PF.WriteDest(), PR.globals_int[7]);};

PF.makestatic = function()
{
	var ent = SV.server.edicts[PR.globals_int[4]];
	var message = SV.server.signon;
	MSG.WriteByte(message, Protocol.svc.spawnstatic);
	MSG.WriteByte(message, SV.ModelIndex(PR.GetString(ent.v_int[PR.entvars.model])));
	MSG.WriteByte(message, ent.v_float[PR.entvars.frame]);
	MSG.WriteByte(message, ent.v_float[PR.entvars.colormap]);
	MSG.WriteByte(message, ent.v_float[PR.entvars.skin]);
	MSG.WriteCoord(message, ent.v_float[PR.entvars.origin]);
	MSG.WriteAngle(message, ent.v_float[PR.entvars.angles]);
	MSG.WriteCoord(message, ent.v_float[PR.entvars.origin1]);
	MSG.WriteAngle(message, ent.v_float[PR.entvars.angles1]);
	MSG.WriteCoord(message, ent.v_float[PR.entvars.origin2]);
	MSG.WriteAngle(message, ent.v_float[PR.entvars.angles2]);
	ED.Free(ent);
};

PF.setspawnparms = function()
{
	var i = PR.globals_int[4];
	if ((i <= 0) || (i > SV.svs.maxclients))
		PR.RunError('Entity is not a client');
	var spawn_parms = SV.svs.clients[i - 1].spawn_parms;
	for (i = 0; i <= 15; ++i)
		PR.globals_float[PR.globalvars.parms + i] = spawn_parms[i];
};

PF.changelevel = function()
{
	if (SV.svs.changelevel_issued === true)
		return;
	SV.svs.changelevel_issued = true;
	Cmd.text += 'changelevel ' + PR.GetString(PR.globals_int[4]) + '\n';
};

PF.Fixme = function()
{
	PR.RunError('unimplemented builtin');
};

PF.builtin = [
	PF.Fixme,
	PF.makevectors,
	PF.setorigin,
	PF.setmodel,
	PF.setsize,
	PF.Fixme,
	PF.breakstatement,
	PF.random,
	PF.sound,
	PF.normalize,
	PF.error,
	PF.objerror,
	PF.vlen,
	PF.vectoyaw,
	PF.Spawn,
	PF.Remove,
	PF.traceline,
	PF.checkclient,
	PF.Find,
	PF.precache_sound,
	PF.precache_model,
	PF.stuffcmd,
	PF.findradius,
	PF.bprint,
	PF.sprint,
	PF.dprint,
	PF.ftos,
	PF.vtos,
	PF.coredump,
	PF.traceon,
	PF.traceoff,
	PF.eprint,
	PF.walkmove,
	PF.Fixme,
	PF.droptofloor,
	PF.lightstyle,
	PF.rint,
	PF.floor,
	PF.ceil,
	PF.Fixme,
	PF.checkbottom,
	PF.pointcontents,
	PF.Fixme,
	PF.fabs,
	PF.aim,
	PF.cvar,
	PF.localcmd,
	PF.nextent,
	PF.particle,
	PF.changeyaw,
	PF.Fixme,
	PF.vectoangles,
	PF.WriteByte,
	PF.WriteChar,
	PF.WriteShort,
	PF.WriteLong,
	PF.WriteCoord,
	PF.WriteAngle,
	PF.WriteString,
	PF.WriteEntity,
	PF.Fixme,
	PF.Fixme,
	PF.Fixme,
	PF.Fixme,
	PF.Fixme,
	PF.Fixme,
	PF.Fixme,
	PF.MoveToGoal,
	PF.precache_file,
	PF.makestatic,
	PF.changelevel,
	PF.Fixme,
	PF.cvar_set,
	PF.centerprint,
	PF.ambientsound,
	PF.precache_model,
	PF.precache_sound,
	PF.precache_file,
	PF.setspawnparms
];