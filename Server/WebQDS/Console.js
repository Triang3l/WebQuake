Con = {};

Con.console=new Node.interactiveConsole.console();
Con.check=function(msg){
    	if (msg.charCodeAt(0) >= 3)
            return msg;
	else
            return msg.substring(1);
            
}
Con.Print = function(msg){
        Con.console.printLn(Con.check(msg));
};
Con.Warn = function(msg){
        Con.console.printLn(Con.console.style(Con.check(msg), {color: "yellow"}));
};
Con.Error = function(msg){
        Con.console.printLn(Con.console.style(Con.check(msg), {color: "red"}));
};


Con.DPrint = function(msg)
{
	if (Host.developer.value !== 0)
		Con.Print(msg);
};
Con.Init = function(){
    Con.console.on = function(cmd){
        Cmd.text += cmd+'\n';
    };
    Con.console.cursorText = "WebQuakeServer_> ";
    Con.console.watch();
}