M = {};

M.state =
{
	none: 0,
	main: 1,
	singleplayer: 2,
	load: 3,
	save: 4,
	multiplayer: 5,
	options: 6,
	keys: 7,
	help: 8,
	quit: 9,
	
	value: 0
};

M.DrawCharacter = function(cx, line, num)
{
	Draw.Character(cx + (VID.width >> 1) - 160, line + (VID.height >> 1) - 100, num);
};

M.Print = function(cx, cy, str)
{
	Draw.StringWhite(cx + (VID.width >> 1) - 160, cy + (VID.height >> 1) - 100, str);
};

M.PrintWhite = function(cx, cy, str)
{
	Draw.String(cx + (VID.width >> 1) - 160, cy + (VID.height >> 1) - 100, str);
};

M.DrawPic = function(x, y, pic)
{
	Draw.Pic(x + (VID.width >> 1) - 160, y + (VID.height >> 1) - 100, pic);
};

M.DrawPicTranslate = function(x, y, pic, top, bottom)
{
	Draw.PicTranslate(x + (VID.width >> 1) - 160, y + (VID.height >> 1) - 100, pic, top, bottom);
};

M.DrawTextBox = function(x, y, width, lines)
{
	var cx, cy, n;

	cy = y;
	M.DrawPic(x, cy, M.box_tl);
	for (n = 0; n < lines; ++n)
		M.DrawPic(x, cy += 8, M.box_ml);
	M.DrawPic(x, cy + 8, M.box_bl);

	cx = x + 8;
	var p;
	for (; width > 0; )
	{
		cy = y;
		M.DrawPic(cx, y, M.box_tm);
		p = M.box_mm;
		for (n = 0; n < lines; ++n)
		{
			M.DrawPic(cx, cy += 8, p);
			if (n === 0)
				p = M.box_mm2;
		}
		M.DrawPic(cx, cy + 8, M.box_bm);
		width -= 2;
		cx += 16;
	}

	cy = y;
	M.DrawPic(cx, cy, M.box_tr);
	for (n = 0; n < lines; ++n)
		M.DrawPic(cx, cy += 8, M.box_mr);
	M.DrawPic(cx, cy + 8, M.box_br);
};

M.ToggleMenu_f = function()
{
	M.entersound = true;
	if (Key.dest.value === Key.dest.menu)
	{
		if (M.state.value !== M.state.main)
		{
			M.Menu_Main_f();
			return;
		}
		Key.dest.value = Key.dest.game;
		M.state.value = M.state.none;
		return;
	}
	M.Menu_Main_f();
};


// Main menu
M.main_cursor = 0;
M.main_items = 5;

M.Menu_Main_f = function()
{
	if (Key.dest.value !== Key.dest.menu)
	{
		M.save_demonum = CL.cls.demonum;
		CL.cls.demonum = -1;
	}
	Key.dest.value = Key.dest.menu;
	M.state.value = M.state.main;
	M.entersound = true;
};

M.Main_Draw = function()
{
	M.DrawPic(16, 4, M.qplaque);
	M.DrawPic(160 - (M.ttl_main.width >> 1), 4, M.ttl_main);
	M.DrawPic(72, 32, M.mainmenu);
	M.DrawPic(54, 32 + M.main_cursor * 20, M.menudot[Math.floor(Host.realtime * 10.0) % 6]);
};

M.Main_Key = function(k)
{
	switch (k)
	{
	case Key.k.escape:
		Key.dest.value = Key.dest.game;
		M.state.value = M.state.none;
		CL.cls.demonum = M.save_demonum;
		if ((CL.cls.demonum !== -1) && (CL.cls.demoplayback !== true) && (CL.cls.state !== CL.active.connected))
			CL.NextDemo();
		return;
	case Key.k.downarrow:
		S.LocalSound(M.sfx_menu1);
		if (++M.main_cursor >= M.main_items)
			M.main_cursor = 0;
		return;
	case Key.k.uparrow:
		S.LocalSound(M.sfx_menu1);
		if (--M.main_cursor < 0)
			M.main_cursor = M.main_items - 1;
		return;
	case Key.k.enter:
		M.entersound = true;
		switch (M.main_cursor)
		{
		case 0:
			M.Menu_SinglePlayer_f();
			return;
		case 1:
			M.Menu_MultiPlayer_f();
			return;
		case 2:
			M.Menu_Options_f();
			return;
		case 3:
			M.Menu_Help_f();
			return;
		case 4:
			M.Menu_Quit_f();
		}
	}
};

// Single player menu
M.singleplayer_cursor = 0;
M.singleplayer_items = 3;

