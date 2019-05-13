/*
-----------------------------------------------------------------------------------------
 requesthandler.js
-----------------------------------------------------------------------------------------
 (c) Olli Kekäläinen

 



 20190513
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
