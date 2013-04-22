COM = {};

COM.argv = [];

COM.standard_quake = true;

COM.DefaultExtension = function(path, extension)
{
	var i, src;
	for (i = path.length - 1; i >= 0; --i)
	{
		src = path.charCodeAt(i);
		if (src === 47)
			break;
		if (src === 46)
			return path;
	}
	return path + extension;
};

COM.Parse = function(data)
{
	COM.token = '';
	var i = 0, c;
	if (data.length === 0)
		return;
		
	var skipwhite = true;
	for (;;)
	{
		if (skipwhite !== true)
			break;
		skipwhite = false;
		for (;;)
		{
			if (i >= data.length)
				return;
			c = data.charCodeAt(i);
			if (c > 32)
				break;
			++i;
		}
		if ((c === 47) && (data.charCodeAt(i + 1) == 47))
		{
			for (;;)
			{
				if ((i >= data.length) || (data.charCodeAt(i) === 10))
					break;
				++i;
			}
			skipwhite = true;
		}
	}

	if (c === 34)
	{
		++i;
		for (;;)
		{
			c = data.charCodeAt(i);
			++i;
			if ((i >= data.length) || (c === 34))
				return data.substring(i);
			COM.token += String.fromCharCode(c);
		}
	}

	for (;;)
	{
		if ((i >= data.length) || (c <= 32))
			break;
		COM.token += String.fromCharCode(c);
		++i;
		c = data.charCodeAt(i);
	}

	return data.substring(i);
};

COM.CheckParm = function(parm)
{
	var i;
	for (i = 1; i < COM.argv.length; ++i)
	{
		if (COM.argv[i] === parm)
			return i;
	}
};

COM.CheckRegistered = function()
{
	var h = COM.LoadFile('gfx/pop.lmp');
	if (h == null)
	{
		Con.Print('Playing shareware version.\n');
		if (COM.modified === true)
			Sys.Error('You must have the registered version to use modified games');
		return;
	}
	var check = new Uint8Array(h);
	var pop =
	[
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
		0x00, 0x00, 0x00, 0x00, 0x66, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x66, 0x00, 0x00, 0x00,
		0x00, 0x00, 0x00, 0x66, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x67, 0x00, 0x00,
		0x00, 0x00, 0x66, 0x65, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x65, 0x66, 0x00,
		0x00, 0x63, 0x65, 0x61, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x61, 0x65, 0x63,
		0x00, 0x64, 0x65, 0x61, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x61, 0x65, 0x64,
		0x00, 0x64, 0x65, 0x64, 0x00, 0x00, 0x64, 0x69, 0x69, 0x69, 0x64, 0x00, 0x00, 0x64, 0x65, 0x64,
		0x00, 0x63, 0x65, 0x68, 0x62, 0x00, 0x00, 0x64, 0x68, 0x64, 0x00, 0x00, 0x62, 0x68, 0x65, 0x63,
		0x00, 0x00, 0x65, 0x67, 0x69, 0x63, 0x00, 0x64, 0x67, 0x64, 0x00, 0x63, 0x69, 0x67, 0x65, 0x00,
		0x00, 0x00, 0x62, 0x66, 0x67, 0x69, 0x6A, 0x68, 0x67, 0x68, 0x6A, 0x69, 0x67, 0x66, 0x62, 0x00,
		0x00, 0x00, 0x00, 0x62, 0x65, 0x66, 0x66, 0x66, 0x66, 0x66, 0x66, 0x66, 0x65, 0x62, 0x00, 0x00,
		0x00, 0x00, 0x00, 0x00, 0x00, 0x62, 0x63, 0x64, 0x66, 0x64, 0x63, 0x62, 0x00, 0x00, 0x00, 0x00,
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x62, 0x66, 0x62, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x61, 0x66, 0x61, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x65, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x64, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
	];
	var i;
	for (i = 0; i < 256; ++i)
	{
		if (check[i] !== pop[i])
			Sys.Error('Corrupted data file.');
	}
	Cvar.Set('registered', '1');
	Con.Print('Playing registered version.\n');
};

