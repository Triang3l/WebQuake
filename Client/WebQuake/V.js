V = {};

V.dmg_time = 0.0;

V.CalcRoll = function(angles, velocity)
{
	var right = [];
	Vec.AngleVectors(angles, null, right);
	var side = velocity[0] * right[0] + velocity[1] * right[1] + velocity[2] * right[2];
	var sign = side < 0 ? -1 : 1;
	side = Math.abs(side);
	if (side < V.rollspeed.value)
		return side * sign * V.rollangle.value / V.rollspeed.value;
	return V.rollangle.value * sign;
};

V.CalcBob = function()
{
	if ((V.bobcycle.value <= 0.0)
		|| (V.bobcycle.value >= 1.0)
		|| (V.bobup.value <= 0.0)
		|| (V.bobup.value >= 1.0)
		|| (V.bob.value === 0.0))
		return 0.0;

	var cycle = (CL.state.time - Math.floor(CL.state.time / V.bobcycle.value) * V.bobcycle.value) / V.bobcycle.value;
	if (cycle < V.bobup.value)
		cycle = Math.PI * cycle / V.bobup.value;
	else
		cycle = Math.PI + Math.PI * (cycle - V.bobup.value) / (1.0 - V.bobup.value);
	var bob = Math.sqrt(CL.state.velocity[0] * CL.state.velocity[0] + CL.state.velocity[1] * CL.state.velocity[1]) * V.bob.value;
	bob = bob * 0.3 + bob * 0.7 * Math.sin(cycle);
	if (bob > 4.0)
		bob = 4.0;
	else if (bob < -7.0)
		bob = -7.0;
	return bob;
};

V.StartPitchDrift = function()
{
	if (CL.state.laststop === CL.state.time)
		return;
	if ((CL.state.nodrift === true) || (CL.state.pitchvel === 0.0))
	{
		CL.state.pitchvel = V.centerspeed.value;
		CL.state.nodrift = false;
		CL.state.driftmove = 0.0;
	}
};

V.StopPitchDrift = function()
{
	CL.state.laststop = CL.state.time;
	CL.state.nodrift = true;
	CL.state.pitchvel = 0.0;
};

V.DriftPitch = function()
{
	if ((Host.noclip_anglehack === true) || (CL.state.onground !== true) || (CL.cls.demoplayback === true))
	{
		CL.state.driftmove = 0.0;
		CL.state.pitchvel = 0.0;
		return;
	}

	if (CL.state.nodrift === true)
	{
		if (Math.abs(CL.state.cmd.forwardmove) < CL.forwardspeed.value)
			CL.state.driftmove = 0.0;
		else
			CL.state.driftmove += Host.frametime;
		if (CL.state.driftmove > V.centermove.value)
			V.StartPitchDrift();
		return;
	}

	var delta = CL.state.idealpitch - CL.state.viewangles[0];
	if (delta === 0.0)
	{
		CL.state.pitchvel = 0.0;
		return;
	}

	var move = Host.frametime * CL.state.pitchvel;
	CL.state.pitchvel += Host.frametime * V.centerspeed.value;

	if (delta > 0)
	{
		if (move > delta)
		{
			CL.state.pitchvel = 0.0;
			move = delta;
		}
		CL.state.viewangles[0] += move;
	}
	else if (delta < 0)
	{
		if (move > -delta)
		{
			CL.state.pitchvel = 0.0;
			move = -delta;
		}
		CL.state.viewangles[0] -= move;
	}
};

V.cshift_empty = [130.0, 80.0, 50.0, 0.0];
V.cshift_water = [130.0, 80.0, 50.0, 128.0];
V.cshift_slime = [0.0, 25.0, 5.0, 150.0];
V.cshift_lava = [255.0, 80.0, 0.0, 150.0];

V.blend = [0.0, 0.0, 0.0, 0.0];

