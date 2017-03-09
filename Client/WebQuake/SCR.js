SCR = {};

SCR.con_current = 0;

SCR.centerstring = [];
SCR.centertime_off = 0.0;

SCR.CenterPrint = function(str)
{
	SCR.centerstring = [];
	var i, start = 0, next;
	for (i = 0; i < str.length; ++i)
	{
		if (str.charCodeAt(i) === 10)
			next = i + 1;
		else if ((i - start) >= 40)
			next = i;
		else
			continue;
		SCR.centerstring[SCR.centerstring.length] = str.substring(start, i);
		start = next;
	}
	SCR.centerstring[SCR.centerstring.length] = str.substring(start, i);
	SCR.centertime_off = SCR.centertime.value;
	SCR.centertime_start = CL.state.time;
}

SCR.DrawCenterString = function()
{
	SCR.centertime_off -= Host.frametime;
	if (((SCR.centertime_off <= 0.0) && (CL.state.intermission === 0)) || (Key.dest.value !== Key.dest.game))
		return;

	var y;
	if (SCR.centerstring.length <= 4)
		y = Math.floor(VID.height * 0.35);
	else
		y = 48;

	var i;
	if (CL.state.intermission)
	{
		var remaining = Math.floor(SCR.printspeed.value * (CL.state.time - SCR.centertime_start));
		var str, x, j;
		for (i = 0; i < SCR.centerstring.length; ++i)
		{
			str = SCR.centerstring[i];
			x = (VID.width - (str.length << 3)) >> 1;
			for (j = 0; j < str.length; ++j)
			{
				Draw.Character(x, y, str.charCodeAt(j));
				if ((remaining--) === 0)
					return;
				x += 8;
			}
			y += 8;
		}
		return;
	}

	for (i = 0; i < SCR.centerstring.length; ++i)
	{
		Draw.String((VID.width - (SCR.centerstring[i].length << 3)) >> 1, y, SCR.centerstring[i]);
		y += 8;
	}
};

SCR.CalcRefdef = function()
{
	SCR.recalc_refdef = false;

	if (SCR.viewsize.value < 30)
		Cvar.Set('viewsize', '30');
	else if (SCR.viewsize.value > 120)
		Cvar.Set('viewsize', '120');

	var size, full;
	if (CL.state.intermission !== 0)
	{
		full = true;
		size = 1.0;
		Sbar.lines = 0;
	}
	else
	{
		size = SCR.viewsize.value;
		if (size >= 120.0)
			Sbar.lines = 0;
		else if (size >= 110.0)
			Sbar.lines = 24;
		else
			Sbar.lines = 48;
		if (size >= 100.0)
		{
			full = true;
			size = 100.0;
		}
		size *= 0.01;
	}

	var vrect = R.refdef.vrect;
	vrect.width = Math.floor(VID.width * size);
	if (vrect.width < 96)
	{
		size = 96.0 / vrect.width;
		vrect.width = 96;
	}
	vrect.height = Math.floor(VID.height * size);
	if (vrect.height > (VID.height - Sbar.lines))
		vrect.height = VID.height - Sbar.lines;
	vrect.x = (VID.width - vrect.width) >> 1;
	if (full === true)
		vrect.y = 0;
	else
		vrect.y = (VID.height - Sbar.lines - vrect.height) >> 1;

	if (SCR.fov.value < 10)
		Cvar.Set('fov', '10');
	else if (SCR.fov.value > 170)
		Cvar.Set('fov', '170');
	if ((vrect.width * 0.75) <= vrect.height)
	{
		R.refdef.fov_x = SCR.fov.value;
		R.refdef.fov_y = Math.atan(vrect.height / (vrect.width / Math.tan(SCR.fov.value * Math.PI / 360.0))) * 360.0 / Math.PI;
	}
	else
	{
		R.refdef.fov_x = Math.atan(vrect.width / (vrect.height / Math.tan(SCR.fov.value * 0.82 * Math.PI / 360.0))) * 360.0 / Math.PI;
		R.refdef.fov_y = SCR.fov.value * 0.82;
	}

	var ymax = 4.0 * Math.tan(R.refdef.fov_y * Math.PI / 360.0);
	R.perspective[0] = 4.0 / (ymax * R.refdef.vrect.width / R.refdef.vrect.height);
	R.perspective[5] = 4.0 / ymax;
	GL.ortho[0] = 2.0 / VID.width;
	GL.ortho[5] = -2.0 / VID.height;

	R.warpwidth = (vrect.width * SCR.devicePixelRatio) >> 0;
	R.warpheight = (vrect.height * SCR.devicePixelRatio) >> 0;
	if (R.warpwidth > 2048)
		R.warpwidth = 2048;
	if (R.warpheight > 2048)
		R.warpheight = 2048;
	if ((R.oldwarpwidth !== R.warpwidth) || (R.oldwarpheight !== R.warpheight))
	{
		R.oldwarpwidth = R.warpwidth;
		R.oldwarpheight = R.warpheight;
		GL.Bind(0, R.warptexture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, R.warpwidth, R.warpheight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
		gl.bindRenderbuffer(gl.RENDERBUFFER, R.warprenderbuffer);
		gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, R.warpwidth, R.warpheight);
		gl.bindRenderbuffer(gl.RENDERBUFFER, null);
	}
};