COM.InitArgv = function(argv)
{
	COM.cmdline = (argv.join(' ') + ' ').substring(0, 256);
	var i;
	for (i = 0; i < argv.length; ++i)
		COM.argv[i] = argv[i];	
	if (COM.CheckParm('-safe') != null)
	{
		COM.argv[COM.argv.length] = '-nosound';
		COM.argv[COM.argv.length] = '-nocdaudio';
		COM.argv[COM.argv.length] = '-nomouse';
	}
	if (COM.CheckParm('-rogue') != null)
	{
		COM.rogue = true;
		COM.standard_quake = false;
	}
	else if (COM.CheckParm('-hipnotic') != null)
	{
		COM.hipnotic = true;
		COM.standard_quake = false;
	}
};

COM.Init = function()
{
	if ((document.location.protocol !== 'http:') && (document.location.protocol !== 'https:'))
		Sys.Error('Protocol is ' + document.location.protocol + ', not http: or https:');

	var swaptest = new ArrayBuffer(2);
	var swaptestview = new Uint8Array(swaptest);
	swaptestview[0] = 1;
	swaptestview[1] = 0;
	if ((new Uint16Array(swaptest))[0] === 1)
		COM.LittleLong = (function(l) {return l;});
	else
		COM.LittleLong = (function(l) {return (l >>> 24) + ((l & 0xff0000) >>> 8) + (((l & 0xff00) << 8) >>> 0) + ((l << 24) >>> 0);});

	COM.registered = Cvar.RegisterVariable('registered', '0');
	Cvar.RegisterVariable('cmdline', COM.cmdline, false, true);
	Cmd.AddCommand('path', COM.Path_f);
	COM.InitFilesystem();
	COM.CheckRegistered();
};

COM.searchpaths = [];

COM.Path_f = function()
{
	Con.Print('Current search path:\n');
	var i = COM.searchpaths.length, j, s;
	for (i = COM.searchpaths.length - 1; i >= 0; --i)
	{
		s = COM.searchpaths[i];
		for (j = s.pack.length - 1; j >= 0; --j)
			Con.Print(s.filename + '/' + 'pak' + j + '.pak (' + s.pack[j].length + ' files)\n');
		Con.Print(s.filename + '\n');
	}
};

COM.WriteFile = function(filename, data, len)
{
	filename = filename.toLowerCase();
	var dest = [], i;
	for (i = 0; i < len; ++i)
		dest[i] = String.fromCharCode(data[i]);
	try
	{
		localStorage.setItem('Quake.' + COM.searchpaths[COM.searchpaths.length - 1].filename + '/' + filename, dest.join(''));
	}
	catch (e)
	{
		Sys.Print('COM.WriteFile: failed on ' + filename + '\n');
		return;
	}
	Sys.Print('COM.WriteFile: ' + filename + '\n');
	return true;
};

COM.WriteTextFile = function(filename, data)
{
	filename = filename.toLowerCase();
	try
	{
		localStorage.setItem('Quake.' + COM.searchpaths[COM.searchpaths.length - 1].filename + '/' + filename, data);
	}
	catch (e)
	{
		Sys.Print('COM.WriteTextFile: failed on ' + filename + '\n');
		return;
	}
	Sys.Print('COM.WriteTextFile: ' + filename + '\n');
	return true;
};

COM.LoadFile = function(filename)
{
	filename = filename.toLowerCase();
	var xhr = new XMLHttpRequest();
	xhr.overrideMimeType('text/plain; charset=x-user-defined');
	var i, j, k, search, netpath, pak, file, data;
	Draw.BeginDisc();
	for (i = COM.searchpaths.length - 1; i >= 0; --i)
	{
		search = COM.searchpaths[i];
		netpath = search.filename + '/' + filename;
		data = localStorage.getItem('Quake.' + netpath);
		if (data != null)
		{
			Sys.Print('FindFile: ' + netpath + '\n');
			Draw.EndDisc();
			return Q.strmem(data);
		}
		for (j = search.pack.length - 1; j >= 0; --j)
		{
			pak = search.pack[j];
			for (k = 0; k < pak.length; ++k)
			{
				file = pak[k];
				if (file.name !== filename)
					continue;
				if (file.filelen === 0)
				{
					Draw.EndDisc();
					return new ArrayBuffer(0);
				}
				xhr.open('GET', search.filename + '/pak' + j + '.pak', false);
				xhr.setRequestHeader('Range', 'bytes=' + file.filepos + '-' + (file.filepos + file.filelen - 1));
				xhr.send();
				if ((xhr.status >= 200) && (xhr.status <= 299) && (xhr.responseText.length === file.filelen))
				{
					Sys.Print('PackFile: ' + search.filename + '/pak' + j + '.pak : ' + filename + '\n')
					Draw.EndDisc();
					return Q.strmem(xhr.responseText);
				}
				break;
			}
		}
		xhr.open('GET', netpath, false);
		xhr.send();
		if ((xhr.status >= 200) && (xhr.status <= 299))
		{
			Sys.Print('FindFile: ' + netpath + '\n');
			Draw.EndDisc();
			return Q.strmem(xhr.responseText);
		}
	}
	Sys.Print('FindFile: can\'t find ' + filename + '\n');
	Draw.EndDisc();
};