M.Menu_SinglePlayer_f = function()
{
	Key.dest.value = Key.dest.menu;
	M.state.value = M.state.singleplayer;
	M.entersound = true;
};

M.SinglePlayer_Draw = function()
{
	M.DrawPic(16, 4, M.qplaque);
	M.DrawPic(160 - (M.ttl_sgl.width >> 1), 4, M.ttl_sgl);
	M.DrawPic(72, 32, M.sp_menu);
	M.DrawPic(54, 32 + M.singleplayer_cursor * 20, M.menudot[Math.floor(Host.realtime * 10.0) % 6]);
};

M.SinglePlayer_Key = function(k)
{
	switch (k)
	{
	case Key.k.escape:
		M.Menu_Main_f();
		return;
	case Key.k.downarrow:
		S.LocalSound(M.sfx_menu1);
		if (++M.singleplayer_cursor >= M.singleplayer_items)
			M.singleplayer_cursor = 0;
		return;
	case Key.k.uparrow:
		S.LocalSound(M.sfx_menu1);
		if (--M.singleplayer_cursor < 0)
			M.singleplayer_cursor = M.singleplayer_items - 1;
		return;
	case Key.k.enter:
		M.entersound = true;
		switch (M.singleplayer_cursor)
		{
		case 0:
			if (SV.server.active === true)
			{
				if (confirm('Are you sure you want to start a new game?') !== true)
					return;
				Cmd.text += 'disconnect\n';
			}
			Key.dest.value = Key.dest.game;
			Cmd.text += 'maxplayers 1\nmap start\n';
			return;
		case 1:
			M.Menu_Load_f();
			return;
		case 2:
			M.Menu_Save_f();
		}
	}
};

// Load/save menu
M.load_cursor = 0;
M.max_savegames = 12;
M.filenames = [];
M.loadable = [];
M.removable = [];

M.ScanSaves = function()
{
	var searchpaths = COM.searchpaths, i, j, search = 'Quake.' + COM.gamedir[0].filename + '/s', f, version, name, j, c;
	COM.searchpaths = COM.gamedir;
	for (i = 0; i < M.max_savegames; ++i)
	{
		f = localStorage.getItem(search + i + '.sav');
		if (f != null)
			M.removable[i] = true;
		else
		{
			M.removable[i] = false;
			f = COM.LoadTextFile('s' + i + '.sav');
			if (f == null)
			{
				M.filenames[i] = '--- UNUSED SLOT ---';
				M.loadable[i] = false;
				continue;
			}
		}
		for (version = 0; version < f.length; ++version)
		{
			c = f.charCodeAt(version);
			if (c === 10)
			{
				++version;
				break;
			}
		}
		name = [];
		for (j = 0; j <= 39; ++j)
		{
			c = f.charCodeAt(version + j);
			if (c === 13)
				break;
			if (c === 95)
				name[j] = ' ';
			else
				name[j] = String.fromCharCode(c);
		}
		M.filenames[i] = name.join('');
		M.loadable[i] = true;
	}
	COM.searchpaths = searchpaths;
};

M.Menu_Load_f = function()
{
	M.entersound = true;
	M.state.value = M.state.load;
	Key.dest.value = Key.dest.menu;
	M.ScanSaves();
};

M.Menu_Save_f = function()
{
	if ((SV.server.active !== true) || (CL.state.intermission !== 0) || (SV.svs.maxclients !== 1))
		return;
	M.entersound = true;
	M.state.value = M.state.save;
	Key.dest.value = Key.dest.menu;
	M.ScanSaves();
};

M.Load_Draw = function()
{
	M.DrawPic(160 - (M.p_load.width >> 1), 4, M.p_load);
	var i;
	for (i = 0; i < M.max_savegames; ++i)
		M.Print(16, 32 + (i << 3), M.filenames[i]);
	M.DrawCharacter(8, 32 + (M.load_cursor << 3), 12 + ((Host.realtime * 4.0) & 1));
};

M.Save_Draw = function()
{
	M.DrawPic(160 - (M.p_save.width >> 1), 4, M.p_save);
	var i;
	for (i = 0; i < M.max_savegames; ++i)
		M.Print(16, 32 + (i << 3), M.filenames[i]);
	M.DrawCharacter(8, 32 + (M.load_cursor << 3), 12 + ((Host.realtime * 4.0) & 1));
};

