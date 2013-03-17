Key = {};

Key.k = {
	tab: 9,
	enter: 13,
	escape: 27,
	space: 32,
	
	backspace: 127,
	uparrow: 128,
	downarrow: 129,
	leftarrow: 130,
	rightarrow: 131,
	
	alt: 132,
	ctrl: 133,
	shift: 134,
	f1: 135,
	f2: 136,
	f3: 137,
	f4: 138,
	f5: 139,
	f6: 140,
	f7: 141,
	f8: 142,
	f9: 143,
	f10: 144,
	f11: 145,
	f12: 146,
	ins: 147,
	del: 148,
	pgdn: 149,
	pgup: 150,
	home: 151,
	end: 152,
	
	pause: 255,
	
	mouse1: 200,
	mouse2: 201,
	mouse3: 202,

	mwheelup: 239,
	mwheeldown: 240
};

Key.lines = [''];
Key.edit_line = '';
Key.history_line = 1;

Key.dest = {
	game: 0,
	console: 1,
	message: 2,
	menu: 3,
	
	value: 0
};

Key.bindings = [];
Key.consolekeys = [];
Key.shift = [];
Key.down = [];

Key.names = [
	{name: 'TAB', keynum: Key.k.tab},
	{name: 'ENTER', keynum: Key.k.enter},
	{name: 'ESCAPE', keynum: Key.k.escape},
	{name: 'SPACE', keynum: Key.k.space},
	{name: 'BACKSPACE', keynum: Key.k.backspace},
	{name: 'UPARROW', keynum: Key.k.uparrow},
	{name: 'DOWNARROW', keynum: Key.k.downarrow},
	{name: 'LEFTARROW', keynum: Key.k.leftarrow},
	{name: 'RIGHTARROW', keynum: Key.k.rightarrow},
	{name: 'ALT', keynum: Key.k.alt},
	{name: 'CTRL', keynum: Key.k.ctrl},
	{name: 'SHIFT', keynum: Key.k.shift},
	{name: 'F1', keynum: Key.k.f1},
	{name: 'F2', keynum: Key.k.f2},
	{name: 'F3', keynum: Key.k.f3},
	{name: 'F4', keynum: Key.k.f4},
	{name: 'F5', keynum: Key.k.f5},
	{name: 'F6', keynum: Key.k.f6},
	{name: 'F7', keynum: Key.k.f7},
	{name: 'F8', keynum: Key.k.f8},
	{name: 'F9', keynum: Key.k.f9},
	{name: 'F10', keynum: Key.k.f10},
	{name: 'F11', keynum: Key.k.f11},
	{name: 'F12', keynum: Key.k.f12},
	{name: 'INS', keynum: Key.k.ins},
	{name: 'DEL', keynum: Key.k.del},
	{name: 'PGDN', keynum: Key.k.pgdn},
	{name: 'PGUP', keynum: Key.k.pgup},
	{name: 'HOME', keynum: Key.k.home},
	{name: 'END', keynum: Key.k.end},
	{name: 'MOUSE1', keynum: Key.k.mouse1},
	{name: 'MOUSE2', keynum: Key.k.mouse2},
	{name: 'MOUSE3', keynum: Key.k.mouse3},
	{name: 'PAUSE', keynum: Key.k.pause},
	{name: 'MWHEELUP', keynum: Key.k.mwheelup},
	{name: 'MWHEELDOWN', keynum: Key.k.mwheeldown},
	{name: 'SEMICOLON', keynum: 59}
];