SCR.SizeUp_f = function()
{
	Cvar.SetValue('viewsize', SCR.viewsize.value + 10);
	SCR.recalc_refdef = true;
};

SCR.SizeDown_f = function()
{
	Cvar.SetValue('viewsize', SCR.viewsize.value - 10);
	SCR.recalc_refdef = true;
};

SCR.Init = function()
{
	SCR.fov = Cvar.RegisterVariable('fov', '90');
	SCR.viewsize = Cvar.RegisterVariable('viewsize', '100', true);
	SCR.conspeed = Cvar.RegisterVariable('scr_conspeed', '300');
	SCR.showturtle = Cvar.RegisterVariable('showturtle', '0');
	SCR.showpause = Cvar.RegisterVariable('showpause', '1');
	SCR.centertime = Cvar.RegisterVariable('scr_centertime', '2');
	SCR.printspeed = Cvar.RegisterVariable('scr_printspeed', '8');
	Cmd.AddCommand('screenshot', SCR.ScreenShot_f);
	Cmd.AddCommand('sizeup', SCR.SizeUp_f);
	Cmd.AddCommand('sizedown', SCR.SizeDown_f);
	SCR.net = Draw.PicFromWad('NET');
	SCR.turtle = Draw.PicFromWad('TURTLE');
	SCR.pause = Draw.CachePic('pause');
};

SCR.count = 0;
SCR.DrawTurtle = function()
{
	if (SCR.showturtle.value === 0)
		return;
	if (Host.frametime < 0.1)
	{
		SCR.count = 0;
		return;
	}
	if (++SCR.count >= 3)
		Draw.Pic(R.refdef.vrect.x, R.refdef.vrect.y, SCR.turtle);
};

SCR.DrawNet = function()
{
	if (((Host.realtime - CL.state.last_received_message) >= 0.3) && (CL.cls.demoplayback !== true))
		Draw.Pic(R.refdef.vrect.x, R.refdef.vrect.y, SCR.net);
};

SCR.DrawPause = function()
{
	if ((SCR.showpause.value !== 0) && (CL.state.paused === true))
		Draw.Pic((VID.width - SCR.pause.width) >> 1, (VID.height - 48 - SCR.pause.height) >> 1, SCR.pause);
};

SCR.SetUpToDrawConsole = function()
{
	Con.forcedup = (CL.state.worldmodel == null) || (CL.cls.signon !== 4);

	if (Con.forcedup === true)
	{
		SCR.con_current = 200;
		return;
	}

	var conlines;
	if (Key.dest.value === Key.dest.console)
		conlines = 100;
	else
		conlines = 0;

	if (conlines < SCR.con_current)
	{
		SCR.con_current -= SCR.conspeed.value * Host.frametime;
		if (conlines > SCR.con_current)
			SCR.con_current = conlines;
	}
	else if (conlines > SCR.con_current)
	{
		SCR.con_current += SCR.conspeed.value * Host.frametime;
		if (conlines < SCR.con_current)
			SCR.con_current = conlines;
	}
};