M.Load_Key = function(k)
{
	switch (k)
	{
	case Key.k.escape:
		M.Menu_SinglePlayer_f();
		return;
	case Key.k.enter:
		S.LocalSound(M.sfx_menu2);
		if (M.loadable[M.load_cursor] !== true)
			return;
		M.state.value = M.state.none;
		Key.dest.value = Key.dest.game;
		SCR.BeginLoadingPlaque();
		Cmd.text += 'load s' + M.load_cursor + '\n';
		return;
	case Key.k.uparrow:
	case Key.k.leftarrow:
		S.LocalSound(M.sfx_menu1);
		if (--M.load_cursor < 0)
			M.load_cursor = M.max_savegames - 1;
		return;
	case Key.k.downarrow:
	case Key.k.rightarrow:
		S.LocalSound(M.sfx_menu1);
		if (++M.load_cursor >= M.max_savegames)
			M.load_cursor = 0;
		return;
	case Key.k.del:
		if (M.removable[M.load_cursor] !== true)
			return;
		if (confirm('Delete selected game?') !== true)
			return;
		localStorage.removeItem('Quake.' + COM.gamedir[0].filename + '/s' + M.load_cursor + '.sav');
		M.ScanSaves();
	}
};

M.Save_Key = function(k)
{
	switch (k)
	{
	case Key.k.escape:
		M.Menu_SinglePlayer_f();
		return;
	case Key.k.enter:
		M.state.value = M.state.none;
		Key.dest.value = Key.dest.game;
		Cmd.text += 'save s' + M.load_cursor + '\n';
		return;
	case Key.k.uparrow:
	case Key.k.leftarrow:
		S.LocalSound(M.sfx_menu1);
		if (--M.load_cursor < 0)
			M.load_cursor = M.max_savegames - 1;
		return;
	case Key.k.downarrow:
	case Key.k.rightarrow:
		S.LocalSound(M.sfx_menu1);
		if (++M.load_cursor >= M.max_savegames)
			M.load_cursor = 0;
		return;
	case Key.k.del:
		if (M.removable[M.load_cursor] !== true)
			return;
		if (confirm('Delete selected game?') !== true)
			return;
		localStorage.removeItem('Quake.' + COM.gamedir[0].filename + '/s' + M.load_cursor + '.sav');
		M.ScanSaves();
	}
};

// Multiplayer menu
M.multiplayer_cursor = 0;
M.multiplayer_cursor_table = [56, 72, 96, 120, 156];
M.multiplayer_joinname = '';
M.multiplayer_items = 5;

M.Menu_MultiPlayer_f = function()
{
	Key.dest.value = Key.dest.menu;
	M.state.value = M.state.multiplayer;
	M.entersound = true;
	M.multiplayer_myname = CL.name.string;
	M.multiplayer_top = M.multiplayer_oldtop = CL.color.value >> 4;
	M.multiplayer_bottom = M.multiplayer_oldbottom = CL.color.value & 15;
};

M.MultiPlayer_Draw = function()
{
	M.DrawPic(16, 4, M.qplaque);
	M.DrawPic(160 - (M.p_multi.width >> 1), 4, M.p_multi);

	M.Print(64, 40, 'Join game at:');
	M.DrawTextBox(72, 48, 22, 1);
	M.Print(80, 56, M.multiplayer_joinname.substring(M.multiplayer_joinname.length - 21));

	M.Print(64, 72, 'Your name');
	M.DrawTextBox(160, 64, 16, 1);
	M.Print(168, 72, M.multiplayer_myname);

	M.Print(64, 96, 'Shirt color');
	M.Print(64, 120, 'Pants color');

	M.DrawTextBox(64, 148, 14, 1);
	M.Print(72, 156, 'Accept Changes');

	M.DrawPic(160, 80, M.bigbox);
	M.DrawPicTranslate(172, 88, M.menuplyr,
		(M.multiplayer_top << 4) + (M.multiplayer_top >= 8 ? 4 : 11),
		(M.multiplayer_bottom << 4) + (M.multiplayer_bottom >= 8 ? 4 : 11));

	M.DrawCharacter(56, M.multiplayer_cursor_table[M.multiplayer_cursor], 12 + ((Host.realtime * 4.0) & 1));

	if (M.multiplayer_cursor === 0)
		M.DrawCharacter(M.multiplayer_joinname.length <= 20 ? 80 + (M.multiplayer_joinname.length << 3) : 248, 56, 10 + ((Host.realtime * 4.0) & 1));
	else if (M.multiplayer_cursor === 1)
		M.DrawCharacter(168 + (M.multiplayer_myname.length << 3), 72, 10 + ((Host.realtime * 4.0) & 1));

	if (WEBS.available !== true)
		M.PrintWhite(52, 172, 'No Communications Available');
};

