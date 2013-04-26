ED = {};

ED.ClearEdict = function(e)
{
	var i;
	for (i = 0; i < PR.entityfields; ++i)
		e.v_int[i] = 0;
	e.free = false;
};

ED.Alloc = function()
{
	var i, e;
	for (i = SV.svs.maxclients + 1; i < SV.server.num_edicts; ++i)
	{
		e = SV.server.edicts[i];
		if ((e.free === true) && ((e.freetime < 2.0) || ((SV.server.time - e.freetime) > 0.5)))
		{
			ED.ClearEdict(e);
			return e;
		}
	}
	if (i === Def.max_edicts)
		Sys.Error('ED.Alloc: no free edicts');
	e = SV.server.edicts[SV.server.num_edicts++];
	ED.ClearEdict(e);
	return e;
};

ED.Free = function(ed)
{
	SV.UnlinkEdict(ed);
	ed.free = true;
	ed.v_int[PR.entvars.model] = 0;
	ed.v_float[PR.entvars.takedamage] = 0.0;
	ed.v_float[PR.entvars.modelindex] = 0.0;
	ed.v_float[PR.entvars.colormap] = 0.0;
	ed.v_float[PR.entvars.skin] = 0.0;
	ed.v_float[PR.entvars.frame] = 0.0;
	ED.SetVector(ed, PR.entvars.origin, Vec.origin);
	ED.SetVector(ed, PR.entvars.angles, Vec.origin);
	ed.v_float[PR.entvars.nextthink] = -1.0;
	ed.v_float[PR.entvars.solid] = 0.0;
	ed.freetime = SV.server.time;
};

ED.GlobalAtOfs = function(ofs)
{
	var i, def;
	for (i = 0; i < PR.globaldefs.length; ++i)
	{
		def = PR.globaldefs[i];
		if (def.ofs === ofs)
			return def;
	}
};

ED.FieldAtOfs = function(ofs)
{
	var i, def;
	for (i = 0; i < PR.fielddefs.length; ++i)
	{
		def = PR.fielddefs[i];
		if (def.ofs === ofs)
			return def;
	}
};

ED.FindField = function(name)
{
	var def, i;
	for (i = 0; i < PR.fielddefs.length; ++i)
	{
		def = PR.fielddefs[i];
		if (PR.GetString(def.name) === name)
			return def;
	}
};

ED.FindGlobal = function(name)
{
	var def, i;
	for (i = 0; i < PR.globaldefs.length; ++i)
	{
		def = PR.globaldefs[i];
		if (PR.GetString(def.name) === name)
			return def;
	}
};

ED.FindFunction = function(name)
{
	var i;
	for (i = 0; i < PR.functions.length; ++i)
	{
		if (PR.GetString(PR.functions[i].name) === name)
			return i;
	}
};

ED.Print = function(ed)
{
	if (ed.free === true)
	{
		Con.Print('FREE\n');
		return;
	}
	Con.Print('\nEDICT ' + ed.num + ':\n');
	var i, d, name, v, l;
	for (i = 1; i < PR.fielddefs.length; ++i)
	{
		d = PR.fielddefs[i];
		name = PR.GetString(d.name);
		if (name.charCodeAt(name.length - 2) === 95)
			continue;
		v = d.ofs;
		if (ed.v_int[v] === 0)
		{
			if ((d.type & 0x7fff) === 3)
			{
				if ((ed.v_int[v + 1] === 0) && (ed.v_int[v + 2] === 0))
					continue;
			}
			else
				continue;
		}
		for (; name.length <= 14; )
			name += ' ';
		Con.Print(name + PR.ValueString(d.type, ed.v, v) + '\n');
	}
};

ED.PrintEdicts = function()
{
	if (SV.server.active !== true)
		return;
	Con.Print(SV.server.num_edicts + ' entities\n');
	var i;
	for (i = 0; i < SV.server.num_edicts; ++i)
		ED.Print(SV.server.edicts[i]);
};