COM.LoadTextFile = function(filename)
{
	var buf = COM.LoadFile(filename);
	if (buf == null)
		return;
	var bufview = new Uint8Array(buf);
	var f = [];
	var i;
	for (i = 0; i < bufview.length; ++i)
	{
		if (bufview[i] !== 13)
			f[f.length] = String.fromCharCode(bufview[i]);
	}
	return f.join('');
};

COM.LoadPackFile = function(packfile)
{
	var xhr = new XMLHttpRequest();
	xhr.overrideMimeType('text/plain; charset=x-user-defined');
	xhr.open('GET', packfile, false);
	xhr.setRequestHeader('Range', 'bytes=0-11');
	xhr.send();
	if ((xhr.status <= 199) || (xhr.status >= 300) || (xhr.responseText.length !== 12))
		return;
	var header = new DataView(Q.strmem(xhr.responseText));
	if (header.getUint32(0, true) !== 0x4b434150)
		Sys.Error(packfile + ' is not a packfile');
	var dirofs = header.getUint32(4, true);
	var dirlen = header.getUint32(8, true);
	var numpackfiles = dirlen >> 6;
	if (numpackfiles !== 339)
		COM.modified = true;
	var pack = [];
	if (numpackfiles !== 0)
	{
		xhr.open('GET', packfile, false);
		xhr.setRequestHeader('Range', 'bytes=' + dirofs + '-' + (dirofs + dirlen - 1));
		xhr.send();
		if ((xhr.status <= 199) || (xhr.status >= 300) || (xhr.responseText.length !== dirlen))
			return;
		var info = Q.strmem(xhr.responseText);
		if (CRC.Block(new Uint8Array(info)) !== 32981)
			COM.modified = true;
		var i;
		for (i = 0; i < numpackfiles; ++i)
		{
			pack[pack.length] =
			{
				name: Q.memstr(new Uint8Array(info, i << 6, 56)).toLowerCase(),
				filepos: (new DataView(info)).getUint32((i << 6) + 56, true),
				filelen: (new DataView(info)).getUint32((i << 6) + 60, true)
			}
		}
	}
	Con.Print('Added packfile ' + packfile + ' (' + numpackfiles + ' files)\n');
	return pack;
};

COM.AddGameDirectory = function(dir)
{
	var search = {filename: dir, pack: []};
	var pak, i = 0;
	for (;;)
	{
		pak = COM.LoadPackFile(dir + '/' + 'pak' + i + '.pak');
		if (pak == null)
			break;
		search.pack[search.pack.length] = pak;
		++i;
	}
	COM.searchpaths[COM.searchpaths.length] = search;
};

COM.InitFilesystem = function()
{
	var i, search;
	
	i = COM.CheckParm('-basedir');
	if (i != null)
		search = COM.argv[i + 1];
	if (search != null)
		COM.AddGameDirectory(search);
	else
		COM.AddGameDirectory('id1');
		
	if (COM.rogue === true)
		COM.AddGameDirectory('rogue');
	else if (COM.hipnotic === true)
		COM.AddGameDirectory('hipnotic');
		
	i = COM.CheckParm('-game');
	if (i != null)
	{
		search = COM.argv[i + 1];
		if (search != null)
		{
			COM.modified = true;
			COM.AddGameDirectory(search);
		}
	}

	COM.gamedir = [COM.searchpaths[COM.searchpaths.length - 1]];
};