M.MultiPlayer_Key = function(k)
{
	if (k === Key.k.escape)
		M.Menu_Main_f();

	switch (k)
	{
	case Key.k.uparrow:
		S.LocalSound(M.sfx_menu1);
		if (--M.multiplayer_cursor < 0)
			M.multiplayer_cursor = M.multiplayer_items - 1;
		return;
	case Key.k.downarrow:
		S.LocalSound(M.sfx_menu1);
		if (++M.multiplayer_cursor >= M.multiplayer_items)
			M.multiplayer_cursor = 0;
		return;
	case Key.k.leftarrow:
		if (M.multiplayer_cursor === 2)
		{
			if (--M.multiplayer_top < 0)
				M.multiplayer_top = 13;
			S.LocalSound(M.sfx_menu3);
		}
		else if (M.multiplayer_cursor === 3)
		{
			if (--M.multiplayer_bottom < 0)
				M.multiplayer_bottom = 13;
			S.LocalSound(M.sfx_menu3);
		}
		return;
	case Key.k.rightarrow:
		if (M.multiplayer_cursor === 2)
			(M.multiplayer_top <= 12) ? ++M.multiplayer_top : M.multiplayer_top = 0;
		else if (M.multiplayer_cursor === 3)
			(M.multiplayer_bottom <= 12) ? ++M.multiplayer_bottom : M.multiplayer_bottom = 0;
		else
			return;
		S.LocalSound(M.sfx_menu3);
		return;
	case Key.k.enter:
		switch (M.multiplayer_cursor)
		{
		case 0:
			S.LocalSound(M.sfx_menu2);
			if (WEBS.available !== true)
				return;
			Key.dest.value = Key.dest.game;
			M.state.value = M.state.none;
			Cmd.text += 'connect "';
			if (M.multiplayer_joinname.substring(0, 5) !== 'ws://')
				Cmd.text += 'ws://';
			Cmd.text += M.multiplayer_joinname + '"\n';
			return;
		case 2:
			S.LocalSound(M.sfx_menu3);
			(M.multiplayer_top <= 12) ? ++M.multiplayer_top : M.multiplayer_top = 0;
			return;
		case 3:
			S.LocalSound(M.sfx_menu3);
			(M.multiplayer_bottom <= 12) ? ++M.multiplayer_bottom : M.multiplayer_bottom = 0;
			return;
		case 4:
			if (CL.name.string !== M.multiplayer_myname)
				Cmd.text += 'name "' + M.multiplayer_myname + '"\n';
			if ((M.multiplayer_top !== M.multiplayer_oldtop) || (M.multiplayer_bottom !== M.multiplayer_oldbottom))
			{
				M.multiplayer_oldtop = M.multiplayer_top;
				M.multiplayer_oldbottom = M.multiplayer_bottom;
				Cmd.text += 'color ' + M.multiplayer_top + ' ' + M.multiplayer_bottom + '\n';
			}
			M.entersound = true;
		}
		return;
	case Key.k.backspace:
		if (M.multiplayer_cursor === 0)
		{
			if (M.multiplayer_joinname.length !== 0)
				M.multiplayer_joinname = M.multiplayer_joinname.substring(0, M.multiplayer_joinname.length - 1);
			return;
		}
		if (M.multiplayer_cursor === 1)
		{
			if (M.multiplayer_myname.length !== 0)
				M.multiplayer_myname = M.multiplayer_myname.substring(0, M.multiplayer_myname.length - 1);
		}
		return;
	}

	if ((k < 32) || (k > 127))
		return;
	if (M.multiplayer_cursor === 0)
	{
		M.multiplayer_joinname += String.fromCharCode(k);
		return;
	}
	if (M.multiplayer_cursor === 1)
	{
		if (M.multiplayer_myname.length <= 14)
			M.multiplayer_myname += String.fromCharCode(k);
	}
};

// Options menu
M.options_cursor = 0;
M.options_items = 11;

M.Menu_Options_f = function()
{
	Key.dest.value = Key.dest.menu;
	M.state.value = M.state.options;
	M.entersound = true;
};

