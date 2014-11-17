S = {};

S.channels = [];
S.static_channels = [];
S.ambient_channels = [];

S.listener_origin = [0.0, 0.0, 0.0];
S.listener_forward = [0.0, 0.0, 0.0];
S.listener_right = [0.0, 0.0, 0.0];
S.listener_up = [0.0, 0.0, 0.0];

S.known_sfx = [];

S.Init = function()
{
	Con.Print('\nSound Initialization\n');
	Cmd.AddCommand('play', S.Play);
	Cmd.AddCommand('playvol', S.PlayVol);
	Cmd.AddCommand('stopsound', S.StopAllSounds);
	Cmd.AddCommand('soundlist', S.SoundList);
	S.nosound = Cvar.RegisterVariable('nosound', (COM.CheckParm('-nosound') != null) ? '1' : '0');
	S.volume = Cvar.RegisterVariable('volume', '0.7', true);
	S.precache = Cvar.RegisterVariable('precache', '1');
	S.bgmvolume = Cvar.RegisterVariable('bgmvolume', '1', true);
	S.ambient_level = Cvar.RegisterVariable('ambient_level', '0.3');
	S.ambient_fade = Cvar.RegisterVariable('ambient_fade', '100');

	S.started = true;

	// createBuffer is broken, disable Web Audio for now.
	/* if (window.AudioContext != null))
		S.context = new AudioContext();
	else if (window.webkitAudioContext != null)
		S.context = new webkitAudioContext(); */

	var i, ambient_sfx = ['water1', 'wind2'], ch, nodes;
	for (i = 0; i < ambient_sfx.length; ++i)
	{
		ch = {sfx: S.PrecacheSound('ambience/' + ambient_sfx[i] + '.wav'), end: 0.0, master_vol: 0.0};
		S.ambient_channels[i] = ch;
		if (S.LoadSound(ch.sfx) !== true)
			continue;
		if (ch.sfx.cache.loopstart == null)
		{
			Con.Print('Sound ambience/' + ch.sfx.name + '.wav not looped\n');
			continue;
		}
		if (S.context != null)
		{
			nodes = {
				source: S.context.createBufferSource(),
				gain: S.context.createGainNode()
			};
			ch.nodes = nodes;
			nodes.source.buffer = ch.sfx.cache.data;
			nodes.source.loop = true;
			nodes.source.loopStart = ch.sfx.cache.loopstart;
			nodes.source.loopEnd = nodes.source.buffer.length;
			nodes.source.connect(nodes.gain);
			nodes.gain.connect(S.context.destination);
		}
		else
			ch.audio = ch.sfx.cache.data.cloneNode();
	}

	Con.sfx_talk = S.PrecacheSound('misc/talk.wav');
};

S.NoteOff = function(node)
{
	if ((node.playbackState === 1) || (node.playbackState === 2))
	{
		try { node.noteOff(0.0); } catch (e) {}
	}
}

S.NoteOn = function(node)
{
	if ((node.playbackState === 0) || (node.playbackState === 3))
	{
		try { node.noteOn(0.0); } catch (e) {}
	}
}

S.PrecacheSound = function(name)
{
	if (S.nosound.value !== 0)
		return;
	var i, sfx;
	for (i = 0; i < S.known_sfx.length; ++i)
	{
		if (S.known_sfx[i].name === name)
		{
			sfx = S.known_sfx[i];
			break;
		}
	}
	if (i === S.known_sfx.length)
	{
		S.known_sfx[i] = {name: name};
		sfx = S.known_sfx[i];
	}
	if (S.precache.value !== 0)
		S.LoadSound(sfx);
	return sfx;
};

