R = {};

// efrag

R.SplitEntityOnNode = function(node)
{
	if (node.contents === Mod.contents.solid)
		return;
	if (node.contents < 0)
	{
		R.currententity.leafs[R.currententity.leafs.length] = node.num - 1;
		return;
	}
	var sides = Vec.BoxOnPlaneSide(R.emins, R.emaxs, node.plane);
	if ((sides & 1) !== 0)
		R.SplitEntityOnNode(node.children[0]);
	if ((sides & 2) !== 0)
		R.SplitEntityOnNode(node.children[1]);
};

// light

R.dlightframecount = 0;

R.lightstylevalue = new Uint8Array(new ArrayBuffer(64));

R.AnimateLight = function()
{
	var j;
	if (R.fullbright.value === 0)
	{
		var i = Math.floor(CL.state.time * 10.0);
		for (j = 0; j < 64; ++j)
		{
			if (CL.lightstyle[j].length === 0)
			{
				R.lightstylevalue[j] = 12;
				continue;
			}
			R.lightstylevalue[j] = CL.lightstyle[j].charCodeAt(i % CL.lightstyle[j].length) - 97;
		}
	}
	else
	{
		for (j = 0; j < 64; ++j)
			R.lightstylevalue[j] = 12;
	}
	GL.Bind(0, R.lightstyle_texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.ALPHA, 64, 1, 0, gl.ALPHA, gl.UNSIGNED_BYTE, R.lightstylevalue);
};

R.RenderDlights = function()
{
	if (R.flashblend.value === 0)
		return;
	++R.dlightframecount;
	gl.enable(gl.BLEND);
	var program = GL.UseProgram('Dlight'), l, a;
	gl.bindBuffer(gl.ARRAY_BUFFER, R.dlightvecs);
	gl.vertexAttribPointer(program.aPosition.location, 3, gl.FLOAT, false, 0, 0);
	for (i = 0; i <= 31; ++i)
	{
		l = CL.dlights[i];
		if ((l.die < CL.state.time) || (l.radius === 0.0))
			continue;
		if (Vec.Length([l.origin[0] - R.refdef.vieworg[0], l.origin[1] - R.refdef.vieworg[1], l.origin[2] - R.refdef.vieworg[2]]) < (l.radius * 0.35))
		{
			a = l.radius * 0.0003;
			V.blend[3] += a * (1.0 - V.blend[3]);
			a /= V.blend[3];
			V.blend[0] = V.blend[1] * (1.0 - a) + (255.0 * a);
			V.blend[1] = V.blend[1] * (1.0 - a) + (127.5 * a);
			V.blend[2] *= 1.0 - a;
			continue;
		}
		gl.uniform3fv(program.uOrigin, l.origin);
		gl.uniform1f(program.uRadius, l.radius);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 18);
	}
	gl.disable(gl.BLEND);
};

R.MarkLights = function(light, bit, node)
{
	if (node.contents < 0)
		return;
	var normal = node.plane.normal;
	var dist = light.origin[0] * normal[0] + light.origin[1] * normal[1] + light.origin[2] * normal[2] - node.plane.dist;
	if (dist > light.radius)
	{
		R.MarkLights(light, bit, node.children[0]);
		return;
	}
	if (dist < -light.radius)
	{
		R.MarkLights(light, bit, node.children[1]);
		return;
	}
	var i, surf;
	for (i = 0; i < node.numfaces; ++i)
	{
		surf = CL.state.worldmodel.faces[node.firstface + i];
		if ((surf.sky === true) || (surf.turbulent === true))
			continue;
		if (surf.dlightframe !== (R.dlightframecount + 1))
		{
			surf.dlightbits = 0;
			surf.dlightframe = R.dlightframecount + 1;
		}
		surf.dlightbits += bit;
	}
	R.MarkLights(light, bit, node.children[0]);
	R.MarkLights(light, bit, node.children[1]);
};

R.PushDlights = function()
{
	if (R.flashblend.value !== 0)
		return;
	var i;
	for (i = 0; i <= 1023; ++i)
		R.lightmap_modified[i] = false;

	var l, bit = 1, j, ent;
	for (i = 0; i <= 31; ++i)
	{
		l = CL.dlights[i];
		if ((l.die >= CL.state.time) && (l.radius !== 0.0))
		{
			R.MarkLights(l, bit, CL.state.worldmodel.nodes[0]);
			for (j = 0; j < CL.numvisedicts; ++j)
			{
				ent = CL.visedicts[j];
				if (ent.model == null)
					continue;
				if ((ent.model.type !== Mod.type.brush) || (ent.model.submodel !== true))
					continue;
				R.MarkLights(l, bit, CL.state.worldmodel.nodes[ent.model.hulls[0].firstclipnode]);
			}
		}
		bit += bit;
	}

	var surf;
	for (i = 0; i < CL.state.worldmodel.faces.length; ++i)
	{
		surf = CL.state.worldmodel.faces[i];
		if (surf.dlightframe === R.dlightframecount)
			R.RemoveDynamicLights(surf);
		else if (surf.dlightframe === (R.dlightframecount + 1))
			R.AddDynamicLights(surf);
	}

	GL.Bind(0, R.dlightmap_texture);
	for (i = 0; i <= 1023; ++i)
	{
		if (R.lightmap_modified[i] !== true)
			continue;
		for (j = 1023; j >= i; --j)
		{
			if (R.lightmap_modified[j] !== true)
				continue;
			gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, i, 1024, j - i + 1, gl.ALPHA, gl.UNSIGNED_BYTE,
				R.dlightmaps.subarray(i << 10, (j + 1) << 10));
			break;
		}
		break;
	}

	++R.dlightframecount;
};

R.RecursiveLightPoint = function(node, start, end)
{
	if (node.contents < 0)
		return -1;

	var normal = node.plane.normal;
	var front = start[0] * normal[0] + start[1] * normal[1] + start[2] * normal[2] - node.plane.dist;
	var back = end[0] * normal[0] + end[1] * normal[1] + end[2] * normal[2] - node.plane.dist;
	var side = front < 0;

	if ((back < 0) === side)
		return R.RecursiveLightPoint(node.children[side === true ? 1 : 0], start, end);

	var frac = front / (front - back);
	var mid = [
		start[0] + (end[0] - start[0]) * frac,
		start[1] + (end[1] - start[1]) * frac,
		start[2] + (end[2] - start[2]) * frac
	];

	var r = R.RecursiveLightPoint(node.children[side === true ? 1 : 0], start, mid);
	if (r >= 0)
		return r;

	if ((back < 0) === side)
		return -1;

	var i, surf, tex, s, t, ds, dt, lightmap, size, maps;
	for (i = 0; i < node.numfaces; ++i)
	{
		surf = CL.state.worldmodel.faces[node.firstface + i];
		if ((surf.sky === true) || (surf.turbulent === true))
			continue;

		tex = CL.state.worldmodel.texinfo[surf.texinfo];

		s = Vec.DotProduct(mid, tex.vecs[0]) + tex.vecs[0][3];
		t = Vec.DotProduct(mid, tex.vecs[1]) + tex.vecs[1][3];
		if ((s < surf.texturemins[0]) || (t < surf.texturemins[1]))
			continue;

		ds = s - surf.texturemins[0];
		dt = t - surf.texturemins[1];
		if ((ds > surf.extents[0]) || (dt > surf.extents[1]))
			continue;

		if (surf.lightofs === 0)
			return 0;

		ds >>= 4;
		dt >>= 4;

		lightmap = surf.lightofs;
		if (lightmap === 0)
			return 0;

		lightmap += dt * ((surf.extents[0] >> 4) + 1) + ds;
		r = 0;
		size = ((surf.extents[0] >> 4) + 1) * ((surf.extents[1] >> 4) + 1);
		for (maps = 0; maps < surf.styles.length; ++maps)
		{
			r += CL.state.worldmodel.lightdata[lightmap] * R.lightstylevalue[surf.styles[maps]] * 22;
			lightmap += size;
		}
		return r >> 8;
	}
	return R.RecursiveLightPoint(node.children[side !== true ? 1 : 0], mid, end);
};

R.LightPoint = function(p)
{
	if (CL.state.worldmodel.lightdata == null)
		return 255;
	var r = R.RecursiveLightPoint(CL.state.worldmodel.nodes[0], p, [p[0], p[1], p[2] - 2048.0]);
	if (r === -1)
		return 0;
	return r;
};

// main

R.visframecount = 0;

R.frustum = [{}, {}, {}, {}];

R.vup = [];
R.vpn = [];
R.vright = [];

R.refdef = {
	vrect: {},
	vieworg: [0.0, 0.0, 0.0],
	viewangles: [0.0, 0.0, 0.0]
};

R.CullBox = function(mins, maxs)
{
	if (Vec.BoxOnPlaneSide(mins, maxs, R.frustum[0]) === 2)
		return true;
	if (Vec.BoxOnPlaneSide(mins, maxs, R.frustum[1]) === 2)
		return true;
	if (Vec.BoxOnPlaneSide(mins, maxs, R.frustum[2]) === 2)
		return true;
	if (Vec.BoxOnPlaneSide(mins, maxs, R.frustum[3]) === 2)
		return true;
};

R.DrawSpriteModel = function(e)
{
	var program = GL.UseProgram('Sprite', true);
	var num = e.frame;
	if ((num >= e.model.numframes) || (num < 0))
	{
		Con.DPrint('R.DrawSpriteModel: no such frame ' + num + '\n');
		num = 0;
	}
	var frame = e.model.frames[num];
	if (frame.group === true)
	{
		var fullinterval, targettime, i, time = CL.state.time + e.syncbase;
		num = frame.frames.length - 1;
		fullinterval = frame.frames[num].interval;
		targettime = time - Math.floor(time / fullinterval) * fullinterval;
		for (i = 0; i < num; ++i)
		{
			if (frame.frames[i].interval > targettime)
				break;
		}
		frame = frame.frames[i];
	}

	GL.Bind(program.tTexture, frame.texturenum, true);

	if (e.model.oriented === true)
	{
		r = [];
		u = [];
		Vec.AngleVectors(e.angles, null, r, u);
	}
	else
	{
		r = R.vright;
		u = R.vup;
	}
	var p = e.origin;
	var x1 = frame.origin[0], y1 = frame.origin[1], x2 = x1 + frame.width, y2 = y1 + frame.height;

	GL.StreamGetSpace(6);
	GL.StreamWriteFloat3(
		p[0] + x1 * r[0] + y1 * u[0],
		p[1] + x1 * r[1] + y1 * u[1],
		p[2] + x1 * r[2] + y1 * u[2]);
	GL.StreamWriteFloat2(0.0, 1.0);
	GL.StreamWriteFloat3(
		p[0] + x1 * r[0] + y2 * u[0],
		p[1] + x1 * r[1] + y2 * u[1],
		p[2] + x1 * r[2] + y2 * u[2]);
	GL.StreamWriteFloat2(0.0, 0.0);
	GL.StreamWriteFloat3(
		p[0] + x2 * r[0] + y1 * u[0],
		p[1] + x2 * r[1] + y1 * u[1],
		p[2] + x2 * r[2] + y1 * u[2]);
	GL.StreamWriteFloat2(1.0, 1.0);
	GL.StreamWriteFloat3(
		p[0] + x2 * r[0] + y1 * u[0],
		p[1] + x2 * r[1] + y1 * u[1],
		p[2] + x2 * r[2] + y1 * u[2]);
	GL.StreamWriteFloat2(1.0, 1.0);
	GL.StreamWriteFloat3(
		p[0] + x1 * r[0] + y2 * u[0],
		p[1] + x1 * r[1] + y2 * u[1],
		p[2] + x1 * r[2] + y2 * u[2]);
	GL.StreamWriteFloat2(0.0, 0.0);
	GL.StreamWriteFloat3(
		p[0] + x2 * r[0] + y2 * u[0],
		p[1] + x2 * r[1] + y2 * u[1],
		p[2] + x2 * r[2] + y2 * u[2]);
	GL.StreamWriteFloat2(1.0, 0.0);
};