M.AdjustSliders = function(dir)
{
	S.LocalSound(M.sfx_menu3);
	
	switch (M.options_cursor)
	{
	case 3: // screen size
		SCR.viewsize.value += dir * 10;
		if (SCR.viewsize.value < 30)
			SCR.viewsize.value = 30;
		else if (SCR.viewsize.value > 120)
			SCR.viewsize.value = 120;
		Cvar.SetValue('viewsize', SCR.viewsize.value);
		return;
	case 4: // gamma
		V.gamma.value -= dir * 0.05;
		if (V.gamma.value < 0.5)
			V.gamma.value = 0.5;
		else if (V.gamma.value > 1.0)
			V.gamma.value = 1.0;
		Cvar.SetValue('gamma', V.gamma.value);
		return;
	case 5: // mouse speed
		CL.sensitivity.value += dir * 0.5;
		if (CL.sensitivity.value < 1.0)
			CL.sensitivity.value = 1.0;
		else if (CL.sensitivity.value > 11.0)
			CL.sensitivity.value = 11.0;
		Cvar.SetValue('sensitivity', CL.sensitivity.value);
		return;
	case 6: // music volume
		S.bgmvolume.value += dir * 0.1;
		if (S.bgmvolume.value < 0.0)
			S.bgmvolume.value = 0.0;
		else if (S.bgmvolume.value > 1.0)
			S.bgmvolume.value = 1.0;
		Cvar.SetValue('bgmvolume', S.bgmvolume.value);
		return;
	case 7: // sfx volume
		S.volume.value += dir * 0.1;
		if (S.volume.value < 0.0)
			S.volume.value = 0.0;
		else if (S.volume.value > 1.0)
			S.volume.value = 1.0;
		Cvar.SetValue('volume', S.volume.value);
		return;
	case 8: // allways run
		if (CL.forwardspeed.value > 200.0)
		{
			Cvar.SetValue('cl_forwardspeed', 200.0);
			Cvar.SetValue('cl_backspeed', 200.0);
			return;
		}
		Cvar.SetValue('cl_forwardspeed', 400.0);
		Cvar.SetValue('cl_backspeed', 400.0);
		return;
	case 9: // invert mouse
		Cvar.SetValue('m_pitch', -CL.m_pitch.value);
		return;
	case 10: // lookspring
		Cvar.SetValue('lookspring', (CL.lookspring.value !== 0) ? 0 : 1);
		return;
	case 11: // lookstrafe
		Cvar.SetValue('lookstrafe', (CL.lookstrafe.value !== 0) ? 0 : 1);
	}
};

M.DrawSlider = function(x, y, range)
{
	if (range < 0)
		range = 0;
	else if (range > 1)
		range = 1;
	M.DrawCharacter(x - 8, y, 128);
	M.DrawCharacter(x, y, 129);
	M.DrawCharacter(x + 8, y, 129);
	M.DrawCharacter(x + 16, y, 129);
	M.DrawCharacter(x + 24, y, 129);
	M.DrawCharacter(x + 32, y, 129);
	M.DrawCharacter(x + 40, y, 129);
	M.DrawCharacter(x + 48, y, 129);
	M.DrawCharacter(x + 56, y, 129);
	M.DrawCharacter(x + 64, y, 129);
	M.DrawCharacter(x + 72, y, 129);
	M.DrawCharacter(x + 80, y, 130);
	M.DrawCharacter(x + Math.floor(72 * range), y, 131);
};

M.Options_Draw = function()
{
	M.DrawPic(16, 4, M.qplaque);
	M.DrawPic(160 - (M.p_option.width >> 1), 4, M.p_option);
	
	M.Print(48, 32, 'Customize controls');
	M.Print(88, 40, 'Go to console');
	M.Print(56, 48, 'Reset to defaults');
	
	M.Print(104, 56, 'Screen size');
	M.DrawSlider(220, 56, (SCR.viewsize.value - 30) / 90);
	M.Print(112, 64, 'Brightness');
	M.DrawSlider(220, 64, (1.0 - V.gamma.value) * 2.0);
	M.Print(104, 72, 'Mouse Speed');
	M.DrawSlider(220, 72, (CL.sensitivity.value - 1) / 10);
	M.Print(72, 80, 'CD Music Volume');
	M.DrawSlider(220, 80, S.bgmvolume.value);
	M.Print(96, 88, 'Sound Volume');
	M.DrawSlider(220, 88, S.volume.value);
	M.Print(112, 96, 'Always Run');
	M.Print(220, 96, (CL.forwardspeed.value > 200.0) ? 'on' : 'off');
	M.Print(96, 104, 'Invert Mouse');
	M.Print(220, 104, (CL.m_pitch.value < 0.0) ? 'on' : 'off');
	M.Print(112, 112, 'Lookspring');
	M.Print(220, 112, (CL.lookspring.value !== 0) ? 'on' : 'off');
	M.Print(112, 120, 'Lookstrafe');
	M.Print(220, 120, (CL.lookstrafe.value !== 0) ? 'on' : 'off');
	
	M.DrawCharacter(200, 32 + (M.options_cursor << 3), 12 + ((Host.realtime * 4.0) & 1));
};