V.ParseDamage = function()
{
	var armor = MSG.ReadByte();
	var blood = MSG.ReadByte();
	var ent = CL.entities[CL.state.viewentity];
	var from = [MSG.ReadCoord() - ent.origin[0], MSG.ReadCoord() - ent.origin[1], MSG.ReadCoord() - ent.origin[2]];
	Vec.Normalize(from);
	var count = (blood + armor) * 0.5;
	if (count < 10.0)
		count = 10.0;
	CL.state.faceanimtime = CL.state.time + 0.2;

	var cshift = CL.state.cshifts[CL.cshift.damage];
	cshift[3] += 3.0 * count;
	if (cshift[3] < 0.0)
		cshift[3] = 0.0;
	else if (cshift[3] > 150.0)
		cshift[3] = 150.0;

	if (armor > blood)
	{
		cshift[0] = 200.0;
		cshift[1] = cshift[2] = 100.0;
	}
	else if (armor !== 0)
	{
		cshift[0] = 220.0;
		cshift[1] = cshift[2] = 50.0;
	}
	else
	{
		cshift[0] = 255.0;
		cshift[1] = cshift[2] = 0.0;
	}

	var forward = [], right = [];
	Vec.AngleVectors(ent.angles, forward, right);
	V.dmg_roll = count * (from[0] * right[0] + from[1] * right[1] + from[2] * right[2]) * V.kickroll.value;
	V.dmg_pitch = count * (from[0] * forward[0] + from[1] * forward[1] + from[2] * forward[2]) * V.kickpitch.value;
	V.dmg_time = V.kicktime.value;
};

V.cshift_f = function()
{
	var cshift = V.cshift_empty;
	cshift[0] = Q.atoi(Cmd.argv[1]);
	cshift[1] = Q.atoi(Cmd.argv[2]);
	cshift[2] = Q.atoi(Cmd.argv[3]);
	cshift[3] = Q.atoi(Cmd.argv[4]);
};

V.BonusFlash_f = function()
{
	var cshift = CL.state.cshifts[CL.cshift.bonus];
	cshift[0] = 215.0;
	cshift[1] = 186.0;
	cshift[2] = 69.0;
	cshift[3] = 50.0;
};

V.SetContentsColor = function(contents)
{
	switch (contents)
	{
	case Mod.contents.empty:
	case Mod.contents.solid:
		CL.state.cshifts[CL.cshift.contents] = V.cshift_empty;
		return;
	case Mod.contents.lava:
		CL.state.cshifts[CL.cshift.contents] = V.cshift_lava;
		return;
	case Mod.contents.slime:
		CL.state.cshifts[CL.cshift.contents] = V.cshift_slime;
		return;
	}
	CL.state.cshifts[CL.cshift.contents] = V.cshift_water;
};

V.CalcBlend = function()
{
	var cshift = CL.state.cshifts[CL.cshift.powerup];
	if ((CL.state.items & Def.it.quad) !== 0)
	{
		cshift[0] = 0.0;
		cshift[1] = 0.0;
		cshift[2] = 255.0;
		cshift[3] = 30.0;
	}
	else if ((CL.state.items & Def.it.suit) !== 0)
	{
		cshift[0] = 0.0;
		cshift[1] = 255.0;
		cshift[2] = 0.0;
		cshift[3] = 20.0;
	}
	else if ((CL.state.items & Def.it.invisibility) !== 0)
	{
		cshift[0] = 100.0;
		cshift[1] = 100.0;
		cshift[2] = 100.0;
		cshift[3] = 100.0;
	}
	else if ((CL.state.items & Def.it.invulnerability) !== 0)
	{
		cshift[0] = 255.0;
		cshift[1] = 255.0;
		cshift[2] = 0.0;
		cshift[3] = 30.0;
	}
	else
		cshift[3] = 0.0;

	CL.state.cshifts[CL.cshift.damage][3] -= Host.frametime * 150.0;
	if (CL.state.cshifts[CL.cshift.damage][3] < 0.0)
		CL.state.cshifts[CL.cshift.damage][3] = 0.0;
	CL.state.cshifts[CL.cshift.bonus][3] -= Host.frametime * 100.0;
	if (CL.state.cshifts[CL.cshift.bonus][3] < 0.0)
		CL.state.cshifts[CL.cshift.bonus][3] = 0.0;

	if (V.cshiftpercent.value === 0)
	{
		V.blend[0] = V.blend[1] = V.blend[2] = V.blend[3] = 0.0;
		return;
	}

	var r = 0.0, g = 0.0, b = 0.0, a = 0.0, a2, i, cshift;
	for (i = 0; i <= 3; ++i)
	{
		cshift = CL.state.cshifts[i];
		a2 = cshift[3] * V.cshiftpercent.value / 25500.0;
		if (a2 === 0.0)
			continue;
		a = a + a2 * (1.0 - a);
		a2 = a2 / a;
		r = r * (1.0 - a2) + cshift[0] * a2;
		g = g * (1.0 - a2) + cshift[1] * a2;
		b = b * (1.0 - a2) + cshift[2] * a2;
	}
	if (a > 1.0)
		a = 1.0;
	else if (a < 0.0)
		a = 0.0;
	V.blend[0] = r;
	V.blend[1] = g;
	V.blend[2] = b;
	V.blend[3] = a;
	if (V.blend[3] > 1.0)
		V.blend[3] = 1.0;
	else if (V.blend[3] < 0.0)
		V.blend[3] = 0.0;
};

