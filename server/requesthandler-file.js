/*
-----------------------------------------------------------------------------------------
 requesthandler-file.js
-----------------------------------------------------------------------------------------
 (c) Olli Kekäläinen

 
	


 

  20211103
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

		this.options.logFileRequests 
			&& console.log( this.getRemoteIp(context.request) + " " + context.request.url + " -> " + context.physicalPath );

		if (context.request.method != 'GET') {
			this.sendResponse( context, { status: 405, headers: { 'Allow': 'GET' }});
			return;
		}

		this.supplyFile( context );
	}

	supplyFile( context ) {

		const responseHeaders = {};
		const request = context.request;
		let filename = context.physicalPath;

		if (!fs.existsSync(filename)) {
			this._sendResponse( context, { status: 404 });
			return;
		}

		if (context.pathName[context.pathName.length-1] == "/") {
			const stat = fs.statSync( filename[filename.length-1] == path.sep 
				? filename.substr( 0, filename.length-1 ) 
				: filename 
			);
			if (stat.isDirectory()) {
				if (context.virtualDirectory.defaultDocument) {
					// filename += context.virtualDirectory.defaultDocument;
					filename = path.join( filename, context.virtualDirectory.defaultDocument );
					if (!fs.existsSync(filename)) {
						this._sendResponse( context, { status: 403.14 });
						return;
					}
				}
				else {
					this._sendResponse( context, { status: 403.14 });
					return;
				}
			}
			else {
				this._sendResponse( context, { status: 404 });
				return;
			}
		}
		else {
			const stat = fs.statSync(filename);
			const protocol = (request.connection && request.connection.encrypted) ? "https" : "http";
			if (stat.isDirectory()) {
				this._sendResponse( context, { 
					headers: { Location: protocol + "://" + request.headers.host + request.url + "/" }, 
					status: 301 
				});
				return;
			}
		}

		const contentType = this.solveMimeName(path.extname(filename));
		if (!contentType) {
			this._sendResponse( context, { status: 404.3 });
			return;
		}

		const stat = fs.statSync(filename);
		const rangeRequest = this._readRangeHeader( context.request.headers["range"], stat.size );
		if (!rangeRequest) {
			responseHeaders["Content-Type"] = contentType;
			responseHeaders["Content-Length"] = stat.size;
			responseHeaders["Accept-Ranges"] = "bytes";
			// responseHeaders["Access-Control-Allow-Origin"] = "*";
			this._sendResponse( context, { 
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
			this._sendResponse( context, { status: 416, headers: responseHeaders }); 
			return;
		}

		responseHeaders["Content-Range"] = "bytes " + start + "-" + end + "/" + stat.size;
		responseHeaders["Content-Length"] = start == end ? 0 : (end - start + 1);
		responseHeaders["Content-Type"] = contentType;
		responseHeaders["Accept-Ranges"] = "bytes";
		responseHeaders["Cache-Control"] = "no-cache";
		// responseHeaders["Access-Control-Allow-Origin"] = "*";

		this._sendResponse( context, { 
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

	_sendResponse( context, params = {} ) {
		params.headers = params.headers||{};
		this.sendResponse( context, params );
	}
}

module.exports = FileRequestHandler;