ED.PrintEdict_f = function()
{
	if (SV.server.active !== true)
		return;
	var i = Q.atoi(Cmd.argv[1]);
	if ((i >= 0) && (i < SV.server.num_edicts))
		ED.Print(SV.server.edicts[i]);
};

ED.Count = function()
{
	if (SV.server.active !== true)
		return;
	var i, ent, active = 0, models = 0, solid = 0, step = 0;
	for (i = 0; i < SV.server.num_edicts; ++i)
	{
		ent = SV.server.edicts[i];
		if (ent.free === true)
			continue;
		++active;
		if (ent.v_float[PR.entvars.solid] !== 0.0)
			++solid;
		if (ent.v_int[PR.entvars.model] !== 0)
			++models;
		if (ent.v_float[PR.entvars.movetype] === SV.movetype.step)
			++step;
	}
	var num_edicts = SV.server.num_edicts;
	Con.Print('num_edicts:' + (num_edicts <= 9 ? '  ' : (num_edicts <= 99 ? ' ' : '')) + num_edicts + '\n');
	Con.Print('active    :' + (active <= 9 ? '  ' : (active <= 99 ? ' ' : '')) + active + '\n');
	Con.Print('view      :' + (models <= 9 ? '  ' : (models <= 99 ? ' ' : '')) + models + '\n');
	Con.Print('touch     :' + (solid <= 9 ? '  ' : (solid <= 99 ? ' ' : '')) + solid + '\n');
	Con.Print('step      :' + (step <= 9 ? '  ' : (step <= 99 ? ' ' : '')) + step + '\n');
};

ED.ParseGlobals = function(data)
{
	var keyname, key;
	for (;;)
	{
		data = COM.Parse(data);
		if (COM.token.charCodeAt(0) === 125)
			return;
		if (data == null)
			Sys.Error('ED.ParseGlobals: EOF without closing brace');
		keyname = COM.token;
		data = COM.Parse(data);
		if (data == null)
			Sys.Error('ED.ParseGlobals: EOF without closing brace');
		if (COM.token.charCodeAt(0) === 125)
			Sys.Error('ED.ParseGlobals: closing brace without data');
		key = ED.FindGlobal(keyname);
		if (key == null)
		{
			Con.Print('\'' + keyname + '\' is not a global\n');
			continue;
		}
		if (ED.ParseEpair(PR.globals, key, COM.token) !== true)
			Host.Error('ED.ParseGlobals: parse error');
	}
};

ED.NewString = function(string)
{
	var newstring = [], i, c;
	for (i = 0; i < string.length; ++i)
	{
		c = string.charCodeAt(i);
		if ((c === 92) && (i < (string.length - 1)))
		{
			++i;
			newstring[newstring.length] = (string.charCodeAt(i) === 110) ? '\n' : '\\';
		}
		else
			newstring[newstring.length] = String.fromCharCode(c);
	}
	return PR.NewString(newstring.join(''), string.length + 1);
};

ED.ParseEpair = function(base, key, s)
{
	var d_float = new Float32Array(base);
	var d_int = new Int32Array(base);
	var d, v;
	switch (key.type & 0x7fff)
	{
	case PR.etype.ev_string:
		d_int[key.ofs] = ED.NewString(s);
		return true;
	case PR.etype.ev_float:
		d_float[key.ofs] = Q.atof(s);
		return true;
	case PR.etype.ev_vector:
		v = s.split(' ');
		d_float[key.ofs] = Q.atof(v[0]);
		d_float[key.ofs + 1] = Q.atof(v[1]);
		d_float[key.ofs + 2] = Q.atof(v[2]);
		return true;
	case PR.etype.ev_entity:
		d_int[key.ofs] = Q.atoi(s);
		return true;
	case PR.etype.ev_field:
		d = ED.FindField(s);
		if (d == null)
		{
			Con.Print('Can\'t find field ' + s + '\n');
			return;
		}
		d_int[key.ofs] = d.ofs;
		return true;
	case PR.etype.ev_function:
		d = ED.FindFunction(s);
		if (d == null)
		{
			Con.Print('Can\'t find function ' + s + '\n');
			return;
		}
		d_int[key.ofs] = d;
	}
	return true;
};