S.PickChannel = function(entnum, entchannel)
{
	var i, channel;

	if (entchannel !== 0)
	{
		for (i = 0; i < S.channels.length; ++i)
		{
			channel = S.channels[i];
			if (channel == null)
				continue;
			if ((channel.entnum === entnum) && ((channel.entchannel === entchannel) || (entchannel === -1)))
			{
				channel.sfx = null;
				if (channel.nodes != null)
				{
					S.NoteOff(channel.nodes.source);
					channel.nodes = null;
				}
				else if (channel.audio != null)
				{
					channel.audio.pause();
					channel.audio = null;
				}
				break;
			}
		}
	}

	if ((entchannel === 0) || (i === S.channels.length))
	{
		for (i = 0; i < S.channels.length; ++i)
		{
			channel = S.channels[i];
			if (channel == null)
				break;
			if (channel.sfx == null)
				break;
		}
	}

	if (i === S.channels.length)
	{
		S.channels[i] = {end: 0.0};
		return S.channels[i];
	}
	return channel;
};

S.Spatialize = function(ch)
{
	if (ch.entnum === CL.state.viewentity)
	{
		ch.leftvol = ch.master_vol;
		ch.rightvol = ch.master_vol;
		return;
	}

	var source = [
		ch.origin[0] - S.listener_origin[0],
		ch.origin[1] - S.listener_origin[1],
		ch.origin[2] - S.listener_origin[2]
	];
	var dist = Math.sqrt(source[0] * source[0] + source[1] * source[1] + source[2] * source[2]);
	if (dist !== 0.0)
	{
		source[0] /= dist;
		source[1] /= dist;
		source[2] /= dist;
	}
	dist *= ch.dist_mult;
	var dot = S.listener_right[0] * source[0]
		+ S.listener_right[1] * source[1]
		+ S.listener_right[2] * source[2];

	ch.rightvol = ch.master_vol * (1.0 - dist) * (1.0 + dot);
	if (ch.rightvol < 0.0)
		ch.rightvol = 0.0;
	ch.leftvol = ch.master_vol * (1.0 - dist) * (1.0 - dot);
	if (ch.leftvol < 0.0)
		ch.leftvol = 0.0;
};

S.StartSound = function(entnum, entchannel, sfx, origin, vol, attenuation)
{
	if ((S.nosound.value !== 0) || (sfx == null))
		return;

	var target_chan = S.PickChannel(entnum, entchannel);
	target_chan.origin = [origin[0], origin[1], origin[2]];
	target_chan.dist_mult = attenuation * 0.001;
	target_chan.master_vol = vol;
	target_chan.entnum = entnum;
	target_chan.entchannel = entchannel;
	S.Spatialize(target_chan);
	if ((target_chan.leftvol === 0.0) && (target_chan.rightvol === 0.0))
		return;

	if (S.LoadSound(sfx) !== true)
	{
		target_chan.sfx = null;
		return;
	}

	target_chan.sfx = sfx;
	target_chan.pos = 0.0;
	target_chan.end = Host.realtime + sfx.cache.length;
	var volume;
	if (S.context != null)
	{
		var nodes = {
			source: S.context.createBufferSource(),
			merger1: S.context.createChannelMerger(2),
			splitter: S.context.createChannelSplitter(2),
			gain0: S.context.createGainNode(),
			gain1: S.context.createGainNode(),
			merger2: S.context.createChannelMerger(2)
		};
		target_chan.nodes = nodes;
		nodes.source.buffer = sfx.cache.data;
		if (sfx.cache.loopstart != null)
		{
			nodes.source.loop = true;
			nodes.source.loopStart = sfx.cache.loopstart;
			nodes.source.loopEnd = nodes.source.buffer.length;
		}
		nodes.source.connect(nodes.merger1);
		nodes.source.connect(nodes.merger1, 0, 1);
		nodes.merger1.connect(nodes.splitter);
		nodes.splitter.connect(nodes.gain0, 0);
		nodes.splitter.connect(nodes.gain1, 1);
		volume = target_chan.leftvol;
		if (volume > 1.0)
			volume = 1.0;
		nodes.gain0.gain.value = volume * S.volume.value;
		nodes.gain0.connect(nodes.merger2, 0, 0);
		volume = target_chan.rightvol;
		if (volume > 1.0)
			volume = 1.0;
		nodes.gain1.gain.value = volume * S.volume.value;
		nodes.gain1.connect(nodes.merger2, 0, 1);
		nodes.merger2.connect(S.context.destination);
		var i, check, skip;
		for (i = 0; i < S.channels.length; ++i)
		{
			check = S.channels[i];
			if (check === target_chan)
				continue;
			if ((check.sfx !== sfx) || (check.pos !== 0.0))
				continue;
			skip = Math.random() * 0.1;
			if (skip >= sfx.cache.length)
			{
				S.NoteOn(nodes.source);
				break;
			}
			target_chan.pos += skip;
			target_chan.end -= skip;
			nodes.source.noteGrainOn(0.0, skip, nodes.source.buffer.length - skip);
			break;
		}
		S.NoteOn(nodes.source);
	}
	else
	{
		target_chan.audio = sfx.cache.data.cloneNode();
		volume = (target_chan.leftvol + target_chan.rightvol) * 0.5;
		if (volume > 1.0)
			volume = 1.0;
		target_chan.audio.volume = volume * S.volume.value;
		target_chan.audio.play();
	}
};

