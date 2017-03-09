Draw = {};

Draw.CharToConback = function(num, dest)
{
	var source = ((num >> 4) << 10) + ((num & 15) << 3);
	var drawline, x;
	for (drawline = 0; drawline < 8; ++drawline)
	{
		for (x = 0; x < 8; ++x)
		{
			if (Draw.chars[source + x] !== 0)
				Draw.conback.data[dest + x] = 0x60 + Draw.chars[source + x];
		}
		source += 128;
		dest += 320;
	}
};

Draw.Init = function()
{
	var i;

	Draw.chars = new Uint8Array(W.GetLumpName('CONCHARS'));
	
	var trans = new ArrayBuffer(65536);
	var trans32 = new Uint32Array(trans);
	for (i = 0; i < 16384; ++i)
	{
		if (Draw.chars[i] !== 0)
			trans32[i] = COM.LittleLong(VID.d_8to24table[Draw.chars[i]] + 0xff000000);
	}
	Draw.char_texture = gl.createTexture();
	GL.Bind(0, Draw.char_texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 128, 128, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(trans));
	gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

	Draw.conback = {};
	var cb = COM.LoadFile('gfx/conback.lmp');
	if (cb == null)
		Sys.Error('Couldn\'t load gfx/conback.lmp');
	Draw.conback.width = 320;
	Draw.conback.height = 200;
	Draw.conback.data = new Uint8Array(cb, 8, 64000);
	var ver = '(WebQuake build ' + Def.webquake_version + ') 1.09';
	for (i = 0; i < ver.length; ++i)
		Draw.CharToConback(ver.charCodeAt(i), 59829 - ((ver.length - i) << 3), 186);
	Draw.conback.texnum = GL.LoadPicTexture(Draw.conback);

	Draw.loading = Draw.CachePic('loading');
	Draw.loadingElem = document.getElementById('loading');
	Draw.loadingElem.src = Draw.PicToDataURL(Draw.loading);

	document.body.style.backgroundImage = 'url("' + Draw.PicToDataURL(Draw.PicFromWad('BACKTILE')) + '")';

	GL.CreateProgram('Fill',
		['uOrtho'],
		[['aPosition', gl.FLOAT, 2], ['aColor', gl.UNSIGNED_BYTE, 4, true]],
		[]);
	GL.CreateProgram('Pic',
		['uOrtho'],
		[['aPosition', gl.FLOAT, 2], ['aTexCoord', gl.FLOAT, 2]],
		['tTexture']);
	GL.CreateProgram('PicTranslate',
		['uOrtho', 'uTop', 'uBottom'],
		[['aPosition', gl.FLOAT, 2], ['aTexCoord', gl.FLOAT, 2]],
		['tTexture', 'tTrans']);
};

Draw.Char = function(x, y, num)
{
	GL.StreamDrawTexturedQuad(x, y, 8, 8,
		(num & 15) * 0.0625, (num >> 4) * 0.0625,
		((num & 15) + 1) * 0.0625, ((num >> 4) + 1) * 0.0625);
}

Draw.Character = function(x, y, num)
{
	var program = GL.UseProgram('Pic', true);
	GL.Bind(program.tTexture, Draw.char_texture, true);
	Draw.Char(x, y, num);
};

Draw.String = function(x, y, str)
{
	var program = GL.UseProgram('Pic', true);
	GL.Bind(program.tTexture, Draw.char_texture, true);
	for (var i = 0; i < str.length; ++i)
	{
		Draw.Char(x, y, str.charCodeAt(i));
		x += 8;
	}
};

Draw.StringWhite = function(x, y, str)
{
	var program = GL.UseProgram('Pic', true);
	GL.Bind(program.tTexture, Draw.char_texture, true);
	for (var i = 0; i < str.length; ++i)
	{
		Draw.Char(x, y, str.charCodeAt(i) + 128);
		x += 8;
	}
};

