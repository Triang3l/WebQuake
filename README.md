# WebQuake

**WebQuake** is an HTML5 port of the game Quake by id Software.

The current development stage is **Public Singleplayer Beta**.

# Installing and running

Follow these steps to install WebQuake:

1. Install a web server with HTTP 1.1 Range support. The project was developed and tested on [Abyss Web Server](http://www.aprelium.com/abyssws/) on Windows, so it's guaranteed to work on it.
2. Download Client/WebQuake.htm from the Code tab and put it somewhere on your server.
3. Get Quake resource files. The demo version containing only the first episode is enough.
4. Copy "id1" folder from the Quake folder to the folder where you put WebQuake.htm.
5. If you have Quake mission packs, repeat step 4 for "hipnotic" and/or "rogue" folders.
6. If you're running a system with case-sensitive names (such as Linux), make sure that all game files have lowercase names.

To launch WebQuake, go to WebQuake.htm on your server in your browser.

To launch the game with command line arguments, add ? after the address and put the arguments after it in the same format as you use for Quake.

For Scourge of Armagon, add *-hipnotic* command line argument. For Dissolution of Eternity, add *-rogue*.

To launch mods, copy the mod folder into the folder containing WebQuake.htm and add *-game MOD_NAME_HERE* command line argument. Ensure step 6 of the installing instructions for the mod folder.

# Adding game music

To add music to WebQuake, you need to get the music off the Quake CD and convert it into .ogg format ([Audacity](http://audacity.sourceforge.net/) is great for this).

The .ogg files should be named **quake(track number - 1).ogg** with trailing 0, so the main theme is named **quake01.ogg** and the last track on the Quake disc is **quake10.ogg**.

Then you should configure the server to return audio/ogg MIME type for .ogg files.

After that, create "media" folder in "id1" folder (or, for the mission pack music, "hipnotic" or "rogue") and put the .ogg files into it.

# Browser support

The port has been tested on the following browsers:

* Firefox (Windows) - **Perfect** - developed on it.
* Chrome (Windows, Android) - **Very Good** - no "loading" image. On Android, a Windows-compatible keyboard is required for Esc and F1-F12 keys.
* Firefox (Android) - **Okay** - very low performance (canvas is locked at 12 FPS). Keypresses are incorrect, not tested with Windows keyboard.
* Opera (Windows) - **Not Good** - low performance, nothing is drawn in water (type r_waterwarp 0 in the console).
* Internet Explorer (Windows) - **Unsupported** - no WebGL, audio formats are not supported, XMLHttpRequest.overrideMimeType doesn't exist.

# Intentionally unimplemented features

These features are intentionally left unimplemented in this build. Please don't make pull requests adding them.

* Multiplayer - will be added when the dedicated server is done.
* Mouse support - uses vendor prefixes, pointer lock works only in element fullscreen in Firefox. Element fullscreen is not going to be added because there's already browser-wide F11 fullscreen.
* Gamepad support - uses vendor prefixes.

# Contributing

If you want to contribute to WebQuake, feel free to fork the project and make a pull request. Pull requests and issues will be reviewed by the developer.

The uncompressed version is located in Client/Source folder.