S.StopSound = function(entnum, entchannel)
{
	if (S.nosound.value !== 0)
		return;
	var i, ch;
	for (i = 0; i < S.channels.length; ++i)
	{
		ch = S.channels[i];
		if (ch == null)
			continue;
		if ((ch.entnum === entnum) && (ch.entchannel === entchannel))
		{
			ch.end = 0.0;
			ch.sfx = null;
			if (ch.nodes != null)
			{
				S.NoteOff(ch.nodes.source);
				ch.nodes = null;
			}
			else if (ch.audio != null)
			{
				ch.audio.pause();
				ch.audio = null;
			}
			return;
		}
	}
};

S.StopAllSounds = function()
{
	if (S.nosound.value !== 0)
		return;

	var i, ch;

	for (i = 0; i < S.ambient_channels.length; ++i)
	{
		ch = S.ambient_channels[i];
		ch.master_vol = 0.0;
		if (ch.nodes != null)
			S.NoteOff(ch.nodes.source);
		else if (ch.audio != null)
			ch.audio.pause();
	}

	for (i = 0; i < S.channels.length; ++i)
	{
		ch = S.channels[i];
		if (ch == null)
			continue;
		if (ch.nodes != null)
			S.NoteOff(ch.nodes.source);
		else if (ch.audio != null)
			ch.audio.pause();
	}
	S.channels = [];

	if (S.context != null)
	{
		for (i = 0; i < S.static_channels.length; ++i)
			S.NoteOff(S.static_channels[i].nodes.source);
	}
	else
	{
		for (i = 0; i < S.static_channels.length; ++i)
			S.static_channels[i].audio.pause();
	}
	S.static_channels = [];
};

S.StaticSound = function(sfx, origin, vol, attenuation)
{
	if ((S.nosound.value !== 0) || (sfx == null))
		return;
	if (S.LoadSound(sfx) !== true)
		return;
	if (sfx.cache.loopstart == null)
	{
		Con.Print('Sound ' + sfx.name + ' not looped\n');
		return;
	}
	var ss = {
		sfx: sfx,
		origin: [origin[0], origin[1], origin[2]],
		master_vol: vol,
		dist_mult: attenuation * 0.000015625,
		end: Host.realtime + sfx.cache.length
	};
	S.static_channels[S.static_channels.length] = ss;
	if (S.context != null)
	{
		var nodes = {
			source: S.context.createBufferSource(),
			merger1: S.context.createChannelMerger(2),
			splitter: S.context.createChannelSplitter(2),
			gain0: S.context.createGainNode(),
			gain1: S.context.createGainNode(),
			merger2: S.context.createChannelMerger(2)
		};
		ss.nodes = nodes;
		nodes.source.buffer = sfx.cache.data;
		nodes.source.loop = true;
		nodes.source.loopStart = sfx.cache.loopstart;
		nodes.source.loopEnd = nodes.source.buffer.length;
		nodes.source.connect(nodes.merger1);
		nodes.source.connect(nodes.merger1, 0, 1);
		nodes.merger1.connect(nodes.splitter);
		nodes.splitter.connect(nodes.gain0, 0);
		nodes.splitter.connect(nodes.gain1, 1);
		nodes.gain0.connect(nodes.merger2, 0, 0);
		nodes.gain1.connect(nodes.merger2, 0, 1);
		nodes.merger2.connect(S.context.destination);
	}
	else
	{
		ss.audio = sfx.cache.data.cloneNode();
		ss.audio.pause();
	}
};

