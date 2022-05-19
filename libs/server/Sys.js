const sysClass = function(){
     this.Quit = function(){
         process.exit(0);
     };
     this.Print = function(text) {
         process.stdout.write(text);
     };
     this.Error = function(text) {
         throw new Error(text);
     };
     this.FloatTime = function() {
         let time = process.hrtime(oldtime);
         return time[0] + (time[1] / 1000000000.0);
     };
     this.ConsoleInput = function(){
         if (cmd.length === 0)
             return;
         const text = cmd.toString();
         cmd = '';
         return text;
     };
     this.main = function() {
         COM.InitArgv(process.argv.slice(1));
         oldtime = process.hrtime();
         Sys.Print('Host.Init\n');
         Host.Init();
         process.stdin.resume();
         process.stdin.on('data', Sys.StdinOnData);
         process.nextTick(Host.Frame);
     };
     this.StdinOnData = function(data){
         cmd += Q.memstr(data);
     };
     let cmd = '';
     let oldtime = process.hrtime();
}
const Sys = new sysClass();