R.avertexnormals = [
	[-0.525731, 0.0, 0.850651],
	[-0.442863, 0.238856, 0.864188],
	[-0.295242, 0.0, 0.955423],
	[-0.309017, 0.5, 0.809017],
	[-0.16246, 0.262866, 0.951056],
	[0.0, 0.0, 1.0],
	[0.0, 0.850651, 0.525731],
	[-0.147621, 0.716567, 0.681718],
	[0.147621, 0.716567, 0.681718],
	[0.0, 0.525731, 0.850651],
	[0.309017, 0.5, 0.809017],
	[0.525731, 0.0, 0.850651],
	[0.295242, 0.0, 0.955423],
	[0.442863, 0.238856, 0.864188],
	[0.16246, 0.262866, 0.951056],
	[-0.681718, 0.147621, 0.716567],
	[-0.809017, 0.309017, 0.5],
	[-0.587785, 0.425325, 0.688191],
	[-0.850651, 0.525731, 0.0],
	[-0.864188, 0.442863, 0.238856],
	[-0.716567, 0.681718, 0.147621],
	[-0.688191, 0.587785, 0.425325],
	[-0.5, 0.809017, 0.309017],
	[-0.238856, 0.864188, 0.442863],
	[-0.425325, 0.688191, 0.587785],
	[-0.716567, 0.681718, -0.147621],
	[-0.5, 0.809017, -0.309017],
	[-0.525731, 0.850651, 0.0],
	[0.0, 0.850651, -0.525731],
	[-0.238856, 0.864188, -0.442863],
	[0.0, 0.955423, -0.295242],
	[-0.262866, 0.951056, -0.16246],
	[0.0, 1.0, 0.0],
	[0.0, 0.955423, 0.295242],
	[-0.262866, 0.951056, 0.16246],
	[0.238856, 0.864188, 0.442863],
	[0.262866, 0.951056, 0.16246],
	[0.5, 0.809017, 0.309017],
	[0.238856, 0.864188, -0.442863],
	[0.262866, 0.951056, -0.16246],
	[0.5, 0.809017, -0.309017],
	[0.850651, 0.525731, 0.0],
	[0.716567, 0.681718, 0.147621],
	[0.716567, 0.681718, -0.147621],
	[0.525731, 0.850651, 0.0],
	[0.425325, 0.688191, 0.587785],
	[0.864188, 0.442863, 0.238856],
	[0.688191, 0.587785, 0.425325],
	[0.809017, 0.309017, 0.5],
	[0.681718, 0.147621, 0.716567],
	[0.587785, 0.425325, 0.688191],
	[0.955423, 0.295242, 0.0],
	[1.0, 0.0, 0.0],
	[0.951056, 0.16246, 0.262866],
	[0.850651, -0.525731, 0.0],
	[0.955423, -0.295242, 0.0],
	[0.864188, -0.442863, 0.238856],
	[0.951056, -0.16246, 0.262866],
	[0.809017, -0.309017, 0.5],
	[0.681718, -0.147621, 0.716567],
	[0.850651, 0.0, 0.525731],
	[0.864188, 0.442863, -0.238856],
	[0.809017, 0.309017, -0.5],
	[0.951056, 0.16246, -0.262866],
	[0.525731, 0.0, -0.850651],
	[0.681718, 0.147621, -0.716567],
	[0.681718, -0.147621, -0.716567],
	[0.850651, 0.0, -0.525731],
	[0.809017, -0.309017, -0.5],
	[0.864188, -0.442863, -0.238856],
	[0.951056, -0.16246, -0.262866],
	[0.147621, 0.716567, -0.681718],
	[0.309017, 0.5, -0.809017],
	[0.425325, 0.688191, -0.587785],
	[0.442863, 0.238856, -0.864188],
	[0.587785, 0.425325, -0.688191],
	[0.688191, 0.587785, -0.425325],
	[-0.147621, 0.716567, -0.681718],
	[-0.309017, 0.5, -0.809017],
	[0.0, 0.525731, -0.850651],
	[-0.525731, 0.0, -0.850651],
	[-0.442863, 0.238856, -0.864188],
	[-0.295242, 0.0, -0.955423],
	[-0.16246, 0.262866, -0.951056],
	[0.0, 0.0, -1.0],
	[0.295242, 0.0, -0.955423],
	[0.16246, 0.262866, -0.951056],
	[-0.442863, -0.238856, -0.864188],
	[-0.309017, -0.5, -0.809017],
	[-0.16246, -0.262866, -0.951056],
	[0.0, -0.850651, -0.525731],
	[-0.147621, -0.716567, -0.681718],
	[0.147621, -0.716567, -0.681718],
	[0.0, -0.525731, -0.850651],
	[0.309017, -0.5, -0.809017],
	[0.442863, -0.238856, -0.864188],
	[0.16246, -0.262866, -0.951056],
	[0.238856, -0.864188, -0.442863],
	[0.5, -0.809017, -0.309017],
	[0.425325, -0.688191, -0.587785],
	[0.716567, -0.681718, -0.147621],
	[0.688191, -0.587785, -0.425325],
	[0.587785, -0.425325, -0.688191],
	[0.0, -0.955423, -0.295242],
	[0.0, -1.0, 0.0],
	[0.262866, -0.951056, -0.16246],
	[0.0, -0.850651, 0.525731],
	[0.0, -0.955423, 0.295242],
	[0.238856, -0.864188, 0.442863],
	[0.262866, -0.951056, 0.16246],
	[0.5, -0.809017, 0.309017],
	[0.716567, -0.681718, 0.147621],
	[0.525731, -0.850651, 0.0],
	[-0.238856, -0.864188, -0.442863],
	[-0.5, -0.809017, -0.309017],
	[-0.262866, -0.951056, -0.16246],
	[-0.850651, -0.525731, 0.0],
	[-0.716567, -0.681718, -0.147621],
	[-0.716567, -0.681718, 0.147621],
	[-0.525731, -0.850651, 0.0],
	[-0.5, -0.809017, 0.309017],
	[-0.238856, -0.864188, 0.442863],
	[-0.262866, -0.951056, 0.16246],
	[-0.864188, -0.442863, 0.238856],
	[-0.809017, -0.309017, 0.5],
	[-0.688191, -0.587785, 0.425325],
	[-0.681718, -0.147621, 0.716567],
	[-0.442863, -0.238856, 0.864188],
	[-0.587785, -0.425325, 0.688191],
	[-0.309017, -0.5, 0.809017],
	[-0.147621, -0.716567, 0.681718],
	[-0.425325, -0.688191, 0.587785],
	[-0.16246, -0.262866, 0.951056],
	[0.442863, -0.238856, 0.864188],
	[0.16246, -0.262866, 0.951056],
	[0.309017, -0.5, 0.809017],
	[0.147621, -0.716567, 0.681718],
	[0.0, -0.525731, 0.850651],
	[0.425325, -0.688191, 0.587785],
	[0.587785, -0.425325, 0.688191],
	[0.688191, -0.587785, 0.425325],
	[-0.955423, 0.295242, 0.0],
	[-0.951056, 0.16246, 0.262866],
	[-1.0, 0.0, 0.0],
	[-0.850651, 0.0, 0.525731],
	[-0.955423, -0.295242, 0.0],
	[-0.951056, -0.16246, 0.262866],
	[-0.864188, 0.442863, -0.238856],
	[-0.951056, 0.16246, -0.262866],
	[-0.809017, 0.309017, -0.5],
	[-0.864188, -0.442863, -0.238856],
	[-0.951056, -0.16246, -0.262866],
	[-0.809017, -0.309017, -0.5],
	[-0.681718, 0.147621, -0.716567],
	[-0.681718, -0.147621, -0.716567],
	[-0.850651, 0.0, -0.525731],
	[-0.688191, 0.587785, -0.425325],
	[-0.587785, 0.425325, -0.688191],
	[-0.425325, 0.688191, -0.587785],
	[-0.425325, -0.688191, -0.587785],
	[-0.587785, -0.425325, -0.688191],
	[-0.688191, -0.587785, -0.425325]
];

