/*
-----------------------------------------------------------------------------------------
 requesthandler-file.js
-----------------------------------------------------------------------------------------
 (c) Olli Kekäläinen

 
	


 

  20190503
----------------------------------------------------------------------------------------
*/

"use strict";

const fs = require("fs");
const path = require("path");
const RequestHandler = require( "./requesthandler" ).RequestHandler;

class FileRequestHandler extends RequestHandler {

	constructor (params = {}) {
		params.name = "default";
		super(params);
	}

	onRequest( context ) {

		const vname =  context.virtualDirectory.name;
		const vpath =  context.virtualDirectory.path;
		const offset = vname.length+Number(vname!=="/");
		const filename = __decodeURI( path.join( vpath, context.path.substr( offset )));

		this.options.logFileRequests 
			&& console.log( this.getRemoteIp(context.request) + " " + context.request.url + " -> " + filename );

		if (context.request.method != 'GET') {
			this.sendResponse( context, { status: 405, headers: { 'Allow': 'GET' }});
			return;
		}

		this.supplyFile( filename, context );
	}

	supplyFile( filename, context ) {

		const contentType = this.solveMimeName(path.extname(filename));
		if (!contentType || !fs.existsSync(filename)) {
			this.sendResponse( context, { status: 404 });
			return;
		}
		const responseHeaders = {};
		const stat = fs.statSync(filename);
		if (stat.isDirectory()) {
			this.sendResponse( context, { status: 403 });
			return;
		}

		const rangeRequest = this._readRangeHeader( context.request.headers["range"], stat.size );
		if (!rangeRequest) {
			responseHeaders["Content-Type"] = contentType;
			responseHeaders["Content-Length"] = stat.size;
			responseHeaders["Accept-Ranges"] = "bytes";
			responseHeaders["Access-Control-Allow-Origin"] = "*";
			this.sendResponse( context, { 
				status: 200, 
				headers: responseHeaders, 
				body: fs.createReadStream(filename)
			});
			return;
		}

		const start = rangeRequest.start;
		const end = rangeRequest.end;

		if (start >= stat.size || end >= stat.size) {
			responseHeaders["Content-Range"] = "bytes */" + stat.size;
			this.sendResponse( context, { status: 416, headers: responseHeaders }); 
			return;
		}

		responseHeaders["Content-Range"] = "bytes " + start + "-" + end + "/" + stat.size;
		responseHeaders["Content-Length"] = start == end ? 0 : (end - start + 1);
		responseHeaders["Content-Type"] = contentType;
		responseHeaders["Accept-Ranges"] = "bytes";
		responseHeaders["Cache-Control"] = "no-cache";
		responseHeaders["Access-Control-Allow-Origin"] = "*";

		this.sendResponse( context, { 
			status: 206, 
			headers: responseHeaders, 
			body: fs.createReadStream(filename, { start: start, end: end })
		});

	}

	_readRangeHeader( range, totalLength ) {
		let result;
		if (typeof range == "string" && range.length > 0) {

			const a = range.split(/bytes=([0-9]*)-([0-9]*)/);
			const start = parseInt(a[1]);
			const end = parseInt(a[2]);

			result = {
				start: isNaN(start) ? 0 : start,
				end: isNaN(end) ? (totalLength - 1) : end
			};

			if (!isNaN(start) && isNaN(end)) {
				result.start = start;
				result.end = totalLength - 1;
			}

			if (isNaN(start) && !isNaN(end)) {
				result.start = totalLength - end;
				result.end = totalLength - 1;
			}
		}
		return result;
	}
}

module.exports = FileRequestHandler;

function __decodeURI(uri) {
	return decodeURI(uri.replace( /%23/g, "#" ));
}
