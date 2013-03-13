Mod = {};

Mod.type = {brush: 0, sprite: 1, alias: 2};

Mod.version = {brush: 29, sprite: 1};

Mod.known = [];

Mod.Init = function()
{
	Mod.novis = [];
	var i;
	for (i = 0; i < 1024; ++i)
		Mod.novis[i] = 0xff;
};

Mod.PointInLeaf = function(p, model)
{
	if (model == null)
		Sys.Error('Mod.PointInLeaf: bad model');
	if (model.nodes == null)
		Sys.Error('Mod.PointInLeaf: bad model');
	var node = model.nodes[0];
	var normal;
	for (;;)
	{
		if (node.contents < 0)
			return node;
		normal = node.plane.normal;
		if ((p[0] * normal[0] + p[1] * normal[1] + p[2] * normal[2] - node.plane.dist) > 0)
			node = node.children[0];
		else
			node = node.children[1];
	}
};

Mod.DecompressVis = function(i, model)
{
	var decompressed = [], c, out, row = (model.leafs.length + 7) >> 3;
	if (model.visdata == null)
	{
		for (; row >= 0; --row)
			decompressed[out++] = 0xff;
		return decompressed;
	}
	for (out = 0; out < row; )
	{
		if (model.visdata[i] !== 0)
		{
			decompressed[out++] = model.visdata[i++];
			continue;
		}
		for (c = model.visdata[i + 1]; c > 0; --c)
			decompressed[out++] = 0;
		i += 2;
	}
	return decompressed;
};

Mod.LeafPVS = function(leaf, model)
{
	if (leaf === model.leafs[0])
		return Mod.novis;
	return Mod.DecompressVis(leaf.visofs, model);
};

Mod.ClearAll = function()
{
	var i, mod;
	for (i = 0; i < Mod.known.length; ++i)
	{
		mod = Mod.known[i];
		if (mod.type !== Mod.type.brush)
			continue;
		if (mod.cmds != null)
			gl.deleteBuffer(mod.cmds);
		Mod.known[i] = {
			name: mod.name,
			needload: true
		};
	}
};

Mod.FindName = function(name)
{
	if (name.length === 0)
		Sys.Error('Mod.FindName: NULL name');
	var i;
	for (i = 0; i < Mod.known.length; ++i)
	{
		if (Mod.known[i] == null)
			continue;
		if (Mod.known[i].name === name)
			return Mod.known[i];
	}
	for (i = 0; i <= Mod.known.length; ++i)
	{
		if (Mod.known[i] != null)
			continue;
		Mod.known[i] = {name: name, needload: true};
		return Mod.known[i];
	}
};

Mod.ClearAll = function()
{
	var i, mod;
	for (i = 0; i < Mod.known.length; ++i)
	{
		mod = Mod.known[i];
		if (mod.type !== Mod.type.brush)
			continue;
		Mod.known[i] = {
			name: mod.name,
			needload: true
		};
	}
};

Mod.LoadModel = function(mod, crash)
{
	if (mod.needload !== true)
		return mod;
	var buf = COM.LoadFile(mod.name);
	if (buf == null)
	{
		if (crash === true)
			Sys.Error('Mod.LoadModel: ' + mod.name + ' not found');
		return;
	}
	Mod.loadmodel = mod;
	mod.needload = false;
	switch ((new DataView(buf)).getUint32(0, true))
	{
	case 0x4f504449:
		Mod.loadmodel.type = Mod.type.alias;
		Mod.loadmodel.mins = [-16.0, -16.0, -16.0];
		Mod.loadmodel.maxs = [16.0, 16.0, 16.0];
		break;
	case 0x50534449:
		Mod.LoadSpriteModel(buf);
		break;
	default:
		Mod.LoadBrushModel(buf);
	}
	return mod;
};

Mod.ForName = function(name, crash)
{
	return Mod.LoadModel(Mod.FindName(name), crash);
};

Mod.lump =
{
	entities: 0,
	planes: 1,
	visibility: 4,
	nodes: 5,
	clipnodes: 9,
	leafs: 10,
	models: 14
};