S.SoundList = function()
{
	var total = 0, i, sfx, sc, size;
	for (i = 0; i < S.known_sfx.length; ++i)
	{
		sfx = S.known_sfx[i];
		sc = sfx.cache;
		if (sc == null)
			continue;
		size = sc.size.toString();
		total += sc.size;
		for (; size.length <= 5; )
			size = ' ' + size;
		if (sc.loopstart != null)
			size = 'L' + size;
		else
			size = ' ' + size;
		Con.Print(size + ' : ' + sfx.name + '\n');
	}
	Con.Print('Total resident: ' + total + '\n');
};

S.LocalSound = function(sound)
{
	S.StartSound(CL.state.viewentity, -1, sound, Vec.origin, 1.0, 1.0);
};

S.UpdateAmbientSounds = function()
{
	if (CL.state.worldmodel == null)
		return;

	var i, ch, vol, sc;

	var l = Mod.PointInLeaf(S.listener_origin, CL.state.worldmodel);
	if ((l == null) || (S.ambient_level.value === 0))
	{
		for (i = 0; i < S.ambient_channels.length; ++i)
		{
			ch = S.ambient_channels[i];
			ch.master_vol = 0.0;
			if (ch.nodes != null)
			{
				S.NoteOff(ch.nodes.source);
			}
			else if (ch.audio != null)
			{
				if (ch.audio.paused !== true)
					ch.audio.pause();
			}
		}
		return;
	}

	for (i = 0; i < S.ambient_channels.length; ++i)
	{
		ch = S.ambient_channels[i];
		if ((ch.nodes == null) && (ch.audio == null))
			continue;
		vol = S.ambient_level.value * l.ambient_level[i];
		if (vol < 8.0)
			vol = 0.0;
		vol /= 255.0;
		if (ch.master_vol < vol)
		{
			ch.master_vol += (Host.frametime * S.ambient_fade.value) / 255.0;
			if (ch.master_vol > vol)
				ch.master_vol = vol;
		}
		else if (ch.master_vol > vol)
		{
			ch.master_vol -= (Host.frametime * S.ambient_fade.value) / 255.0;
			if (ch.master_vol < vol)
				ch.master_vol = vol;
		}

		if (ch.master_vol === 0.0)
		{
			if (S.context != null)
			{
				S.NoteOff(ch.nodes.source);
			}
			else
			{
				if (ch.audio.paused !== true)
					ch.audio.pause();
			}
			continue;
		}
		if (ch.master_vol > 1.0)
			ch.master_vol = 1.0;
		if (S.context != null)
		{
			ch.nodes.gain.gain.value = ch.master_vol * S.volume.value;
			S.NoteOn(ch.nodes.source);
		}
		else
		{
			ch.audio.volume = ch.master_vol * S.volume.value;
			sc = ch.sfx.cache;
			if (ch.audio.paused === true)
			{
				ch.audio.play();
				ch.end = Host.realtime + sc.length;
				continue;
			}
			if (Host.realtime >= ch.end)
			{
				try
				{
					ch.audio.currentTime = sc.loopstart;
				}
				catch (e)
				{
					ch.end = Host.realtime;
					continue;
				}
				ch.end = Host.realtime + sc.length - sc.loopstart;
			}
		}
	}
};

S.UpdateDynamicSounds = function()
{
	var i, ch, sc, volume;
	for (i = 0; i < S.channels.length; ++i)
	{
		ch = S.channels[i];
		if (ch == null)
			continue;
		if (ch.sfx == null)
			continue;
		if (Host.realtime >= ch.end)
		{
			sc = ch.sfx.cache;
			if (sc.loopstart != null)
			{
				if (S.context == null)
				{
					try
					{
						ch.audio.currentTime = sc.loopstart;
					}
					catch (e)
					{
						ch.end = Host.realtime;
						continue;
					}
				}
				ch.end = Host.realtime + sc.length - sc.loopstart;
			}
			else
			{
				ch.sfx = null;
				ch.nodes = null;
				ch.audio = null;
				continue;
			}
		}
		S.Spatialize(ch);
		if (S.context != null)
		{
			if (ch.leftvol > 1.0)
				ch.leftvol = 1.0;
			if (ch.rightvol > 1.0)
				ch.rightvol = 1.0;
			ch.nodes.gain0.gain.volume = ch.leftvol * S.volume.value;
			ch.nodes.gain1.gain.volume = ch.rightvol * S.volume.value;
		}
		else
		{
			volume = (ch.leftvol + ch.rightvol) * 0.5;
			if (volume > 1.0)
				volume = 1.0;
			ch.audio.volume = volume * S.volume.value;
		}
	}
};

