V = {};

V.CalcRoll = function(angles, velocity)
{
	var right = [];
	Vec.AngleVectors(angles, null, right);
	var side = velocity[0] * right[0] + velocity[1] * right[1] + velocity[2] * right[2];
	var sign = side < 0 ? -1 : 1;
	side = Math.abs(side);
	if (side < V.rollspeed.value)
		return side * sign * V.rollangle.value / V.rollspeed.value;
	return V.rollangle.value * sign;
};

V.Init = function()
{
	V.rollspeed = Cvar.RegisterVariable('cl_rollspeed', '200');
	V.rollangle = Cvar.RegisterVariable('cl_rollangle', '2.0');
};