V.CalcIntermissionRefdef = function()
{
	var ent = CL.entities[CL.state.viewentity];
	R.refdef.vieworg[0] = ent.origin[0];
	R.refdef.vieworg[1] = ent.origin[1];
	R.refdef.vieworg[2] = ent.origin[2];
	R.refdef.viewangles[0] = ent.angles[0] + Math.sin(CL.state.time * V.ipitch_cycle.value) * V.ipitch_level.value;
	R.refdef.viewangles[1] = ent.angles[1] + Math.sin(CL.state.time * V.iyaw_cycle.value) * V.iyaw_level.value;
	R.refdef.viewangles[2] = ent.angles[2] + Math.sin(CL.state.time * V.iroll_cycle.value) * V.iroll_level.value;
	CL.state.viewent.model = null;
};

V.oldz = 0.0;
V.CalcRefdef = function()
{
	V.DriftPitch();

	var ent = CL.entities[CL.state.viewentity];
	ent.angles[1] = CL.state.viewangles[1];
	ent.angles[0] = -CL.state.viewangles[0];
	var bob = V.CalcBob();

	R.refdef.vieworg[0] = ent.origin[0] + 0.03125;
	R.refdef.vieworg[1] = ent.origin[1] + 0.03125;
	R.refdef.vieworg[2] = ent.origin[2] + CL.state.viewheight + bob + 0.03125;

	R.refdef.viewangles[0] = CL.state.viewangles[0];
	R.refdef.viewangles[1] = CL.state.viewangles[1];
	R.refdef.viewangles[2] = CL.state.viewangles[2] + V.CalcRoll(CL.entities[CL.state.viewentity].angles, CL.state.velocity);

	if (V.dmg_time > 0.0)
	{
		if (V.kicktime.value !== 0.0)
		{
			R.refdef.viewangles[2] += (V.dmg_time / V.kicktime.value) * V.dmg_roll;
			R.refdef.viewangles[0] -= (V.dmg_time / V.kicktime.value) * V.dmg_pitch;
		}
		V.dmg_time -= Host.frametime;
	}
	if (CL.state.stats[Def.stat.health] <= 0)
		R.refdef.viewangles[2] = 80.0;

	var ipitch = V.idlescale.value * Math.sin(CL.state.time * V.ipitch_cycle.value) * V.ipitch_level.value;
	var iyaw = V.idlescale.value * Math.sin(CL.state.time * V.iyaw_cycle.value) * V.iyaw_level.value;
	var iroll = V.idlescale.value * Math.sin(CL.state.time * V.iroll_cycle.value) * V.iroll_level.value;
	R.refdef.viewangles[0] += ipitch;
	R.refdef.viewangles[1] += iyaw;
	R.refdef.viewangles[2] += iroll;

	var forward = [], right = [], up = [];
	Vec.AngleVectors([-ent.angles[0], ent.angles[1], ent.angles[2]], forward, right, up);
	R.refdef.vieworg[0] += V.ofsx.value * forward[0] + V.ofsy.value * right[0] + V.ofsz.value * up[0];
	R.refdef.vieworg[1] += V.ofsx.value * forward[1] + V.ofsy.value * right[1] + V.ofsz.value * up[1];
	R.refdef.vieworg[2] += V.ofsx.value * forward[2] + V.ofsy.value * right[2] + V.ofsz.value * up[2];

	if (R.refdef.vieworg[0] < (ent.origin[0] - 14.0))
		R.refdef.vieworg[0] = ent.origin[0] - 14.0;
	else if (R.refdef.vieworg[0] > (ent.origin[0] + 14.0))
		R.refdef.vieworg[0] = ent.origin[0] + 14.0;
	if (R.refdef.vieworg[1] < (ent.origin[1] - 14.0))
		R.refdef.vieworg[1] = ent.origin[1] - 14.0;
	else if (R.refdef.vieworg[1] > (ent.origin[1] + 14.0))
		R.refdef.vieworg[1] = ent.origin[1] + 14.0;
	if (R.refdef.vieworg[2] < (ent.origin[2] - 22.0))
		R.refdef.vieworg[2] = ent.origin[2] - 22.0;
	else if (R.refdef.vieworg[2] > (ent.origin[2] + 30.0))
		R.refdef.vieworg[2] = ent.origin[2] + 30.0;

	var view = CL.state.viewent;
	view.angles[0] = -R.refdef.viewangles[0] - ipitch;
	view.angles[1] = R.refdef.viewangles[1] - iyaw;
	view.angles[2] = CL.state.viewangles[2] - iroll;
	view.origin[0] = ent.origin[0] + forward[0] * bob * 0.4;
	view.origin[1] = ent.origin[1] + forward[1] * bob * 0.4;
	view.origin[2] = ent.origin[2] + CL.state.viewheight + forward[2] * bob * 0.4 + bob;
	switch (SCR.viewsize.value)
	{
	case 110:
	case 90:
		view.origin[2] += 1.0;
		break;
	case 100:
		view.origin[2] += 2.0;
		break;
	case 80:
		view.origin[2] += 0.5;
	}
	view.model = CL.state.model_precache[CL.state.stats[Def.stat.weapon]];
	view.frame = CL.state.stats[Def.stat.weaponframe];

	R.refdef.viewangles[0] += CL.state.punchangle[0];
	R.refdef.viewangles[1] += CL.state.punchangle[1];
	R.refdef.viewangles[2] += CL.state.punchangle[2];

	if ((CL.state.onground === true) && ((ent.origin[2] - V.oldz) > 0.0))
	{
		var steptime = CL.state.time - CL.state.oldtime;
		if (steptime < 0.0)
			steptime = 0.0;
		V.oldz += steptime * 80.0;
		if (V.oldz > ent.origin[2])
			V.oldz = ent.origin[2];
		else if ((ent.origin[2] - V.oldz) > 12.0)
			V.oldz = ent.origin[2] - 12.0;
		R.refdef.vieworg[2] += V.oldz - ent.origin[2];
		view.origin[2] += V.oldz - ent.origin[2];
	}
	else
		V.oldz = ent.origin[2];
	if (Chase.active.value !== 0)
		Chase.Update();
};