S.UpdateStaticSounds = function()
{
	var i, j, ch, ch2, sfx, sc, volume;

	for (i = 0; i < S.static_channels.length; ++i)
		S.Spatialize(S.static_channels[i]);

	for (i = 0; i < S.static_channels.length; ++i)
	{
		ch = S.static_channels[i];
		if ((ch.leftvol === 0.0) && (ch.rightvol === 0.0))
			continue;
		sfx = ch.sfx;
		for (j = i + 1; j < S.static_channels.length; ++j)
		{
			ch2 = S.static_channels[j];
			if (sfx === ch2.sfx)
			{
				ch.leftvol += ch2.leftvol;
				ch.rightvol += ch2.rightvol;
				ch2.leftvol = 0.0;
				ch2.rightvol = 0.0;
			}
		}
	}

	if (S.context != null)
	{
		for (i = 0; i < S.static_channels.length; ++i)
		{
			ch = S.static_channels[i];
			if ((ch.leftvol === 0.0) && (ch.rightvol === 0.0))
			{
				S.NoteOff(ch.nodes.source);
				continue;
			}
			if (ch.leftvol > 1.0)
				ch.leftvol = 1.0;
			if (ch.rightvol > 1.0)
				ch.rightvol = 1.0;
			ch.nodes.gain0.gain.value = ch.leftvol * S.volume.value;
			ch.nodes.gain1.gain.value = ch.rightvol * S.volume.value;
			S.NoteOn(ch.nodes.source);
		}
	}
	else
	{
		for (i = 0; i < S.static_channels.length; ++i)
		{
			ch = S.static_channels[i];
			volume = (ch.leftvol + ch.rightvol) * 0.5;
			if (volume > 1.0)
				volume = 1.0;
			if (volume === 0.0)
			{
				if (ch.audio.paused !== true)
					ch.audio.pause();
				continue;
			}
			ch.audio.volume = volume * S.volume.value;
			sc = ch.sfx.cache;
			if (ch.audio.paused === true)
			{
				ch.audio.play();
				ch.end = Host.realtime + sc.length;
				continue;
			}
			if (Host.realtime >= ch.end)
			{
				try
				{
					ch.audio.currentTime = sc.loopstart;
				}
				catch (e)
				{
					ch.end = Host.realtime;
					continue;
				}
			}
		}
	}
};

S.Update = function(origin, forward, right, up)
{
	if (S.nosound.value !== 0)
		return;

	S.listener_origin[0] = origin[0];
	S.listener_origin[1] = origin[1];
	S.listener_origin[2] = origin[2];
	S.listener_forward[0] = forward[0];
	S.listener_forward[1] = forward[1];
	S.listener_forward[2] = forward[2];
	S.listener_right[0] = right[0];
	S.listener_right[1] = right[1];
	S.listener_right[2] = right[2];
	S.listener_up[0] = up[0];
	S.listener_up[1] = up[1];
	S.listener_up[2] = up[2];

	if (S.volume.value < 0.0)
		Cvar.SetValue('volume', 0.0);
	else if (S.volume.value > 1.0)
		Cvar.SetValue('volume', 1.0);

	S.UpdateAmbientSounds();
	S.UpdateDynamicSounds();
	S.UpdateStaticSounds();
};

