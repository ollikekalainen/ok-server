
const okserver = require("ok-server");

function method1() {

	const server = okserver.createServer({
		logFolder: __dirname + "/log",
		pulseFolder: __dirname,
		optionsFile: __dirname + "/options-test.json"

	});
	server.loadHandler( require("./requesthandler-test" ) );

	server.addVirtualDirectory({
		name: "test", 
		path: "c:\\temp", 
		handlerName: "test" 
	});

	server.start({ onSuccess: () => { console._log("Server initialized");}}); 
}

function method2() {

	const server = new MyServer({
		serverClass: MyServer,
		logFolder: __dirname + "/log",
		pulseFolder: __dirname,
		optionsFile: __dirname + "/options-test.json"

	});
	server.start( (error) => {console.log(error);}, () => { console._log("Server initialized");}); 
}

class MyServer extends okserver.OKServer {
	constructor(options) {
		super(options);
		this.loadHandler( require("./requesthandler-test" ) );
		this.addVirtualDirectory({
			name: "test", 
			path: "c:\\temp", 
			handlerName: "test" 
		});
	}

	onHttpReady() {
		console._log("Server ready to listen...");
	}
}

//method1();
method2();