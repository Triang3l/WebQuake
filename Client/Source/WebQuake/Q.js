var Q = {};

Q.memstr = function(src)
{
	var dest = [], i;
	for (i = 0; i < src.length; ++i)
	{
		if (src[i] === 0)
			break;
		dest[i] = String.fromCharCode(src[i]);
	}
	return dest.join('');
};

Q.strmem = function(src)
{
	var buf = new ArrayBuffer(src.length);
	var dest = new Uint8Array(buf);
	var i;
	for (i = 0; i < src.length; ++i)
		dest[i] = src.charCodeAt(i) & 255;
	return buf;
};

Q.atoi = function(str)
{
	if (str == null)
		return 0;
	var ptr, val = 0, sign, c, c2;
	if (str.charCodeAt(0) === 45)
	{
		sign = -1;
		ptr = 1;
	}
	else
	{
		sign = 1;
		ptr = 0;
	}
	c = str.charCodeAt(ptr);
	c2 = str.charCodeAt(ptr + 1);
	if ((c === 48) && ((c2 === 120) || (c2 === 88)))
	{
		ptr += 2;
		for (;;)
		{
			c = str.charCodeAt(ptr++);
			if ((c >= 48) && (c <= 57))
				val = (val << 4) + c - 48;
			else if ((c >= 97) && (c <= 102))
				val = (val << 4) + c - 87;
			else if ((c >= 65) && (c <= 70))
				val = (val << 4) + c - 55;
			else
				return val * sign;
		}
	}
	if (c === 39)
	{
		if (isNaN(c2) === true)
			return 0;
		return sign * c2;
	}
	for (;;)
	{
		c = str.charCodeAt(ptr++);
		if ((isNaN(c) === true) || (c <= 47) || (c >= 58))
			return val * sign;
		val = val * 10 + c - 48;
	}
	return 0;
};

Q.atof = function(str)
{
	if (str == null)
		return 0.0;
	var ptr, val, sign, c, c2;
	if (str.charCodeAt(0) === 45)
	{
		sign = -1.0;
		ptr = 1;
	}
	else
	{
		sign = 1.0;
		ptr = 0;
	}
	c = str.charCodeAt(ptr);
	c2 = str.charCodeAt(ptr + 1);
	if ((c === 48) && ((c2 === 120) || (c2 === 88)))
	{
		ptr += 2;
		val = 0.0;
		for (;;)
		{
			c = str.charCodeAt(ptr++);
			if ((c >= 48) && (c <= 57))
				val = (val * 16.0) + c - 48;
			else if ((c >= 97) && (c <= 102))
				val = (val * 16.0) + c - 87;
			else if ((c >= 65) && (c <= 70))
				val = (val * 16.0) + c - 55;
			else
				return val * sign;
		}
	}
	if (c === 39)
	{
		if (isNaN(c2) === true)
			return 0.0;
		return sign * c2;
	}
	val = parseFloat(str);
	if (isNaN(val) === true)
		return 0.0;
	return val;
};

Q.btoa = function(src)
{
	var str = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
	var val = [];
	var len = src.length - (src.length % 3);
	var c, i;
	for (i = 0; i < len; i += 3)
	{
		c = (src[i] << 16) + (src[i + 1] << 8) + src[i + 2];
		val[val.length] = str.charAt(c >> 18) + str.charAt((c >> 12) & 63) + str.charAt((c >> 6) & 63) + str.charAt(c & 63);
	}
	if ((src.length - len) === 1)
	{
		c = src[len];
		val[val.length] = str.charAt(c >> 2) + str.charAt((c & 3) << 4) + '==';
	}
	else if ((src.length - len) === 2)
	{
		c = (src[len] << 8) + src[len + 1];
		val[val.length] = str.charAt(c >> 10) + str.charAt((c >> 4) & 63) + str.charAt((c & 15) << 2) + '=';
	}
	return val.join('');
};

Q.swapbuf = new ArrayBuffer(8);

Q.ShortSwap = function(l)
{
	var b8 = new Uint8Array(Q.swapbuf, 0, 2);
	var b16 = new Int16Array(Q.swapbuf, 0, 2);
	b16[0] = l;
	var b1 = b8[0];
	b8[0] = b8[1];
	b8[1] = b1;
	return b16[0];
};

Q.UShortSwap = function(l)
{
	var b8 = new Uint8Array(Q.swapbuf, 0, 2);
	var b16 = new Uint16Array(Q.swapbuf, 0, 2);
	b16[0] = l;
	var b1 = b8[0];
	b8[0] = b8[1];
	b8[1] = b1;
	return b16[0];
};

Q.LongSwap = function(l)
{
	var b8 = new Uint8Array(Q.swapbuf);
	var b32 = new Int32Array(Q.swapbuf);
	b32[0] = b32[1] = l;
	b8[0] = b8[7];
	b8[1] = b8[6];
	b8[2] = b8[5];
	b8[3] = b8[4];
	return b32[0];
};

Q.ULongSwap = function(l)
{
	var b8 = new Uint8Array(Q.swapbuf);
	var b32 = new Uint32Array(Q.swapbuf);
	b32[0] = b32[1] = l;
	b8[0] = b8[7];
	b8[1] = b8[6];
	b8[2] = b8[5];
	b8[3] = b8[4];
	return b32[0];
};

Q.FloatSwap = function(f)
{
	var b8 = new Uint8Array(Q.swapbuf);
	var b32 = new Float32Array(Q.swapbuf);
	b32[0] = b32[1] = f;
	b8[0] = b8[7];
	b8[1] = b8[6];
	b8[2] = b8[5];
	b8[3] = b8[4];
	return b32[0];
};

Q.NoSwap = function(l)
{
	return l;
};