R.DrawAliasModel = function(e)
{
	var clmodel = e.model;

	if (R.CullBox(
		[
			e.origin[0] - clmodel.boundingradius,
			e.origin[1] - clmodel.boundingradius,
			e.origin[2] - clmodel.boundingradius
		],
		[
			e.origin[0] + clmodel.boundingradius,
			e.origin[1] + clmodel.boundingradius,
			e.origin[2] + clmodel.boundingradius
		]) === true)
		return;

	var program;
	if ((e.colormap !== 0) && (clmodel.player === true) && (R.nocolors.value === 0))
	{
		program = GL.UseProgram('Player');
		var top = (CL.state.scores[e.colormap - 1].colors & 0xf0) + 4;
		var bottom = ((CL.state.scores[e.colormap - 1].colors & 0xf) << 4) + 4;
		if (top <= 127)
			top += 7;
		if (bottom <= 127)
			bottom += 7;
		top = VID.d_8to24table[top];
		bottom = VID.d_8to24table[bottom];
		gl.uniform3f(program.uTop, top & 0xff, (top >> 8) & 0xff, top >> 16);
		gl.uniform3f(program.uBottom, bottom & 0xff, (bottom >> 8) & 0xff, bottom >> 16);
	}
	else
		program = GL.UseProgram('Alias');
	gl.uniform3fv(program.uOrigin, e.origin);
	gl.uniformMatrix3fv(program.uAngles, false, GL.RotationMatrix(e.angles[0], e.angles[1], e.angles[2]));

	var ambientlight = R.LightPoint(e.origin);
	var shadelight = ambientlight;
	if ((e === CL.state.viewent) && (ambientlight < 24.0))
		ambientlight = shadelight = 24.0;
	var i, dl, add;
	for (i = 0; i <= 31; ++i)
	{
		dl = CL.dlights[i];
		if (dl.die < CL.state.time)
			continue;
		add = dl.radius - Vec.Length([e.origin[0] - dl.origin[0], e.origin[1] - dl.origin[1], e.origin[1] - dl.origin[1]]);
		if (add > 0.0)
		{
			ambientlight += add;
			shadelight += add;
		}
	}
	if (ambientlight > 128.0)
		ambientlight = 128.0;
	if ((ambientlight + shadelight) > 192.0)
		shadelight = 192.0 - ambientlight;
	if ((e.num >= 1) && (e.num <= CL.state.maxclients) && (ambientlight < 8.0))
		ambientlight = shadelight = 8.0;
	gl.uniform1f(program.uAmbientLight, ambientlight * 0.0078125);
	gl.uniform1f(program.uShadeLight, shadelight * 0.0078125);

	var forward = [], right = [], up = [];
	Vec.AngleVectors(e.angles, forward, right, up);
	gl.uniform3fv(program.uLightVec, [
		Vec.DotProduct([-1.0, 0.0, 0.0], forward),
		-Vec.DotProduct([-1.0, 0.0, 0.0], right),
		Vec.DotProduct([-1.0, 0.0, 0.0], up)
	]);

	R.c_alias_polys += clmodel.numtris;

	var num, fullinterval, targettime, i;
	var time = CL.state.time + e.syncbase;
	num = e.frame;
	if ((num >= clmodel.numframes) || (num < 0))
	{
		Con.DPrint('R.DrawAliasModel: no such frame ' + num + '\n');
		num = 0;
	}
	var frame = clmodel.frames[num];
	if (frame.group === true)
	{	
		num = frame.frames.length - 1;
		fullinterval = frame.frames[num].interval;
		targettime = time - Math.floor(time / fullinterval) * fullinterval;
		for (i = 0; i < num; ++i)
		{
			if (frame.frames[i].interval > targettime)
				break;
		}
		frame = frame.frames[i];
	}
	gl.bindBuffer(gl.ARRAY_BUFFER, clmodel.cmds);
	gl.vertexAttribPointer(program.aPosition.location, 3, gl.FLOAT, false, 24, frame.cmdofs);
	gl.vertexAttribPointer(program.aNormal.location, 3, gl.FLOAT, false, 24, frame.cmdofs + 12);
	gl.vertexAttribPointer(program.aTexCoord.location, 2, gl.FLOAT, false, 0, 0);

	num = e.skinnum;
	if ((num >= clmodel.numskins) || (num < 0))
	{
		Con.DPrint('R.DrawAliasModel: no such skin # ' + num + '\n');
		num = 0;
	}
	var skin = clmodel.skins[num];
	if (skin.group === true)
	{	
		num = skin.skins.length - 1;
		fullinterval = skin.skins[num].interval;
		targettime = time - Math.floor(time / fullinterval) * fullinterval;
		for (i = 0; i < num; ++i)
		{
			if (skin.skins[i].interval > targettime)
				break;
		}
		skin = skin.skins[i];
	}
	GL.Bind(program.tTexture, skin.texturenum.texnum);
	if (clmodel.player === true)
		GL.Bind(program.tPlayer, skin.playertexture);

	gl.drawArrays(gl.TRIANGLES, 0, clmodel.numtris * 3);
};

R.DrawEntitiesOnList = function()
{
	if (R.drawentities.value === 0)
		return;
	var vis = (R.novis.value !== 0) ? Mod.novis : Mod.LeafPVS(R.viewleaf, CL.state.worldmodel);
	var i, j, leaf;
	for (i = 0; i < CL.state.num_statics; ++i)
	{
		R.currententity = CL.static_entities[i];
		if (R.currententity.model == null)
			continue;
		for (j = 0; j < R.currententity.leafs.length; ++j)
		{
			leaf = R.currententity.leafs[j];
			if ((leaf < 0) || ((vis[leaf >> 3] & (1 << (leaf & 7))) !== 0))
				break;
		}
		if (j === R.currententity.leafs.length)
			continue;
		switch (R.currententity.model.type)
		{
		case Mod.type.alias:
			R.DrawAliasModel(R.currententity);
			continue;
		case Mod.type.brush:
			R.DrawBrushModel(R.currententity);
		}
	}
	for (i = 0; i < CL.numvisedicts; ++i)
	{
		R.currententity = CL.visedicts[i];
		if (R.currententity.model == null)
			continue;
		switch (R.currententity.model.type)
		{
		case Mod.type.alias:
			R.DrawAliasModel(R.currententity);
			continue;
		case Mod.type.brush:
			R.DrawBrushModel(R.currententity);
		}
	}
	GL.StreamFlush();
	gl.depthMask(false);
	gl.enable(gl.BLEND);
	for (i = 0; i < CL.state.num_statics; ++i)
	{
		R.currententity = CL.static_entities[i];
		if (R.currententity.model == null)
			continue;
		if (R.currententity.model.type === Mod.type.sprite)
			R.DrawSpriteModel(R.currententity);
	}
	for (i = 0; i < CL.numvisedicts; ++i)
	{
		R.currententity = CL.visedicts[i];
		if (R.currententity.model == null)
			continue;
		if (R.currententity.model.type === Mod.type.sprite)
			R.DrawSpriteModel(R.currententity);
	}
	GL.StreamFlush();
	gl.disable(gl.BLEND);
	gl.depthMask(true);
};

R.DrawViewModel = function()
{
	if (R.drawviewmodel.value === 0)
		return;
	if (Chase.active.value !== 0)
		return;
	if (R.drawentities.value === 0)
		return;
	if ((CL.state.items & Def.it.invisibility) !== 0)
		return;
	if (CL.state.stats[Def.stat.health] <= 0)
		return;
	if (CL.state.viewent.model == null)
		return;

	gl.depthRange(0.0, 0.3);

	var ymax = 4.0 * Math.tan(SCR.fov.value * 0.82 * Math.PI / 360.0);
	R.perspective[0] = 4.0 / (ymax * R.refdef.vrect.width / R.refdef.vrect.height);
	R.perspective[5] = 4.0 / ymax;
	var program = GL.UseProgram('Alias');
	gl.uniformMatrix4fv(program.uPerspective, false, R.perspective);

	R.DrawAliasModel(CL.state.viewent);

	ymax = 4.0 * Math.tan(R.refdef.fov_y * Math.PI / 360.0);
	R.perspective[0] = 4.0 / (ymax * R.refdef.vrect.width / R.refdef.vrect.height);
	R.perspective[5] = 4.0 / ymax;
	program = GL.UseProgram('Alias');
	gl.uniformMatrix4fv(program.uPerspective, false, R.perspective);

	gl.depthRange(0.0, 1.0);
};

R.PolyBlend = function()
{
	if (R.polyblend.value === 0)
		return;
	if (V.blend[3] === 0.0)
		return;
	GL.UseProgram('Fill', true);
	var vrect = R.refdef.vrect;
	GL.StreamDrawColoredQuad(vrect.x, vrect.y, vrect.width, vrect.height,
		V.blend[0], V.blend[1], V.blend[2], V.blend[3] * 255.0);
};

R.SetFrustum = function()
{
	R.frustum[0].normal = Vec.RotatePointAroundVector(R.vup, R.vpn, -(90.0 - R.refdef.fov_x * 0.5));
	R.frustum[1].normal = Vec.RotatePointAroundVector(R.vup, R.vpn, 90.0 - R.refdef.fov_x * 0.5);
	R.frustum[2].normal = Vec.RotatePointAroundVector(R.vright, R.vpn, 90.0 - R.refdef.fov_y * 0.5);
	R.frustum[3].normal = Vec.RotatePointAroundVector(R.vright, R.vpn, -(90.0 - R.refdef.fov_y * 0.5));
	var i, out;
	for (i = 0; i <= 3; ++i)
	{
		out = R.frustum[i];
		out.type = 5;
		out.dist = Vec.DotProduct(R.refdef.vieworg, out.normal);
		out.signbits = 0;
		if (out.normal[0] < 0.0)
			out.signbits = 1;
		if (out.normal[1] < 0.0)
			out.signbits += 2;
		if (out.normal[2] < 0.0)
			out.signbits += 4;
		if (out.normal[3] < 0.0)
			out.signbits += 8;
	}
};

R.perspective = [
	0.0, 0.0, 0.0, 0.0,
	0.0, 0.0, 0.0, 0.0,
	0.0, 0.0, -65540.0 / 65532.0, -1.0,
	0.0, 0.0, -524288.0 / 65532.0, 0.0
];

R.Perspective = function()
{
	var viewangles = [
		R.refdef.viewangles[0] * Math.PI / 180.0,
		(R.refdef.viewangles[1] - 90.0) * Math.PI / -180.0,
		R.refdef.viewangles[2] * Math.PI / -180.0
	];
	var sp = Math.sin(viewangles[0]);
	var cp = Math.cos(viewangles[0]);
	var sy = Math.sin(viewangles[1]);
	var cy = Math.cos(viewangles[1]);
	var sr = Math.sin(viewangles[2]);
	var cr = Math.cos(viewangles[2]);
	var viewMatrix = [
		cr * cy + sr * sp * sy,		cp * sy,	-sr * cy + cr * sp * sy,
		cr * -sy + sr * sp * cy,	cp * cy,	-sr * -sy + cr * sp * cy,
		sr * cp,					-sp,		cr * cp
	];

	if (V.gamma.value < 0.5)
		Cvar.SetValue('gamma', 0.5);
	else if (V.gamma.value > 1.0)
		Cvar.SetValue('gamma', 1.0);

	GL.UnbindProgram();
	var i, program;
	for (i = 0; i < GL.programs.length; ++i)
	{
		program = GL.programs[i];
		gl.useProgram(program.program);
		if (program.uViewOrigin != null)
			gl.uniform3fv(program.uViewOrigin, R.refdef.vieworg);
		if (program.uViewAngles != null)
			gl.uniformMatrix3fv(program.uViewAngles, false, viewMatrix);
		if (program.uPerspective != null)
			gl.uniformMatrix4fv(program.uPerspective, false, R.perspective);
		if (program.uGamma != null)
			gl.uniform1f(program.uGamma, V.gamma.value);
	}
};

R.SetupGL = function()
{
	if (R.dowarp === true)
	{
		gl.bindFramebuffer(gl.FRAMEBUFFER, R.warpbuffer);
		gl.clear(gl.COLOR_BUFFER_BIT + gl.DEPTH_BUFFER_BIT);
		gl.viewport(0, 0, R.warpwidth, R.warpheight);
	}
	else
	{
		var vrect = R.refdef.vrect;
		var pixelRatio = SCR.devicePixelRatio;
		gl.viewport((vrect.x * pixelRatio) >> 0, ((VID.height - vrect.height - vrect.y) * pixelRatio) >> 0, (vrect.width * pixelRatio) >> 0, (vrect.height * pixelRatio) >> 0);
	}
	R.Perspective();
	gl.enable(gl.DEPTH_TEST);
};

