PR = {};

PR.etype = {
	ev_void: 0,
	ev_string: 1,
	ev_float: 2,
	ev_vector: 3,
	ev_entity: 4,
	ev_field: 5,
	ev_function: 6,
	ev_pointer: 7
};

PR.op = {
	done: 0,
	mul_f: 1, mul_v: 2, mul_fv: 3, mul_vf: 4,
	div_f: 5,
	add_f: 6, add_v: 7,
	sub_f: 8, sub_v: 9,
	eq_f: 10, eq_v: 11, eq_s: 12, eq_e: 13, eq_fnc: 14,
	ne_f: 15, ne_v: 16, ne_s: 17, ne_e: 18, ne_fnc: 19,
	le: 20, ge: 21, lt: 22, gt: 23,
	load_f: 24, load_v: 25, load_s: 26, load_ent: 27, load_fld: 28, load_fnc: 29,
	address: 30,
	store_f: 31, store_v: 32, store_s: 33, store_ent: 34, store_fld: 35, store_fnc: 36,
	storep_f: 37, storep_v: 38, storep_s: 39, storep_ent: 40, storep_fld: 41, storep_fnc: 42,
	ret: 43,
	not_f: 44, not_v: 45, not_s: 46, not_ent: 47, not_fnc: 48,
	jnz: 49, jz: 50,
	call0: 51, call1: 52, call2: 53, call3: 54, call4: 55, call5: 56, call6: 57, call7: 58, call8: 59,
	state: 60,
	jump: 61,
	and: 62, or: 63,
	bitand: 64, bitor: 65
};

PR.version = 6;

PR.globalvars = {
	self: 28, // edict
	other: 29, // edict
	world: 30, // edict
	time: 31, // float
	frametime: 32, // float
	force_retouch: 33, // float
	mapname: 34, // string
	deathmatch: 35, // float
	coop: 36, // float
	teamplay: 37, // float
	serverflags: 38, // float
	total_secrets: 39, // float
	total_monsters: 40, // float
	found_secrets: 41, // float
	killed_monsters: 42, // float
	parms: 43, // float[16]
	v_forward: 59, // vec3
	v_forward1: 60,
	v_forward2: 61,
	v_up: 62, // vec3
	v_up1: 63,
	v_up2: 64,
	v_right: 65, // vec3,
	v_right1: 66,
	v_right2: 67,
	trace_allsolid: 68, // float
	trace_startsolid: 69, // float
	trace_fraction: 70, // float
	trace_endpos: 71, // vec3
	trace_endpos1: 72,
	trace_endpos2: 73,
	trace_plane_normal: 74, // vec3
	trace_plane_normal1: 75,
	trace_plane_normal2: 76,
	trace_plane_dist: 77, // float
	trace_ent: 78, // edict
	trace_inopen: 79, // float
	trace_inwater: 80, // float
	msg_entity: 81, // edict
	main: 82, // func
	StartFrame: 83, // func
	PlayerPreThink: 84, // func
	PlayerPostThink: 85, // func
	ClientKill: 86, // func
	ClientConnect: 87, // func
	PutClientInServer: 88, // func
	ClientDisconnect: 89, // func
	SetNewParms: 90, // func
	SetChangeParms: 91 // func
};

