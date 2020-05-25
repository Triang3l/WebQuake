
const sClass = function(){
    this.Init=function(){
        init();
    };
    this.PrecacheSound = function(name){
        if (this.nosound !== 0)
            return name;
        if (this.precache === 0)
            return name;
        return precacheSound(name);
    };
    this.LoadSound = function(source){
        if (this.nosound.value !== 0)
            return;
        return loadSound(source);
    };
    this.SounList = function(){
        for(let i in sfxs)
            Con.Print(
                 sizeGet(i) + ' : ' + i  + '\n'
            );
        Con.Print(
            'Total resident: ' + 
            total + 
            '\n'
        );
    };
    this.StartSound = function(entnum, entchannel, sfx, origin, vol, attenuation){
        startSound(entnum, entchannel, sfx, origin, vol, attenuation);
    }
    this.StartAmbient = function(name){
        return startAmbient(name);
    }
    this.listAmbient = function(){
        let out = [];
        for(let i in ambient_channels)
           out.push(i);
        return out;
    }
    this.LocalSound = function(sound){
         startSound(
             CL.state.viewentity, 
             1, 
             sound,
             Vec.origin, 
             1.0, 
             1.0
        );
    };
    this.StopAllSounds = function(){
         stopAllSounds();
    }
    this.StopSound = function(etnum, etchannel){
         stopSound(etnum, etchannel);
    }
    this.Play = function(){

    }
    this.PlayVol = function(){

    }
    this.StaticSound = async function(sfx, origin, vol, attenuation){
         await startSound(
             "static", 
             staticSerial,
             sfx,
             origin,
             vol,
             attenuation
        );
        channels["static"].sub[staticSerial].sx.loop = true;
        staticSerial++;
        if(staticSerial >10) // 11 static channels
           staticSerial = 0;

    }
    this.UpdateDynamicSounds = function(){
        for (let i of activeChannels){ //ia:string
            if(Host.realtime >= channels[
                   activeChannels[i].entnum
               ].sub[
                   activeChannels[i].entchannel
               ].end
            ){
               activeChannels.splice(i, 1);
               continue;
            }
            spatialize(
                activeChannels[i].entnum,
                activeChannels[i].entchannel
            );
            channelVolume(
                activeChannels[i].entnum,
                activeChannels[i].entchannel
            );
        }
    }
    this.UpdateAmbientSounds = function(){}
    this.UpdateStaticSounds = function(){}
    this.Update = function(origin, forward, right, up){
        listener_origin = origin;
        listener_forward = forward;
        listener_right = right;
        listener_up = up;
        if (volume.value < 0.0)
            Cvar.SetValue('volume', 0.0);
        else if (volume.value > 1.0)
            Cvar.SetValue('volume', 1.0);
    }
    this.Spatialize = function(ch){}
    this.size = 0;
    this.bgmvolume = 0;
    this.volume = 0;
    this.ambient_level = 0.3;
    this.ambient_fade = 100;
    this.precache = 1;
    this.nosound = 0;
    this.static_channels = [];
    this.known_sfx = [];
    this.started = false;
    let staticSerial = 0;
    let activeChannels = [];
    let channels = {};
    let ambient_channels = {};
    let listener_origin = [0.0, 0.0, 0.0];
    let listener_forward = [0.0, 0.0, 0.0];
    let listener_right = [0.0, 0.0, 0.0];
    let listener_up = [0.0, 0.0, 0.0];
    let sfxs = {};
    let audioCTX;
    let init = async function(){
        Con.Print('\nSound Initialization\n');
        Cmd.AddCommand('play', S.Play);
        Cmd.AddCommand('playvol', S.PlayVol);
        Cmd.AddCommand('stopsound', S.StopAllSounds);
        Cmd.AddCommand('soundlist', S.SoundList);
        this.nosound = Cvar.RegisterVariable(
            'nosound', 
            (COM.CheckParm(
                 '-nosound'
                 ) != null) ? '1' : '0'
        );
        this.volume = Cvar.RegisterVariable(
            'volume', 
            '0.7', 
            true
        );
        this.precache = Cvar.RegisterVariable(
            'precache', 
            '1'
        );
        this.bgmvolume = Cvar.RegisterVariable(
            'bgmvolume', 
            '1', 
            true
        );
        this.ambient_level = Cvar.RegisterVariable(
            'ambient_level', 
            '0.3'
        );
        this.ambient_fade = Cvar.RegisterVariable(
            'ambient_fade', 
            '100'
        );
        this.started = true;
        audioCTX = new (window.AudioContext || window.webkitAudioContext)({
              latencyHint: 'interactive',
              sampleRate: 44100,
        });
        let ambient_sfx = ['water1', 'wind2'];
        for (let i  of  ambient_sfx)
             startAmbient('ambience/' + i + '.wav');

    }
    let upldate = function(){

    }
    let spatialize = function(en, ec){
        if(en === CL.state.viewentity){
           channels[en].sub[ec].volLeft = channels[en].sub[ec].vol; 
           channels[en].sub[ec].volRight = channels[en].sub[ec].vol; 
           return ;
        }
        let source = [
            channels[en].sub[ec].origin[0] - listener_origin[0],
            channels[en].sub[ec].origin[1] - listener_origin[1],
            channels[en].sub[ec].origin[2] - listener_origin[2]
        ];
        let dist = Math.sqrt(source[0] * source[0] + source[1] * source[1] + source[2] * source[2]);

        if (dist !== 0.0){
            source[0] /= dist;
            source[1] /= dist;
            source[2] /= dist;
        }
        dist *= (channels[en].sub[ec].mult*0.4);
        var dot = listener_right[0] * source[0]
            + listener_right[1] * source[1]
            + listener_right[2] * source[2];
        channels[en].sub[ec].volRight = channels[en].sub[ec].vol * (1.0 - dist) * (1.0 + dot);
        if (channels[en].sub[ec].volRight < 0.0)
            channels[en].sub[ec].volRight = 0.0;
        if (channels[en].sub[ec].volRight > 1.0)
            channels[en].sub[ec].volRight = 1.0;
        channels[en].sub[ec].volLeft = channels[en].sub[ec].vol * (1.0 - dist) * (1.0 - dot);
        if (channels[en].sub[ec].volLeft < 0.0)
            channels[en].sub[ec].volLeft = 0.0;
        if (channels[en].sub[ec].volLeft > 1.0)
            channels[en].sub[ec].volLeft = 1.0;
    }
    let channelVolume = function(en,ec){
        channels[en].sub[ec].g1.gain.value = 
             channels[en].sub[ec].volLeft * volume.value;
        channels[en].sub[ec].g2.gain.value = 
             channels[en].sub[ec].volRight * volume.value;
    }
    let startSound = async function(entnum, entchannel, sfx, origin, vol, attenuation){
         pickChannel(entnum, entchannel);
         await loadSound(sfx);
         channels[entnum].sub[entchannel].vol = vol;
         channels[entnum].sub[entchannel].mult = attenuation * 0.001;
         spatialize(entnum, entchannel);
         if (
             (channels[entnum].sub[entchannel].volLeft === 0.0)&&
             (channels[entnum].sub[entchannel].volRight === 0.0)
        )
             return;

         if(channels[entnum].sub[entchannel].activeChannels === false){
            channels[entnum].sub[entchannel].activeChannels = parseInt(activeChannels.length);
            activeChannels.push({
                entnum,
                entchannel
            });
         }
         channels[entnum].sub[entchannel].sx.buffer = sfxs[sfx].cache;
//        channels[entnum].sub[entchannel].sx.connect(audioCTX.destination);
         channels[entnum].sub[entchannel].end  = Host.realtime + sfxs[sfx].cache.length;
         channels[entnum].sub[entchannel].sx.connect(
             channels[entnum].sub[entchannel].m1
         );
         channels[entnum].sub[entchannel].sx.connect(
             channels[entnum].sub[entchannel].m1, 0, 1
         );
         channels[entnum].sub[entchannel].m1.connect(
             channels[entnum].sub[entchannel].sp
         );
         channels[entnum].sub[entchannel].sp.connect(
             channels[entnum].sub[entchannel].g1
         );
         channels[entnum].sub[entchannel].sp.connect(
             channels[entnum].sub[entchannel].g2
         );
         channels[entnum].sub[entchannel].g1.connect( 
             channels[entnum].sub[entchannel].m2, 0, 0
         );
         channels[entnum].sub[entchannel].g2.connect( 
             channels[entnum].sub[entchannel].m2, 0, 1
         );
         channels[entnum].sub[entchannel].m2.connect(
             audioCTX.destination
         );
         channelVolume(entnum,entchannel);
         return channels[entnum].sub[entchannel].sx.start(); 
    }
    let startAmbient = async (sfx)=>{
        try{
            ambient_channels[sfx].stop();
        }catch(e){};
        loadSound(sfx);
        ambient_channels[sfx] = audioCTX.createBufferSource();
        ambient_channels[sfx].loop = true ;
        ambient_channels[sfx].connect(audioCTX.destination);
        setTimeout(function(){
            try{
                console.info(sfx);
                 ambient_channels[sfx].buffer = sfxs[sfx].cache;
                 ambient_channels[sfx].start(); 
            }catch(e){
                 console.error(e);
            }
        },2000);
    }
    let startAmbientAll = function(){
        for (let i  in  ambient_channels)
           startAmbient(i);
    }
    let precacheSound = function(name){
        if(typeof sfxs[name] === "undefined")
            sfxs[name] = {name: name};
        loadSound(name);
        return name;
    }
    let loadSound = async function(name){
        if (sfxs[name]  == null)
            sfxs[name] = {
               name  : name,
               cache : null
            };
        if (sfxs[name].cache != null)
            return true;
        let sc = {};
        let data = COM.LoadFile('sound/' + name);
        if (data == null){
            Con.Print(
                'Couldn\'t load sound/' + 
                name + 
                '\n'
            );
            return;
        }
        (await (async function(dataout, name){
            audioCTX.decodeAudioData(
                 data,
                 function(buffer){ 
                     sfxs[name].cache = buffer;
                 },
                 (e) => { reject(e); }
             );
        })(data,name));
        return true;
    };
    let sizeGet = function(name){
        if(sfxs[name].cache== null)
            return '';
        let size = sfxs.cache.size.toString();
        if (sfxs.cache.loopstart != null)
            size = 'L' + size;
        return size.padStart(6, ' ');
    };
    let pickChannel = function(entnum,entchannel){
        if(channels[entnum] == null)
            newChannel(entnum);
        if(channels[entnum].sub[entchannel] != null)
           stopSound(entnum, entchannel);
        return channels[entnum].sub[entchannel]=
               emptyChannel();

    };
    let emptyChannel = function(){
        return {
            vol       : 1,
            volLeft   : 1,
            volRight  : 1,
            origin    : [0,0,0],
            mult      : 0.0001,
            end       : null,
            sx        : audioCTX.createBufferSource(),
            m1        : audioCTX.createChannelMerger(2),
            m2        : audioCTX.createChannelMerger(2),
            sp        : audioCTX.createChannelSplitter(2),
            g1        : audioCTX.createGain(),
            g2        : audioCTX.createGain()
        }
    }
    let newChannel = function(entnum, sub){
        if((1 > sub)||(typeof sub === "undefined"))
            sub = 2;
        channels[entnum] = {
            sub:[]
        };
    };
    let stopAllSounds = function(){
        for(let iOne in channels)
             for(let iTwo in channels[iOne].sub)
                  stopSound(iOne,iTwo);
        for(let iOne in ambient_channels)
            stopSoundAmbient(iOne);
    }
    let stopSoundAmbient = function(sfx){
        if(ambient_channels[sfx] == null)
           return ;
        try{
            ambient_channels[sfx].stop();
            ambient_channels[sfx]=null;
        }catch(e){

        }
    }
    let stopSound = function(entnum, entchannel){
        if(channels[entnum].sub[entchannel].sx == null)
           return ;
        try{
            channels[entnum].sub[entchannel].sx.stop();
            channels[entnum].sub[entchannel].sx=null;
        }catch(e){

        }
    }

};

const S = new sClass();