V.RenderView = function()
{
	if (Con.forcedup === true)
		return;
	if (CL.state.maxclients >= 2)
	{
		Cvar.Set('scr_ofsx', '0');
		Cvar.Set('scr_ofsy', '0');
		Cvar.Set('scr_ofsz', '0');
	}
	if (CL.state.intermission !== 0)
		V.CalcIntermissionRefdef();
	else if (CL.state.paused !== true)
		V.CalcRefdef();
	R.PushDlights();
	R.RenderView();
};

V.Init = function()
{
	Cmd.AddCommand('v_cshift', V.cshift_f);
	Cmd.AddCommand('bf', V.BonusFlash_f);
	Cmd.AddCommand('centerview', V.StartPitchDrift);
	V.centermove = Cvar.RegisterVariable('v_centermove', '0.15');
	V.centerspeed = Cvar.RegisterVariable('v_centerspeed', '500');
	V.iyaw_cycle = Cvar.RegisterVariable('v_iyaw_cycle', '2');
	V.iroll_cycle = Cvar.RegisterVariable('v_iroll_cycle', '0.5');
	V.ipitch_cycle = Cvar.RegisterVariable('v_ipitch_cycle', '1');
	V.iyaw_level = Cvar.RegisterVariable('v_iyaw_level', '0.3');
	V.iroll_level = Cvar.RegisterVariable('v_iroll_level', '0.1');
	V.ipitch_level = Cvar.RegisterVariable('v_ipitch_level', '0.3');
	V.idlescale = Cvar.RegisterVariable('v_idlescale', '0');
	V.crosshair = Cvar.RegisterVariable('crosshair', '0', true);
	V.crossx = Cvar.RegisterVariable('cl_crossx', '0');
	V.crossy = Cvar.RegisterVariable('cl_crossy', '0');
	V.cshiftpercent = Cvar.RegisterVariable('gl_cshiftpercent', '100');
	V.ofsx = Cvar.RegisterVariable('scr_ofsx', '0');
	V.ofsy = Cvar.RegisterVariable('scr_ofsy', '0');
	V.ofsz = Cvar.RegisterVariable('scr_ofsz', '0');
	V.rollspeed = Cvar.RegisterVariable('cl_rollspeed', '200');
	V.rollangle = Cvar.RegisterVariable('cl_rollangle', '2.0');
	V.bob = Cvar.RegisterVariable('cl_bob', '0.02');
	V.bobcycle = Cvar.RegisterVariable('cl_bobcycle', '0.6');
	V.bobup = Cvar.RegisterVariable('cl_bobup', '0.5');
	V.kicktime = Cvar.RegisterVariable('v_kicktime', '0.5');
	V.kickroll = Cvar.RegisterVariable('v_kickroll', '0.6');
	V.kickpitch = Cvar.RegisterVariable('v_kickpitch', '0.6');
	V.gamma = Cvar.RegisterVariable('gamma', '1', true);
};