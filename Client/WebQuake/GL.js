GL = {};

GL.textures = [];
GL.currenttextures = [];
GL.programs = [];

GL.Bind = function(target, texnum, flushStream)
{
	if (GL.currenttextures[target] !== texnum)
	{
		if (flushStream === true)
			GL.StreamFlush();
		if (GL.activetexture !== target)
		{
			GL.activetexture = target;
			gl.activeTexture(gl.TEXTURE0 + target);
		}
		GL.currenttextures[target] = texnum;
		gl.bindTexture(gl.TEXTURE_2D, texnum);
	}
};

GL.TextureMode_f = function()
{
	var i;
	if (Cmd.argv.length <= 1)
	{
		for (i = 0; i < GL.modes.length; ++i)
		{
			if (GL.filter_min === GL.modes[i][1])
			{
				Con.Print(GL.modes[i][0] + '\n');
				return;
			}
		}
		Con.Print('current filter is unknown???\n');
		return;
	}
	var name = Cmd.argv[1].toUpperCase();
	for (i = 0; i < GL.modes.length; ++i)
	{
		if (GL.modes[i][0] === name)
			break;
	}
	if (i === GL.modes.length)
	{
		Con.Print('bad filter name\n');
		return;
	}
	GL.filter_min = GL.modes[i][1];
	GL.filter_max = GL.modes[i][2];
	for (i = 0; i < GL.textures.length; ++i)
	{
		GL.Bind(0, GL.textures[i].texnum);
		gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, GL.filter_min);
		gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, GL.filter_max);
	}
};

GL.ortho = [
	0.0, 0.0, 0.0, 0.0,
	0.0, 0.0, 0.0, 0.0,
	0.0, 0.0, 0.00001, 0.0,
	-1.0, 1.0, 0.0, 1.0
];

GL.Set2D = function()
{
	gl.viewport(0, 0, (VID.width * SCR.devicePixelRatio) >> 0, (VID.height * SCR.devicePixelRatio) >> 0);
	GL.UnbindProgram();
	var i, program;
	for (i = 0; i < GL.programs.length; ++i)
	{
		program = GL.programs[i];
		if (program.uOrtho == null)
			continue;
		gl.useProgram(program.program);
		gl.uniformMatrix4fv(program.uOrtho, false, GL.ortho);
	}
	gl.disable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND);
};

GL.ResampleTexture = function(data, inwidth, inheight, outwidth, outheight)
{
	var outdata = new ArrayBuffer(outwidth * outheight);
	var out = new Uint8Array(outdata);
	var xstep = inwidth / outwidth, ystep = inheight / outheight;
	var src, dest = 0, y;
	var i, j;
	for (i = 0; i < outheight; ++i)
	{
		src = Math.floor(i * ystep) * inwidth;
		for (j = 0; j < outwidth; ++j)
			out[dest + j] = data[src + Math.floor(j * xstep)];
		dest += outwidth;
	}
	return out;
};

GL.Upload = function(data, width, height)
{
	var scaled_width = width, scaled_height = height;
	if (((width & (width - 1)) !== 0) || ((height & (height - 1)) !== 0))
	{
		--scaled_width;
		scaled_width |= (scaled_width >> 1);
		scaled_width |= (scaled_width >> 2);
		scaled_width |= (scaled_width >> 4);
		scaled_width |= (scaled_width >> 8);
		scaled_width |= (scaled_width >> 16);
		++scaled_width;
		--scaled_height;
		scaled_height |= (scaled_height >> 1);
		scaled_height |= (scaled_height >> 2);
		scaled_height |= (scaled_height >> 4);
		scaled_height |= (scaled_height >> 8);
		scaled_height |= (scaled_height >> 16);
		++scaled_height;
	}
	if (scaled_width > GL.maxtexturesize)
		scaled_width = GL.maxtexturesize;
	if (scaled_height > GL.maxtexturesize)
		scaled_height = GL.maxtexturesize;
	if ((scaled_width !== width) || (scaled_height !== height))
		data = GL.ResampleTexture(data, width, height, scaled_width, scaled_height);
	var trans = new ArrayBuffer((scaled_width * scaled_height) << 2)
	var trans32 = new Uint32Array(trans);
	var i;
	for (i = scaled_width * scaled_height - 1; i >= 0; --i)
	{
		trans32[i] = COM.LittleLong(VID.d_8to24table[data[i]] + 0xff000000);
		if (data[i] >= 224)
			trans32[i] &= 0xffffff;
	}
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, scaled_width, scaled_height, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(trans));
	gl.generateMipmap(gl.TEXTURE_2D);
	gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, GL.filter_min);
	gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, GL.filter_max);
};