Mod.contents = {
	empty: -1,
	solid: -2,
	water: -3,
	slime: -4,
	lava: -5,
	sky: -6,
	origin: -7,
	clip: -8,
	current_0: -9,
	current_90: -10,
	current_180: -11,
	current_270: -12,
	current_up: -13,
	current_down: -14
};

Mod.LoadVisibility = function(buf)
{
	var view = new DataView(buf);
	var fileofs = view.getUint32((Mod.lump.visibility << 3) + 4, true);
	var filelen = view.getUint32((Mod.lump.visibility << 3) + 8, true);
	if (filelen === 0)
		return;
	Mod.loadmodel.visdata = new Uint8Array(new ArrayBuffer(filelen));
	Mod.loadmodel.visdata.set(new Uint8Array(buf, fileofs, filelen));
};

Mod.LoadEntities = function(buf)
{
	var view = new DataView(buf);
	var fileofs = view.getUint32((Mod.lump.entities << 3) + 4, true);
	var filelen = view.getUint32((Mod.lump.entities << 3) + 8, true);
	Mod.loadmodel.entities = Q.memstr(new Uint8Array(buf, fileofs, filelen));
};

Mod.LoadSubmodels = function(buf)
{
	var view = new DataView(buf);
	var fileofs = view.getUint32((Mod.lump.models << 3) + 4, true);
	var filelen = view.getUint32((Mod.lump.models << 3) + 8, true);
	var count = filelen >> 6;
	if (count === 0)
		Sys.Error('Mod.LoadSubmodels: funny lump size in ' + Mod.loadmodel.name);
	Mod.loadmodel.submodels = [];

	Mod.loadmodel.mins = [view.getFloat32(fileofs, true) - 1.0,
		view.getFloat32(fileofs + 4, true) - 1.0,
		view.getFloat32(fileofs + 8, true) - 1.0];
	Mod.loadmodel.maxs = [view.getFloat32(fileofs + 12, true) + 1.0,
		view.getFloat32(fileofs + 16, true) + 1.0,
		view.getFloat32(fileofs + 20, true) + 1.0];
	Mod.loadmodel.hulls[0].firstclipnode = view.getUint32(fileofs + 36, true);
	Mod.loadmodel.hulls[1].firstclipnode = view.getUint32(fileofs + 40, true);
	Mod.loadmodel.hulls[2].firstclipnode = view.getUint32(fileofs + 44, true);
	fileofs += 64;

	var i, clipnodes = Mod.loadmodel.hulls[0].clipnodes, out;
	for (i = 1; i < count; ++i)
	{
		out = Mod.FindName('*' + i);
		out.needload = false;
		out.type = Mod.type.brush;
		out.mins = [view.getFloat32(fileofs, true) - 1.0,
			view.getFloat32(fileofs + 4, true) - 1.0,
			view.getFloat32(fileofs + 8, true) - 1.0];
		out.maxs = [view.getFloat32(fileofs + 12, true) + 1.0,
			view.getFloat32(fileofs + 16, true) + 1.0,
			view.getFloat32(fileofs + 20, true) + 1.0];
		out.origin = [view.getFloat32(fileofs + 24, true), view.getFloat32(fileofs + 28, true), view.getFloat32(fileofs + 32, true)];
		out.hulls = [
			{
				clipnodes: clipnodes,
				firstclipnode: view.getUint32(fileofs + 36, true),
				lastclipnode: Mod.loadmodel.nodes.length - 1,
				planes: Mod.loadmodel.planes,
				clip_mins: [0.0, 0.0, 0.0],
				clip_maxs: [0.0, 0.0, 0.0]
			},
			{
				clipnodes: Mod.loadmodel.clipnodes,
				firstclipnode: view.getUint32(fileofs + 40, true),
				lastclipnode: Mod.loadmodel.clipnodes.length - 1,
				planes: Mod.loadmodel.planes,
				clip_mins: [-16.0, -16.0, -24.0],
				clip_maxs: [16.0, 16.0, 32.0]
			},
			{
				clipnodes: Mod.loadmodel.clipnodes,
				firstclipnode: view.getUint32(fileofs + 44, true),
				lastclipnode: Mod.loadmodel.clipnodes.length - 1,
				planes: Mod.loadmodel.planes,
				clip_mins: [-32.0, -32.0, -24.0],
				clip_maxs: [32.0, 32.0, 64.0]
			}
		];
		Mod.loadmodel.submodels[i - 1] = out;
		fileofs += 64;
	}
};

