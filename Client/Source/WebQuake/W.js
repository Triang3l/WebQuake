var W = {};

W.lumps = [];

W.CleanupName = function(name)
{
	var i = name.indexOf('\0');
	if (i !== -1)
		name = name.substring(0, i);
	return name.toLowerCase();
};

W.LoadWadFile = function(filename)
{
	var base = COM.LoadFile(filename);
	if (base == null)
		Sys.Error('W.LoadWadFile: couldn\'t load ' + filename);
	var view = new DataView(base);
	if (view.getUint32(0, true) !== 0x32444157)
		Sys.Error('Wad file ' + filename + ' doesn\'t have WAD2 id');
	var numlumps = view.getUint32(4, true);
	var infotableofs = view.getUint32(8, true);
	var i, lumpinfo, filepos, size, lump, lumpview, baseview;
	for (i = 0; i < numlumps; ++i)
	{
		filepos = view.getUint32(infotableofs, true);
		size = view.getUint32(infotableofs + 4, true);
		lump = new ArrayBuffer(size);
		(new Uint8Array(lump)).set(new Uint8Array(base, filepos, size));
		W.lumps[Q.memstr(new Uint8Array(base, infotableofs + 16, 16)).toLowerCase()] = lump;
		infotableofs += 32;
	}
};

W.GetLumpName = function(name)
{
	return W.lumps[name.toLowerCase()];
};