R.RenderScene = function()
{
	if (CL.state.maxclients >= 2)
		Cvar.Set('r_fullbright', '0');
	R.AnimateLight();
	Vec.AngleVectors(R.refdef.viewangles, R.vpn, R.vright, R.vup);
	R.viewleaf = Mod.PointInLeaf(R.refdef.vieworg, CL.state.worldmodel);
	V.SetContentsColor(R.viewleaf.contents);
	V.CalcBlend();
	R.dowarp = (R.waterwarp.value !== 0) && (R.viewleaf.contents <= Mod.contents.water);

	R.SetFrustum();
	R.SetupGL();
	R.MarkLeaves();
	gl.enable(gl.CULL_FACE);
	R.DrawSkyBox();
	R.DrawViewModel();
	R.DrawWorld();
	R.DrawEntitiesOnList();
	gl.disable(gl.CULL_FACE);
	R.RenderDlights();
	R.DrawParticles();
};

R.RenderView = function()
{
	gl.finish();
	var time1;
	if (R.speeds.value !== 0)
		time1 = Sys.FloatTime();
	R.c_brush_verts = 0;
	R.c_alias_polys = 0;
	gl.clear(gl.COLOR_BUFFER_BIT + gl.DEPTH_BUFFER_BIT);
	R.RenderScene();
	if (R.speeds.value !== 0)
	{
		var time2 = Math.floor((Sys.FloatTime() - time1) * 1000.0);
		var c_brush_polys = R.c_brush_verts / 3;
		var c_alias_polys = R.c_alias_polys;
		var msg = ((time2 >= 100) ? '' : ((time2 >= 10) ? ' ' : '  ')) + time2 + ' ms  ';
		msg += ((c_brush_polys >= 1000) ? '' : ((c_brush_polys >= 100) ? ' ' : ((c_brush_polys >= 10) ? '  ' : '   '))) + c_brush_polys + ' wpoly ';
		msg += ((c_alias_polys >= 1000) ? '' : ((c_alias_polys >= 100) ? ' ' : ((c_alias_polys >= 10) ? '  ' : '   '))) + c_alias_polys + ' epoly\n';
		Con.Print(msg);
	}
};

// mesh

R.MakeBrushModelDisplayLists = function(m)
{
	if (m.cmds != null)
		gl.deleteBuffer(m.cmds);
	var i, j, k;
	var cmds = [];
	var texture, chain, leaf, surf, vert, styles = [0.0, 0.0, 0.0, 0.0];
	var verts = 0;
	m.chains = [];
	for (i = 0; i < m.textures.length; ++i)
	{
		texture = m.textures[i];
		if ((texture.sky === true) || (texture.turbulent === true))
			continue;
		chain = [i, verts, 0];
		for (j = 0; j < m.numfaces; ++j)
		{
			surf = m.faces[m.firstface + j];
			if (surf.texture !== i)
				continue;
			styles[0] = styles[1] = styles[2] = styles[3] = 0.0;
			switch (surf.styles.length)
			{
			case 4:
				styles[3] = surf.styles[3] * 0.015625 + 0.0078125;
			case 3:
				styles[2] = surf.styles[2] * 0.015625 + 0.0078125;
			case 2:
				styles[1] = surf.styles[1] * 0.015625 + 0.0078125;
			case 1:
				styles[0] = surf.styles[0] * 0.015625 + 0.0078125;
			}
			chain[2] += surf.verts.length;
			for (k = 0; k < surf.verts.length; ++k)
			{
				vert = surf.verts[k];
				cmds[cmds.length] = vert[0];
				cmds[cmds.length] = vert[1];
				cmds[cmds.length] = vert[2];
				cmds[cmds.length] = vert[3];
				cmds[cmds.length] = vert[4];
				cmds[cmds.length] = vert[5];
				cmds[cmds.length] = vert[6];
				cmds[cmds.length] = styles[0];
				cmds[cmds.length] = styles[1];
				cmds[cmds.length] = styles[2];
				cmds[cmds.length] = styles[3];
			}
		}
		if (chain[2] !== 0)
		{
			m.chains[m.chains.length] = chain;
			verts += chain[2];
		}
	}
	m.waterchain = verts * 44;
	verts = 0;
	for (i = 0; i < m.textures.length; ++i)
	{
		texture = m.textures[i];
		if (texture.turbulent !== true)
			continue;
		chain = [i, verts, 0];
		for (j = 0; j < m.numfaces; ++j)
		{
			surf = m.faces[m.firstface + j];
			if (surf.texture !== i)
				continue;
			chain[2] += surf.verts.length;
			for (k = 0; k < surf.verts.length; ++k)
			{
				vert = surf.verts[k];
				cmds[cmds.length] = vert[0];
				cmds[cmds.length] = vert[1];
				cmds[cmds.length] = vert[2];
				cmds[cmds.length] = vert[3];
				cmds[cmds.length] = vert[4];
			}
		}
		if (chain[2] !== 0)
		{
			m.chains[m.chains.length] = chain;
			verts += chain[2];
		}
	}
	m.cmds = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, m.cmds);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cmds), gl.STATIC_DRAW);
};

R.MakeWorldModelDisplayLists = function(m)
{
	if (m.cmds != null)
		return;
	var i, j, k, l;
	var cmds = [];
	var texture, leaf, chain, surf, vert, styles = [0.0, 0.0, 0.0, 0.0];
	var verts = 0;
	for (i = 0; i < m.textures.length; ++i)
	{
		texture = m.textures[i];
		if ((texture.sky === true) || (texture.turbulent === true))
			continue;
		for (j = 0; j < m.leafs.length; ++j)
		{
			leaf = m.leafs[j];
			chain = [i, verts, 0];
			for (k = 0; k < leaf.nummarksurfaces; ++k)
			{
				surf = m.faces[m.marksurfaces[leaf.firstmarksurface + k]];
				if (surf.texture !== i)
					continue;
				styles[0] = styles[1] = styles[2] = styles[3] = 0.0;
				switch (surf.styles.length)
				{
				case 4:
					styles[3] = surf.styles[3] * 0.015625 + 0.0078125;
				case 3:
					styles[2] = surf.styles[2] * 0.015625 + 0.0078125;
				case 2:
					styles[1] = surf.styles[1] * 0.015625 + 0.0078125;
				case 1:
					styles[0] = surf.styles[0] * 0.015625 + 0.0078125;
				}
				chain[2] += surf.verts.length;
				for (l = 0; l < surf.verts.length; ++l)
				{
					vert = surf.verts[l];
					cmds[cmds.length] = vert[0];
					cmds[cmds.length] = vert[1];
					cmds[cmds.length] = vert[2];
					cmds[cmds.length] = vert[3];
					cmds[cmds.length] = vert[4];
					cmds[cmds.length] = vert[5];
					cmds[cmds.length] = vert[6];
					cmds[cmds.length] = styles[0];
					cmds[cmds.length] = styles[1];
					cmds[cmds.length] = styles[2];
					cmds[cmds.length] = styles[3];
				}
			}
			if (chain[2] !== 0)
			{
				leaf.cmds[leaf.cmds.length] = chain;
				++leaf.skychain;
				++leaf.waterchain;
				verts += chain[2];
			}
		}
	}
	m.skychain = verts * 44;
	verts = 0;
	for (i = 0; i < m.textures.length; ++i)
	{
		texture = m.textures[i];
		if (texture.sky !== true)
			continue;
		for (j = 0; j < m.leafs.length; ++j)
		{
			leaf = m.leafs[j];
			chain = [verts, 0];
			for (k = 0; k < leaf.nummarksurfaces; ++k)
			{
				surf = m.faces[m.marksurfaces[leaf.firstmarksurface + k]];
				if (surf.texture !== i)
					continue;
				chain[1] += surf.verts.length;
				for (l = 0; l < surf.verts.length; ++l)
				{
					vert = surf.verts[l];
					cmds[cmds.length] = vert[0];
					cmds[cmds.length] = vert[1];
					cmds[cmds.length] = vert[2];
				}
			}
			if (chain[1] !== 0)
			{
				leaf.cmds[leaf.cmds.length] = chain;
				++leaf.waterchain;
				verts += chain[1];
			}
		}
	}
	m.waterchain = m.skychain + verts * 12;
	verts = 0;
	for (i = 0; i < m.textures.length; ++i)
	{
		texture = m.textures[i];
		if (texture.turbulent !== true)
			continue;
		for (j = 0; j < m.leafs.length; ++j)
		{
			leaf = m.leafs[j];
			chain = [i, verts, 0];
			for (k = 0; k < leaf.nummarksurfaces; ++k)
			{
				surf = m.faces[m.marksurfaces[leaf.firstmarksurface + k]];
				if (surf.texture !== i)
					continue;
				chain[2] += surf.verts.length;
				for (l = 0; l < surf.verts.length; ++l)
				{
					vert = surf.verts[l];
					cmds[cmds.length] = vert[0];
					cmds[cmds.length] = vert[1];
					cmds[cmds.length] = vert[2];
					cmds[cmds.length] = vert[3];
					cmds[cmds.length] = vert[4];
				}
			}
			if (chain[2] !== 0)
			{
				leaf.cmds[leaf.cmds.length] = chain;
				verts += chain[2];
			}
		}
	}
	m.cmds = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, m.cmds);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cmds), gl.STATIC_DRAW);
};

// misc