PR.entvars = {
	modelindex: 0, // float
	absmin: 1, // vec3
	absmin1: 2,
	absmin2: 3,
	absmax: 4, // vec3
	absmax1: 5,
	absmax2: 6,
	ltime: 7, // float
	movetype: 8, // float
	solid: 9, // float
	origin: 10, // vec3
	origin1: 11,
	origin2: 12,
	oldorigin: 13, // vec3
	oldorigin1: 14,
	oldorigin2: 15,
	velocity: 16, // vec3
	velocity1: 17,
	velocity2: 18,
	angles: 19, // vec3
	angles1: 20,
	angles2: 21,
	avelocity: 22, // vec3
	avelocity1: 23,
	avelocity2: 24,
	punchangle: 25, // vec3
	punchangle1: 26,
	punchangle2: 27,
	classname: 28, // string
	model: 29, // string
	frame: 30, // float
	skin: 31, // float
	effects: 32, // float
	mins: 33, // vec3
	mins1: 34,
	mins2: 35,
	maxs: 36, // vec3
	maxs1: 37,
	maxs2: 38,
	size: 39, // vec3
	size1: 40,
	size2: 41,
	touch: 42, // func
	use: 43, // func
	think: 44, // func
	blocked: 45, // func
	nextthink: 46, // float
	groundentity: 47, // edict
	health: 48, // float
	frags: 49, // float
	weapon: 50, // float
	weaponmodel: 51, // string
	weaponframe: 52, // float
	currentammo: 53, // float
	ammo_shells: 54, // float
	ammo_nails: 55, // float
	ammo_rockets: 56, // float
	ammo_cells: 57, // float
	items: 58, // float
	takedamage: 59, // float
	chain: 60, // edict
	deadflag: 61, // float
	view_ofs: 62, // vec3
	view_ofs1: 63,
	view_ofs2: 64,
	button0: 65, // float
	button1: 66, // float
	button2: 67, // float
	impulse: 68, // float
	fixangle: 69, // float
	v_angle: 70, // vec3
	v_angle1: 71,
	v_angle2: 72,
	idealpitch: 73, // float
	netname: 74, // string
	enemy: 75, // edict
	flags: 76, // float
	colormap: 77, // float
	team: 78, // float
	max_health: 79, // float
	teleport_time: 80, // float
	armortype: 81, // float
	armorvalue: 82, // float
	waterlevel: 83, // float
	watertype: 84, // float
	ideal_yaw: 85, // float
	yaw_speed: 86, // float
	aiment: 87, // edict
	goalentity: 88, // edict
	spawnflags: 89, // float
	target: 90, // string
	targetname: 91, // string
	dmg_take: 92, // float
	dmg_save: 93, // float
	dmg_inflictor: 94, // edict
	owner: 95, // edict
	movedir: 96, // vec3
	movedir1: 97,
	movedir2: 98,
	message: 99, // string
	sounds: 100, // float
	noise: 101, // string
	noise1: 102, // string
	noise2: 103, // string
	noise3: 104 // string
};

PR.progheader_crc = 5927;

// cmds

PR.CheckEmptyString = function(s)
{
	var c = s.charCodeAt(0);
	if ((Q.isNaN(c) === true) || (c <= 32))
		PR.RunError('Bad string');
};

// edict

PR.ValueString = function(type, val, ofs)
{
	var val_float = new Float32Array(val);
	var val_int = new Int32Array(val);
	type &= 0x7fff;
	switch (type)
	{
	case PR.etype.ev_string:
		return PR.GetString(val_int[ofs]);
	case PR.etype.ev_entity:
		return 'entity ' + val_int[ofs];
	case PR.etype.ev_function:
		return PR.GetString(PR.functions[val_int[ofs]].name) + '()';
	case PR.etype.ev_field:
		var def = ED.FieldAtOfs(val_int[ofs]);
		if (def != null)
			return '.' + PR.GetString(def.name);
		return '.';
	case PR.etype.ev_void:
		return 'void';
	case PR.etype.ev_float:
		return val_float[ofs].toFixed(1);
	case PR.etype.ev_vector:
		return '\'' + val_float[ofs].toFixed(1) +
		' ' + val_float[ofs + 1].toFixed(1) +
		' ' + val_float[ofs + 2].toFixed(1) + '\'';
	case PR.etype.ev_pointer:
		return 'pointer';
	}
	return 'bad type ' + type;
};

PR.UglyValueString = function(type, val, ofs)
{
	var val_float = new Float32Array(val);
	var val_int = new Int32Array(val);
	type &= 0x7fff;
	switch (type)
	{
	case PR.etype.ev_string:
		return PR.GetString(val_int[ofs]);
	case PR.etype.ev_entity:
		return val_int[ofs].toString();
	case PR.etype.ev_function:
		return PR.GetString(PR.functions[val_int[ofs]].name);
	case PR.etype.ev_field:
		var def = ED.FieldAtOfs(val_int[ofs]);
		if (def != null)
			return PR.GetString(def.name);
		return '';
	case PR.etype.ev_void:
		return 'void';
	case PR.etype.ev_float:
		return val_float[ofs].toFixed(6);
	case PR.etype.ev_vector:
		return val_float[ofs].toFixed(6) +
		' ' + val_float[ofs + 1].toFixed(6) +
		' ' + val_float[ofs + 2].toFixed(6);
	}
	return 'bad type ' + type;
};