Mod.SetParent = function(node, parent)
{
	node.parent = parent;
	if (node.contents < 0)
		return;
	Mod.SetParent(node.children[0], node);
	Mod.SetParent(node.children[1], node);
};

Mod.LoadNodes = function(buf)
{
	var view = new DataView(buf);
	var fileofs = view.getUint32((Mod.lump.nodes << 3) + 4, true);
	var filelen = view.getUint32((Mod.lump.nodes << 3) + 8, true);
	if ((filelen === 0) || ((filelen % 24) !== 0))
		Sys.Error('Mod.LoadNodes: funny lump size in ' + Mod.loadmodel.name);
	var count = filelen / 24;
	Mod.loadmodel.nodes = [];
	var i, out;
	for (i = 0; i < count; ++i)
	{
		Mod.loadmodel.nodes[i] = {
			num: i,
			contents: 0,
			planenum: view.getUint32(fileofs, true),
			children: [view.getInt16(fileofs + 4, true), view.getInt16(fileofs + 6, true)],
			mins: [view.getInt16(fileofs + 8, true), view.getInt16(fileofs + 10, true), view.getInt16(fileofs + 12, true)],
			maxs: [view.getInt16(fileofs + 14, true), view.getInt16(fileofs + 16, true), view.getInt16(fileofs + 18, true)]
		};
		fileofs += 24;
	}
	for (i = 0; i < count; ++i)
	{
		out = Mod.loadmodel.nodes[i];
		out.plane = Mod.loadmodel.planes[out.planenum];
		if (out.children[0] >= 0)
			out.children[0] = Mod.loadmodel.nodes[out.children[0]];
		else
			out.children[0] = Mod.loadmodel.leafs[-1 - out.children[0]];
		if (out.children[1] >= 0)
			out.children[1] = Mod.loadmodel.nodes[out.children[1]];
		else
			out.children[1] = Mod.loadmodel.leafs[-1 - out.children[1]];
	}
	Mod.SetParent(Mod.loadmodel.nodes[0]);
};

Mod.LoadLeafs = function(buf)
{
	var view = new DataView(buf);
	var fileofs = view.getUint32((Mod.lump.leafs << 3) + 4, true);
	var filelen = view.getUint32((Mod.lump.leafs << 3) + 8, true);
	if ((filelen % 28) !== 0)
		Sys.Error('Mod.LoadLeafs: funny lump size in ' + Mod.loadmodel.name);
	var count = filelen / 28;
	Mod.loadmodel.leafs = [];
	var i, j;
	for (i = 0; i < count; ++i)
	{
		Mod.loadmodel.leafs[i] = {
			num: i,
			contents: view.getInt32(fileofs, true),
			visofs: view.getInt32(fileofs + 4, true),
			mins: [view.getInt16(fileofs + 8, true), view.getInt16(fileofs + 10, true), view.getInt16(fileofs + 12, true)],
			maxs: [view.getInt16(fileofs + 14, true), view.getInt16(fileofs + 16, true), view.getInt16(fileofs + 18, true)]
		};
		fileofs += 28;
	};
};

Mod.LoadClipnodes = function(buf)
{
	var view = new DataView(buf);
	var fileofs = view.getUint32((Mod.lump.clipnodes << 3) + 4, true);
	var filelen = view.getUint32((Mod.lump.clipnodes << 3) + 8, true);
	var count = filelen >> 3;
	Mod.loadmodel.clipnodes = [];

	Mod.loadmodel.hulls = [];
	Mod.loadmodel.hulls[1] = {
		clipnodes: Mod.loadmodel.clipnodes,
		firstclipnode: 0,
		lastclipnode: count - 1,
		planes: Mod.loadmodel.planes,
		clip_mins: [-16.0, -16.0, -24.0],
		clip_maxs: [16.0, 16.0, 32.0]
	};
	Mod.loadmodel.hulls[2] = {
		clipnodes: Mod.loadmodel.clipnodes,
		firstclipnode: 0,
		lastclipnode: count - 1,
		planes: Mod.loadmodel.planes,
		clip_mins: [-32.0, -32.0, -24.0],
		clip_maxs: [32.0, 32.0, 64.0]
	};
	var i;
	for (i = 0; i < count; ++i)
	{
		Mod.loadmodel.clipnodes[i] = {
			planenum: view.getUint32(fileofs, true),
			children: [view.getInt16(fileofs + 4, true), view.getInt16(fileofs + 6, true)]
		};
		fileofs += 8;
	}
};