R.InitTextures = function()
{
	var data = new Uint8Array(new ArrayBuffer(256));
	var i, j;
	for (i = 0; i < 8; ++i)
	{
		for (j = 0; j < 8; ++j)
		{
			data[(i << 4) + j] = data[136 + (i << 4) + j] = 255;
			data[8 + (i << 4) + j] = data[128 + (i << 4) + j] = 0;
		}
	}
	R.notexture_mip = {name: 'notexture', width: 16, height: 16, texturenum: gl.createTexture()};
	GL.Bind(0, R.notexture_mip.texturenum);
	GL.Upload(data, 16, 16);

	R.solidskytexture = gl.createTexture();
	GL.Bind(0, R.solidskytexture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	R.alphaskytexture = gl.createTexture();
	GL.Bind(0, R.alphaskytexture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

	R.lightmap_texture = gl.createTexture();
	GL.Bind(0, R.lightmap_texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

	R.dlightmap_texture = gl.createTexture();
	GL.Bind(0, R.dlightmap_texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

	R.lightstyle_texture = gl.createTexture();
	GL.Bind(0, R.lightstyle_texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

	R.fullbright_texture = gl.createTexture();
	GL.Bind(0, R.fullbright_texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 0, 0, 0]));
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

	R.null_texture = gl.createTexture();
	GL.Bind(0, R.null_texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
};

R.Init = function()
{
	R.InitTextures();

	Cmd.AddCommand('timerefresh', R.TimeRefresh_f);
	Cmd.AddCommand('pointfile', R.ReadPointFile_f);

	R.waterwarp = Cvar.RegisterVariable('r_waterwarp', '1');
	R.fullbright = Cvar.RegisterVariable('r_fullbright', '0');
	R.drawentities = Cvar.RegisterVariable('r_drawentities', '1');
	R.drawviewmodel = Cvar.RegisterVariable('r_drawviewmodel', '1');
	R.novis = Cvar.RegisterVariable('r_novis', '0');
	R.speeds = Cvar.RegisterVariable('r_speeds', '0');
	R.polyblend = Cvar.RegisterVariable('gl_polyblend', '1');
	R.flashblend = Cvar.RegisterVariable('gl_flashblend', '0');
	R.nocolors = Cvar.RegisterVariable('gl_nocolors', '0');

	R.InitParticles();

	GL.CreateProgram('Alias',
		['uOrigin', 'uAngles', 'uViewOrigin', 'uViewAngles', 'uPerspective', 'uLightVec', 'uGamma', 'uAmbientLight', 'uShadeLight'],
		[['aPosition', gl.FLOAT, 3], ['aNormal', gl.FLOAT, 3], ['aTexCoord', gl.FLOAT, 2]],
		['tTexture']);
	GL.CreateProgram('Brush',
		['uOrigin', 'uAngles', 'uViewOrigin', 'uViewAngles', 'uPerspective', 'uGamma'],
		[['aPosition', gl.FLOAT, 3], ['aTexCoord', gl.FLOAT, 4], ['aLightStyle', gl.FLOAT, 4]],
		['tTexture', 'tLightmap', 'tDlight', 'tLightStyle']);
	GL.CreateProgram('Dlight',
		['uOrigin', 'uViewOrigin', 'uViewAngles', 'uPerspective', 'uRadius', 'uGamma'],
		[['aPosition', gl.FLOAT, 3]],
		[]);
	GL.CreateProgram('Player',
		['uOrigin', 'uAngles', 'uViewOrigin', 'uViewAngles', 'uPerspective', 'uLightVec', 'uGamma', 'uAmbientLight', 'uShadeLight', 'uTop', 'uBottom'],
		[['aPosition', gl.FLOAT, 3], ['aNormal', gl.FLOAT, 3], ['aTexCoord', gl.FLOAT, 2]],
		['tTexture', 'tPlayer']);
	GL.CreateProgram('Sprite',
		['uViewOrigin', 'uViewAngles', 'uPerspective', 'uGamma'],
		[['aPosition', gl.FLOAT, 3], ['aTexCoord', gl.FLOAT, 2]],
		['tTexture']);
	GL.CreateProgram('Turbulent',
		['uOrigin', 'uAngles', 'uViewOrigin', 'uViewAngles', 'uPerspective', 'uGamma', 'uTime'],
		[['aPosition', gl.FLOAT, 3], ['aTexCoord', gl.FLOAT, 2]],
		['tTexture']);
	GL.CreateProgram('Warp',
		['uOrtho', 'uTime'],
		[['aPosition', gl.FLOAT, 2], ['aTexCoord', gl.FLOAT, 2]],
		['tTexture']);

	R.warpbuffer = gl.createFramebuffer();
	R.warptexture = gl.createTexture();
	GL.Bind(0, R.warptexture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	R.warprenderbuffer = gl.createRenderbuffer();
	gl.bindRenderbuffer(gl.RENDERBUFFER, R.warprenderbuffer);
	gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, 0, 0);
	gl.bindRenderbuffer(gl.RENDERBUFFER, null);
	gl.bindFramebuffer(gl.FRAMEBUFFER, R.warpbuffer);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, R.warptexture, 0);
	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, R.warprenderbuffer);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);

	R.dlightvecs = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, R.dlightvecs);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
		0.0, -1.0, 0.0,
		0.0, 0.0, 1.0,
		-0.382683, 0.0, 0.92388,
		-0.707107, 0.0, 0.707107,
		-0.92388, 0.0, 0.382683,
		-1.0, 0.0, 0.0,
		-0.92388, 0.0, -0.382683,
		-0.707107, 0.0, -0.707107,
		-0.382683, 0.0, -0.92388,
		0.0, 0.0, -1.0,
		0.382683, 0.0, -0.92388,
		0.707107, 0.0, -0.707107,
		0.92388, 0.0, -0.382683,
		1.0, 0.0, 0.0,
		0.92388, 0.0, 0.382683,
		0.707107, 0.0, 0.707107,
		0.382683, 0.0, 0.92388,
		0.0, 0.0, 1.0
	]), gl.STATIC_DRAW);

	R.MakeSky();
};

R.NewMap = function()
{
	var i;
	for (i = 0; i < 64; ++i)
		R.lightstylevalue[i] = 12;

	R.ClearParticles();
	R.BuildLightmaps();

	for (i = 0; i <= 1048575; ++i)
		R.dlightmaps[i] = 0;
	GL.Bind(0, R.dlightmap_texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.ALPHA, 1024, 1024, 0, gl.ALPHA, gl.UNSIGNED_BYTE, null);
};

R.TimeRefresh_f = function()
{
	gl.finish();
	var i;
	var start = Sys.FloatTime();
	for (i = 0; i <= 127; ++i)
	{
		R.refdef.viewangles[1] = i * 2.8125;
		R.RenderView();
	}
	gl.finish();
	var time = Sys.FloatTime() - start;
	Con.Print(time.toFixed(6) + ' seconds (' + (128.0 / time).toFixed(6) + ' fps)\n');
};

// part

R.ptype = {
	tracer: 0,
	grav: 1,
	slowgrav: 2,
	fire: 3,
	explode: 4,
	explode2: 5,
	blob: 6,
	blob2: 7
};

R.ramp1 = [0x6f, 0x6d, 0x6b, 0x69, 0x67, 0x65, 0x63, 0x61];
R.ramp2 = [0x6f, 0x6e, 0x6d, 0x6c, 0x6b, 0x6a, 0x68, 0x66];
R.ramp3 = [0x6d, 0x6b, 6, 5, 4, 3];

R.InitParticles = function()
{
	var i = COM.CheckParm('-particles');
	if (i != null)
	{
		R.numparticles = Q.atoi(COM.argv[i + 1]);
		if (R.numparticles < 512)
			R.numparticles = 512;
	}
	else
		R.numparticles = 2048;

	R.avelocities = [];
	for (i = 0; i <= 161; ++i)
		R.avelocities[i] = [Math.random() * 2.56, Math.random() * 2.56, Math.random() * 2.56];

	GL.CreateProgram('Particle',
		['uViewOrigin', 'uViewAngles', 'uPerspective', 'uGamma'],
		[['aOrigin', gl.FLOAT, 3], ['aCoord', gl.FLOAT, 2], ['aScale', gl.FLOAT, 1], ['aColor', gl.UNSIGNED_BYTE, 3, true]],
		[]);
};

R.EntityParticles = function(ent)
{
	var allocated = R.AllocParticles(162), i;
	var angle, sp, sy, cp, cy, forward = [];
	for (i = 0; i < allocated.length; ++i)
	{
		angle = CL.state.time * R.avelocities[i][0];
		sp = Math.sin(angle);
		cp = Math.cos(angle);
		angle = CL.state.time * R.avelocities[i][1];
		sy = Math.sin(angle);
		cy = Math.cos(angle);

		R.particles[allocated[i]] = {
			die: CL.state.time + 0.01,
			color: 0x6f,
			ramp: 0.0,
			type: R.ptype.explode,
			org: [
				ent.origin[0] + R.avertexnormals[i][0] * 64.0 + cp * cy * 16.0,
				ent.origin[1] + R.avertexnormals[i][1] * 64.0 + cp * sy * 16.0,
				ent.origin[2] + R.avertexnormals[i][2] * 64.0 + sp * -16.0
			],
			vel: [0.0, 0.0, 0.0]
		};
	}
};

R.ClearParticles = function()
{
	var i;
	R.particles = [];
	for (i = 0; i < R.numparticles; ++i)
		R.particles[i] = {die: -1.0};
};

R.ReadPointFile_f = function()
{
	if (SV.server.active !== true)
		return;
	var name = 'maps/' + PR.GetString(PR.globals_int[PR.globalvars.mapname]) + '.pts';
	var f = COM.LoadTextFile(name);
	if (f == null)
	{
		Con.Print('couldn\'t open ' + name + '\n');
		return;
	}
	Con.Print('Reading ' + name + '...\n');
	f = f.split('\n');
	var c, org, p;
	for (c = 0; c < f.length; )
	{
		org = f[c].split(' ');
		if (org.length !== 3)
			break;
		++c;
		p = R.AllocParticles(1);
		if (p.length === 0)
		{
			Con.Print('Not enough free particles\n');
			break;
		}
		R.particles[p[0]] = {
			die: 99999.0,
			color: -c & 15,
			type: R.ptype.tracer,
			vel: [0.0, 0.0, 0.0],
			org: [Q.atof(org[0]), Q.atof(org[1]), Q.atof(org[2])]
		};
	}
	Con.Print(c + ' points read\n');
};

R.ParseParticleEffect = function()
{
	var org = [MSG.ReadCoord(), MSG.ReadCoord(), MSG.ReadCoord()];
	var dir = [MSG.ReadChar() * 0.0625, MSG.ReadChar() * 0.0625, MSG.ReadChar() * 0.0625];
	var msgcount = MSG.ReadByte();
	var color = MSG.ReadByte();
	if (msgcount === 255)
		R.ParticleExplosion(org);
	else
		R.RunParticleEffect(org, dir, color, msgcount);
};

R.ParticleExplosion = function(org)
{
	var allocated = R.AllocParticles(1024), i;
	for (i = 0; i < allocated.length; ++i)
	{
		R.particles[allocated[i]] = {
			die: CL.state.time + 5.0,
			color: R.ramp1[0],
			ramp: Math.floor(Math.random() * 4.0),
			type: ((i & 1) !== 0) ? R.ptype.explode : R.ptype.explode2,
			org: [
				org[0] + Math.random() * 32.0 - 16.0,
				org[1] + Math.random() * 32.0 - 16.0,
				org[2] + Math.random() * 32.0 - 16.0
			],
			vel: [Math.random() * 512.0 - 256.0, Math.random() * 512.0 - 256.0, Math.random() * 512.0 - 256.0]
		};
	}
};

R.ParticleExplosion2 = function(org, colorStart, colorLength)
{
	var allocated = R.AllocParticles(512), i, colorMod = 0;
	for (i = 0; i < allocated.length; ++i)
	{
		R.particles[allocated[i]] = {
			die: CL.state.time + 0.3,
			color: colorStart + (colorMod++ % colorLength),
			type: R.ptype.blob,
			org: [
				org[0] + Math.random() * 32.0 - 16.0,
				org[1] + Math.random() * 32.0 - 16.0,
				org[2] + Math.random() * 32.0 - 16.0
			],
			vel: [Math.random() * 512.0 - 256.0, Math.random() * 512.0 - 256.0, Math.random() * 512.0 - 256.0]
		};
	}
};

R.BlobExplosion = function(org)
{
	var allocated = R.AllocParticles(1024), i, p;
	for (i = 0; i < allocated.length; ++i)
	{
		p = R.particles[allocated[i]];
		p.die = CL.state.time + 1.0 + Math.random() * 0.4;
		if ((i & 1) !== 0)
		{
			p.type = R.ptype.blob;
			p.color = 66 + Math.floor(Math.random() * 7.0);
		}
		else
		{
			p.type = R.ptype.blob2;
			p.color = 150 + Math.floor(Math.random() * 7.0);
		}
		p.org = [
			org[0] + Math.random() * 32.0 - 16.0,
			org[1] + Math.random() * 32.0 - 16.0,
			org[2] + Math.random() * 32.0 - 16.0
		];
		p.vel = [Math.random() * 512.0 - 256.0, Math.random() * 512.0 - 256.0, Math.random() * 512.0 - 256.0];
	}
};