M.Options_Key = function(k)
{
	switch (k)
	{
	case Key.k.escape:
		M.Menu_Main_f();
		return;
	case Key.k.enter:
		M.entersound = true;
		switch (M.options_cursor)
		{
		case 0:
			M.Menu_Keys_f();
			return;
		case 1:
			M.state.value = M.state.none;
			Con.ToggleConsole_f();
			return;
		case 2:
			Cmd.text += 'exec default.cfg\n';
			return;
		default:
			M.AdjustSliders(1);
		}
		return;
	case Key.k.uparrow:
		S.LocalSound(M.sfx_menu1);
		if (--M.options_cursor < 0)
			M.options_cursor = M.options_items - 1;
		return;
	case Key.k.downarrow:
		S.LocalSound(M.sfx_menu1);
		if (++M.options_cursor >= M.options_items)
			M.options_cursor = 0;
		return;
	case Key.k.leftarrow:
		M.AdjustSliders(-1);
		return;
	case Key.k.rightarrow:
		M.AdjustSliders(1);
	}
};

// Keys menu
M.bindnames = [
	["+attack", "attack"],
	["impulse 10", "change weapon"],
	["+jump", "jump / swim up"],
	["+forward", "walk forward"],
	["+back", "backpedal"],
	["+left", "turn left"],
	["+right", "turn right"],
	["+speed", "run"],
	["+moveleft", "step left"],
	["+moveright", "step right"],
	["+strafe", "sidestep"],
	["+lookup", "look up"],
	["+lookdown", "look down"],
	["centerview", "center view"],
	["+mlook", "mouse look"],
	["+klook", "keyboard look"],
	["+moveup", "swim up"],
	["+movedown", "swim down"]
];

M.keys_cursor = 0;

M.Menu_Keys_f = function()
{
	Key.dest.value = Key.dest.menu;
	M.state.value = M.state.keys;
	M.entersound = true;
};

M.FindKeysForCommand = function(command)
{
	var twokeys = [], i;
	for (i = 0; i < Key.bindings.length; ++i)
	{
		if (Key.bindings[i] === command)
		{
			twokeys[twokeys.length] = i;
			if (twokeys.length === 2)
				return twokeys;
		}
	}
	return twokeys;
};

M.UnbindCommand = function(command)
{
	var i;
	for (i = 0; i < Key.bindings.length; ++i)
	{
		if (Key.bindings[i] === command)
			delete Key.bindings[i];
	}
};

M.Keys_Draw = function()
{
	M.DrawPic(160 - (M.ttl_cstm.width >> 1), 4, M.ttl_cstm);

	if (M.bind_grab === true)
	{
		M.Print(12, 32, 'Press a key or button for this action');
		M.DrawCharacter(130, 48 + (M.keys_cursor << 3), 61);
	}
	else
	{
		M.Print(18, 32, 'Enter to change, backspace to clear');
		M.DrawCharacter(130, 48 + (M.keys_cursor << 3), 12 + ((Host.realtime * 4.0) & 1));
	}

	var i, y = 48, keys, name;
	for (i = 0; i < M.bindnames.length; ++i)
	{
		M.Print(16, y, M.bindnames[i][1]);
		keys = M.FindKeysForCommand(M.bindnames[i][0]);
		if (keys[0] == null)
			M.Print(140, y, '???');
		else
		{
			name = Key.KeynumToString(keys[0]);
			if (keys[1] != null)
				name += ' or ' + Key.KeynumToString(keys[1]);
			M.Print(140, y, name);
		}
		y += 8;
	}
};

M.Keys_Key = function(k)
{
	if (M.bind_grab === true)
	{
		S.LocalSound(M.sfx_menu1);
		if ((k !== Key.k.escape) && (k !== 96))
			Cmd.text = 'bind "' + Key.KeynumToString(k) + '" "' + M.bindnames[M.keys_cursor][0] + '"\n' + Cmd.text;
		M.bind_grab = false;
		return;
	}

	switch (k)
	{
	case Key.k.escape:
		M.Menu_Options_f();
		return;
	case Key.k.leftarrow:
	case Key.k.uparrow:
		S.LocalSound(M.sfx_menu1);
		if (--M.keys_cursor < 0)
			M.keys_cursor = M.bindnames.length - 1;
		return;
	case Key.k.downarrow:
	case Key.k.rightarrow:
		S.LocalSound(M.sfx_menu1);
		if (++M.keys_cursor >= M.bindnames.length)
			M.keys_cursor = 0;
		return;
	case Key.k.enter:
		S.LocalSound(M.sfx_menu2);
		if (M.FindKeysForCommand(M.bindnames[M.keys_cursor][0])[1] != null)
			M.UnbindCommand(M.bindnames[M.keys_cursor][0]);
		M.bind_grab = true;
		return;
	case Key.k.backspace:
	case Key.k.del:
		S.LocalSound(M.sfx_menu2);
		M.UnbindCommand(M.bindnames[M.keys_cursor][0]);
	}
};

