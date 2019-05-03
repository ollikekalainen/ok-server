/*
----------------------------------------------------------------------------------------------------
 ok-server.js
----------------------------------------------------------------------------------------------------
 (c) Olli Kekäläinen

	okserver.createServer() -> OKServer
	okserver.createServer( options ) -> OKServer

		Options:

		    accessFiltering: array, contains filter objects
				{
					path: string,
					status: string ("forbidden"|"permitted")
				}

			apiEntryPoint		string, default: "api",
			apiExtensions		array, default: []
			defaultDirectory    string, default: __dirname + "/examples/site"
		    defaultDocument     string, default: "index.htm"
		    httpsOptions 		object, default: {
		     		   					pfx: "%LANNS_PFX%",
		        						passphrase: "%LANNS_PHRASE%"
		    						}
		    logApiRequests 		boolean
		    logFileRequests 	boolean
			mimeTypes:          object, { <extenstion1>: <type:string>, ..., <extenstionN>: <type:string> }
									default: {
												".css": "text/css; charset=utf-8",
												".htm": "text/html; charset=utf-8",
												".html": "text/html; charset=utf-8",
												".js": "application/javascript; charset=utf-8",
												".json": "application/json; charset=utf-8",
												".txt": "text/plain; charset=utf-8"
											}
			optionsFile         string, default: __dirname + "options.js"
			port                number, default: 3002
			pulseFolder 		string, if not set, pulse does not start
			pulseInterval		number, default: 1000
			serverClass 		default: OKServer
			sslPort             number, default: 0
		    virtualDirectories  object, {
		        				   			<name>: { "path": <path:string>, handler: <handlername:string> }
		    							}


		Command line parameters

			/initServerOptions

		OKServer

			Properties:

			Methods:

				onGetConfig( onError, onSuccess, context )

				start( onError, onSuccess )
					onError
					onSuccess

				stop( onStop )


	okserver.defineApiRequest({ 
		name: <string>, 
		parameters: {
			<parametername(1)>: {
				type: <string:"string"|"number"|"boolean"|"object">,
				[mandatory: <boolean>,]
				[default: <string|number|boolean|object>]
			},
			...,
			<parametername(n)>: {
				type: <string:"string"|"number"|"boolean"|"object">,
				[mandatory: <boolean>,]
				[default: <string|number|boolean|object>]
			}

		},
		worker: <function>
	});

	okserver.defaultOptions     object
	okserver.OKServer 			class
	okserver.RequestHandler 	class


 20190503
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

	start( onError, onSuccess ) {
		const q = helper.queue();
		onError = onError||((error) => { this._handleError(error);})
		q.add(
			() => {
				this._startPulse( onError, q.next());
			},
			() => {
				const commands = { 
					stop: (params) => { 
						this.stop(() => { setTimeout( ()=>{ process.exit(0);}, 1000 );})
					}
				};
				this.cmds = helper.newCmds({ interval: 1000, commands: commands });
				this.cmds.start( onError, q.next());
			},
			() => {
				super.start( onError, onSuccess || (()=>{ console.log("Server started");}));
			}
		).proceed();
	}

	stop( onStop ) {
		this.cmds && this.cmds.stop();
		this.pulse && this.pulse.stop();
		super.stop( onStop );
		this.options.logFolder && helper.logToFile(); // killing the log timer...
	}

	_startPulse( onError, onSuccess ) {
		if (this.options.pulseFolder) {
			const filename = "pulse-" + (this.options.port||this.options.sslPort) + ".json";
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
        "pfx": "%LANNS_PFX%",
        "passphrase": "%LANNS_PHRASE%"
    },
    logApiRequests: false,
    logFileRequests: false,
    mimeTypes: { // additional mimetypes (extension: mimetype)
    },
	port: 3002,
	pulseInterval: 1000,
	readinessTimeout: 10000,
	sslPort: 0,	// 0: no https support
    virtualDirectories: {}
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