PR.GlobalString = function(ofs)
{
	var def = ED.GlobalAtOfs(ofs), line;
	if (def != null)
		line = ofs + '(' + PR.GetString(def.name) + ')' + PR.ValueString(def.type, PR.globals, ofs);
	else
		line = ofs + '(???)';
	for (; line.length <= 20; )
		line += ' ';
	return line;
};

PR.GlobalStringNoContents = function(ofs)
{
	var def = ED.GlobalAtOfs(ofs), line;
	if (def != null)
		line = ofs + '(' + PR.GetString(def.name) + ')';
	else
		line = ofs + '(???)';
	for (; line.length <= 20; )
		line += ' ';
	return line;
};

PR.LoadProgs = function()
{
	var progs = COM.LoadFile('progs.dat');
	if (progs == null)
		Sys.Error('PR.LoadProgs: couldn\'t load progs.dat');
	Con.DPrint('Programs occupy ' + (progs.byteLength >> 10) + 'K.\n');
	var view = new DataView(progs);

	var i = view.getUint32(0, true);
	if (i !== PR.version)
		Sys.Error('progs.dat has wrong version number (' + i + ' should be ' + PR.version + ')');
	if (view.getUint32(4, true) !== PR.progheader_crc)
		Sys.Error('progs.dat system vars have been modified, PR.js is out of date');

	PR.crc = CRC.Block(new Uint8Array(progs));

	PR.stack = [];
	PR.depth = 0;

	PR.localstack = [];
	for (i = 0; i < PR.localstack_size; ++i)
		PR.localstack[i] = 0;
	PR.localstack_used = 0;

	var ofs, num;

	ofs = view.getUint32(8, true);
	num = view.getUint32(12, true);
	PR.statements = [];
	for (i = 0; i < num; ++i)
	{
		PR.statements[i] = {
			op: view.getUint16(ofs, true),
			a: view.getInt16(ofs + 2, true),
			b: view.getInt16(ofs + 4, true),
			c: view.getInt16(ofs + 6, true)
		};
		ofs += 8;
	}

	ofs = view.getUint32(16, true);
	num = view.getUint32(20, true);
	PR.globaldefs = [];
	for (i = 0; i < num; ++i)
	{
		PR.globaldefs[i] = {
			type: view.getUint16(ofs, true),
			ofs: view.getUint16(ofs + 2, true),
			name: view.getUint32(ofs + 4, true)
		};
		ofs += 8;
	}

	ofs = view.getUint32(24, true);
	num = view.getUint32(28, true);
	PR.fielddefs = [];
	for (i = 0; i < num; ++i)
	{
		PR.fielddefs[i] = {
			type: view.getUint16(ofs, true),
			ofs: view.getUint16(ofs + 2, true),
			name: view.getUint32(ofs + 4, true)
		};
		ofs += 8;
	}

	ofs = view.getUint32(32, true);
	num = view.getUint32(36, true);
	PR.functions = [];
	for (i = 0; i < num; ++i)
	{
		PR.functions[i] = {
			first_statement: view.getInt32(ofs, true),
			parm_start: view.getUint32(ofs + 4, true),
			locals: view.getUint32(ofs + 8, true),
			profile: view.getUint32(ofs + 12, true),
			name: view.getUint32(ofs + 16, true),
			file: view.getUint32(ofs + 20, true),
			numparms: view.getUint32(ofs + 24, true),
			parm_size: [
				view.getUint8(ofs + 28), view.getUint8(ofs + 29),
				view.getUint8(ofs + 30), view.getUint8(ofs + 31),
				view.getUint8(ofs + 32), view.getUint8(ofs + 33),
				view.getUint8(ofs + 34), view.getUint8(ofs + 35)
			]
		};
		ofs += 36;
	}

	ofs = view.getUint32(40, true);
	num = view.getUint32(44, true);
	PR.strings = [];
	for (i = 0; i < num; ++i)
		PR.strings[i] = view.getUint8(ofs + i);
	PR.string_temp = PR.NewString('', 128);
	PR.netnames = PR.NewString('', SV.svs.maxclients << 5);

	ofs = view.getUint32(48, true);
	num = view.getUint32(52, true);
	PR.globals = new ArrayBuffer(num << 2);
	PR.globals_float = new Float32Array(PR.globals);
	PR.globals_int = new Int32Array(PR.globals);
	for (i = 0; i < num; ++i)
		PR.globals_int[i] = view.getInt32(ofs + (i << 2), true);

	PR.entityfields = view.getUint32(56, true);
	PR.edict_size = 96 + (PR.entityfields << 2);

	var fields = [
		'ammo_shells1',
		'ammo_nails1',
		'ammo_lava_nails',
		'ammo_rockets1',
		'ammo_multi_rockets',
		'ammo_cells1',
		'ammo_plasma',
		'gravity',
		'items2'
	], field, def;
	for (i = 0; i < fields.length; ++i)
	{
		field = fields[i];
		def = ED.FindField(field);
		PR.entvars[field] = (def != null) ? def.ofs : null;
	}
};