ED.ParseEdict = function(data, ent)
{
	var i, init, anglehack, keyname, n, key;
	if (ent !== SV.server.edicts[0])
	{
		for (i = 0; i < PR.entityfields; ++i)
			ent.v_int[i] = 0;
	}
	for (;;)
	{
		data = COM.Parse(data);
		if (COM.token.charCodeAt(0) === 125)
			break;
		if (data == null)
			Sys.Error('ED.ParseEdict: EOF without closing brace');
		if (COM.token === 'angle')
		{
			COM.token = 'angles';
			anglehack = true;
		}
		else
		{
			anglehack = false;
			if (COM.token === 'light')
				COM.token = 'light_lev';
		}
		for (n = COM.token.length; n > 0; --n)
		{
			if (COM.token.charCodeAt(n - 1) !== 32)
				break;
		}
		keyname = COM.token.substring(0, n);
		data = COM.Parse(data);
		if (data == null)
			Sys.Error('ED.ParseEdict: EOF without closing brace');
		if (COM.token.charCodeAt(0) === 125)
			Sys.Error('ED.ParseEdict: closing brace without data');
		init = true;
		if (keyname.charCodeAt(0) === 95)
			continue;
		key = ED.FindField(keyname);
		if (key == null)
		{
			Con.Print('\'' + keyname + '\' is not a field\n');
			continue;
		}
		if (anglehack == true)
			COM.token = '0 ' + COM.token + ' 0';
		if (ED.ParseEpair(ent.v, key, COM.token) !== true)
			Host.Error('ED.ParseEdict: parse error');
	}
	if (init !== true)
		ent.free = true;
	return data;
};

ED.LoadFromFile = function(data)
{
	var ent, spawnflags, inhibit = 0, func;
	PR.globals_float[PR.globalvars.time] = SV.server.time;

	for (;;)
	{
		data = COM.Parse(data);
		if (data == null)
			break;
		if (COM.token.charCodeAt(0) !== 123)
			Sys.Error('ED.LoadFromFile: found ' + COM.token + ' when expecting {');

		if (ent == null)
			ent = SV.server.edicts[0];
		else
			ent = ED.Alloc();
		data = ED.ParseEdict(data, ent);

		spawnflags = ent.v_float[PR.entvars.spawnflags] >> 0;
		if (Host.deathmatch.value !== 0)
		{
			if ((spawnflags & 2048) !== 0)
			{
				ED.Free(ent);
				++inhibit;
				continue;
			}
		}
		else if (((Host.current_skill === 0) && ((spawnflags & 256) !== 0))
			|| ((Host.current_skill === 1) && ((spawnflags & 512) !== 0))
			|| ((Host.current_skill >= 2) && ((spawnflags & 1024) !== 0)))
		{
			ED.Free(ent);
			++inhibit;
			continue;
		}

		if (ent.v_int[PR.entvars.classname] === 0)
		{
			Con.Print('No classname for:\n');
			ED.Print(ent);
			ED.Free(ent);
			continue;
		}

		func = ED.FindFunction(PR.GetString(ent.v_int[PR.entvars.classname]));
		if (func == null)
		{
			Con.Print('No spawn function for:\n');
			ED.Print(ent);
			ED.Free(ent);
			continue;
		}

		PR.globals_int[PR.globalvars.self] = ent.num;
		PR.ExecuteProgram(func);
	}

	Con.DPrint(inhibit + ' entities inhibited\n');
};

ED.Vector = function(e, o)
{
	return [e.v_float[o], e.v_float[o + 1], e.v_float[o + 2]];
};

ED.SetVector = function(e, o, v)
{
	e.v_float[o] = v[0];
	e.v_float[o + 1] = v[1];
	e.v_float[o + 2] = v[2];
};