R.RunParticleEffect = function(org, dir, color, count)
{
	var allocated = R.AllocParticles(count), i;
	for (i = 0; i < allocated.length; ++i)
	{
		R.particles[allocated[i]] = {
			die: CL.state.time + 0.6 * Math.random(),
			color: (color & 0xf8) + Math.floor(Math.random() * 8.0),
			type: R.ptype.slowgrav,
			org: [
				org[0] + Math.random() * 16.0 - 8.0,
				org[1] + Math.random() * 16.0 - 8.0,
				org[2] + Math.random() * 16.0 - 8.0
			],
			vel: [dir[0] * 15.0, dir[1] * 15.0, dir[2] * 15.0]
		};
	}
};

R.LavaSplash = function(org)
{
	var allocated = R.AllocParticles(1024), i, j, k = 0, p;
	var dir = [], vel;
	for (i = -16; i <= 15; ++i)
	{
		for (j = -16; j <= 15; ++j)
		{
			if (k >= allocated.length)
				return;
			p = R.particles[allocated[k++]];
			p.die = CL.state.time + 2.0 + Math.random() * 0.64;
			p.color = 224 + Math.floor(Math.random() * 8.0);
			p.type = R.ptype.slowgrav;
			dir[0] = (j + Math.random) * 8.0;
			dir[1] = (i + Math.random) * 8.0;
			dir[2] = 256.0;
			p.org = [org[0] + dir[0], org[1] + dir[1], org[2] + Math.random() * 64.0];
			Vec.Normalize(dir);
			vel = 50.0 + Math.random() * 64.0;
			p.vel = [dir[0] * vel, dir[1] * vel, dir[2] * vel];
		}
	}
};

R.TeleportSplash = function(org)
{
	var allocated = R.AllocParticles(896), i, j, k, l = 0, p;
	var dir = [], vel;
	for (i = -16; i <= 15; i += 4)
	{
		for (j = -16; j <= 15; j += 4)
		{
			for (k = -24; k <= 31; k += 4)
			{
				if (l >= allocated.length)
					return;
				p = R.particles[allocated[l++]];
				p.die = CL.state.time + 0.2 + Math.random() * 0.16;
				p.color = 7 + Math.floor(Math.random() * 8.0);
				p.type = R.ptype.slowgrav;
				dir[0] = j * 8.0;
				dir[1] = i * 8.0;
				dir[2] = k * 8.0;
				p.org = [
					org[0] + i + Math.random() * 4.0,
					org[1] + j + Math.random() * 4.0,
					org[2] + k + Math.random() * 4.0
				];
				Vec.Normalize(dir);
				vel = 50.0 + Math.random() * 64.0;
				p.vel = [dir[0] * vel, dir[1] * vel, dir[2] * vel];
			}
		}
	}
};

R.tracercount = 0;
R.RocketTrail = function(start, end, type)
{
	var vec = [end[0] - start[0], end[1] - start[1], end[2] - start[2]];
	var len = Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1] + vec[2] * vec[2]);
	if (len === 0.0)
		return;
	vec = [vec[0] / len, vec[1] / len, vec[2] / len];

	var allocated;
	if (type === 4)
		allocated = R.AllocParticles(Math.floor(len / 6.0));
	else
		allocated = R.AllocParticles(Math.floor(len / 3.0));

	var i, p;
	for (i = 0; i < allocated.length; ++i)
	{
		p = R.particles[allocated[i]];
		p.vel = [0.0, 0.0, 0.0];
		p.die = CL.state.time + 2.0;
		switch (type)
		{
		case 0:
		case 1:
			p.ramp = Math.floor(Math.random() * 4.0) + (type << 1);
			p.color = R.ramp3[p.ramp];
			p.type = R.ptype.fire;
			p.org = [
				start[0] + Math.random() * 6.0 - 3.0,
				start[1] + Math.random() * 6.0 - 3.0,
				start[2] + Math.random() * 6.0 - 3.0
			];
			break;
		case 2:
			p.type = R.ptype.grav;
			p.color = 67 + Math.floor(Math.random() * 4.0);
			p.org = [
				start[0] + Math.random() * 6.0 - 3.0,
				start[1] + Math.random() * 6.0 - 3.0,
				start[2] + Math.random() * 6.0 - 3.0
			];
			break;
		case 3:
		case 5:
			p.die = CL.state.time + 0.5;
			p.type = R.ptype.tracer;
			if (type === 3)
				p.color = 52 + ((R.tracercount++ & 4) << 1);
			else
				p.color = 230 + ((R.tracercount++ & 4) << 1);
			p.org = [start[0], start[1], start[2]];
			if ((R.tracercount & 1) !== 0)
			{
				p.vel[0] = 30.0 * vec[1];
				p.vel[2] = -30.0 * vec[0];
			}
			else
			{
				p.vel[0] = -30.0 * vec[1];
				p.vel[2] = 30.0 * vec[0];
			}
			break;
		case 4:
			p.type = R.ptype.grav;
			p.color = 67 + Math.floor(Math.random() * 4.0);
			p.org = [
				start[0] + Math.random() * 6.0 - 3.0,
				start[1] + Math.random() * 6.0 - 3.0,
				start[2] + Math.random() * 6.0 - 3.0
			];
			break;
		case 6:
			p.color = 152 + Math.floor(Math.random() * 4.0);
			p.type = R.ptype.tracer;
			p.die = CL.state.time + 0.3;
			p.org = [
				start[0] + Math.random() * 16.0 - 8.0,
				start[1] + Math.random() * 16.0 - 8.0,
				start[2] + Math.random() * 16.0 - 8.0
			];
		}
		start[0] += vec[0];
		start[1] += vec[1];
		start[2] += vec[2];
	}
};

R.DrawParticles = function()
{
	GL.StreamFlush();

	var program = GL.UseProgram('Particle');
	gl.depthMask(false);
	gl.enable(gl.BLEND);

	var frametime = CL.state.time - CL.state.oldtime;
	var grav = frametime * SV.gravity.value * 0.05;
	var dvel = frametime * 4.0;
	var scale;

	var coords = [-1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0];
	for (var i = 0; i < R.numparticles; ++i)
	{
		var p = R.particles[i];
		if (p.die < CL.state.time)
			continue;

		var color = VID.d_8to24table[p.color];
		scale = (p.org[0] - R.refdef.vieworg[0]) * R.vpn[0]
			+ (p.org[1] - R.refdef.vieworg[1]) * R.vpn[1]
			+ (p.org[2] - R.refdef.vieworg[2]) * R.vpn[2];
		if (scale < 20.0)
			scale = 0.375;
		else
			scale = 0.375 + scale * 0.0015;

		GL.StreamGetSpace(6);
		for (var j = 0; j < 6; ++j)
		{
			GL.StreamWriteFloat3(p.org[0], p.org[1], p.org[2]);
			GL.StreamWriteFloat2(coords[j * 2], coords[j * 2 + 1]);
			GL.StreamWriteFloat(scale);
			GL.StreamWriteUByte4(color & 0xff, (color >> 8) & 0xff, color >> 16, 255);
		}

		p.org[0] += p.vel[0] * frametime;
		p.org[1] += p.vel[1] * frametime;
		p.org[2] += p.vel[2] * frametime;

		switch (p.type)
		{
		case R.ptype.fire:
			p.ramp += frametime * 5.0;
			if (p.ramp >= 6.0)
				p.die = -1.0;
			else
				p.color = R.ramp3[Math.floor(p.ramp)];
			p.vel[2] += grav;
			continue;
		case R.ptype.explode:
			p.ramp += frametime * 10.0;
			if (p.ramp >= 8.0)
				p.die = -1.0;
			else
				p.color = R.ramp1[Math.floor(p.ramp)];
			p.vel[0] += p.vel[0] * dvel;
			p.vel[1] += p.vel[1] * dvel;
			p.vel[2] += p.vel[2] * dvel - grav;
			continue;
		case R.ptype.explode2:
			p.ramp += frametime * 15.0;
			if (p.ramp >= 8.0)
				p.die = -1.0;
			else
				p.color = R.ramp2[Math.floor(p.ramp)];
			p.vel[0] -= p.vel[0] * frametime;
			p.vel[1] -= p.vel[1] * frametime;
			p.vel[2] -= p.vel[2] * frametime + grav;
			continue;
		case R.ptype.blob:
			p.vel[0] += p.vel[0] * dvel;
			p.vel[1] += p.vel[1] * dvel;
			p.vel[2] += p.vel[2] * dvel - grav;
			continue;
		case R.ptype.blob2:
			p.vel[0] += p.vel[0] * dvel;
			p.vel[1] += p.vel[1] * dvel;
			p.vel[2] -= grav;
			continue;
		case R.ptype.grav:
		case R.ptype.slowgrav:
			p.vel[2] -= grav;
		}
	}

	GL.StreamFlush();

	gl.disable(gl.BLEND);
	gl.depthMask(true);
};

R.AllocParticles = function(count)
{
	var allocated = [], i;
	for (i = 0; i < R.numparticles; ++i)
	{
		if (count === 0)
			return allocated;
		if (R.particles[i].die < CL.state.time)
		{
			allocated[allocated.length] = i;
			--count;
		}
	}
	return allocated;
};

// surf

R.lightmap_modified = [];
R.lightmaps = new Uint8Array(new ArrayBuffer(4194304));
R.dlightmaps = new Uint8Array(new ArrayBuffer(1048576));

R.AddDynamicLights = function(surf)
{
	var smax = (surf.extents[0] >> 4) + 1;
	var tmax = (surf.extents[1] >> 4) + 1;
	var size = smax * tmax;
	var tex = CL.state.worldmodel.texinfo[surf.texinfo];
	var i, light, s, t;
	var dist, rad, minlight, impact = [], local = [], sd, td;

	var blocklights = [];
	for (i = 0; i < size; ++i)
		blocklights[i] = 0;

	for (i = 0; i <= 31; ++i)
	{
		if (((surf.dlightbits >>> i) & 1) === 0)
			continue;
		light = CL.dlights[i];
		dist = Vec.DotProduct(light.origin, surf.plane.normal) - surf.plane.dist;
		rad = light.radius - Math.abs(dist);
		minlight = light.minlight;
		if (rad < minlight)
			continue;
		minlight = rad - minlight;
		impact[0] = light.origin[0] - surf.plane.normal[0] * dist;
		impact[1] = light.origin[1] - surf.plane.normal[1] * dist;
		impact[2] = light.origin[2] - surf.plane.normal[2] * dist;
		local[0] = Vec.DotProduct(impact, tex.vecs[0]) + tex.vecs[0][3] - surf.texturemins[0];
		local[1] = Vec.DotProduct(impact, tex.vecs[1]) + tex.vecs[1][3] - surf.texturemins[1];
		for (t = 0; t < tmax; ++t)
		{
			td = local[1] - (t << 4);
			if (td < 0.0)
				td = -td;
			td = Math.floor(td);
			for (s = 0; s < smax; ++s)
			{
				sd = local[0] - (s << 4);
				if (sd < 0)
					sd = -sd;
				sd = Math.floor(sd);
				if (sd > td)
					dist = sd + (td >> 1);
				else
					dist = td + (sd >> 1);
				if (dist < minlight)
					blocklights[t * smax + s] += Math.floor((rad - dist) * 256.0);
			}
		}
	}

	i = 0;
	var dest, bl;
	for (t = 0; t < tmax; ++t)
	{
		R.lightmap_modified[surf.light_t + t] = true;
		dest = ((surf.light_t + t) << 10) + surf.light_s;
		for (s = 0; s < smax; ++s)
		{
			bl = blocklights[i++] >> 7;
			if (bl > 255)
				bl = 255;
			R.dlightmaps[dest + s] = bl;
		}
	}
};