// Help menu
M.num_help_pages = 6;

M.Menu_Help_f = function()
{
	Key.dest.value = Key.dest.menu;
	M.state.value = M.state.help;
	M.entersound = true;
	M.help_page = 0;
};

M.Help_Draw = function()
{
	M.DrawPic(0, 0, M.help_pages[M.help_page]);
};

M.Help_Key = function(k)
{
	switch (k)
	{
	case Key.k.escape:
		M.Menu_Main_f();
		return;
	case Key.k.uparrow:
	case Key.k.rightarrow:
		M.entersound = true;
		if (++M.help_page >= M.num_help_pages)
			M.help_page = 0;
		return;
	case Key.k.downarrow:
	case Key.k.leftarrow:
		M.entersound = true;
		if (--M.help_page < 0)
			M.help_page = M.num_help_pages - 1;
	};
};

// Quit menu
M.quitMessage =
[
	['  Are you gonna quit', '  this game just like', '   everything else?', ''],
	[' Milord, methinks that', '   thou art a lowly', ' quitter. Is this true?', ''],
	[' Do I need to bust your', '  face open for trying', '        to quit?', ''],
	[' Man, I oughta smack you', '   for trying to quit!', '     Press Y to get', '      smacked out.'],
	[' Press Y to quit like a', '   big loser in life.', '  Press N to stay proud', '    and successful!'],
	['   If you press Y to', '  quit, I will summon', '  Satan all over your', '      hard drive!'],
	['  Um, Asmodeus dislikes', ' his children trying to', ' quit. Press Y to return', '   to your Tinkertoys.'],
	['  If you quit now, I\'ll', '  throw a blanket-party', '   for you next time!', '']
];

M.Menu_Quit_f = function()
{
	if (M.state.value === M.state.quit)
		return;
	M.wasInMenus = (Key.dest.value === Key.dest.menu);
	Key.dest.value = Key.dest.menu;
	M.quit_prevstate = M.state.value;
	M.state.value = M.state.quit;
	M.entersound = true;
	M.msgNumber = Math.floor(Math.random() * M.quitMessage.length);
};

M.Quit_Draw = function()
{
	if (M.wasInMenus === true)
	{
		M.state.value = M.quit_prevstate;
		M.recursiveDraw = true;
		M.Draw();
		M.state.value = M.state.quit;
	}
	M.DrawTextBox(56, 76, 24, 4);
	M.Print(64, 84, M.quitMessage[M.msgNumber][0]);
	M.Print(64, 92, M.quitMessage[M.msgNumber][1]);
	M.Print(64, 100, M.quitMessage[M.msgNumber][2]);
	M.Print(64, 108, M.quitMessage[M.msgNumber][3]);
};

M.Quit_Key = function(k)
{
	switch (k)
	{
	case Key.k.escape:
	case 110:
		if (M.wasInMenus === true)
		{
			M.state.value = M.quit_prevstate;
			M.entersound = true;
		}
		else
		{
			Key.dest.value = Key.dest.game;
			M.state.value = M.state.none;
		}
		break;
	case 121:
		Key.dest.value = Key.dest.console;
		Host.Quit_f();
	}
};


