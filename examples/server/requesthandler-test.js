/*
-----------------------------------------------------------------------------------------
 requesthandler-test.js
-----------------------------------------------------------------------------------------
 (c) Olli Kekäläinen

 
	


 

 20190329
-----------------------------------------------------------------------------------------
*/

"use strict";

const fs = require("fs");
const path = require("path");
const RequestHandler = require("ok-server").RequestHandler;

class TestRequestHandler extends RequestHandler {

	constructor (params = {}) {
		params.name = "test";
		super(params);
	}

	onRequest( context ) {

		const filename = decodeURI( path.join( context.virtualDirectory.path, context.path ));

		this.options.logFileRequests 
			&& console.log( this.getRemoteIp(context.request) + " " + context.request.url + " -> " + filename );

		const responseHeaders = {};
		const responseBody = "You tried to get file '" + context.path + "'";

		responseHeaders['Content-Type'] = "text/plain";
		responseHeaders['Content-Length'] = responseBody.length;
		responseHeaders["Access-Control-Allow-Origin"] = "*";
		
		this.sendResponse( context, {
			status: 200,
			headers: responseHeaders,
			body: responseBody
		});
	}

}

module.exports = TestRequestHandler;

// url: Url object