Key.Console = function(key)
{
	if (key === Key.k.enter)
	{
		Cmd.text += Key.edit_line + '\n';
		Con.Print(']' + Key.edit_line + '\n');
		Key.lines[Key.lines.length] = Key.edit_line;
		Key.edit_line = '';
		Key.history_line = Key.lines.length;
		return;
	}

	if (key === Key.k.tab)
	{
		var cmd = Cmd.CompleteCommand(Key.edit_line);
		if (cmd == null)
			cmd = Cvar.CompleteVariable(Key.edit_line);
		if (cmd == null)
			return;
		Key.edit_line = cmd + ' ';
		return;
	}

	if ((key === Key.k.backspace) || (key === Key.k.leftarrow))
	{
		if (Key.edit_line.length > 0)
			Key.edit_line = Key.edit_line.substring(0, Key.edit_line.length - 1);
		return;
	}

	if (key === Key.k.uparrow)
	{
		if (--Key.history_line < 0)
			Key.history_line = 0;
		Key.edit_line = Key.lines[Key.history_line];
		return;
	}

	if (key === Key.k.downarrow)
	{
		if (Key.history_line >= Key.lines.length)
			return;
		if (++Key.history_line >= Key.lines.length)
		{
			Key.history_line = Key.lines.length;
			Key.edit_line = '';
			return;
		}
		Key.edit_line = Key.lines[Key.history_line];
		return;
	}

	if (key === Key.k.pgup)
	{
		Con.backscroll += 2;
		if (Con.backscroll > Con.text.length)
			Con.backscroll = Con.text.length;
		return;
	}

	if (key === Key.k.pgdn)
	{
		Con.backscroll -= 2;
		if (Con.backscroll < 0)
			Con.backscroll = 0;
		return;
	}

	if (key === Key.k.home)
	{
		Con.backscroll = Con.text.length - 10;
		if (Con.backscroll < 0)
			Con.backscroll = 0;
		return;
	}

	if (key === Key.k.end)
	{
		Con.backscroll = 0;
		return;
	}

	if ((key < 32) || (key > 127))
		return;

	Key.edit_line += String.fromCharCode(key);
};

Key.chat_buffer = '';

Key.Message = function(key)
{
	if (key === Key.k.enter)
	{
		if (Key.team_message === true)
			Cmd.text += 'say_team "' + Key.chat_buffer + '"\n';
		else
			Cmd.text += 'say "' + Key.chat_buffer + '"\n';
		Key.dest.value = Key.dest.game;
		Key.chat_buffer = '';
		return;
	}
	if (key === Key.k.escape)
	{
		Key.dest.value = Key.dest.game;
		Key.chat_buffer = '';
		return;
	}
	if ((key < 32) || (key > 127))
		return;
	if (key === Key.k.backspace)
	{
		if (Key.chat_buffer.length !== 0)
			Key.chat_buffer = Key.chat_buffer.substring(0, Key.chat_buffer.length - 1);
		return;
	}
	if (Key.chat_buffer.length >= 31)
		return;
	Key.chat_buffer = Key.chat_buffer + String.fromCharCode(key);
};

Key.StringToKeynum = function(str)
{
	if (str.length === 1)
		return str.charCodeAt(0);
	str = str.toUpperCase();
	var i;
	for (i = 0; i < Key.names.length; ++i)
	{
		if (Key.names[i].name === str)
			return Key.names[i].keynum;
	}
};

Key.KeynumToString = function(keynum)
{
	if ((keynum > 32) && (keynum < 127))
		return String.fromCharCode(keynum);
	var i;
	for (i = 0; i < Key.names.length; ++i)
	{
		if (Key.names[i].keynum === keynum)
			return Key.names[i].name;
	}
	return '<UNKNOWN KEYNUM>';
};

Key.Unbind_f = function()
{
	if (Cmd.argv.length !== 2)
	{
		Con.Print('unbind <key> : remove commands from a key\n');
		return;
	}
	var b = Key.StringToKeynum(Cmd.argv[1]);
	if (b == null)
	{
		Con.Print('"' + Cmd.argv[1] + '" isn\'t a valid key\n');
		return;
	}
	Key.bindings[b] = null;
};

Key.Unbindall_f = function()
{
	Key.bindings = [];
};

Key.Bind_f = function()
{
	var c = Cmd.argv.length;
	if ((c !== 2) && (c !== 3))
	{
		Con.Print('bind <key> [command] : attach a command to a key\n');
		return;
	}
	var b = Key.StringToKeynum(Cmd.argv[1]);
	if (b == null)
	{
		Con.Print('"' + Cmd.argv[1] + '" isn\'t a valid key\n');
		return;
	}
	if (c === 2)
	{
		if (Key.bindings[b] != null)
			Con.Print('"' + Cmd.argv[1] + '" = "' + Key.bindings[b] + '"\n');
		else
			Con.Print('"' + Cmd.argv[1] + '" is not bound\n');
		return;
	}

	var i, cmd = Cmd.argv[2];
	for (i = 3; i < c; ++i)
	{
		cmd += ' ' + Cmd.argv[i];
	}
	Key.bindings[b] = cmd;
};

Key.WriteBindings = function()
{
	var f = [];
	var i;
	for (i = 0; i < Key.bindings.length; ++i)
	{
		if (Key.bindings[i] != null)
			f[f.length] = 'bind "' + Key.KeynumToString(i) + '" "' + Key.bindings[i] + '"\n';
	}
	return f.join('');
};