GL.LoadTexture = function(identifier, width, height, data)
{
	var glt, i;
	if (identifier.length !== 0)
	{
		for (i = 0; i < GL.textures.length; ++i)
		{
			glt = GL.textures[i];
			if (glt.identifier === identifier)
			{
				if ((width !== glt.width) || (height !== glt.height))
					Sys.Error('GL.LoadTexture: cache mismatch');
				return glt;
			}
		}
	}

	var scaled_width = width, scaled_height = height;
	if (((width & (width - 1)) !== 0) || ((height & (height - 1)) !== 0))
	{
		--scaled_width ;
		scaled_width |= (scaled_width >> 1);
		scaled_width |= (scaled_width >> 2);
		scaled_width |= (scaled_width >> 4);
		scaled_width |= (scaled_width >> 8);
		scaled_width |= (scaled_width >> 16);
		++scaled_width;
		--scaled_height;
		scaled_height |= (scaled_height >> 1);
		scaled_height |= (scaled_height >> 2);
		scaled_height |= (scaled_height >> 4);
		scaled_height |= (scaled_height >> 8);
		scaled_height |= (scaled_height >> 16);
		++scaled_height;
	}
	if (scaled_width > GL.maxtexturesize)
		scaled_width = GL.maxtexturesize;
	if (scaled_height > GL.maxtexturesize)
		scaled_height = GL.maxtexturesize;
	scaled_width >>= GL.picmip.value;
	if (scaled_width === 0)
		scaled_width = 1;
	scaled_height >>= GL.picmip.value;
	if (scaled_height === 0)
		scaled_height = 1;
	if ((scaled_width !== width) || (scaled_height !== height))
		data = GL.ResampleTexture(data, width, height, scaled_width, scaled_height);

	glt = {texnum: gl.createTexture(), identifier: identifier, width: width, height: height};
	GL.Bind(0, glt.texnum);
	GL.Upload(data, scaled_width, scaled_height);
	GL.textures[GL.textures.length] = glt;
	return glt;
};

GL.LoadPicTexture = function(pic)
{
	var data = pic.data, scaled_width = pic.width, scaled_height = pic.height;
	if (((pic.width & (pic.width - 1)) !== 0) || ((pic.height & (pic.height - 1)) !== 0))
	{
		--scaled_width ;
		scaled_width |= (scaled_width >> 1);
		scaled_width |= (scaled_width >> 2);
		scaled_width |= (scaled_width >> 4);
		scaled_width |= (scaled_width >> 8);
		scaled_width |= (scaled_width >> 16);
		++scaled_width;
		--scaled_height;
		scaled_height |= (scaled_height >> 1);
		scaled_height |= (scaled_height >> 2);
		scaled_height |= (scaled_height >> 4);
		scaled_height |= (scaled_height >> 8);
		scaled_height |= (scaled_height >> 16);
		++scaled_height;
	}
	if (scaled_width > GL.maxtexturesize)
		scaled_width = GL.maxtexturesize;
	if (scaled_height > GL.maxtexturesize)
		scaled_height = GL.maxtexturesize;
	if ((scaled_width !== pic.width) || (scaled_height !== pic.height))
		data = GL.ResampleTexture(data, pic.width, pic.height, scaled_width, scaled_height);

	var texnum = gl.createTexture();
	GL.Bind(0, texnum);
	var trans = new ArrayBuffer((scaled_width * scaled_height) << 2)
	var trans32 = new Uint32Array(trans);
	var i;
	for (i = scaled_width * scaled_height - 1; i >= 0; --i)
	{
		if (data[i] !== 255)
			trans32[i] = COM.LittleLong(VID.d_8to24table[data[i]] + 0xff000000);
	}
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, scaled_width, scaled_height, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(trans));
	gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	return texnum;
};

