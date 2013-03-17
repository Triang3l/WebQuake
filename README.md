# WebQuake

__WebQuake__ is an HTML5 WebGL port of the game Quake by id Software.

The current development stage is __Public Beta__.

[Online demo by SpiritQuaddicted](http://quaddicted.com/forum/viewtopic.php?pid=438).

# Installing and running

Follow these steps to install WebQuake:

1. Install a web server with HTTP 1.1 Range support. The project was developed and tested on [Abyss Web Server](http://www.aprelium.com/abyssws/) on Windows, so it's guaranteed to work on it.
2. Download entire contents of the Client folder (WebQuake.htm and WebQuake/ folder) from the Code tab and put it somewhere on your server.
3. Get Quake resource files. The demo version containing only the first episode is enough.
4. Copy "id1" folder from the Quake folder to the folder where you put WebQuake.htm.
5. If you have Quake mission packs, repeat step 4 for "hipnotic" and/or "rogue" folders.
6. If you're running a system with case-sensitive names (such as Linux), make sure that all game files (__not__ including code files) have lowercase names.

To launch WebQuake, go to WebQuake.htm on your server in your browser.

To launch the game with command line arguments, add ? after the address and put the arguments after it in the same format as you use for Quake.

For Scourge of Armagon, add _-hipnotic_ command line argument. For Dissolution of Eternity, add _-rogue_.

To launch mods, copy the mod folder into the folder containing WebQuake.htm and add _-game MOD_NAME_HERE_ command line argument. Ensure step 6 of the installing instructions for the mod folder.

# Playing multiplayer

If you want to join a multiplayer game, do one of the following steps, go to Multiplayer menu in the main menu, type the IP in "Join game at" field and press Enter, or type _connect ws://ip:port_ in the console.

Currently there is no way to play with native Quake players, but it's in development.

You cannot join multiplayer games if the client is installed on https:// protocol, however.

If you want to create a server, first, install the dedicated server by completing the following steps.

1. Install [Node.js](http://nodejs.org).
2. Download the "Server" folder from the repository.
3. Put Quake resource files into the downloaded Server folder.
3. Open Node.js command prompt.
4. Go (cd) to the Server folder.
5. Type _npm install websocket_ (for more information, see [Worlize/WebSocket-Node](https://github.com/Worlize/WebSocket-Node) repository).

Then, to launch a server, open Node.js command prompt, go to the Server folder and type _node WebQDS.js_.

To change maximum number of players, use _-maxplayers_ command line argument.

## Remote console

To execute console commands on the server from the client or the web, set _rcon_password_ in the server console. If you have spaces in the password, surround it with quotes.

Don't tell the password to anyone except for the server admins. __Don't put the password in the command line, as everybody on the web can see your command line on your server's /rule_info page!__

Then, you have 4 ways to execute server commands:

* In the game, when not connected, in the console, type _rcon_address ip:port_ (without ws://), _rcon_password server_RCON_password_ (surround the password with quotes if you have spaces in it), and then execute the commands by typing _rcon your_command_here_.
* In the game, when connected to the server, do the same as in the previous way except for settings _rcon_address_.
* Go to the server IP in the browser (for example, if your server is at _ws://192.168.0.2:26000_, go to _http://192.168.0.2:26000_). On the Rcon line, enter your command in the left field and the password in the right field and press Send.
* Go to _http://ip:port/rcon/your_command_here_ in the browser. Login as "quake" with your RCON password.

## Server info API

You can retrieve some server information in JSON format by going to special addresses on your server IP.

* */server_info* - returns an object containing the server name (_hostName_), current level name (_levelName_), number of connected players (_currentPlayers_), maximum number of players (_maxPlayers_) and API version (_protocolVersion_). Gives 503 if server is off.
* */player_info* - returns an array of objects with the info about a player, where # is player number starting from 0. Contains name (_name_), shirt/pants color (_colors_, shirt color is upper 4 bits, pants color is lower 4 bits), number of kills (_frags_), time since connected (_connectTime_) and IP address (_address_). Gives 503 if server is off or 404 if the player is not found.
* */player_info/#* - returns single player info object for the player under the number #.
* */rule_info* - returns an array of all server console variables (like movement variables), in _{rule:"variable name",value:"variable value"}_ format.
* */rule_info/variable_name* - returns single server console variable in the same format. 404 if the variable is not there.

# Adding game music

To add music to WebQuake, you need to get the music off the Quake CD and convert it into .ogg format ([Audacity](http://audacity.sourceforge.net/) is great for this).

The .ogg files should be called _quake##.ogg_, where ## is CD track number minus 1 trailing 0, so the main theme is named _quake01.ogg_ and the last track on the Quake disc is _quake10.ogg_.

Then you should configure the server to return audio/ogg MIME type for .ogg files.

After that, create "media" folder in "id1" folder (or, for the mission pack music, "hipnotic" or "rogue") and put the .ogg files into it.

# Browser support

The port has been tested in the following browsers:

* Firefox (Windows) - __Very Good__ - developed in it, no mouse.
* Chrome (Windows, Android) - __Unknown__ - many crashes reported due to sound (launch with _-nosound_ argument). No "loading" image. On Android, a Windows-compatible keyboard is required for Esc and F1-F12 keys.
* Firefox (Android) - __Okay__ - very low performance (canvas is locked at 12 FPS), no mouse support. Keypresses are incorrect, not tested with Windows keyboard.
* Opera (Windows) - __Not Good__ - low performance, nothing is drawn in water (type _r_waterwarp 0_ in the console), no mouse.
* Internet Explorer (Windows) - __Unsupported__ - no WebGL, audio formats are not supported, XMLHttpRequest.overrideMimeType doesn't exist, no mouse.

Mouse support currently exists only in Chrome.

# Tips

If the sound randomly doesn't play, go to console (press ~ or Options > Go to console in main menu), type _stopsound_ and press Enter.

You can delete saved games by pressing Del in the load or save menus. This only works for the saved games created in WebQuake.

# Intentionally unimplemented features

These features are intentionally left unimplemented in this build. Please don't make pull requests adding them.

* Gamepad support - uses vendor prefixes.

# Contributing

If you want to contribute to WebQuake, feel free to fork the project and make a pull request. Pull requests and issues will be reviewed by the developer.