R.RemoveDynamicLights = function(surf)
{
	var smax = (surf.extents[0] >> 4) + 1;
	var tmax = (surf.extents[1] >> 4) + 1;
	var dest, s, t;
	for (t = 0; t < tmax; ++t)
	{
		R.lightmap_modified[surf.light_t + t] = true;
		dest = ((surf.light_t + t) << 10) + surf.light_s;
		for (s = 0; s < smax; ++s)
			R.dlightmaps[dest + s] = 0;
	}
};

R.BuildLightMap = function(surf)
{
	var dest;
	var smax = (surf.extents[0] >> 4) + 1;
	var tmax = (surf.extents[1] >> 4) + 1;
	var i, j;
	var lightmap = surf.lightofs;
	var maps;
	for (maps = 0; maps < surf.styles.length; ++maps)
	{
		dest = (surf.light_t << 12) + (surf.light_s << 2) + maps;
		for (i = 0; i < tmax; ++i)
		{
			for (j = 0; j < smax; ++j)
				R.lightmaps[dest + (j << 2)] = R.currentmodel.lightdata[lightmap + j];
			lightmap += smax;
			dest += 4096;
		}
	}
	for (; maps <= 3; ++maps)
	{
		dest = (surf.light_t << 12) + (surf.light_s << 2) + maps;
		for (i = 0; i < tmax; ++i)
		{
			for (j = 0; j < smax; ++j)
				R.lightmaps[dest + (j << 2)] = 0;
			dest += 4096;
		}
	}
};

R.TextureAnimation = function(base)
{
	var frame = 0;
	if (base.anim_base != null)
	{
		frame = base.anim_frame;
		base = R.currententity.model.textures[base.anim_base];
	}
	var anims = base.anims;
	if (anims == null)
		return base;
	if ((R.currententity.frame !== 0) && (base.alternate_anims.length !== 0))
		anims = base.alternate_anims;
	return R.currententity.model.textures[anims[(Math.floor(CL.state.time * 5.0) + frame) % anims.length]];
};

R.DrawBrushModel = function(e)
{
	var clmodel = e.model;

	if (clmodel.submodel === true)
	{
		if (R.CullBox(
			[
				e.origin[0] + clmodel.mins[0],
				e.origin[1] + clmodel.mins[1],
				e.origin[2] + clmodel.mins[2]
			],
			[
				e.origin[0] + clmodel.maxs[0],
				e.origin[1] + clmodel.maxs[1],
				e.origin[2] + clmodel.maxs[2]
			]) === true)
			return;
	}
	else
	{
		if (R.CullBox(
			[
				e.origin[0] - clmodel.radius,
				e.origin[1] - clmodel.radius,
				e.origin[2] - clmodel.radius
			],
			[
				e.origin[0] + clmodel.radius,
				e.origin[1] + clmodel.radius,
				e.origin[2] + clmodel.radius
			]) === true)
			return;
	}

	gl.bindBuffer(gl.ARRAY_BUFFER, clmodel.cmds);
	var viewMatrix = GL.RotationMatrix(e.angles[0], e.angles[1], e.angles[2]);

	var program = GL.UseProgram('Brush');
	gl.uniform3fv(program.uOrigin, e.origin);
	gl.uniformMatrix3fv(program.uAngles, false, viewMatrix);
	gl.vertexAttribPointer(program.aPosition.location, 3, gl.FLOAT, false, 44, 0);
	gl.vertexAttribPointer(program.aTexCoord.location, 4, gl.FLOAT, false, 44, 12);
	gl.vertexAttribPointer(program.aLightStyle.location, 4, gl.FLOAT, false, 44, 28);
	if ((R.fullbright.value !== 0) || (clmodel.lightdata == null))
		GL.Bind(program.tLightmap, R.fullbright_texture);
	else
		GL.Bind(program.tLightmap, R.lightmap_texture);
	GL.Bind(program.tDlight, ((R.flashblend.value === 0) && (clmodel.submodel === true)) ? R.dlightmap_texture : R.null_texture);
	GL.Bind(program.tLightStyle, R.lightstyle_texture);
	var i, chain, texture;
	for (i = 0; i < clmodel.chains.length; ++i)
	{
		chain = clmodel.chains[i];
		texture = R.TextureAnimation(clmodel.textures[chain[0]]);
		if (texture.turbulent === true)
			continue;
		R.c_brush_verts += chain[2];
		GL.Bind(program.tTexture, texture.texturenum);
		gl.drawArrays(gl.TRIANGLES, chain[1], chain[2]);
	}

	program = GL.UseProgram('Turbulent');
	gl.uniform3f(program.uOrigin, 0.0, 0.0, 0.0);
	gl.uniformMatrix3fv(program.uAngles, false, viewMatrix);
	gl.uniform1f(program.uTime, Host.realtime % (Math.PI * 2.0));
	gl.vertexAttribPointer(program.aPosition.location, 3, gl.FLOAT, false, 20, e.model.waterchain);
	gl.vertexAttribPointer(program.aTexCoord.location, 2, gl.FLOAT, false, 20, e.model.waterchain + 12);
	for (i = 0; i < clmodel.chains.length; ++i)
	{
		chain = clmodel.chains[i];
		texture = clmodel.textures[chain[0]];
		if (texture.turbulent !== true)
			continue;
		R.c_brush_verts += chain[2];
		GL.Bind(program.tTexture, texture.texturenum);
		gl.drawArrays(gl.TRIANGLES, chain[1], chain[2]);
	}
};

R.RecursiveWorldNode = function(node)
{
	if (node.contents === Mod.contents.solid)
		return;
	if (node.contents < 0)
	{
		if (node.markvisframe !== R.visframecount)
			return;
		node.visframe = R.visframecount;
		if (node.skychain !== node.waterchain)
			R.drawsky = true;
		return;
	}
	R.RecursiveWorldNode(node.children[0]);
	R.RecursiveWorldNode(node.children[1]);
};

R.DrawWorld = function()
{
	var clmodel = CL.state.worldmodel;
	R.currententity = CL.entities[0];
	gl.bindBuffer(gl.ARRAY_BUFFER, clmodel.cmds);

	var program = GL.UseProgram('Brush');
	gl.uniform3f(program.uOrigin, 0.0, 0.0, 0.0);
	gl.uniformMatrix3fv(program.uAngles, false, GL.identity);
	gl.vertexAttribPointer(program.aPosition.location, 3, gl.FLOAT, false, 44, 0);
	gl.vertexAttribPointer(program.aTexCoord.location, 4, gl.FLOAT, false, 44, 12);
	gl.vertexAttribPointer(program.aLightStyle.location, 4, gl.FLOAT, false, 44, 28);
	if ((R.fullbright.value !== 0) || (clmodel.lightdata == null))
		GL.Bind(program.tLightmap, R.fullbright_texture);
	else
		GL.Bind(program.tLightmap, R.lightmap_texture);
	if (R.flashblend.value === 0)
		GL.Bind(program.tDlight, R.dlightmap_texture);
	else
		GL.Bind(program.tDlight, R.null_texture);
	GL.Bind(program.tLightStyle, R.lightstyle_texture);
	var i, j, leaf, cmds;
	for (i = 0; i < clmodel.leafs.length; ++i)
	{
		leaf = clmodel.leafs[i];
		if ((leaf.visframe !== R.visframecount) || (leaf.skychain === 0))
			continue;
		if (R.CullBox(leaf.mins, leaf.maxs) === true)
			continue;
		for (j = 0; j < leaf.skychain; ++j)
		{
			cmds = leaf.cmds[j];
			R.c_brush_verts += cmds[2];
			GL.Bind(program.tTexture, R.TextureAnimation(clmodel.textures[cmds[0]]).texturenum);
			gl.drawArrays(gl.TRIANGLES, cmds[1], cmds[2]);
		}
	}

	program = GL.UseProgram('Turbulent');
	gl.uniform3f(program.uOrigin, 0.0, 0.0, 0.0);
	gl.uniformMatrix3fv(program.uAngles, false, GL.identity);
	gl.uniform1f(program.uTime, Host.realtime % (Math.PI * 2.0));
	gl.vertexAttribPointer(program.aPosition.location, 3, gl.FLOAT, false, 20, clmodel.waterchain);
	gl.vertexAttribPointer(program.aTexCoord.location, 2, gl.FLOAT, false, 20, clmodel.waterchain + 12);
	for (i = 0; i < clmodel.leafs.length; ++i)
	{
		leaf = clmodel.leafs[i];
		if ((leaf.visframe !== R.visframecount) || (leaf.waterchain === leaf.cmds.length))
			continue;
		if (R.CullBox(leaf.mins, leaf.maxs) === true)
			continue;
		for (j = leaf.waterchain; j < leaf.cmds.length; ++j)
		{
			cmds = leaf.cmds[j];
			R.c_brush_verts += cmds[2];
			GL.Bind(program.tTexture, clmodel.textures[cmds[0]].texturenum);
			gl.drawArrays(gl.TRIANGLES, cmds[1], cmds[2]);
		}
	}
};

R.MarkLeaves = function()
{
	if ((R.oldviewleaf === R.viewleaf) && (R.novis.value === 0))
		return;
	++R.visframecount;
	R.oldviewleaf = R.viewleaf;
	var vis = (R.novis.value !== 0) ? Mod.novis : Mod.LeafPVS(R.viewleaf, CL.state.worldmodel);
	var i, node;
	for (i = 0; i < CL.state.worldmodel.leafs.length; ++i)
	{
		if ((vis[i >> 3] & (1 << (i & 7))) === 0)
			continue;
		for (node = CL.state.worldmodel.leafs[i + 1]; node != null; node = node.parent)
		{
			if (node.markvisframe === R.visframecount)
				break;
			node.markvisframe = R.visframecount;
		}
	}
	do
	{
		if (R.novis.value !== 0)
			break;
		var p = [R.refdef.vieworg[0], R.refdef.vieworg[1], R.refdef.vieworg[2]];
		var leaf;
		if (R.viewleaf.contents <= Mod.contents.water)
		{
			leaf = Mod.PointInLeaf([R.refdef.vieworg[0], R.refdef.vieworg[1], R.refdef.vieworg[2] + 16.0], CL.state.worldmodel);
			if (leaf.contents <= Mod.contents.water)
				break;
		}
		else
		{
			leaf = Mod.PointInLeaf([R.refdef.vieworg[0], R.refdef.vieworg[1], R.refdef.vieworg[2] - 16.0], CL.state.worldmodel);
			if (leaf.contents > Mod.contents.water)
				break;
		}
		if (leaf === R.viewleaf)
			break;
		vis = Mod.LeafPVS(leaf, CL.state.worldmodel);
		for (i = 0; i < CL.state.worldmodel.leafs.length; ++i)
		{
			if ((vis[i >> 3] & (1 << (i & 7))) === 0)
				continue;
			for (node = CL.state.worldmodel.leafs[i + 1]; node != null; node = node.parent)
			{
				if (node.markvisframe === R.visframecount)
					break;
				node.markvisframe = R.visframecount;
			}
		}
	} while (false);
	R.drawsky = false;
	R.RecursiveWorldNode(CL.state.worldmodel.nodes[0]);
};

