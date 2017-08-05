Sys = {};

Sys.Quit = function()
{
	process.exit(0);
};


Sys.Error = function(text)
{
        Con.Error(text);
	throw new Error(text);
};

Sys.FloatTime = function()
{
	var time = process.hrtime(Sys.oldtime);
	return time[0] + (time[1] / 1000000000.0);
};

Sys.main = function()
{
        Con.Init();
        COM.InitArgv(process.argv.slice(1));
	Sys.oldtime = process.hrtime();
	Con.Print('Host.Init');
	Host.Init();

	process.nextTick(Host.Frame);
};