SCR.DrawConsole = function()
{
	if (SCR.con_current > 0)
	{
		Con.DrawConsole(SCR.con_current);
		return;
	}
	if ((Key.dest.value === Key.dest.game) || (Key.dest.value === Key.dest.message))
		Con.DrawNotify();
};

SCR.ScreenShot_f = function()
{
	SCR.screenshot = true;
};

SCR.BeginLoadingPlaque = function()
{
	S.StopAllSounds();
	if ((CL.cls.state !== CL.active.connected) || (CL.cls.signon !== 4))
		return;
	SCR.centertime_off = 0.0;
	SCR.con_current = 0;
	SCR.disabled_for_loading = true;
	SCR.disabled_time = Host.realtime + 60.0;
};

SCR.EndLoadingPlaque = function()
{
	SCR.disabled_for_loading = false;
	Con.ClearNotify();
};

SCR.UpdateScreen = function()
{
	if (SCR.disabled_for_loading === true)
	{
		if (Host.realtime <= SCR.disabled_time)
			return;
		SCR.disabled_for_loading = false;
		Con.Print('load failed.\n');
	}

	var elem = document.documentElement;
	var width = (elem.clientWidth <= 320) ? 320 : elem.clientWidth;
	var height = (elem.clientHeight <= 200) ? 200 : elem.clientHeight;
	var pixelRatio;
	if (window.devicePixelRatio >= 1.0)
		pixelRatio = window.devicePixelRatio;
	else
		pixelRatio = 1.0;
	if ((VID.width !== width) || (VID.height !== height) || (SCR.devicePixelRatio !== pixelRatio) || (Host.framecount === 0))
	{
		VID.width = width;
		VID.height = height;
		VID.mainwindow.width = (width * pixelRatio) >> 0;
		VID.mainwindow.height = (height * pixelRatio) >> 0;
		VID.mainwindow.style.width = width + 'px';
		VID.mainwindow.style.height = height + 'px';
		SCR.devicePixelRatio = pixelRatio;
		SCR.recalc_refdef = true;
	}

	if (SCR.oldfov !== SCR.fov.value)
	{
		SCR.oldfov = SCR.fov.value;
		SCR.recalc_refdef = true;
	}
	if (SCR.oldscreensize !== SCR.viewsize.value)
	{
		SCR.oldscreensize = SCR.viewsize.value;
		SCR.recalc_refdef = true;
	}
	if (SCR.recalc_refdef === true)
		SCR.CalcRefdef();

	SCR.SetUpToDrawConsole();
	V.RenderView();
	GL.Set2D();
	if (R.dowarp === true)
		R.WarpScreen();
	if (Con.forcedup !== true)
		R.PolyBlend();

	if (CL.cls.state === CL.active.connecting)
		SCR.DrawConsole();
	else if ((CL.state.intermission === 1) && (Key.dest.value === Key.dest.game))
		Sbar.IntermissionOverlay();
	else if ((CL.state.intermission === 2) && (Key.dest.value === Key.dest.game))
	{
		Sbar.FinaleOverlay();
		SCR.DrawCenterString();
	}
	else if ((CL.state.intermission === 3) && (Key.dest.value === Key.dest.game))
		SCR.DrawCenterString();
	else
	{
		if (V.crosshair.value !== 0)
		{
			Draw.Character(R.refdef.vrect.x + (R.refdef.vrect.width >> 1) + V.crossx.value,
				R.refdef.vrect.y + (R.refdef.vrect.height >> 1) + V.crossy.value, 43);
		}
		SCR.DrawNet();
		SCR.DrawTurtle();
		SCR.DrawPause();
		SCR.DrawCenterString();
		Sbar.Draw();
		SCR.DrawConsole();
		M.Draw();
	}

	GL.StreamFlush();

	gl.disable(gl.BLEND);

	if (SCR.screenshot === true)
	{
		SCR.screenshot = false;
		gl.finish();
		open(VID.mainwindow.toDataURL('image/jpeg'));
	}
};