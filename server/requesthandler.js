/*
-----------------------------------------------------------------------------------------
 requesthandler.js
-----------------------------------------------------------------------------------------
 (c) Olli Kekäläinen

 
 	Module:
		requesthandler.getHandler(name) -> RequestHandler
		requesthandler.RequestHandler -> class RequestHandler
	
	class RequestHandler

		Initialization:
			new RequestHandler(params)
				params  object
					server 	PrimalServer
					name 	string

		Properties:

			options -> object
			server -> PrimalServer

		Methods: 

			getRemoteIp( httpRequest ) -> string

			sendResponse( params )
				params.response 	HttpResponse
				params.status		number, default: 200
				params.headers 		objects, default: {}
				params.body	 		string/readableStream, default ""

			setCookie( response, array:Cookie )
				Cookie properties:
					name 		string, mandatory
					value 		string, default: ""
					path  		string, default: "/"
					domain 		string
					expires 	Date
					maxAge 		number
					httpOnly 	boolean
					secure 		boolean

			solveMimeName(extension) -> ContentType string

			onRequest(params)
				params:
				   request: httpRequest object
				   response: httpResponse object
				   virtualDirectory: VirtualDirectory object
				   path: string
	               url: Url object
	               cookies: object
			
			decodeURI(uri) -> string
 
			_register( handlerName )


 20190503
-----------------------------------------------------------------------------------------
*/

"use strict";
const requesthandler = {};
const HANDLERS = {};

class RequestHandler {
	constructor(params={}) {
		this.server = params.server;
		if (params.name) {
			this.name = params.name;
			this._register(params.name);	
		} 
	}

	get options() {
		return this.server.options;
	}

	getRemoteIp(request) {
		return this.server.getRemoteIp(request);
	}

	sendResponse( context, params ) {
		// context 				RequestContext
		// params.status		number, default: 200
		// params.headers 		objects, default: {}
		// params.body	 		string/readableStream, default: undefined
		this.server._sendResponse( context, params );
	}

	setResponseCookie( response, cookies, encoder ) {
		this.server.setResponseCookie( response, cookies, encoder );
	}

	solveMimeName(ext) {
		return this.server._solveMimeName(ext);
	}

	onRequest(context) {
	}

	decodeURI(uri) {
		return decodeURI(uri.replace( /%23/g, "#" ));
	}

	_register(name) {
		__register(name,this);
		return this;
	}
}

requesthandler.RequestHandler = RequestHandler;

requesthandler.getHandler = (name) => {
	return HANDLERS[name];
};

function __register( name, handler ) {
	HANDLERS[name] = handler;
}

module.exports = requesthandler;