GL.CreateProgram = function(identifier, uniforms, attribs, textures)
{
	var p = gl.createProgram();
	var program =
	{
		identifier: identifier,
		program: p,
		attribs: []
	};

	var vsh = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vsh, document.getElementById('vsh' + identifier).text);
	gl.compileShader(vsh);
	if (gl.getShaderParameter(vsh, gl.COMPILE_STATUS) !== true)
		Sys.Error('Error compiling shader: ' + gl.getShaderInfoLog(vsh));

	var fsh = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fsh, document.getElementById('fsh' + identifier).text);
	gl.compileShader(fsh);
	if (gl.getShaderParameter(fsh, gl.COMPILE_STATUS) !== true)
		Sys.Error('Error compiling shader: ' + gl.getShaderInfoLog(fsh));

	gl.attachShader(p, vsh);
	gl.attachShader(p, fsh);

	gl.linkProgram(p);
	if (gl.getProgramParameter(p, gl.LINK_STATUS) !== true)
		Sys.Error('Error linking program: ' + gl.getProgramInfoLog(p));

	gl.useProgram(p);

	for (var i = 0; i < uniforms.length; ++i)
		program[uniforms[i]] = gl.getUniformLocation(p, uniforms[i]);

	program.vertexSize = 0;
	program.attribBits = 0;
	for (var i = 0; i < attribs.length; ++i)
	{
		var attribParameters = attribs[i];
		var attrib =
		{
			name: attribParameters[0],
			location: gl.getAttribLocation(p, attribParameters[0]),
			type: attribParameters[1],
			components: attribParameters[2],
			normalized: (attribParameters[3] === true),
			offset: program.vertexSize
		};
		program.attribs[i] = attrib;
		program[attrib.name] = attrib;
		if (attrib.type === gl.FLOAT)
			program.vertexSize += attrib.components * 4;
		else if (attrib.type === gl.BYTE || attrib.type === gl.UNSIGNED_BYTE)
			program.vertexSize += 4;
		else
			Sys.Error('Unknown vertex attribute type');
		program.attribBits |= 1 << attrib.location;
	}

	for (var i = 0; i < textures.length; ++i)
	{
		program[textures[i]] = i;
		gl.uniform1i(gl.getUniformLocation(p, textures[i]), i);
	}

	GL.programs[GL.programs.length] = program;
	return program;
};

GL.UseProgram = function(identifier, flushStream)
{
	var currentProgram = GL.currentProgram;
	if (currentProgram != null)
	{
		if (currentProgram.identifier === identifier)
			return currentProgram;
		if (flushStream === true)
			GL.StreamFlush();
	}

	var program = null;
	for (var i = 0; i < GL.programs.length; ++i)
	{
		if (GL.programs[i].identifier === identifier)
		{
			program = GL.programs[i];
			break;
		}
	}
	if (program == null)
		return null;

	var enableAttribs = program.attribBits, disableAttribs = 0;
	if (currentProgram != null)
	{
		enableAttribs &= ~currentProgram.attribBits;
		disableAttribs = currentProgram.attribBits & ~program.attribBits;
	}
	GL.currentProgram = program;
	gl.useProgram(program.program);
	for (var attrib = 0; enableAttribs !== 0 || disableAttribs !== 0; ++attrib)
	{
		var mask = 1 << attrib;
		if ((enableAttribs & mask) !== 0)
			gl.enableVertexAttribArray(attrib);
		else if ((disableAttribs & mask) !== 0)
			gl.disableVertexAttribArray(attrib);
		enableAttribs &= ~mask;
		disableAttribs &= ~mask;
	}

	return program;
};

