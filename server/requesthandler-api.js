/*
-----------------------------------------------------------------------------------------
 requesthandler-api.js
-----------------------------------------------------------------------------------------
 (c) Olli Kekäläinen

 

 

  20190503
----------------------------------------------------------------------------------------
*/

"use strict";

const api = require( "./api.js" );
const RequestHandler = require( "./requesthandler" ).RequestHandler;

class ApiRequestHandler extends RequestHandler {

	constructor(params) {
		params.name = "api";
		super(params);
		this.iface = undefined;
		this.originalNames = {};
		this.regularFunction = {};
	}

	get logRequests() {
		return this.server.logApiRequests;
	}

	newErrorResponse( params ) {
		return {
			succeed: false,
			requestName: params.requestName,
			error: {
				code: params.code,
				message: params.message,
			},
			elapsed: params.started ? new Date().getTime() - params.started : undefined
		};
	}

	newResponse( params ) {
		return {
			succeed: true,
			requestName: params.requestName,
			content: params.content == undefined ? "" : params.content,
			elapsed: params.started ? new Date().getTime() - params.started : undefined
		};
	}

	onRequest( context ) {
		let json;
		let content = "";

		if (context.request.method != "POST") {
			this.sendResponse( context, {
				status: 405,
				headers: { "Allow": "POST" }
			});
			return;
		}

		if (this._solveContentType(context.request)!=="application/json") {
			this.sendResponse( context, { status: 415 });
			return;
		}

		context.request.on( "data", (chunk) => { content += chunk.toString(); });
		context.request.on( "end", () => {
			try {
				json = JSON.parse( content );
			}
			catch( error )  {
				this.sendResponse( context, { status: 400 });
				json = undefined;
			}
			if (json) {
				this._handle({
					onError: (error) => { this._sendResponse( context, { body: error });},
					onSuccess: (result) => { this._sendResponse( context, { body: result });},
					context: context,
					apiRequest: json
				});
			}
		});
	}

	_ensureSpecs() {
		if (!this.iface) {
			this.iface = api.iface;
			for (let name in this.iface) {
				this.originalNames[name.toLowerCase()] = name;
				this.regularFunction[name] = this.iface[name].worker.toString().trim().substr(0,8) == "function";
			}
		}
	}

	_handle( params ) {
		this._ensureSpecs();
		let requestName = params.apiRequest.name;
		this.logRequests
			&& console.log( 
				(params.context.request ? this.server.getRemoteIp( params.context.request ) : "") 
				+ " Request: " + requestName 
			);
		let started = new Date().getTime();
		this._validateRequest(
			params.onError,
			() => {
				requestName = this.originalNames[requestName.toLowerCase()];
				try {	
					const context = new Context( 
						this,
						requestName,
						(error) => { 
							console.log(error); 
							params.onError( this.newErrorResponse({
								requestName: requestName,
								code: !error ? "E_UNKNOWN" : (error.code||error.message),
								message: (!error ? "" : error.message)||"Unknown error",
								started: started
							}));
						},
						(content) => { 
							params.onSuccess( this.newResponse({
								requestName: requestName,
								content: content,
								started: started
							}));
						}, 
						params
					);
					this.regularFunction[requestName]
						? this.iface[requestName].worker.call(context,context)
						: this.iface[requestName].worker(context);
				}
				catch (error) {
					console.log(error);
					params.onError( this.newErrorResponse({
						requestName: requestName,
						code: "E_SYSTEM",
						message: "Internal server error. Details written in the server's log file.",
						started: started
					}));
				}
			}, 
			requestName, 
			params.apiRequest.parameters, 
			started 
		);
	}

	_solveContentType(httpRequest) {
		if (httpRequest.headers["content-type"]) {
			return httpRequest.headers["content-type"].split(";")[0];
		}
		return;
	}

	_validateRequest( onError, onSuccess, requestName, parameters, started ) {
		if (requestName) {
			const _requestName = requestName.toLowerCase();
			if (this.originalNames[_requestName]) {
				requestName = this.originalNames[_requestName];
				let p, name, missing = [], invalid = [];
				for (name in this.iface[requestName].parameters) {
					p = this.iface[requestName].parameters[name];
					if (p.mandatory && parameters[name] == undefined) {
						missing.push(name);
					}
					else if (!p.mandatory && parameters[name] == undefined) {
						parameters[name] = p.default;
					}
					else if (typeof parameters[name] !== p.type) {
						invalid.push[name];
					}
				}
				if (missing.length || invalid.length) {
					let info = "";
					if (missing.length) {
						info += "missing parameter(s): ";
						missing.forEach((name,index)=>{info += (index?",":"")+" '"+name+"'" });
					}
					if (invalid.length) {
						info += (missing.length?" " :"") + "invalid parameter value(s): ";
						invalid.forEach((name,index)=>{info += (index?",":"")+" '"+name+"'" });
					}
					onError( this.newErrorResponse({
						code: "E_INVALIDREQUESTPARAMETERS", 
						message: "Invalid request '" + requestName + "' (" + info + ")",
						started: started					
					}));
				}
				else {
					onSuccess();
				}
			}
			else {
				onError( this.newErrorResponse({
					code: "E_INVALIDREQUESTNAME", 
					message: "Invalid request name '" + requestName + "'",
					started: started					
				}));
			}
		}
		else {
			onError( this.newErrorResponse({
				code: "E_NOREQUESTNAME", 
				message: "No requestname",
				started: started					
			}));
		}
	}

	_sendResponse( context, params ) {
		params.headers = {};
		if (typeof params.body !== "string") {
			params.body = JSON.stringify( params.body );
		}
		params.headers["Pragma"] = "no-cache";
		params.headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
		params.headers["Expires"] = 0;
		params.headers["Access-Control-Allow-Origin"] = "*";
		params.headers["Content-Type"] = "application/json; charset=utf-8";
		params.headers["Content-Length"] = Buffer.from( params.body ).length;
		this.sendResponse( context, params );
	}
}

class Context {
	constructor( requestHandler, requestName, onError, onSuccess, params ) {
		this.started = new Date().getTime();
		this.requestHandler = requestHandler;
		this.server = requestHandler.server;
		this.onError = onError;
		this.onSuccess = onSuccess;
		this.requestName = requestName;
		this.request = params.apiRequest;
		this.requestContext = params.context;
	}

	get cookies() {
		return this.requestContext.cookies;
	}
	
	get httpRequest() {
		return this.requestContext.request;
	}

	get httpResponse() {
		return this.requestContext.response;
	}

}

module.exports = ApiRequestHandler;


