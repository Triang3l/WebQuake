SZ = {};

SZ.GetSpace = function(buf, length)
{
	if ((buf.cursize + length) > buf.data.byteLength)
	{
		if (buf.allowoverflow !== true)
			Sys.Error('SZ.GetSpace: overflow without allowoverflow set');
		if (length > buf.byteLength)
			Sys.Error('SZ.GetSpace: ' + length + ' is > full buffer size');
		buf.overflowed = true;
		Con.Print('SZ.GetSpace: overflow\n');
		buf.cursize = 0;
	}
	var cursize = buf.cursize;
	buf.cursize += length;
	return cursize;
};

SZ.Write = function(sb, data, length)
{
	(new Uint8Array(sb.data, SZ.GetSpace(sb, length), length)).set(data.subarray(0, length));
};

SZ.Print = function(sb, data)
{
	var buf = new Uint8Array(sb.data);
	var dest;
	if (sb.cursize !== 0)
	{
		if (buf[sb.cursize - 1] === 0)
			dest = SZ.GetSpace(sb, data.length - 1) - 1;
		else
			dest = SZ.GetSpace(sb, data.length);
	}
	else
		dest = SZ.GetSpace(sb, data.length);
	var i;
	for (i = 0; i < data.length; ++i)
		buf[dest + i] = data.charCodeAt(i);
};