GL.UnbindProgram = function()
{
	if (GL.currentProgram == null)
		return;
	GL.StreamFlush();
	var i;
	for (i = 0; i < GL.currentProgram.attribs.length; ++i)
		gl.disableVertexAttribArray(GL.currentProgram.attribs[i].location);
	GL.currentProgram = null;
};

GL.identity = [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0];

GL.RotationMatrix = function(pitch, yaw, roll)
{
	pitch *= Math.PI / -180.0;
	yaw *= Math.PI / 180.0;
	roll *= Math.PI / 180.0;
	var sp = Math.sin(pitch);
	var cp = Math.cos(pitch);
	var sy = Math.sin(yaw);
	var cy = Math.cos(yaw);
	var sr = Math.sin(roll);
	var cr = Math.cos(roll);
	return [
		cy * cp,					sy * cp,					-sp,
		-sy * cr + cy * sp * sr,	cy * cr + sy * sp * sr,		cp * sr,
		-sy * -sr + cy * sp * cr,	cy * -sr + sy * sp * cr,	cp * cr
	];
};

GL.StreamFlush = function()
{
	if (GL.streamArrayVertexCount === 0)
		return;
	var program = GL.currentProgram;
	if (program != null)
	{
		gl.bindBuffer(gl.ARRAY_BUFFER, GL.streamBuffer);
		gl.bufferSubData(gl.ARRAY_BUFFER, GL.streamBufferPosition,
			GL.streamArrayBytes.subarray(0, GL.streamArrayPosition));
		var attribs = program.attribs;
		for (var i = 0; i < attribs.length; ++i)
		{
			var attrib = attribs[i];
			gl.vertexAttribPointer(attrib.location,
				attrib.components, attrib.type, attrib.normalized,
				program.vertexSize, GL.streamBufferPosition + attrib.offset);
		}
		gl.drawArrays(gl.TRIANGLES, 0, GL.streamArrayVertexCount);
		GL.streamBufferPosition += GL.streamArrayPosition;
	}
	GL.streamArrayPosition = 0;
	GL.streamArrayVertexCount = 0;
}

GL.StreamGetSpace = function(vertexCount)
{
	var program = GL.currentProgram;
	if (program == null)
		return;
	var length = vertexCount * program.vertexSize;
	if ((GL.streamBufferPosition + GL.streamArrayPosition + length) > GL.streamArray.byteLength)
	{
		GL.StreamFlush();
		GL.streamBufferPosition = 0;
	}
	GL.streamArrayVertexCount += vertexCount;
}

GL.StreamWriteFloat = function(x)
{
	GL.streamArrayView.setFloat32(GL.streamArrayPosition, x, true);
	GL.streamArrayPosition += 4;
}

GL.StreamWriteFloat2 = function(x, y)
{
	var view = GL.streamArrayView;
	var position = GL.streamArrayPosition;
	view.setFloat32(position, x, true);
	view.setFloat32(position + 4, y, true);
	GL.streamArrayPosition += 8;
}

GL.StreamWriteFloat3 = function(x, y, z)
{
	var view = GL.streamArrayView;
	var position = GL.streamArrayPosition;
	view.setFloat32(position, x, true);
	view.setFloat32(position + 4, y, true);
	view.setFloat32(position + 8, z, true);
	GL.streamArrayPosition += 12;
}

GL.StreamWriteFloat4 = function(x, y, z, w)
{
	var view = GL.streamArrayView;
	var position = GL.streamArrayPosition;
	view.setFloat32(position, x, true);
	view.setFloat32(position + 4, y, true);
	view.setFloat32(position + 8, z, true);
	view.setFloat32(position + 12, w, true);
	GL.streamArrayPosition += 16;
}