Mod.MakeHull0 = function()
{
	var node, child, clipnodes = [], i, out;
	var hull = {
		clipnodes: clipnodes,
		lastclipnode: Mod.loadmodel.nodes.length - 1,
		planes: Mod.loadmodel.planes,
		clip_mins: [0.0, 0.0, 0.0],
		clip_maxs: [0.0, 0.0, 0.0]
	};
	for (i = 0; i < Mod.loadmodel.nodes.length; ++i)
	{
		node = Mod.loadmodel.nodes[i];
		out = {planenum: node.planenum, children: []};
		child = node.children[0];
		out.children[0] = child.contents < 0 ? child.contents : child.num;
		child = node.children[1];
		out.children[1] = child.contents < 0 ? child.contents : child.num;
		clipnodes[i] = out;
	}
	Mod.loadmodel.hulls[0] = hull;
};

Mod.LoadPlanes = function(buf)
{
	var view = new DataView(buf);
	var fileofs = view.getUint32((Mod.lump.planes << 3) + 4, true);
	var filelen = view.getUint32((Mod.lump.planes << 3) + 8, true);
	if ((filelen % 20) !== 0)
		Sys.Error('Mod.LoadPlanes: funny lump size in ' + Mod.loadmodel.name);
	var count = filelen / 20;
	Mod.loadmodel.planes = [];
	var i, out;
	for (i = 0; i < count; ++i)
	{
		out = {
			normal: [view.getFloat32(fileofs, true), view.getFloat32(fileofs + 4, true), view.getFloat32(fileofs + 8, true)],
			dist: view.getFloat32(fileofs + 12, true),
			type: view.getUint32(fileofs + 16, true),
			signbits: 0
		};
		if (out.normal[0] < 0)
			++out.signbits;
		if (out.normal[1] < 0)
			out.signbits += 2;
		if (out.normal[2] < 0)
			out.signbits += 4;
		Mod.loadmodel.planes[i] = out;
		fileofs += 20;
	}
};

Mod.LoadBrushModel = function(buffer)
{
	Mod.loadmodel.type = Mod.type.brush;
	var version = (new DataView(buffer)).getUint32(0, true);
	if (version !== Mod.version.brush)
		Sys.Error('Mod.LoadBrushModel: ' + Mod.loadmodel.name + ' has wrong version number (' + version + ' should be ' + Mod.version.brush + ')');
	Mod.LoadPlanes(buffer);
	Mod.LoadVisibility(buffer);
	Mod.LoadLeafs(buffer);
	Mod.LoadNodes(buffer);
	Mod.LoadClipnodes(buffer);
	Mod.MakeHull0();
	Mod.LoadEntities(buffer);
	Mod.LoadSubmodels(buffer);
};

Mod.LoadSpriteModel = function(buffer)
{
	Mod.loadmodel.type = Mod.type.sprite;
	var model = new DataView(buffer);
	var version = model.getUint32(4, true);
	if (version !== Mod.version.sprite)
		Sys.Error(Mod.loadmodel.name + ' has wrong version number (' + version + ' should be ' + Mod.version.sprite + ')');
	var width = model.getUint32(16, true) * 0.5;
	var height = model.getUint32(20, true);
	Mod.loadmodel.mins = [-width, -width, height * -0.5];
	Mod.loadmodel.maxs = [width, width, height * 0.5];
}

Mod.Print = function()
{
	Con.Print('Cached models:\n');
	var i;
	for (i = 0; i < Mod.known.length; ++i)
		Con.Print(Mod.known[i].name + '\n');
};