R.AllocBlock = function(surf)
{
	var w = (surf.extents[0] >> 4) + 1, h = (surf.extents[1] >> 4) + 1;
	var x, y, i, j, best = 1024, best2;
	for (i = 0; i < (1024 - w); ++i)
	{
		best2 = 0;
		for (j = 0; j < w; ++j)
		{
			if (R.allocated[i + j] >= best)
				break;
			if (R.allocated[i + j] > best2)
				best2 = R.allocated[i + j];
		}
		if (j === w)
		{
			x = i;
			y = best = best2;
		}
	}
	best += h;
	if (best > 1024)
		Sys.Error('AllocBlock: full');
	for (i = 0; i < w; ++i)
		R.allocated[x + i] = best;
	surf.light_s = x;
	surf.light_t = y;
};

// Based on Quake 2 polygon generation algorithm by Toji - http://blog.tojicode.com/2010/06/quake-2-bsp-quite-possibly-worst-format.html
R.BuildSurfaceDisplayList = function(fa)
{
	fa.verts = [];
	if (fa.numedges <= 2)
		return;
	var i, index, vec, vert, s, t;
	var texinfo = R.currentmodel.texinfo[fa.texinfo];
	var texture = R.currentmodel.textures[texinfo.texture];
	for (i = 0; i < fa.numedges; ++i)
	{
		index = R.currentmodel.surfedges[fa.firstedge + i];
		if (index > 0)
			vec = R.currentmodel.vertexes[R.currentmodel.edges[index][0]];
		else
			vec = R.currentmodel.vertexes[R.currentmodel.edges[-index][1]];
		vert = [vec[0], vec[1], vec[2]];
		if (fa.sky !== true)
		{
			s = Vec.DotProduct(vec, texinfo.vecs[0]) + texinfo.vecs[0][3];
			t = Vec.DotProduct(vec, texinfo.vecs[1]) + texinfo.vecs[1][3];
			vert[3] = s / texture.width;
			vert[4] = t / texture.height;
			if (fa.turbulent !== true)
			{
				vert[5] = (s - fa.texturemins[0] + (fa.light_s << 4) + 8.0) / 16384.0;
				vert[6] = (t - fa.texturemins[1] + (fa.light_t << 4) + 8.0) / 16384.0;
			}
		}
		if (i >= 3)
		{
			fa.verts[fa.verts.length] = fa.verts[0];
			fa.verts[fa.verts.length] = fa.verts[fa.verts.length - 2];
		}
		fa.verts[fa.verts.length] = vert;
	}
};

R.BuildLightmaps = function()
{
	var i, j;

	R.allocated = [];
	for (i = 0; i < 1024; ++i)
		R.allocated[i] = 0;

	var surf;
	for (i = 1; i < CL.state.model_precache.length; ++i)
	{
		R.currentmodel = CL.state.model_precache[i];
		if (R.currentmodel.type !== Mod.type.brush)
			continue;
		if (R.currentmodel.name.charCodeAt(0) !== 42)
		{
			for (j = 0; j < R.currentmodel.faces.length; ++j)
			{
				surf = R.currentmodel.faces[j];
				if ((surf.sky !== true) && (surf.turbulent !== true))
				{
					R.AllocBlock(surf);
					if (R.currentmodel.lightdata != null)
						R.BuildLightMap(surf);
				}
				R.BuildSurfaceDisplayList(surf);
			}
		}
		if (i === 1)
			R.MakeWorldModelDisplayLists(R.currentmodel);
		else
			R.MakeBrushModelDisplayLists(R.currentmodel);
	}

	GL.Bind(0, R.lightmap_texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1024, 1024, 0, gl.RGBA, gl.UNSIGNED_BYTE, R.lightmaps);
};

// scan

R.WarpScreen = function()
{
	GL.StreamFlush();
	gl.finish();
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.bindRenderbuffer(gl.RENDERBUFFER, null);
	var program = GL.UseProgram('Warp');
	GL.Bind(program.tTexture, R.warptexture);
	gl.uniform1f(program.uTime, Host.realtime % (Math.PI * 2.0));
	var vrect = R.refdef.vrect;
	GL.StreamDrawTexturedQuad(vrect.x, vrect.y, vrect.width, vrect.height, 0.0, 1.0, 1.0, 0.0);
	GL.StreamFlush();
};

// warp

R.MakeSky = function()
{
	var sin = [0.0, 0.19509, 0.382683, 0.55557, 0.707107, 0.831470, 0.92388, 0.980785, 1.0];
	var vecs = [], i, j;

	for (i = 0; i < 7; i += 2)
	{
		vecs = vecs.concat(
		[
			0.0, 0.0, 1.0,
			sin[i + 2] * 0.19509, sin[6 - i] * 0.19509, 0.980785,
			sin[i] * 0.19509, sin[8 - i] * 0.19509, 0.980785
		]);
		for (j = 0; j < 7; ++j)
		{
			vecs = vecs.concat(
			[
				sin[i] * sin[8 - j], sin[8 - i] * sin[8 - j], sin[j],
				sin[i] * sin[7 - j], sin[8 - i] * sin[7 - j], sin[j + 1],
				sin[i + 2] * sin[7 - j], sin[6 - i] * sin[7 - j], sin[j + 1],

				sin[i] * sin[8 - j], sin[8 - i] * sin[8 - j], sin[j],
				sin[i + 2] * sin[7 - j], sin[6 - i] * sin[7 - j], sin[j + 1],
				sin[i + 2] * sin[8 - j], sin[6 - i] * sin[8 - j], sin[j]
			]);
		}
	}

	GL.CreateProgram('Sky',
		['uViewAngles', 'uPerspective', 'uScale', 'uGamma', 'uTime'],
		[['aPosition', gl.FLOAT, 3]],
		['tSolid', 'tAlpha']);
	GL.CreateProgram('SkyChain',
		['uViewOrigin', 'uViewAngles', 'uPerspective'],
		[['aPosition', gl.FLOAT, 3]],
		[]);

	R.skyvecs = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, R.skyvecs);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vecs), gl.STATIC_DRAW);
};

R.DrawSkyBox = function()
{
	if (R.drawsky !== true)
		return;

	gl.colorMask(false, false, false, false);
	var clmodel = CL.state.worldmodel;
	var program = GL.UseProgram('SkyChain');
	gl.bindBuffer(gl.ARRAY_BUFFER, clmodel.cmds);
	gl.vertexAttribPointer(program.aPosition.location, 3, gl.FLOAT, false, 12, clmodel.skychain);
	var i, j, leaf, cmds;
	for (i = 0; i < clmodel.leafs.length; ++i)
	{
		leaf = clmodel.leafs[i];
		if ((leaf.visframe !== R.visframecount) || (leaf.skychain === leaf.waterchain))
			continue;
		if (R.CullBox(leaf.mins, leaf.maxs) === true)
			continue;
		for (j = leaf.skychain; j < leaf.waterchain; ++j)
		{
			cmds = leaf.cmds[j];
			gl.drawArrays(gl.TRIANGLES, cmds[0], cmds[1]);
		}
	}
	gl.colorMask(true, true, true, true);

	gl.depthFunc(gl.GREATER);
	gl.depthMask(false);
	gl.disable(gl.CULL_FACE);

	program = GL.UseProgram('Sky');
	gl.uniform2f(program.uTime, (Host.realtime * 0.125) % 1.0, (Host.realtime * 0.03125) % 1.0);
	GL.Bind(program.tSolid, R.solidskytexture);
	GL.Bind(program.tAlpha, R.alphaskytexture);
	gl.bindBuffer(gl.ARRAY_BUFFER, R.skyvecs);
	gl.vertexAttribPointer(program.aPosition.location, 3, gl.FLOAT, false, 12, 0);

	gl.uniform3f(program.uScale, 2.0, -2.0, 1.0);
	gl.drawArrays(gl.TRIANGLES, 0, 180);
	gl.uniform3f(program.uScale, 2.0, -2.0, -1.0);
	gl.drawArrays(gl.TRIANGLES, 0, 180);

	gl.uniform3f(program.uScale, 2.0, 2.0, 1.0);
	gl.drawArrays(gl.TRIANGLES, 0, 180);
	gl.uniform3f(program.uScale, 2.0, 2.0, -1.0);
	gl.drawArrays(gl.TRIANGLES, 0, 180);

	gl.uniform3f(program.uScale, -2.0, -2.0, 1.0);
	gl.drawArrays(gl.TRIANGLES, 0, 180);
	gl.uniform3f(program.uScale, -2.0, -2.0, -1.0);
	gl.drawArrays(gl.TRIANGLES, 0, 180);

	gl.uniform3f(program.uScale, -2.0, 2.0, 1.0);
	gl.drawArrays(gl.TRIANGLES, 0, 180);
	gl.uniform3f(program.uScale, -2.0, 2.0, -1.0);
	gl.drawArrays(gl.TRIANGLES, 0, 180);

	gl.enable(gl.CULL_FACE);
	gl.depthMask(true);
	gl.depthFunc(gl.LESS);
};

R.InitSky = function(src)
{
	var i, j, p;
	var trans = new ArrayBuffer(65536);
	var trans32 = new Uint32Array(trans);

	for (i = 0; i < 128; ++i)
	{
		for (j = 0; j < 128; ++j)
			trans32[(i << 7) + j] = COM.LittleLong(VID.d_8to24table[src[(i << 8) + j + 128]] + 0xff000000);
	}
	GL.Bind(0, R.solidskytexture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 128, 128, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(trans));
	gl.generateMipmap(gl.TEXTURE_2D);

	for (i = 0; i < 128; ++i)
	{
		for (j = 0; j < 128; ++j)
		{
			p = (i << 8) + j;
			if (src[p] !== 0)
				trans32[(i << 7) + j] = COM.LittleLong(VID.d_8to24table[src[p]] + 0xff000000);
			else
				trans32[(i << 7) + j] = 0;
		}
	}
	GL.Bind(0, R.alphaskytexture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 128, 128, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(trans));
	gl.generateMipmap(gl.TEXTURE_2D);
};