GL.StreamWriteUByte4 = function(x, y, z, w)
{
	var view = GL.streamArrayView;
	var position = GL.streamArrayPosition;
	view.setUint8(position, x);
	view.setUint8(position + 1, y);
	view.setUint8(position + 2, z);
	view.setUint8(position + 3, w);
	GL.streamArrayPosition += 4;
}

GL.StreamDrawTexturedQuad = function(x, y, w, h, u, v, u2, v2)
{
	var x2 = x + w, y2 = y + h;
	GL.StreamGetSpace(6);
	GL.StreamWriteFloat4(x, y, u, v);
	GL.StreamWriteFloat4(x, y2, u, v2);
	GL.StreamWriteFloat4(x2, y, u2, v);
	GL.StreamWriteFloat4(x2, y, u2, v);
	GL.StreamWriteFloat4(x, y2, u, v2);
	GL.StreamWriteFloat4(x2, y2, u2, v2);
}

GL.StreamDrawColoredQuad = function(x, y, w, h, r, g, b, a)
{
	var x2 = x + w, y2 = y + h;
	GL.StreamGetSpace(6);
	GL.StreamWriteFloat2(x, y);
	GL.StreamWriteUByte4(r, g, b, a);
	GL.StreamWriteFloat2(x, y2);
	GL.StreamWriteUByte4(r, g, b, a);
	GL.StreamWriteFloat2(x2, y);
	GL.StreamWriteUByte4(r, g, b, a);
	GL.StreamWriteFloat2(x2, y);
	GL.StreamWriteUByte4(r, g, b, a);
	GL.StreamWriteFloat2(x, y2);
	GL.StreamWriteUByte4(r, g, b, a);
	GL.StreamWriteFloat2(x2, y2);
	GL.StreamWriteUByte4(r, g, b, a);
}

GL.Init = function()
{
	VID.mainwindow = document.getElementById('mainwindow');
	try
	{
		gl = VID.mainwindow.getContext('webgl') || VID.mainwindow.getContext('experimental-webgl');
	}
	catch (e) {}
	if (gl == null)
		Sys.Error('Unable to initialize WebGL. Your browser may not support it.');

	GL.maxtexturesize = gl.getParameter(gl.MAX_TEXTURE_SIZE);

	gl.clearColor(0.0, 0.0, 0.0, 0.0);
	gl.cullFace(gl.FRONT);
	gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE);

	GL.modes = [
		['GL_NEAREST', gl.NEAREST, gl.NEAREST],
		['GL_LINEAR', gl.LINEAR, gl.LINEAR],
		['GL_NEAREST_MIPMAP_NEAREST', gl.NEAREST_MIPMAP_NEAREST, gl.NEAREST],
		['GL_LINEAR_MIPMAP_NEAREST', gl.LINEAR_MIPMAP_NEAREST, gl.LINEAR],
		['GL_NEAREST_MIPMAP_LINEAR', gl.NEAREST_MIPMAP_LINEAR, gl.NEAREST],
		['GL_LINEAR_MIPMAP_LINEAR', gl.LINEAR_MIPMAP_LINEAR, gl.LINEAR]
	];
	GL.filter_min = gl.LINEAR_MIPMAP_NEAREST;
	GL.filter_max = gl.LINEAR;

	GL.picmip = Cvar.RegisterVariable('gl_picmip', '0');
	Cmd.AddCommand('gl_texturemode', GL.TextureMode_f);

	GL.streamArray = new ArrayBuffer(8192); // Increasing even a little bit ruins all performance on Mali.
	GL.streamArrayBytes = new Uint8Array(GL.streamArray);
	GL.streamArrayPosition = 0;
	GL.streamArrayVertexCount = 0;
	GL.streamArrayView = new DataView(GL.streamArray);
	GL.streamBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, GL.streamBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, GL.streamArray.byteLength, gl.DYNAMIC_DRAW);
	GL.streamBufferPosition = 0;

	VID.mainwindow.style.display = 'inline-block';
};