PR.Init = function()
{
	Cmd.AddCommand('edict', ED.PrintEdict_f);
	Cmd.AddCommand('edicts', ED.PrintEdicts);
	Cmd.AddCommand('edictcount', ED.Count);
	Cmd.AddCommand('profile', PR.Profile_f);
	Cvar.RegisterVariable('nomonsters', '0');
	Cvar.RegisterVariable('gamecfg', '0');
	Cvar.RegisterVariable('scratch1', '0');
	Cvar.RegisterVariable('scratch2', '0');
	Cvar.RegisterVariable('scratch3', '0');
	Cvar.RegisterVariable('scratch4', '0');
	Cvar.RegisterVariable('savedgamecfg', '0', true);
	Cvar.RegisterVariable('saved1', '0', true);
	Cvar.RegisterVariable('saved2', '0', true);
	Cvar.RegisterVariable('saved3', '0', true);
	Cvar.RegisterVariable('saved4', '0', true);
};

// exec

PR.localstack_size = 2048;

PR.opnames = [
	'DONE',
	'MUL_F', 'MUL_V', 'MUL_FV', 'MUL_VF',
	'DIV',
	'ADD_F', 'ADD_V',
	'SUB_F', 'SUB_V',
	'EQ_F', 'EQ_V', 'EQ_S', 'EQ_E', 'EQ_FNC',
	'NE_F', 'NE_V', 'NE_S', 'NE_E', 'NE_FNC',
	'LE', 'GE', 'LT', 'GT',
	'INDIRECT', 'INDIRECT', 'INDIRECT', 'INDIRECT', 'INDIRECT', 'INDIRECT',
	'ADDRESS',
	'STORE_F', 'STORE_V', 'STORE_S', 'STORE_ENT', 'STORE_FLD', 'STORE_FNC',
	'STOREP_F', 'STOREP_V', 'STOREP_S', 'STOREP_ENT', 'STOREP_FLD', 'STOREP_FNC',
	'RETURN',
	'NOT_F', 'NOT_V', 'NOT_S', 'NOT_ENT', 'NOT_FNC',
	'IF', 'IFNOT',
	'CALL0', 'CALL1', 'CALL2', 'CALL3', 'CALL4', 'CALL5', 'CALL6', 'CALL7', 'CALL8',
	'STATE',
	'GOTO',
	'AND', 'OR',
	'BITAND', 'BITOR'
];

