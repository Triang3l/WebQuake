COM = {};

COM.argv = [];

COM.standard_quake = true;

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
	var swaptest = new ArrayBuffer(2);
	var swaptestview = new Uint8Array(swaptest);
	swaptestview[0] = 1;
	swaptestview[1] = 0;
	COM.bigendien = ((new Uint16Array(swaptest))[0] !== 1);
	COM.registered = Cvar.RegisterVariable('registered', '0');
	Cvar.RegisterVariable('cmdline', COM.cmdline, false, true);
	Cmd.AddCommand('path', COM.Path_f);
	COM.InitFilesystem();
	COM.CheckRegistered();
};

COM.searchpaths = [];

COM.LoadFile = function(filename)
{
	filename = filename.toLowerCase();
	var src, i, j, k, search, pak, file, fd;
	for (i = COM.searchpaths.length - 1; i >= 0; --i)
	{
		search = COM.searchpaths[i];
		for (j = search.pack.length - 1; j >= 0; --j)
		{
			pak = search.pack[j];
			for (k = 0; k < pak.length; ++k)
			{
				file = pak[k];
				if (file.name !== filename)
					continue;
				if (file.filelen === 0)
					return new ArrayBuffer(0);
				try
				{
					fd = Node.fs.openSync(search.filename + '/pak' + j + '.pak', 'r');
				}
				catch (e)
				{
					break;
				}
				Sys.Print('PackFile: ' + search.filename + '/pak' + j + '.pak : ' + filename + '\n')
				src = new Buffer(file.filelen);
				Node.fs.readSync(fd, src, 0, file.filelen, file.filepos);
				Node.fs.closeSync(fd);
				break;
			}
		}
		if (src != null)
			break;
		try
		{
			src = Node.fs.readFileSync(search.filename + '/' + filename);
			Sys.Print('FindFile: ' + search.filename + '/' + filename + '\n');
			break;
		}
		catch (e)
		{
		}
	}
	if (src == null)
	{
		Sys.Print('FindFile: can\'t find ' + filename + '\n');
		return;
	}
	var size = src.length;
	var dest = new ArrayBuffer(size), view = new DataView(dest);
	var count = size >> 2;
	if (count !== 0)
	{
		if (COM.bigendien !== true)
		{
			for (i = 0; i < count; ++i)
				view.setUint32(i << 2, src.readUInt32LE(i << 2), true);
		}
		else
		{
			for (i = 0; i < count; ++i)
				view.setUint32(i << 2, src.readUInt32BE(i << 2));
		}
	}
	count <<= 2;
	switch (size & 3)
	{
	case 1:
		view.setUint8(count, src[count]);
		break;
	case 2:
		view.setUint16(count, src.readUInt16LE(count), true);
		break;
	case 3:
		view.setUint16(count, src.readUInt16LE(count), true);
		view.setUint8(count + 2, src[count + 2]);
	}
	return dest;
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
	var fd;
	try
	{
		fd = Node.fs.openSync(packfile, 'r');
	}
	catch (e)
	{
		return;
	}
	var buf = new Buffer(12);
	Node.fs.readSync(fd, buf, 0, 12, 0);
	if (buf.readUInt32LE(0) !== 0x4b434150)
		Sys.Error(packfile + ' is not a packfile');
	var dirofs = buf.readUInt32LE(4);
	var dirlen = buf.readUInt32LE(8);
	var numpackfiles = dirlen >> 6;
	if (numpackfiles !== 339)
		COM.modified = true;
	var pack = [];
	if (numpackfiles !== 0)
	{
		buf = new Buffer(dirlen);
		Node.fs.readSync(fd, buf, 0, dirlen, dirofs);
		if (CRC.Block(buf) !== 32981)
			COM.modified = true;
		var i;
		for (i = 0; i < numpackfiles; ++i)
		{
			pack[pack.length] =
			{
				name: Q.memstr(buf.slice(i << 6, (i << 6) + 56)).toLowerCase(),
				filepos: buf.readUInt32LE((i << 6) + 56),
				filelen: buf.readUInt32LE((i << 6) + 60)
			}
		}
	}
	Node.fs.closeSync(fd);
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
	var i;
	var search;
	
	i = COM.CheckParm('-basedir');
	if (i != null)
	{
		search = COM.argv[i + 1];
		if (search != null)
			COM.AddGameDirectory(search);
	}
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
};