Key.Init = function()
{
	var i;

	for (i = 32; i < 128; ++i)
		Key.consolekeys[i] = true;
	Key.consolekeys[Key.k.enter] = true;
	Key.consolekeys[Key.k.tab] = true;
	Key.consolekeys[Key.k.leftarrow] = true;
	Key.consolekeys[Key.k.rightarrow] = true;
	Key.consolekeys[Key.k.uparrow] = true;
	Key.consolekeys[Key.k.downarrow] = true;
	Key.consolekeys[Key.k.backspace] = true;
	Key.consolekeys[Key.k.home] = true;
	Key.consolekeys[Key.k.end] = true;
	Key.consolekeys[Key.k.pgup] = true;
	Key.consolekeys[Key.k.pgdn] = true;
	Key.consolekeys[Key.k.shift] = true;
	Key.consolekeys[96] = false;
	Key.consolekeys[126] = false;

	for (i = 0; i < 256; ++i)
		Key.shift[i] = i;
	for (i = 97; i <= 122; ++i)
		Key.shift[i] = i - 32;
	Key.shift[49] = 33;
	Key.shift[50] = 64;
	Key.shift[51] = 35;
	Key.shift[52] = 36;
	Key.shift[53] = 37;
	Key.shift[54] = 94;
	Key.shift[55] = 38;
	Key.shift[56] = 42;
	Key.shift[57] = 40;
	Key.shift[48] = 41;
	Key.shift[45] = 95;
	Key.shift[61] = 43;
	Key.shift[43] = 60;
	Key.shift[46] = 62;
	Key.shift[47] = 63;
	Key.shift[59] = 58;
	Key.shift[39] = 34;
	Key.shift[91] = 123;
	Key.shift[93] = 125;
	Key.shift[96] = 126;
	Key.shift[92] = 124;

	Cmd.AddCommand('bind', Key.Bind_f);
	Cmd.AddCommand('unbind', Key.Unbind_f);
	Cmd.AddCommand('unbindall', Key.Unbindall_f);
};

Key.Event = function(key, down)
{
	if (CL.cls.state === CL.active.connecting)
		return;
	if (down === true)
	{
		if ((key !== Key.k.backspace) && (key !== Key.k.pause) && (Key.down[key] === true))
			return;
		if ((key >= 200) && (Key.bindings[key] == null))
			Con.Print(Key.KeynumToString(key) + ' is unbound, hit F4 to set.\n');
	}
	Key.down[key] = down;

	if (key === Key.k.shift)
		Key.shift_down = down;

	if (key === Key.k.escape)
	{
		if (down !== true)
			return;
		if (Key.dest.value === Key.dest.message)
			Key.Message(key);
		else if (Key.dest.value === Key.dest.menu)
			M.Keydown(key);
		else
			M.ToggleMenu_f();
		return;
	}

	var kb;

	if (down !== true)
	{
		kb = Key.bindings[key];
		if (kb != null)
		{
			if (kb.charCodeAt(0) === 43)
				Cmd.text += '-' + kb.substring(1) + ' ' + key + '\n';
		}
		if (Key.shift[key] !== key)
		{
			kb = Key.bindings[Key.shift[key]];
			if (kb != null)
			{
				if (kb.charCodeAt(0) === 43)
					Cmd.text += '-' + kb.substring(1) + ' ' + key + '\n';
			}
		}
		return;
	}

	if ((CL.cls.demoplayback === true) && (Key.consolekeys[key] === true) && (Key.dest.value === Key.dest.game))
	{
		M.ToggleMenu_f();
		return;
	}

	if (((Key.dest.value === Key.dest.menu) && ((key === Key.k.escape) || ((key >= Key.k.f1) && (key <= Key.k.f12))))
		|| ((Key.dest.value === Key.dest.console) && (Key.consolekeys[key] !== true))
		|| ((Key.dest.value === Key.dest.game) && ((Con.forcedup !== true) || (Key.consolekeys[key] !== true))))
	{
		kb = Key.bindings[key];
		if (kb != null)
		{
			if (kb.charCodeAt(0) === 43)
				Cmd.text += kb + ' ' + key + '\n';
			else
				Cmd.text += kb + '\n';
		}
		return;
	}

	if (Key.shift_down === true)
		key = Key.shift[key];

	if (Key.dest.value === Key.dest.message)
		Key.Message(key);
	else if (Key.dest.value === Key.dest.menu)
		M.Keydown(key);
	else
		Key.Console(key);
};