PR.PrintStatement = function(s)
{
	var text;
	if (s.op < PR.opnames.length)
	{
		text = PR.opnames[s.op] + ' ';
		for (; text.length <= 9; )
			text += ' ';
	}
	else
		text = '';
	if ((s.op === PR.op.jnz) || (s.op === PR.op.jz))
		text += PR.GlobalString(s.a) + 'branch ' + s.b;
	else if (s.op === PR.op.jump)
		text += 'branch ' + s.a;
	else if ((s.op >= PR.op.store_f) && (s.op <= PR.op.store_fnc))
		text += PR.GlobalString(s.a) + PR.GlobalStringNoContents(s.b);
	else
	{
		if (s.a !== 0)
			text += PR.GlobalString(s.a);
		if (s.b !== 0)
			text += PR.GlobalString(s.b);
		if (s.c !== 0)
			text += PR.GlobalStringNoContents(s.c);
	}
	Con.Print(text + '\n');
};

PR.StackTrace = function()
{
	if (PR.depth === 0)
	{
		Con.Print('<NO STACK>\n');
		return;
	}
	PR.stack[PR.depth] = [PR.xstatement, PR.xfunction];
	var f, file;
	for (; PR.depth >= 0; --PR.depth)
	{
		f = PR.stack[PR.depth][1];
		if (f == null)
		{
			Con.Print('<NO FUNCTION>\n');
			continue;
		}
		file = PR.GetString(f.file);
		for (; file.length <= 11; )
			file += ' ';
		Con.Print(file + ' : ' + PR.GetString(f.name) + '\n');
	}
	PR.depth = 0;
};

PR.Profile_f = function()
{
	if (SV.server.active !== true)
		return;
	var num = 0, max, best, i, f, profile;
	for (;;)
	{
		max = 0;
		best = null;
		for (i = 0; i < PR.functions.length; ++i)
		{
			f = PR.functions[i];
			if (f.profile > max)
			{
				max = f.profile;
				best = f;
			}
		}
		if (best == null)
			return;
		if (num < 10)
		{
			profile = best.profile.toString();
			for (; profile.length <= 6; )
				profile = ' ' + profile;
			Con.Print(profile + ' ' + PR.GetString(best.name) + '\n');
		}
		++num;
		best.profile = 0;
	}
};

PR.RunError = function(error)
{
	PR.PrintStatement(PR.statements[PR.xstatement]);
	PR.StackTrace();
	Con.Print(error + '\n');
	Host.Error('Program error');
};

PR.EnterFunction = function(f)
{
	PR.stack[PR.depth++] = [PR.xstatement, PR.xfunction];
	var c = f.locals;
	if ((PR.localstack_used + c) > PR.localstack_size)
		PR.RunError('PR.EnterFunction: locals stack overflow\n');
	var i;
	for (i = 0; i < c; ++i)
		PR.localstack[PR.localstack_used + i] = PR.globals_int[f.parm_start + i];
	PR.localstack_used += c;
	var o = f.parm_start, j;
	for (i = 0; i < f.numparms; ++i)
	{
		for (j = 0; j < f.parm_size[i]; ++j)
			PR.globals_int[o++] = PR.globals_int[4 + i * 3 + j];
	}
	PR.xfunction = f;
	return f.first_statement - 1;
};

PR.LeaveFunction = function()
{
	if (PR.depth <= 0)
		Sys.Error('prog stack underflow');
	var c = PR.xfunction.locals;
	PR.localstack_used -= c;
	if (PR.localstack_used < 0)
		PR.RunError('PR.LeaveFunction: locals stack underflow\n');
	for (--c; c >= 0; --c)
		PR.globals_int[PR.xfunction.parm_start + c] = PR.localstack[PR.localstack_used + c];
	PR.xfunction = PR.stack[--PR.depth][1];
	return PR.stack[PR.depth][0];
};

