/*
----------------------------------------------------------------------------------------------------
 ok-server.js
----------------------------------------------------------------------------------------------------
 (c) Olli Kekäläinen




 Rev 1.0.6
 ----------
 	Fixed a bug that prevented multiple server instances in the same directory from starting
 	by using different ports when using the same options file. The server now checks - when 
 	opening the pulse file - the port 	number using the server's port getter property instead 
 	of reading it from the initialization option's port/sslPort property. After the fix 
 	the port/sslPort getter can be successfully overwritten in the server class extending 
 	the OKServer class.


Rev 1.0.5
----------

	Added CORS functionality to the server.
 

Rev 1.0.4
----------

	Fixed an issue with the api extension that occurred when node.js loaded the api module 
	more than once.


Rev 1.0.3
----------

	-	Added property OKServer.defaultDirectoryName
	-	Added property OKServer.root
	-	Changed method OKServer.addVirtualDirectory(params) - Added two new properties 
		to the param parameter: defaultDocument and parent.
	-	Deprecated method OKServer.isForbidden()
	-	Deprecated method OKServer.isPermitted()
	-	Added property VirtualDirectory.server
	-	Added property VirtualDirectory.parent
	-	Added property VirtualDirectory.defaultDocument
	-	Changed property RequestContext.path - Returns same value as RequestContext.pathName. 
		Does not add the default document in the end of the path anymore.
	-	Added property RequestContext.physicalPath
	-	Added method RequestContext.isForbidden()
	-	Changed FileRequestHandler class - It is now responsible for handling of 
		the defaultDocument.


Rev 1.0.2
----------

	Bug fix in Cmds.exec() method on server/helper.js.


Rev 1.0.1
----------

	OKServer.addVirtualDirectory() now returns a string value that indicates the success 
	of the action.




 20221004
----------------------------------------------------------------------------------------------------
*/
"use strict";

const helper = require( "./server/helper.js" );
const clparser = require( "clparser" );
const PrimalServer = require("./server/primal-server");
const okserver = {};

module.exports = okserver;

class OKServer extends PrimalServer {
	constructor(options) {
		const optionsInFile = readOptionsSync( 
			(error) => { console.log(error);}, 
			options.optionsFile,
			okserver.defaultOptions
		);
		options = solveEnvVars( Object.assign( okserver.defaultOptions, optionsInFile, options ));
		clparser.isSwitch("initServerOptions") && process.exit(0);
		options.logFolder && helper.logToFile({ folder: helper.platformize(options.logFolder)});
		super(options);
	}

	onApiApi( onError, onSuccess, context, iface ) {
		onSuccess(iface);					
	}

	onApiGetConfig( onError, onSuccess, context, config ) {
		config.apiUrl = this._solveApiUrl( context );
		onSuccess( config );					
	}

	start( params={}) {
		try {
			params.onError = params.onError||((error) => { this._handleError(error);})
			params.onSuccess = params.onSuccess||(()=>{ console.log("Server started");});
			const q = helper.queue();
			q.add(
				() => {
					this._startPulse( params.onError, q.next());
				},
				() => {
					const commands = { 
						stop: (params) => { 
							this.stop(() => { setTimeout( ()=>{ process.exit(0);}, 1000 );})
						}
					};
					this.cmds = helper.newCmds({ interval: 1000, commands: commands });
					this.cmds.start( params.onError, q.next());
				},
				() => {
					super.start( params );
				}
			).proceed();
		} 
		catch (error) {
			// ensuring (coding) error writing to the log file.
			console.log(error);
			setTimeout( () => { throw error; }, 1000 );
		}
	}

	stop( onStop ) {
		this.cmds && this.cmds.stop();
		this.pulse && this.pulse.stop();
		super.stop( onStop );
		this.options.logFolder && helper.logToFile(); // killing the log timer...
	}

	_startPulse( onError, onSuccess ) {
		if (this.options.pulseFolder) {
			const filename = "pulse-" + (this.port||this.sslPort) + ".json";
			this.pulse = helper.newPulse({ 
				interval: this.options.pulseInterval||1000, 
				filename: helper.platformize( this.options.pulseFolder + "/" + filename )
			});
			this.pulse.isBeating( onError, (beating) => {
				if (beating) {
					process.exit(0);
				}
				else if (this.options.pulseFolder) {
					this.pulse.start( onError, onSuccess );
				}
			});	
		}
		else {
			onSuccess();
		}
	}

	_handleError( error ) {
		console.log(error);
		this.stop(() => { setTimeout( () => { process.exit(0); }, 1700 ); });
	}

	_solveApiUrl( context ) {
		if (this.sslPort) {
			let host = context.httpRequest.headers.host.split(":")[0];
			return "https://" + host + ":" + this.sslPort + "/" + this.apiEntryPoint;
		}
		return;
	}

}

//--------------------------------------------------------------------------------------------------

okserver.OKServer = OKServer;

okserver.defaultOptions = {
    accessFiltering: [],
	apiEntryPoint: "api",
	apiExtensions: [
		helper.platformize( __dirname + "/examples/server/api-example")
	],
	defaultDirectory: helper.platformize( __dirname + "/examples/site" ),
    defaultDocument: "index.htm",
    httpsOptions: {
        "pfx": "%OKSERVER_PFX%",
        "passphrase": "%OKSERVER_PHRASE%"
    },
    logApiRequests: false,
    logFileRequests: false,
    mimeTypes: { // additional mimetypes (extension: mimetype)
    },
	port: 3002,
	pulseInterval: 1000,
	readinessTimeout: 10000,
	sslPort: 0,	// 0: no https support
    virtualDirectories: {},
    cors: {
    	allowCredentials: false,
    	allowHeaders: "authorization, content-type, x-requested-with",
    	allowOrigin: "*",
    	exposeHeaders: "",
    	maxAge: 7200
    }
};

okserver.defineApiRequest = (definition) => {
	require( "./server/api" ).add(definition);
};

okserver.RequestHandler = require( "./server/requesthandler" ).RequestHandler;

okserver.createServer = ( options = {}) => {
	const Server = options.serverClass || OKServer;
	return new Server(options);
};

//--------------------------------------------------------------------------------------------------

function readOptionsSync( onError, optionsFile, defaultOptions ) {
	if (optionsFile) {
		if (clparser.isSwitch("initServerOptions")) {
			helper.jsonWriteSync( onError, optionsFile, defaultOptions );
			return defaultOptions;
		}
		else {
			return helper.jsonReadExSync( onError, optionsFile, defaultOptions );
		}
	}
	return {};
}

function solveEnvVars(source) {
	const target = Object.assign( Array.isArray(source) ? []: {}, source);
	for (let property in target) {
		if (typeof target[property] == "object") {
			target[property] = solveEnvVars(target[property]);
		}
		else if(typeof target[property] == "string") {
			target[property] = helper.renderEnvVars(target[property]);
		}
	}
	return target;
}
