
"use strict"

exports.console = function () {
    this.howami = "interactiveConsole";
    this.libs = {
        console: require('console').Console,
        fs: require('fs'),
    }
    this.assert = this.libs.console.assert;
    this.count = this.libs.console.count;
    this.check = function () {
        try {
            var wo = require("wonderful-output");
            that.libs.wonderfulOutput = new wo.json();
            that.detected.wonderfulOutput = 1;
        } catch (e) {
            that.detected.wonderfulOutput = 0;
        }
    }    
    this.debug = this.libs.console.debug;
    this.detected  = {
        wonderfulOutput:0
    };    
    this.dir = this.libs.console.dir;
    this.dirxml = this.libs.console.dirxml;
    this.expection = this.libs.console.expection;
    this.group = this.libs.console.group;
    this.groupCollapsed = this.libs.console.groupCollapsed;
    this.groupEnd = this.libs.console.groupEnd;
    this.markTimeLine = this.libs.console.markTimeLine;
    this.profile = this.libs.console.profile;
    this.profileEnd = this.libs.console.profileEnd;
    this.timeStamp = this.libs.console.timeStamp;
    this.trace = this.libs.console.trace;
    this.cacheCount = {};
    this.countNumber = 0;
    this.history = [];
    this.historyPosition = 0;
    this.icons = {
        log: "\u27e1",
        warn: "\u26a0",
        info: "\u2709",
        error: "\u26a1",
        time: "\u25f4"
    },
    this.writeStream={
        write:function(haleluja){
            return false;
        }
    }
    this.writeInit=function(){
        this.writeStream=this.libs.fs.createWriteStream(this.config.log.directory+this.config.log.fileName, { 'flags': 'a'});
        this.config.log.write=1;
    };
    this.config = {
        icon: 0,
        color: 0,
        title: 1,
        titleColor: 1,
        timeStamp: 1,
        count: 0,
        date: 0,
        mode: "normal", // normal, password, hidden, yesNo
        dateFormat: "DMY", // DMY, MDY, YMD,
        format: "text", // text, json
        hostname: 0,
        host: "localhost",
        limitation: "none", // none, safe, number, calculator
        wonderfulOutput:1, 
        limits: {
            safe: "QWERTYUIOOOOPASDFGHJKL\ZXCVBNM qwertyuiopasdfghjklzxcvbnm`1234567890_-+={[}]:;@'~#!" + '"' + "£$%^&*()æßðđŋħĸµn¢»«|\\/?><,.€½³²¹½¾¢|«»nµłĸŋđðßæ@łe¶ŧ←↓→øþ·̣|¬*",
            number: "0123456789",
            calculator: "098764321=+-*/%"
        },
        log: {
            write: 0,
            fileName: "console.log",
            directory: ""
        },
        styles: {
            count: {color: "white", effect: "italic"},
            timeStamp: {color: "white", effect: "dim"},
            date: {color: "white", effect: "dim"},
            log: {color: "grey", effect: "bold"},
            warn: {color: "yellow", effect: "bold"},
            info: {color: "green", effect: "bold"},
            error: {color: "red", effect: "bold"},
            time: {color: "blue", effect: "bold"},
            logTitle: {color: "grey", effect: "bold"},
            warnTitle: {color: "yellow", effect: "bold"},
            infoTitle: {color: "green", effect: "bold"},
            errorTitle: {color: "red", effect: "bold"},
            timeTitle: {color: "blue", effect: "bold"},
            logIcon: {color: "grey", effect: "bold"},
            warnIcon: {color: "yellow"},
            infoIcon: {color: "green"},
            errorIcon: {color: "red"},
            timeIcon: {color: "blue"}
        }
    }
    this.styles = {
        color: {
            black: 30,
            red: 31,
            green: 32,
            yellow: 33,
            blue: 34,
            magenta: 35,
            cyan: 36,
            white: 37,
            gray: 90,
            grey: 90
        },
        background: {
            black: 40,
            red: 41,
            green: 42,
            yellow: 43,
            blue: 44,
            magenta: 45,
            cyan: 46,
            white: 47
        },
        effect: {
            bold: 1,
            dim: 2,
            italic: 3,
            underline: 4,
            blink: 5,
            inverse: 7,
            hidden: 8,
            strikethrough: 9,
        }
    }
    this.cache = [];
    this.cacheRewrite = function () {
        that.clear();
        for (var i = 0; that.cache.length > i; i++) {
            that.print(that.textMaker.re(that.cache[i].count,
                    that.cache[i].hostname,
                    that.cache[i].text,
                    that.cache[i].type,
                    that.cache[i].timeStamp) + "\n");
        }
        that.makePrompt();
    }
    this.cacheAdd = function (count, hostname, text, type, timeStamp) {
        that.cache.push({
            count: count,
            hostname: hostname,
            timeStamp: timeStamp,
            text: text,
            type: type
        });
    }
    this.style = function (text, styles) {
        var style = '\u001b[85';
        for (var i in styles)
            for (var s in styles[i])
                if ((typeof this.styles[s] !== "undefined") && (typeof this.styles[s][styles[i][s]] !== "undefined"))
                    style += ";" + this.styles[s][styles[i][s]].toString();
        for (var s in styles)
            if ((typeof this.styles[s] !== "undefined") && (typeof this.styles[s][styles[s]] !== "undefined"))
                style += ";" + this.styles[s][styles[s]].toString();
        var last = text.lastIndexOf("\u001b[0m");
        text = text.slice(0, last) + text.slice(last).replace("\u001b[0m", "\u001b[0m" + style + "m");
        return style + "m" + text + "\u001b[0m";
    }
    this.lineText = "";
    this.watchOn = 0;
    this.yes = function () {};
    this.no = function () {};
    this.clear = function () {
        process.stdout.write('\u001b[2J\u001b[0;0f');
    }
    this.print = function (incoming) {
        process.stdout.write(incoming.toString());
    }
    this.printLn = function (incoming) {
        process.stdout.cursorTo(0);
        process.stdout.clearLine();
        this.print(incoming.toString() + "\n");
        if (this.watchOn === 1)
            this.makePrompt();
    }
    this.titleText = {
        log: "log : ",
        warn: "warning : ",
        info: "info : ",
        error: "error : ",
        time: "time : "
    }
    this.textMaker = {
        timeStamp: function (stamp) {
            if (that.config.timeStamp === 1)
                return "[" + that.style((parseInt(stamp / 1000)).toString(), that.config.styles.timeStamp) + "]";
            return "";
        },
        date: function (stamp) {
            // DMY, MDY, YMD,
            var d = new Date(stamp);
            if (that.config.date === 1) {
                if (that.config.dateFormat === "YMD")
                    return"[" + that.style(d.getFullYear().toString() + "-" + (parseInt(d.getMonth()) + 1).toString() + "-" + d.getDate().toString() + " " + d.getHours().toString() + ":" + d.getMinutes().toString() + ":" + d.getSeconds().toString() + "." + d.getMilliseconds().toString(), that.config.styles.date) + "]";
                if (that.config.dateFormat === "DMY")
                    return"[" + that.style(d.getDate().toString() + "-" + (parseInt(d.getMonth()) + 1).toString() + "-" + d.getFullYear().toString() + " " + d.getHours().toString() + ":" + d.getMinutes().toString() + ":" + d.getSeconds().toString() + "." + d.getMilliseconds().toString(), that.config.styles.date) + "]";
                if (that.config.dateFormat === "MDY")
                    return"[" + that.style((parseInt(d.getMonth()) + 1).toString() + "-" + d.getDate().toString() + "-" + d.getFullYear().toString() + " " + d.getHours().toString() + ":" + d.getMinutes().toString() + ":" + d.getSeconds().toString() + "." + d.getMilliseconds().toString(), that.config.styles.date) + "]";
            }
            return "";
        },
        title: function (type) {
            var title;
            if (that.config.titleColor === 1)
                title = that.style(that.titleText[type], that.config.styles[type + "Title"]);
            if (that.config.title === 1)
                return title;
            return "";
        },
        icon: function (type) {
            if (that.config.icon === 1)
                return that.style(that.icons.log + " ", that.config.styles[type + "Icon"]);
            return "";
        },
        hostname: function (hostname) {
            if (that.config.hostname === 1)
                return that.style("=" + hostname + "= ", that.config.styles.hostname);
            return "";
        },
        json: function (text, type, stamp) {
            return {host: that.config.hostname, timeStamp: stamp, type: type, text: text}
        },
        count: function () {
            if (that.config.count === 1)
                return that.style(that.countNumber.toString() + ". ", that.config.styles.count);
            return "";
        },
        text: function (type, text) {
            if (that.config.count === 1)
                return that.style(text.toString(), that.config.styles[type]);
            return text.toString();
        },
        formater: function(text){
                if ((that.detected.wonderfulOutput === 1)&&(that.config.wonderfulOutput === 1)){
                    if (typeof text === "object") return that.libs.wonderfulOutput.json(text);
                    return text;
                } else {
                    if (typeof text === "object") return JSON.stringify(text);
                    return text;
                }
        },
        add: function (text, type) {
            var stamp = +new Date;
            that.countNumber++;
            var out = text;
            if (that.config.format === "text") {
                out = that.textMaker.formater(out);
                out = that.textMaker.text(type, out);
                out = that.textMaker.title(type) + out;
                out = that.textMaker.icon(type) + out;
                out = that.textMaker.timeStamp(stamp) + out;
                out = that.textMaker.date(stamp) + out;
                out = that.textMaker.hostname(that.config.host) + out;
                out = that.textMaker.count() + out;
            } else if (that.config.format === "json") {
                that.textMaker.count();
                text = JSON.stringify({
                    count: that.countNumber.toString(),
                    hostname: that.config.host,
                    timeStamp: stamp,
                    type: type,
                    text: text
                });
            }
            that.textMaker.file(that.countNumber.toString(),that.config.host,stamp,type,text);
            that.cacheAdd(that.countNumber, that.config.host, text, type, stamp);
            return out;
        },
        file:function(count, host, stamp, type, text){
            if(that.config.log.write === 1){
                that.writeStream.write(JSON.stringify({
                    count: count,
                    hostname: host,
                    timeStamp: stamp,
                    type: type,
                    text: text
                })+"\n");
            }
        },
        re: function (count, hostname, text, type, stamp) {
            if (that.config.format === "text") {
                text = that.textMaker.formater(text);
                text = that.textMaker.text(type, text);
                text = that.textMaker.title(type) + text;
                text = that.textMaker.icon(type) + text;
                text = that.textMaker.timeStamp(stamp) + text;
                text = that.textMaker.date(stamp) + text;
                text = that.textMaker.hostname(hostname) + text;
                text = that.textMaker.count(count) + text;
            } else if (that.config.format === "json") {
                that.textMaker.count();
                text = JSON.stringify({
                    count: count,
                    hostbane: hostname,
                    timeStamp: stamp,
                    type: type,
                    text: text
                });
            }
            return text;
        },
        incomming: function (hostname, text, type, stamp) {
            var stamp = +new Date;
            that.countNumber++;
            if (that.config.format === "text") {
                text = that.textMaker.formater(text);                
                text = that.textMaker.text(type, text);
                text = that.textMaker.title(type) + text;
                text = that.textMaker.icon(type) + text;
                text = that.textMaker.timeStamp(stamp) + text;
                text = that.textMaker.date(stamp) + text;
                text = that.textMaker.hostname(hostname) + text;
                text = that.textMaker.count() + text;
            } else if (that.config.format === "json") {
                that.textMaker.count();
                text = JSON.stringify({
                    count: that.countNumber.toString(),
                    hostname: hostname,
                    timeStamp: stamp,
                    type: type,
                    text: text
                });
            }
            that.textMaker.file(that.countNumber.toString(), hostname, stamp, type, text);
            that.cacheAdd(that.countNumber, hostname, text, type, stamp);
            return text;
        }

    }
    this.log = function (incoming) {
        this.printLn(this.textMaker.add(incoming, "log"));
    }
    this.error = function (incoming) {
        this.printLn(this.textMaker.add(incoming, "error"));
    }
    this.info = function (incoming) {
        this.printLn(this.textMaker.add(incoming, "info"));
    }
    this.timeText = "";
    this.timeStamp = 0;
    this.time = function (incoming) {
        this.timeText = incoming.toString();
        this.timeStamp = +new Date();
    }
    this.timeEnd = function () {
        this.printLn(this.textMaker.add(this.timeText + " " + (((+new Date())) - this.timeStamp).toString() + "ms", "time"));
    }
    this.warn = function (incoming) {
        this.printLn(this.textMaker.add(incoming, "warn"));
    }
    this.table = function (tableData) {
        var u = {
            a1: "\u250C",
            c1: "\u252c",
            b1: "\u2500",
            a2: "\u2510",
            a3: "\u2514",
            a4: "\u2518",
            c2: "\u253c",
            c3: "\u2534",
            c4: "\u251c",
            c5: "\u2524",
            b2: "\u2502"
        }

        function calculateTable(tableData) {
            var sizeCol = 0,
                    sizeDat = [],
                    colNum = 0;
            for (var i = 0; tableData.length > i; i++)
                if (tableData[i].length > colNum)
                    colNum = tableData[i].length;

            for (var ic = 0; colNum > ic; ic++) {
                sizeDat[ic] = 0;
                for (var il = 0; tableData.length > il; il++) {
                    if (typeof tableData[il][ic] !== "undefined")
                        if (tableData[il][ic].length > sizeDat[ic])
                            sizeDat[ic] = tableData[il][ic].length;
                }
            }
            return  sizeDat;
        }
        function tableTop(tableSize) {
            var out = "";
            out += u.a1;
            for (var ic = 0; tableSize.length > ic; ic++) {
                if (ic > 0)
                    out += u.c1;
                for (var il = 0; tableSize[ic] > il; il++)
                    out += u.b1;
            }
            out += u.a2;
            return out;
        }

        function tableCenter(tableSize) {
            var out = "";
            out += u.c4;
            for (var ic = 0; tableSize.length > ic; ic++) {
                if (ic > 0)
                    out += u.c2;
                for (var il = 0; tableSize[ic] > il; il++)
                    out += u.b1;
            }
            out += u.c5;
            return out;
        }

        function tableButton(tableSize) {
            var out = "";
            out += u.a3;
            for (var ic = 0; tableSize.length > ic; ic++) {
                if (ic > 0)
                    out += u.c3;
                for (var il = 0; tableSize[ic] > il; il++)
                    out += u.b1;
            }
            out += u.a4;
            return out;
        }

        function tableDataLine(tableData, tableSize) {
            var out = "",
                    before = 0;
            out += u.b2;
            for (var ic = 0; tableSize.length > ic; ic++) {
                if (ic > 0)
                    out += u.b2;
                if (typeof tableData[ic] !== "undefined") {
                    before = parseInt((tableSize[ic] - tableData[ic].length) / 2);
                    for (var ila = 0; before > ila; ila++)
                        out += " ";
                    out += tableData[ic];
                    for (var ilb = 0; (tableSize[ic] - (before + tableData[ic].length)) > ilb; ilb++)
                        out += " ";
                } else {
                    for (var il = 0; tableSize[ic] > il; il++)
                        out += " ";
                }
            }
            out += u.b2;
            return out;
        }

        function tableTitle(tableData, tableSize) {
            var out = "",
                    before = 0;
            out += u.b2;
            for (var ic = 0; tableSize.length > ic; ic++) {
                if (ic > 0)
                    out += u.b2;
                if (typeof tableData[ic] !== "undefined") {
                    before = parseInt((tableSize[ic] - tableData[ic].length) / 2);
                    for (var ila = 0; before > ila; ila++)
                        out += " ";
                    out += '\u001b[1m' + tableData[ic] + '\u001b[0m';
                    for (var ilb = 0; (tableSize[ic] - (before + tableData[ic].length)) > ilb; ilb++) {
                        out += " ";
                    }
                } else {
                    for (var il = 0; tableSize[ic] > il; il++) {
                        out += " ";
                    }
                }
            }
            out += u.b2;
            return out;
        }


        var tableSize = calculateTable(tableData),
                out = "";
        out += tableTop(tableSize) + "\n";
        for (var i = 0; tableData.length > i; i++) {
            if (i > 0) {
                out += tableCenter(tableSize) + "\n";
                out += tableDataLine(tableData[i], tableSize) + "\n";
            } else {
                out += tableTitle(tableData[i], tableSize) + "\n";
            }
        }
        out += tableButton(tableSize) + "\n";
        process.stdout.write(out);
    }
    this.graph = function (barData, startNumber) {
        startNumber = startNumber || 0;
        var bar = [
            " ",
            "\u2581",
            "\u2583",
            "\u2584",
            "\u2585",
            "\u2586",
            "\u2587",
            "\u2588",
        ],
                barb = [
                    " ",
                    "\u2581",
                    "\u2582",
                    "\u2583",
                    "\u2584",
                    "\u2585",
                    "\u2586",
                    "\u2587",
                    "\u2588",
                ],
                graph = "",
                minNumber = 0,
                maxNumber = 0,
                endNumber = 0,
                startNumber = 0,
                diffNumber = 0,
                outData = [],
                perNumber = 0,
                minus = 0;

        if (barData.length === 0)
            return [];

        if (startNumber > barData.length) {
            startNumber = 0;
        }
        if (60 > barData.length - 1) {
            startNumber = 0;
        }
        if (60 > ((barData.length - 1) - startNumber)) {
            startNumber = ((barData.length - 1) - 60);
            endNumber = barData.length;
        } else {
            endNumber = startNumber + 60;
        }
        if (0 > startNumber) {
            startNumber = 0;
        }
        maxNumber = parseInt(barData[0]);
        minNumber = parseInt(barData[0]);
        for (var i = startNumber; barData.length > i; i++) {
            if (parseFloat(barData[i]) > maxNumber)
                maxNumber = parseInt(barData[i]);
            if (minNumber > parseFloat(barData[i]))
                minNumber = parseInt(barData[i]);
        }
        minNumber--;
        diffNumber = maxNumber - minNumber;
        perNumber = diffNumber / 100;
        for (var i = startNumber; barData.length > i; i++) {
            outData.push((parseInt(barData[i]) - minNumber) / perNumber);
        }
        graph = "\n\u25B2 \n";
        for (var i = 0; 14 > i; i++) {
            graph += "\u2502";
            for (var iL = 0; 60 > iL; iL++) {
                minus = parseInt(outData[iL]) - ((14 - i) * 8)
                if (1 > minus)
                    minus = 0;
                if (minus > 7)
                    minus = 8;
                if (typeof outData[iL] === "undefined")
                    minus = 0;
                graph += barb[minus];

            }
            graph += "\n";
        }
        graph += "\u2514";
        for (var i = 0; 60 > i; i++) {
            graph += "\u2500";
        }

        graph += "\u25B6" + "\n";
        process.stdout.write(graph);
    }

    this.exit = function () {
        that.makePrompt();
        that.config.mode = "yesNo";
        process.stdout.write("\n");
        this.print(" Are you sure you want to exit? (y\\n)");
        process.stdout.write("\n");
        that.yes = function () {
            process.exit();
        };
    }
    this.cursorPosition = 0;
    this.cursorText = "nodeConsole_> ";

    this.on = function (incomming) {
        return false;
    }
    this.newLine = function () {
        process.stdout.write("\n");
        that.cursorPosition = 0;
        that.lineText = "";
    }
    this.makePrompt = function () {
        process.stdout.cursorTo(0);
        process.stdout.clearLine();
        if (this.config.mode === "hidden") {
            process.stdout.write(this.cursorText);
            return true;
        } else if (this.config.mode === "password") {
            process.stdout.write(this.cursorText + (function () {
                var out = "";
                for (var ri = 0; that.lineText.length > ri; ri++)
                    out += "*";
                return out;
            })());
        } else {
            process.stdout.write(this.cursorText + this.lineText);
        }
        process.stdout.cursorTo(this.cursorPosition + this.cursorText.length);
    }
    this.watch = function () {
        this.watchOn = 1;
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        that.makePrompt();
        process.stdin.on('data', function (key) {
            if (that.config.mode === "yesNo") {
                if ((key === 'y') || (key === 'j') || (key === 'i')) {
                    that.newLine();
                    that.yes();
                    that.yes = function () {};
                    that.config.mode = "normal";
                    that.makePrompt();
                } else {
                    that.newLine();
                    that.no();
                    that.no = function () {};
                    that.config.mode = "normal";
                    process.stdout.write("\n");
                    that.makePrompt();
                }
            } else {
                if (key === '\u0003') {
                    that.exit();
                } else if (key === '\u000D') {
                    if (that.lineText.length > 0) {
                        if (["q", "quit", "e", "exit"].indexOf(that.lineText) > -1) {
                            that.exit();
                        } else {
                            process.stdout.write("\n");
                            that.on(that.lineText);
                            if ((that.history.length < 1) || (that.lineText !== that.history[that.history.length - 1]))
                                that.history.push(that.lineText);
                            that.lineText="";
                            that.cursorPosition = 0;
                            that.makePrompt();                              
                            that.historyPosition = that.history.length;
                        }
                    }
                } else if ((key === '\u0008') || (key.charCodeAt(0) === 127)) {
                    if (that.cursorPosition > 0) {
                        that.lineText = that.lineText.substr(0, parseInt(that.cursorPosition - 1)) + that.lineText.substr(parseInt(that.cursorPosition), that.lineText.length);
                        that.cursorPosition--;
                        that.makePrompt();
                    }
                } else if ((key === '\u001b[3~')) {
                    if (that.lineText.length>that.cursorPosition) {
                        that.lineText = that.lineText.substr(0, parseInt(that.cursorPosition)) + that.lineText.substr(parseInt(that.cursorPosition+1), that.lineText.length);
                        that.makePrompt();
                    }
                } else if (key === '\u001b[A') {
                    if (that.historyPosition > 0) {
                        that.historyPosition--;
                        that.lineText = that.history[that.historyPosition];
                        that.cursorPosition = that.lineText.length;
                        that.makePrompt();
                    }
                } else if (key === '\u001b[B') {
                    if (that.history.length > that.historyPosition + 1) {
                        that.historyPosition++;
                        that.lineText = that.history[that.historyPosition];
                        that.cursorPosition = that.lineText.length;
                        that.makePrompt();
                    }

                } else if ((key === '\u001b[C') || (key == '\u001B\u005B\u0043')) {
                    if (that.lineText.length > that.cursorPosition)
                        that.cursorPosition++;
                    that.makePrompt();
                } else if ((key === '\u001b[D') || (key == '\u001B\u005B\u0044')) {
                    if (that.cursorPosition > 0)
                        that.cursorPosition--;
                    that.makePrompt();
                } else {
                    if ((that.config.limitation === "none") ||
                            ((that.config.limitation === "safe") && (that.config.limits.safe.indexOf(key.toString()) > -1)) ||
                            ((that.config.limitation === "number") && (that.config.limits.number.indexOf(key.toString()) > -1)) ||
                            ((that.config.limitation === "calculator") && (that.config.limits.calculator.indexOf(key.toString()) > -1))
                            ) {
                        if (that.lineText.length > 0) {
                            that.lineText = that.lineText.substr(0, parseInt(that.cursorPosition)) + key.toString() + that.lineText.substr(parseInt(that.cursorPosition), that.lineText.length);
                        } else {
                            that.lineText = key.toString();
                        }
                        that.cursorPosition++;
                        that.makePrompt();
                    }
                }
            }
        });
    }
    var that = this;
    this.check();
    
};





