Q = {};

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
		if (Q.isNaN(c2) === true)
			return 0;
		return sign * c2;
	}
	for (;;)
	{
		c = str.charCodeAt(ptr++);
		if ((Q.isNaN(c) === true) || (c <= 47) || (c >= 58))
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
		if (Q.isNaN(c2) === true)
			return 0.0;
		return sign * c2;
	}
	val = parseFloat(str);
	if (Q.isNaN(val) === true)
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