// Menu Subsystem
M.Init = function()
{
	Cmd.AddCommand('togglemenu', M.ToggleMenu_f);
	Cmd.AddCommand('menu_main', M.Menu_Main_f);
	Cmd.AddCommand('menu_singleplayer', M.Menu_SinglePlayer_f);
	Cmd.AddCommand('menu_load', M.Menu_Load_f);
	Cmd.AddCommand('menu_save', M.Menu_Save_f);
	Cmd.AddCommand('menu_multiplayer', M.Menu_MultiPlayer_f);
	Cmd.AddCommand('menu_setup', M.Menu_MultiPlayer_f);
	Cmd.AddCommand('menu_options', M.Menu_Options_f);
	Cmd.AddCommand('menu_keys', M.Menu_Keys_f);
	Cmd.AddCommand('help', M.Menu_Help_f);
	Cmd.AddCommand('menu_quit', M.Menu_Quit_f);

	M.sfx_menu1 = S.PrecacheSound('misc/menu1.wav');
	M.sfx_menu2 = S.PrecacheSound('misc/menu2.wav');
	M.sfx_menu3 = S.PrecacheSound('misc/menu3.wav');

	M.box_tl = Draw.CachePic('box_tl');
	M.box_ml = Draw.CachePic('box_ml');
	M.box_bl = Draw.CachePic('box_bl');
	M.box_tm = Draw.CachePic('box_tm');
	M.box_mm = Draw.CachePic('box_mm');
	M.box_mm2 = Draw.CachePic('box_mm2');
	M.box_bm = Draw.CachePic('box_bm');
	M.box_tr = Draw.CachePic('box_tr');
	M.box_mr = Draw.CachePic('box_mr');
	M.box_br = Draw.CachePic('box_br');

	M.qplaque = Draw.CachePic('qplaque');

	M.menudot = [
		Draw.CachePic('menudot1'),
		Draw.CachePic('menudot2'),
		Draw.CachePic('menudot3'),
		Draw.CachePic('menudot4'),
		Draw.CachePic('menudot5'),
		Draw.CachePic('menudot6')
	];

	M.ttl_main = Draw.CachePic('ttl_main');
	M.mainmenu = Draw.CachePic('mainmenu');

	M.ttl_sgl = Draw.CachePic('ttl_sgl');
	M.sp_menu = Draw.CachePic('sp_menu');
	M.p_load = Draw.CachePic('p_load');
	M.p_save = Draw.CachePic('p_save');

	M.p_multi = Draw.CachePic('p_multi');
	M.bigbox = Draw.CachePic('bigbox');
	M.menuplyr = Draw.CachePic('menuplyr');
	var buf = COM.LoadFile('gfx/menuplyr.lmp');
	var data = GL.ResampleTexture(M.menuplyr.data, M.menuplyr.width, M.menuplyr.height, 64, 64);
	var trans = new Uint8Array(new ArrayBuffer(16384));
	var i, p;
	for (i = 0; i < 4096; ++i)
	{
		p = data[i];
		if ((p >> 4) === 1)
		{
			trans[i << 2] = (p & 15) * 17;
			trans[(i << 2) + 1] = 255;
		}
		else if ((p >> 4) === 6)
		{
			trans[(i << 2) + 2] = (p & 15) * 17;
			trans[(i << 2) + 3] = 255;
		}
	}
	M.menuplyr.translate = gl.createTexture();
	GL.Bind(0, M.menuplyr.translate);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 64, 64, 0, gl.RGBA, gl.UNSIGNED_BYTE, trans);
	gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

	M.p_option = Draw.CachePic('p_option');
	M.ttl_cstm = Draw.CachePic('ttl_cstm');

	M.help_pages = [
		Draw.CachePic('help0'),
		Draw.CachePic('help1'),
		Draw.CachePic('help2'),
		Draw.CachePic('help3'),
		Draw.CachePic('help4'),
		Draw.CachePic('help5')
	];
};

M.Draw = function()
{
	if ((M.state.value === M.state.none) || (Key.dest.value !== Key.dest.menu))
		return;

	if (M.recursiveDraw !== true)
	{
		if (SCR.con_current !== 0)
			Draw.ConsoleBackground(VID.height);
		else
			Draw.FadeScreen();
	}
	else
		M.recursiveDraw = false;
	
	switch (M.state.value)
	{
	case M.state.main:
		M.Main_Draw();
		break;
	case M.state.singleplayer:
		M.SinglePlayer_Draw();
		break;
	case M.state.load:
		M.Load_Draw();
		break;
	case M.state.save:
		M.Save_Draw();
		break;
	case M.state.multiplayer:
		M.MultiPlayer_Draw();
		break;
	case M.state.options:
		M.Options_Draw();
		break;
	case M.state.keys:
		M.Keys_Draw();
		break;
	case M.state.help:
		M.Help_Draw();
		break;
	case M.state.quit:
		M.Quit_Draw();
	}
	if (M.entersound === true)
	{
		S.LocalSound(M.sfx_menu2);
		M.entersound = false;
	}
};

M.Keydown = function(key)
{
	switch (M.state.value)
	{
	case M.state.main:
		M.Main_Key(key);
		return;
	case M.state.singleplayer:
		M.SinglePlayer_Key(key);
		return;
	case M.state.load:
		M.Load_Key(key);
		return;
	case M.state.save:
		M.Save_Key(key);
		return;
	case M.state.multiplayer:
		M.MultiPlayer_Key(key);
		return;
	case M.state.options:
		M.Options_Key(key);
		return;
	case M.state.keys:
		M.Keys_Key(key);
		return;
	case M.state.help:
		M.Help_Key(key);
		return;
	case M.state.quit:
		M.Quit_Key(key);
	}
};