PR.ExecuteProgram = function(fnum)
{
	if ((fnum === 0) || (fnum >= PR.functions.length))
	{
		if (PR.globals_int[PR.globalvars.self] !== 0)
			ED.Print(SV.server.edicts[PR.globals_int[PR.globalvars.self]]);
		Host.Error('PR.ExecuteProgram: NULL function');
	}
	var runaway = 100000;
	PR.trace = false;
	var exitdepth = PR.depth;
	var s = PR.EnterFunction(PR.functions[fnum]);
	var st, ed, ptr, newf;

	for (;;)
	{
		++s;
		st = PR.statements[s];
		if (--runaway === 0)
			PR.RunError('runaway loop error');
		++PR.xfunction.profile;
		PR.xstatement = s;
		if (PR.trace === true)
			PR.PrintStatement(st);
		switch (st.op)
		{
		case PR.op.add_f:
			PR.globals_float[st.c] = PR.globals_float[st.a] + PR.globals_float[st.b];
			continue;
		case PR.op.add_v:
			PR.globals_float[st.c] = PR.globals_float[st.a] + PR.globals_float[st.b];
			PR.globals_float[st.c + 1] = PR.globals_float[st.a + 1] + PR.globals_float[st.b + 1];
			PR.globals_float[st.c + 2] = PR.globals_float[st.a + 2] + PR.globals_float[st.b + 2];
			continue;
		case PR.op.sub_f:
			PR.globals_float[st.c] = PR.globals_float[st.a] - PR.globals_float[st.b];
			continue;
		case PR.op.sub_v:
			PR.globals_float[st.c] = PR.globals_float[st.a] - PR.globals_float[st.b];
			PR.globals_float[st.c + 1] = PR.globals_float[st.a + 1] - PR.globals_float[st.b + 1];
			PR.globals_float[st.c + 2] = PR.globals_float[st.a + 2] - PR.globals_float[st.b + 2];
			continue;
		case PR.op.mul_f:
			PR.globals_float[st.c] = PR.globals_float[st.a] * PR.globals_float[st.b];
			continue;
		case PR.op.mul_v:
			PR.globals_float[st.c] = PR.globals_float[st.a] * PR.globals_float[st.b] +
				PR.globals_float[st.a + 1] * PR.globals_float[st.b + 1] +
				PR.globals_float[st.a + 2] * PR.globals_float[st.b + 2];
			continue;
		case PR.op.mul_fv:
			PR.globals_float[st.c] = PR.globals_float[st.a] * PR.globals_float[st.b];
			PR.globals_float[st.c + 1] = PR.globals_float[st.a] * PR.globals_float[st.b + 1];
			PR.globals_float[st.c + 2] = PR.globals_float[st.a] * PR.globals_float[st.b + 2];
			continue;
		case PR.op.mul_vf:
			PR.globals_float[st.c] = PR.globals_float[st.b] * PR.globals_float[st.a];
			PR.globals_float[st.c + 1] = PR.globals_float[st.b] * PR.globals_float[st.a + 1];
			PR.globals_float[st.c + 2] = PR.globals_float[st.b] * PR.globals_float[st.a + 2];
			continue;
		case PR.op.div_f:
			PR.globals_float[st.c] = PR.globals_float[st.a] / PR.globals_float[st.b];
			continue;
		case PR.op.bitand:
			PR.globals_float[st.c] = PR.globals_float[st.a] & PR.globals_float[st.b];
			continue;
		case PR.op.bitor:
			PR.globals_float[st.c] = PR.globals_float[st.a] | PR.globals_float[st.b];
			continue;
		case PR.op.ge:
			PR.globals_float[st.c] = (PR.globals_float[st.a] >= PR.globals_float[st.b]) ? 1.0 : 0.0;
			continue;
		case PR.op.le:
			PR.globals_float[st.c] = (PR.globals_float[st.a] <= PR.globals_float[st.b]) ? 1.0 : 0.0;
			continue;
		case PR.op.gt:
			PR.globals_float[st.c] = (PR.globals_float[st.a] > PR.globals_float[st.b]) ? 1.0 : 0.0;
			continue;
		case PR.op.lt:
			PR.globals_float[st.c] = (PR.globals_float[st.a] < PR.globals_float[st.b]) ? 1.0 : 0.0;
			continue;
		case PR.op.and:
			PR.globals_float[st.c] = ((PR.globals_float[st.a] !== 0.0) && (PR.globals_float[st.b] !== 0.0)) ? 1.0 : 0.0;
			continue;
		case PR.op.or:
			PR.globals_float[st.c] = ((PR.globals_float[st.a] !== 0.0) || (PR.globals_float[st.b] !== 0.0)) ? 1.0 : 0.0;
			continue;
		case PR.op.not_f:
			PR.globals_float[st.c] = (PR.globals_float[st.a] === 0.0) ? 1.0 : 0.0;
			continue;
		case PR.op.not_v:
			PR.globals_float[st.c] = ((PR.globals_float[st.a] === 0.0) &&
				(PR.globals_float[st.a + 1] === 0.0) &&
				(PR.globals_float[st.a + 2] === 0.0)) ? 1.0 : 0.0;
			continue;
		case PR.op.not_s:
			if (PR.globals_int[st.a] !== 0)
				PR.globals_float[st.c] = (PR.strings[PR.globals_int[st.a]] === 0) ? 1.0 : 0.0;
			else
				PR.globals_float[st.c] = 1.0;
			continue;
		case PR.op.not_fnc:
		case PR.op.not_ent:
			PR.globals_float[st.c] = (PR.globals_int[st.a] === 0) ? 1.0 : 0.0;
			continue;
		case PR.op.eq_f:
			PR.globals_float[st.c] = (PR.globals_float[st.a] === PR.globals_float[st.b]) ? 1.0 : 0.0;
			continue;
		case PR.op.eq_v:
			PR.globals_float[st.c] = ((PR.globals_float[st.a] === PR.globals_float[st.b])
				&& (PR.globals_float[st.a + 1] === PR.globals_float[st.b + 1])
				&& (PR.globals_float[st.a + 2] === PR.globals_float[st.b + 2])) ? 1.0 : 0.0;
			continue;
		case PR.op.eq_s:
			PR.globals_float[st.c] = (PR.GetString(PR.globals_int[st.a]) === PR.GetString(PR.globals_int[st.b])) ? 1.0 : 0.0;
			continue;
		case PR.op.eq_e:
		case PR.op.eq_fnc:
			PR.globals_float[st.c] = (PR.globals_int[st.a] === PR.globals_int[st.b]) ? 1.0 : 0.0;
			continue;
		case PR.op.ne_f:
			PR.globals_float[st.c] = (PR.globals_float[st.a] !== PR.globals_float[st.b]) ? 1.0 : 0.0;
			continue;
		case PR.op.ne_v:
			PR.globals_float[st.c] = ((PR.globals_float[st.a] !== PR.globals_float[st.b])
				|| (PR.globals_float[st.a + 1] !== PR.globals_float[st.b + 1])
				|| (PR.globals_float[st.a + 2] !== PR.globals_float[st.b + 2])) ? 1.0 : 0.0;
			continue;
		case PR.op.ne_s:
			PR.globals_float[st.c] = (PR.GetString(PR.globals_int[st.a]) !== PR.GetString(PR.globals_int[st.b])) ? 1.0 : 0.0;
			continue;
		case PR.op.ne_e:
		case PR.op.ne_fnc:
			PR.globals_float[st.c] = (PR.globals_int[st.a] !== PR.globals_int[st.b]) ? 1.0 : 0.0;
			continue;
		case PR.op.store_f:
		case PR.op.store_ent:
		case PR.op.store_fld:
		case PR.op.store_s:
		case PR.op.store_fnc:
			PR.globals_int[st.b] = PR.globals_int[st.a];
			continue;
		case PR.op.store_v:
			PR.globals_int[st.b] = PR.globals_int[st.a];
			PR.globals_int[st.b + 1] = PR.globals_int[st.a + 1];
			PR.globals_int[st.b + 2] = PR.globals_int[st.a + 2];
			continue;
		case PR.op.storep_f:
		case PR.op.storep_ent:
		case PR.op.storep_fld:
		case PR.op.storep_s:
		case PR.op.storep_fnc:
			ptr = PR.globals_int[st.b];
			SV.server.edicts[Math.floor(ptr / PR.edict_size)].v_int[((ptr % PR.edict_size) - 96) >> 2] = PR.globals_int[st.a];
			continue;
		case PR.op.storep_v:
			ed = SV.server.edicts[Math.floor(PR.globals_int[st.b] / PR.edict_size)];
			ptr = ((PR.globals_int[st.b] % PR.edict_size) - 96) >> 2;
			ed.v_int[ptr] = PR.globals_int[st.a];
			ed.v_int[ptr + 1] = PR.globals_int[st.a + 1];
			ed.v_int[ptr + 2] = PR.globals_int[st.a + 2];
			continue;
		case PR.op.address:
			ed = PR.globals_int[st.a];
			if ((ed === 0) && (SV.server.loading !== true))
				PR.RunError('assignment to world entity');
			PR.globals_int[st.c] = ed * PR.edict_size + 96 + (PR.globals_int[st.b] << 2);
			continue;
		case PR.op.load_f:
		case PR.op.load_fld:
		case PR.op.load_ent:
		case PR.op.load_s:
		case PR.op.load_fnc:
			PR.globals_int[st.c] = SV.server.edicts[PR.globals_int[st.a]].v_int[PR.globals_int[st.b]];
			continue;
		case PR.op.load_v:
			ed = SV.server.edicts[PR.globals_int[st.a]];
			ptr = PR.globals_int[st.b];
			PR.globals_int[st.c] = ed.v_int[ptr];
			PR.globals_int[st.c + 1] = ed.v_int[ptr + 1];
			PR.globals_int[st.c + 2] = ed.v_int[ptr + 2];
			continue;
		case PR.op.jz:
			if (PR.globals_int[st.a] === 0)
				s += st.b - 1;
			continue;
		case PR.op.jnz:
			if (PR.globals_int[st.a] !== 0)
				s += st.b - 1;
			continue;
		case PR.op.jump:
			s += st.a - 1;
			continue;
		case PR.op.call0:
		case PR.op.call1:
		case PR.op.call2:
		case PR.op.call3:
		case PR.op.call4:
		case PR.op.call5:
		case PR.op.call6:
		case PR.op.call7:
		case PR.op.call8:
			PR.argc = st.op - PR.op.call0;
			if (PR.globals_int[st.a] === 0)
				PR.RunError('NULL function');
			newf = PR.functions[PR.globals_int[st.a]];
			if (newf.first_statement < 0)
			{
				ptr = -newf.first_statement;
				if (ptr >= PF.builtin.length)
					PR.RunError('Bad builtin call number');
				PF.builtin[ptr]();
				continue;
			}
			s = PR.EnterFunction(newf);
			continue;
		case PR.op.done:
		case PR.op.ret:
			PR.globals_int[1] = PR.globals_int[st.a];
			PR.globals_int[2] = PR.globals_int[st.a + 1];
			PR.globals_int[3] = PR.globals_int[st.a + 2];
			s = PR.LeaveFunction();
			if (PR.depth === exitdepth)
				return;
			continue;
		case PR.op.state:
			ed = SV.server.edicts[PR.globals_int[PR.globalvars.self]];
			ed.v_float[PR.entvars.nextthink] = PR.globals_float[PR.globalvars.time] + 0.1;
			ed.v_float[PR.entvars.frame] = PR.globals_float[st.a];
			ed.v_int[PR.entvars.think] = PR.globals_int[st.b];
			continue;
		}
		PR.RunError('Bad opcode ' + st.op);
	}
};

PR.GetString = function(num)
{
	var string = [], c;
	for (; num < PR.strings.length; ++num)
	{
		if (PR.strings[num] === 0)
			break;
		string[string.length] = String.fromCharCode(PR.strings[num]);
	}
	return string.join('');
};

PR.NewString = function(s, length)
{
	var ofs = PR.strings.length;
	var i;
	if (s.length >= length)
	{
		for (i = 0; i < (length - 1); ++i)
			PR.strings[PR.strings.length] = s.charCodeAt(i);
		PR.strings[PR.strings.length] = 0;
		return ofs;
	}
	for (i = 0; i < s.length; ++i)
		PR.strings[PR.strings.length] = s.charCodeAt(i);
	length -= s.length;
	for (i = 0; i < length; ++i)
		PR.strings[PR.strings.length] = 0;
	return ofs;
};

PR.TempString = function(string)
{
	var i;
	if (string.length > 127)
		string = string.substring(0, 127);
	for (i = 0; i < string.length; ++i)
		PR.strings[PR.string_temp + i] = string.charCodeAt(i);
	PR.strings[PR.string_temp + string.length] = 0;
};