VID = {};

VID.d_8to24table = new Uint32Array(new ArrayBuffer(1024));

VID.SetPalette = function()
{
	var palette = COM.LoadFile('gfx/palette.lmp');
	if (palette == null)
		Sys.Error('Couldn\'t load gfx/palette.lmp');
	var pal = new Uint8Array(palette);
	var i, src = 0;
	for (i = 0; i < 256; ++i)
	{
		VID.d_8to24table[i] = pal[src] + (pal[src + 1] << 8) + (pal[src + 2] << 16);
		src += 3;
	}
};

VID.Init = function()
{
	document.getElementById('progress').style.display = 'none';
	GL.Init();
	VID.SetPalette();
};