Chase = {};

Chase.Init = function()
{
	Chase.back = Cvar.RegisterVariable('chase_back', '100');
	Chase.up = Cvar.RegisterVariable('chase_up', '16');
	Chase.right = Cvar.RegisterVariable('chase_right', '0');
	Chase.active = Cvar.RegisterVariable('chase_active', '0');
};

Chase.Update = function()
{
	var forward = [], right = [];
	Vec.AngleVectors(CL.state.viewangles, forward, right);
	var trace = {plane: {}}, org = R.refdef.vieworg;
	SV.RecursiveHullCheck(CL.state.worldmodel.hulls[0], 0, 0.0, 1.0, org, [
		org[0] + 4096.0 * forward[0],
		org[1] + 4096.0 * forward[1],
		org[2] + 4096.0 * forward[2]], trace);
	var stop = trace.endpos;
	stop[2] -= org[2];
	var dist = (stop[0] - org[0]) * forward[0] + (stop[1] - org[1]) * forward[1] + stop[2] * forward[2];
	if (dist < 1.0)
		dist = 1.0;
	R.refdef.viewangles[0] = Math.atan(stop[2] / dist) / Math.PI * -180.0;
	org[0] -= forward[0] * Chase.back.value + right[0] * Chase.right.value;
	org[1] -= forward[1] * Chase.back.value + right[1] * Chase.right.value;
	org[2] += Chase.up.value;
};