Draw.PicFromWad = function(name)
{
	var buf = W.GetLumpName(name);
	var p = {};
	var view = new DataView(buf, 0, 8);
	p.width = view.getUint32(0, true);
	p.height = view.getUint32(4, true);
	p.data = new Uint8Array(buf, 8, p.width * p.height);
	p.texnum = GL.LoadPicTexture(p);
	return p;
};

Draw.CachePic = function(path)
{
	path = 'gfx/' + path + '.lmp';
	var buf = COM.LoadFile(path);
	if (buf == null)
		Sys.Error('Draw.CachePic: failed to load ' + path);
	var dat = {};
	var view = new DataView(buf, 0, 8);
	dat.width = view.getUint32(0, true);
	dat.height = view.getUint32(4, true);
	dat.data = new Uint8Array(buf, 8, dat.width * dat.height);
	dat.texnum = GL.LoadPicTexture(dat);
	return dat;
};

Draw.Pic = function(x, y, pic)
{
	var program = GL.UseProgram('Pic', true);
	GL.Bind(program.tTexture, pic.texnum, true);
	GL.StreamDrawTexturedQuad(x, y, pic.width, pic.height, 0.0, 0.0, 1.0, 1.0);
};

Draw.PicTranslate = function(x, y, pic, top, bottom)
{
	GL.StreamFlush();
	var program = GL.UseProgram('PicTranslate');
	GL.Bind(program.tTexture, pic.texnum);
	GL.Bind(program.tTrans, pic.translate);

	var p = VID.d_8to24table[top];
	var scale = 1.0 / 191.25;
	gl.uniform3f(program.uTop, (p & 0xff) * scale, ((p >> 8) & 0xff) * scale, (p >> 16) * scale);
	p = VID.d_8to24table[bottom];
	gl.uniform3f(program.uBottom, (p & 0xff) * scale, ((p >> 8) & 0xff) * scale, (p >> 16) * scale);

	GL.StreamDrawTexturedQuad(x, y, pic.width, pic.height, 0.0, 0.0, 1.0, 1.0);

	GL.StreamFlush();
};

Draw.ConsoleBackground = function(lines)
{
	var program = GL.UseProgram('Pic', true);
	GL.Bind(program.tTexture, Draw.conback.texnum, true);
	GL.StreamDrawTexturedQuad(0, lines - VID.height, VID.width, VID.height, 0.0, 0.0, 1.0, 1.0);
};

Draw.Fill = function(x, y, w, h, c)
{
	var program = GL.UseProgram('Fill', true);
	var color = VID.d_8to24table[c];
	GL.StreamDrawColoredQuad(x, y, w, h, color & 0xff, (color >> 8) & 0xff, color >> 16, 255);
};

Draw.FadeScreen = function()
{
	var program = GL.UseProgram('Fill', true);
	GL.StreamDrawColoredQuad(0, 0, VID.width, VID.height, 0, 0, 0, 204);
};

Draw.BeginDisc = function()
{
	if (Draw.loadingElem == null)
		return;
	Draw.loadingElem.style.left = ((VID.width - Draw.loading.width) >> 1) + 'px';
	Draw.loadingElem.style.top = ((VID.height - Draw.loading.height) >> 1) + 'px';
	Draw.loadingElem.style.display = 'inline-block';
};

Draw.EndDisc = function()
{
	if (Draw.loadingElem != null)
		Draw.loadingElem.style.display = 'none';
};

Draw.PicToDataURL = function(pic)
{
	var canvas = document.createElement('canvas');
	canvas.width = pic.width;
	canvas.height = pic.height;
	var ctx = canvas.getContext('2d');
	var data = ctx.createImageData(pic.width, pic.height);
	var trans = new ArrayBuffer(data.data.length);
	var trans32 = new Uint32Array(trans);
	var i;
	for (i = 0; i < pic.data.length; ++i)
		trans32[i] = COM.LittleLong(VID.d_8to24table[pic.data[i]] + 0xff000000);
	data.data.set(new Uint8Array(trans));
	ctx.putImageData(data, 0, 0);
	return canvas.toDataURL();
};