S.Play = function()
{
	if (S.nosound.value !== 0)
		return;
	var i, sfx;
	for (i = 1; i < Cmd.argv.length; ++i)
	{
		sfx = S.PrecacheSound(COM.DefaultExtension(Cmd.argv[i], '.wav'));
		if (sfx != null)
			S.StartSound(CL.state.viewentity, 0, sfx, S.listener_origin, 1.0, 1.0);
	}
};

S.PlayVol = function()
{
	if (S.nosound.value !== 0)
		return;
	var i, sfx;
	for (i = 1; i < Cmd.argv.length; i += 2)
	{
		sfx = S.PrecacheSound(COM.DefaultExtension(Cmd.argv[i], '.wav'));
		if (sfx != null)
			S.StartSound(CL.state.viewentity, 0, sfx, S.listener_origin, Q.atof(Cmd.argv[i + 1]), 1.0);
	}
};

S.LoadSound = function(s)
{
	if (S.nosound.value !== 0)
		return;
	if (s.cache != null)
		return true;

	var sc = {};

	var data = COM.LoadFile('sound/' + s.name);
	if (data == null)
	{
		Con.Print('Couldn\'t load sound/' + s.name + '\n');
		return;
	}

	var view = new DataView(data);
	if ((view.getUint32(0, true) !== 0x46464952) || (view.getUint32(8, true) !== 0x45564157))
	{
		Con.Print('Missing RIFF/WAVE chunks\n');
		return;
	}
	var p, fmt, dataofs, datalen, cue, loopstart, samples;
	for (p = 12; p < data.byteLength; )
	{
		switch (view.getUint32(p, true))
		{
		case 0x20746d66: // fmt
			if (view.getInt16(p + 8, true) !== 1)
			{
				Con.Print('Microsoft PCM format only\n');
				return;
			}
			fmt = {
				channels: view.getUint16(p + 10, true),
				samplesPerSec: view.getUint32(p + 12, true),
				avgBytesPerSec: view.getUint32(p + 16, true),
				blockAlign: view.getUint16(p + 20, true),
				bitsPerSample: view.getUint16(p + 22, true)
			};
			break;
		case 0x61746164: // data
			dataofs = p + 8;
			datalen = view.getUint32(p + 4, true);
			break;
		case 0x20657563: // cue
			cue = true;
			loopstart = view.getUint32(p + 32, true);
			break;
		case 0x5453494c: // LIST
			if (cue !== true)
				break;
			cue = false;
			if (view.getUint32(p + 28, true) === 0x6b72616d)
				samples = loopstart + view.getUint32(p + 24, true);
			break;
		}
		p += view.getUint32(p + 4, true) + 8;
		if ((p & 1) !== 0)
			++p;
	}

	if (fmt == null)
	{
		Con.Print('Missing fmt chunk\n');
		return;
	}
	if (dataofs == null)
	{
		Con.Print('Missing data chunk\n');
		return;
	}
	if (loopstart != null)
		sc.loopstart = loopstart * fmt.blockAlign / fmt.samplesPerSec;
	if (samples != null)
		sc.length = samples / fmt.samplesPerSec;
	else
		sc.length = datalen / fmt.avgBytesPerSec;

	sc.size = datalen + 44;
	if ((sc.size & 1) !== 0)
		++sc.size;
	var out = new ArrayBuffer(sc.size);
	view = new DataView(out);
	view.setUint32(0, 0x46464952, true); // RIFF
	view.setUint32(4, sc.size - 8, true);
	view.setUint32(8, 0x45564157, true); // WAVE
	view.setUint32(12, 0x20746d66, true); // fmt
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, fmt.channels, true);
	view.setUint32(24, fmt.samplesPerSec, true);
	view.setUint32(28, fmt.avgBytesPerSec, true);
	view.setUint16(32, fmt.blockAlign, true);
	view.setUint16(34, fmt.bitsPerSample, true);
	view.setUint32(36, 0x61746164, true); // data
	view.setUint32(40, datalen, true);
	(new Uint8Array(out, 44, datalen)).set(new Uint8Array(data, dataofs, datalen));
	if (S.context != null)
		sc.data = S.context.createBuffer(out, true);
	else
		sc.data = new Audio('data:audio/wav;base64,' + Q.btoa(new Uint8Array(out)));

	s.cache = sc;
	return true;
};
