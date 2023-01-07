/*
-----------------------------------------------------------------------------------------
 primal-server.js
-----------------------------------------------------------------------------------------
 (c) Olli Kekäläinen

	
 

 

 20211103
-----------------------------------------------------------------------------------------
*/
"use strict";

const http = require("http");
const fs = require("fs");
const requesthandler = require("./requesthandler.js");

class PrimalServer {
	constructor(options) {
		this.virtualDirectories = {};
		this.forbiddenPaths = [];
		this.permittedPaths = [];
		this._servers = { http: undefined, https: undefined };
		this.options = options;
		this._mimeTypes = Object.assign({
			".css": "text/css; charset=utf-8",
			".htm": "text/html; charset=utf-8",
			".html": "text/html; charset=utf-8",
			".bmp": "image/bmp",
			".gif": "image/gif",
			".jpeg": "image/jpeg",
			".jpg": "image/jpeg",
			".png": "image/png",
			".pnz": "image/png",
			".tif": "image/tiff",
			".tiff": "image/tiff",
			".pfd": "application/pdf",
			".js": "application/javascript; charset=utf-8",
			".json": "application/json; charset=utf-8",
			".txt": "text/plain; charset=utf-8"
		}, this.options.mimeTypes||{});
		this._initDefaultHandlers();
		this.extendApi( this.apiExtensions );
	}

	get apiEntryPoint() {
		return this.options.apiEntryPoint||"api";
	}

	set apiEntryPoint(value) {
		this.options.apiEntryPoint = value;
		this._resetApiRequestHandler();
		return value;
	}

	get apiExtensions() {
		if (!this.options.apiExtensions) {
			this.options.apiExtensions = [];
		}
		return this.options.apiExtensions;
	}

	get cors() {
		return this.options.cors||{};
	}

	get corsAllowCredentials() {
		return this.cors.allowCredentials||false;
	}

	get corsAllowHeaders() {
		return this.cors.allowHeaders||"authorization, content-type, x-requested-with";
	}

	get corsAllowOrigin() {
		return this.cors.allowOrigin||"*";
	}

	get corsExposeHeaders() {
		return this.cors.exposeHeaders||"";
	}

	get corsMaxAge() {
		return this.cors.maxAge||7200;
	}

	get defaultDirectory() {
		return this.options.defaultDirectory;
	}

	set defaultDirectory(value) {
		this.options.defaultDirectory = value;
		this._resetRoot();
		return value;
	}

	get defaultDirectoryName() {
		return this.options.defaultDirectoryName||"/";
	}

	set defaultDirectoryName(value) {
		if (value !== this.options.defaultDirectoryName) {
			this.options.defaultDirectoryName = value;
			this._resetRoot();
		}
		return value;
	}

	get defaultDocument() {
		return this.options.defaultDocument||"index.htm";
	}

	set defaultDocument(value) {
		this.options.defaultDocument = value;
		return value;
	}

	get httpServer() {
		return this._servers.http;
	}

	get httpsOptions() {
		if (!this.options.httpsOptions) {
			this.options.httpsOptions = {};
		}
		return this.options.httpsOptions||{};
	}

	get httpsServer() {
		return this._servers.https;
	}

	get logApiRequests() {
		return !!this.options.logApiRequests
	}

	set logApiRequests(value) {
		this.options.logApiRequests = value;
		return value;
	}

	get logFileRequests() {
		return !!this.options.logFileRequests
	}

	set logFileRequests(value) {
		this.options.logFileRequests = value;
		return value;
	}

	get mimeTypes() {
		return this._mimeTypes;
	}

	get port() {
		return this.options.port||0;
	}

	set port(value) {
		this.options.port = value;
		return value;
	}

	get root() {
		for (let fullname in this.virtualDirectories) {
			if (this.virtualDirectories[fullname].isRoot()) {
				return this.virtualDirectories[fullname];
			}
		}
		return;
	}

	get sslPort() {
		return this.options.sslPort||0;
	}

	set sslPort(value) {
		this.options.sslPort = value;
		return value;
	}

	addForbiddenPath( path ) {
		const MS = require("path").sep == "\\";
		MS && (path = path.toLowerCase());
		this.forbiddenPaths.indexOf(path) >= 0 || this.forbiddenPaths.push(path);
		return this;
	}

	addMimeType( ext, type ) {
		const _solve = x=>x[0]=="."?x:"."+x;
		if (typeof ext == "object") {
			for (let _ext in ext) {
				this.mimeTypes[_solve(_ext)] = ext[_ext];
			}
		}
		else {
			this.mimeTypes[_solve(ext)] = type;
		}
		return this;
	}

	addPermittedPath( path ) {
		const MS = require("path").sep == "\\";
		MS && (path = path.toLowerCase());
		this.permittedPaths.indexOf(path) >= 0 || this.permittedPaths.push(path);
		return this;
	}

	addVirtualDirectory( params = {}) {
		params.name = params.name||"/";
		if (params.path && !__exists(params.path)) {
			return "E_PATHNOTFOUND";
		}
		else if (typeof params.parent == "object" && this.getVirtualDirectory( params.name, params.parent )) {
			return "E_ALREADYEXISTS";
		}
		else {
			params.server = this;
			params.defaultDocument = params.defaultDocument||this.defaultDocument; 
			const v = new VirtualDirectory(params);
			if (!v.handler) {
				return "E_UNKNOWNHANDLER";
			}
		}
		return "OK";
	}

	extendApi(apiExtension) {
		require( "./api" ).extend(apiExtension);
		return this;
	}

	getRemoteIp( request ) {
	    let ip = request.headers["x-forwarded-for"] ||
	        (request.connection && request.connection.remoteAddress) ||
	        (request.socket && request.socket.remoteAddress) ||
	        (request.connection && request.connection.socket && request.connection.socket.remoteAddress) ||
	        "";
	    ip = ip.split(",")[0];
	    ip = ip.split(":").slice(-1)[0];
	    return ip == "1" ? "127.0.0.1" : ip;
	}

	getVirtualDirectory( name, parent ) {
		const fullname = this._solveVDNamePar( name, parent );
		return this.virtualDirectories[fullname];
	}

	getVirtualDirectoryPath( name, parent ) {
		const fullname = this._solveVDNamePar( name, parent );
		return this.virtualDirectories[fullname] ? this.virtualDirectories[fullname].path : undefined;
	}

	isForbidden(url) {
		console.log( "**** Method Server.isForbidden() is deprecated ****" );
		return false;
	}

	isPermitted(url) {
		console.log( "**** Method Server.isPermitted() is deprecated ****" );
		return true;
	}

	loadHandler( _module ) {
		try {
			const HandlerClass = typeof _module == "string" ? require(_module) : _module;
			new HandlerClass({ server: this });
		}
		catch (error) {
			console.log(error);
		}
		return this;
	}

	onApiApi( onError, onSuccess, context, iface ) {
		onSuccess(iface);					
	}

	onApiGetConfig( onError, onSuccess, context, config ) {
		onSuccess( config );					
	}

	onHttpReady() { 
		// Overwrite this in child class. Will be called after the httpServer is ready to listen.
	}

	onHttpsReady() {
		// Overwrite this in child class. Will be called after the httpsServer is ready to listen.
	}

	onOptions( context ) {
		const headers = context.request.headers["access-control-request-headers"];
		const method = context.request.headers["access-control-request-method"];
		const setHeader = (header,value) => context.response.setHeader( header, value );
		if (headers == undefined || method == undefined) {
			// Not a CORS preflight request
			context.response.statusCode = 204;
			setHeader( "Allow", "POST, GET, OPTIONS" );
		}
		else {
			const allowedOrigin = context.solveAllowedOrigin();
			if (allowedOrigin && headers.trim().length && method.trim().length) {
				setHeader( "Access-Control-Allow-Origin", allowedOrigin );
				setHeader( "Access-Control-Allow-Headers", this.corsAllowHeaders );
				setHeader( "Access-Control-Allow-Methods", "POST, GET, OPTIONS" );
				setHeader( "Access-Control-Max-Age", "" + this.corsMaxAge );
				this.corsExposeHeaders && setHeader( "Access-Control-Expose-Headers", this.corsExposeHeaders );
				this.corsAllowCredentials && setHeader( "Access-Control-Allow-Credentials", "true" );
			}
			else {
				// Not supported CORS preflight request (headers)
				setHeader( "Content-Type", "text/html; charset=utf-8" ); // this invalidates CORS request
			}
		}
	}

	onRequest(context) { 
	}

	onResponse( context, params ) { 
	}

	removeMimeType( ext ) {
		const _solve = x=>x[0]=="."?x:"."+x;
		delete this.mimeTypes[_solve(ext)];
		return this;
	}

	setResponseCookie( response, cookie = [], encoder = encodeURIComponent ) {
		const cookies = [];
		(Array.isArray(cookie)?cookie:[cookie]).forEach((cookie) => {
			const cs = stringifyCookie( cookie, encoder );
			cs && cookies.push(cs);
		});
		response.setHeader( "Set-Cookie", cookies );
		return this;
	}

	start( params={}) {
		try {
			const onError = params.onError||(()=>{});
			const onSuccess = params.onSuccess||(()=>{});

			if (!__exists( this.defaultDirectory)) {
				onError( new Error("E_INVALIDDEFAULTDIRECTORY: " + this.defaultDirectory ));
				return this;
			}

			this._resetRoot();
			this._resetApiRequestHandler();

			if (typeof this.options.virtualDirectories == "object") {
				for (let name in this.options.virtualDirectories) {
					let success = this.addVirtualDirectory({ 
						name: name, 
						path: this.options.virtualDirectories[name].path, 
						defaultDocument: this.options.virtualDirectories[name].defaultDocument,
						handlerName: this.options.virtualDirectories[name].handler||"default"
					});
					if (success == "E_PATHNOTFOUND") {
						onError( new Error("E_INVALIDVIRTUALPATH: " + this.options.virtualDirectories[name].path));
						return this;
					}
					if (success == "E_UNKNOWNHANDLER") {
						onError( new Error("E_UNKNOWNHANDLER: " + this.options.virtualDirectories[name].handler));
						return this;
					}
				}
			}

			this.addForbiddenPath( __dirname );
			this._createAccessFilteringRules();

			if (this.port || this.sslPort) {
				const readines = { isReady: () => {
					return (!this.port||!this.sslPort) || (readines.http && readines.https );
				}};
				if (this.port) {
					try {
						this._servers.http = http.createServer(( request, response ) => { 
							this._onRequest( request, response );
						}).on( "error", (error) => { this._handleStartError( onError, error );}
						).on( "listening", () => { 
							readines.http = true; 
							this.onHttpReady();
							readines.isReady() && onSuccess();
						});
						this.httpServer.listen( this.port );
						
					}
					catch (error) {
						onError(error);
					}
				}
				if (this.sslPort) {
					const https = require('https');
					const options = {};
				    if (this.httpsOptions.pfx) {
				    	options.pfx = fs.readFileSync(this.httpsOptions.pfx);
				    	options.passphrase = __exists(this.httpsOptions.passphrase) 
				    		? fs.readFileSync(this.httpsOptions.passphrase)
				    		: this.httpsOptions.passphrase;
				    }
				    else if (this.httpsOptions.key && this.httpsOptions.cert) {
				    	options.key = fs.readFileSync(this.httpsOptions.key);
				    	options.cert = fs.readFileSync(this.httpsOptions.cert);
				    }
				    else {
						onError( new Error("E_INVALIDHTTPSOPTIONS"));
				    }
					try {
						this._servers.https = https.createServer( options, (request, response) => {
							this._onRequest( request, response );
						}).on( "error", (error) => { this._handleStartError( onError, error, true );}
						).on( "listening", () => { 
							readines.https = true; 
							this.onHttpsReady();
							readines.isReady() && onSuccess();
						});
						this.httpsServer.listen( this.sslPort );
					}
					catch (error) {
						onError(error);
					}
				}
			}
			else {
				onError( new Error("E_NOSERVERPORT"));
			}
		} 
		catch (error) {
			// ensuring (coding) error writing to the log file.
			console.log(error);
			setTimeout( () => { throw error; }, 1000 );
		}
		return this;
	}

	stop( onStop = (()=>{}) ) {
		let serverCount = Number(!!this.httpServer) + Number(!!this.httpsServer);
		if (serverCount) {
			this.httpServer && this.httpServer.close(() => { --serverCount || onStop();});
			this.httpsServer && this.httpsServer.close(() => { --serverCount || onStop();});
		}
		else {
			onStop();
		}
		return this;
	}

	_createAccessFilteringRules() {
		let rules = this.options.accessFiltering||[];
		const sep = require("path").sep;
		rules.forEach((rule) => {
			if (rule.path) {
				let path = rule.path;
				let permitted = rule.status && rule.status[0] == "p";
				if (!(path.substr(0,1) ==  sep || path.substr(1,1) == ":")) {
					path = this.defaultDirectory +  sep + path;
				}
				permitted ? this.addPermittedPath(path) : this.addForbiddenPath(path);
			}
		});
	}

	_endResponse( httpResponse, content ) {
		if (!httpResponse.writableEnded) {
			httpResponse.end(content);
		}
		else {
			// This usually happens when the http response with the error info 
			// is sent after the httpResponse.end() method is already called.
			console.log( 
				"E_HTTPRESPONSE_ENDED_ALREADY - " + new Error().stack + "\n" 
				+ "Response content: " + content 
			);
		}
	}

	_handleStartError( onError, error, ssl ) {
		if (error.code == "EADDRINUSE") {
			const e = new Error(ssl ? "E_HTTPSPORTINUSE" : "E_HTTPPORTINUSE");
			e.code = "E_PORTINUSE";
			onError(e);
		}
		else {
			onError(error);
		}
	}

	_initDefaultHandlers() {
		this.loadHandler( "./requesthandler-file" ); 	// name: "default"
		this.loadHandler( "./requesthandler-api" ); 	// name: "api"
	}

	_onRequest( request, response ) {
		try {
			const context = new RequestContext( this, request, response );
			if (request.method == "OPTIONS") {
				this.onOptions(context);
				this._endResponse(response);
			}
			else if (context.isForbidden()) {
				console.log( this.getRemoteIp(request) + " FORBIDDEN: " + context.pathName );
				this._sendResponse( context, { status: 403 });
			}
			else {
				if (context.handler) {
					this.onRequest(context);
					context.handler.onRequest(context);
				}
				else {
					console.log( "SERVER ERROR: Virtual directory '" 
						+ context.virtualDirectory.name 
						+ "' does not have proper request handler (" 
						+ context.handlerName + ") loaded." 
					);
				}
			}
		} 
		catch (error) {
			// ensuring (coding) error writing to the log file.
			console.log(error);
			setTimeout( () => { throw error; }, 1000 );
		}
	}

	_resetApiRequestHandler() {
		this.addVirtualDirectory({ name: this.apiEntryPoint, handlerName: "api" });
	}
	
	_resetRoot() {
		this._removeRoot().addVirtualDirectory({ 
			name: this.defaultDirectoryName,
			path: this.defaultDirectory, 
			handlerName: "default",
			parent: false
		});
	}

	_removeRoot() {
		this.root && delete this.virtualDirectories[this.root.fullname];
		return this;
	}

	_sendResponse( context, params = {}) {

		// params.status		number, default: 200
		// params.headers 		objects, default: {}
		// params.body	 		string/readableStream, default: undefined

		const allowedOrigin = context.solveAllowedOrigin();
		params.status = params.status||200;
		params.headers = params.headers||{};
		allowedOrigin && (params.headers["Access-Control-Allow-Origin"] = allowedOrigin);
		this.onResponse( context, params );
		context.response.writeHead( params.status, params.headers );
		if (params.body == null || params.body == undefined) {
			this._endResponse( context.response );
		}
		else if (isReadable(params.body)) {
			params.body.on( "open", () => { params.body.pipe(context.response); });
		}
		else {
			this._endResponse( context.response, "" + params.body );
		}
	}

	_solveMimeName( ext ) {
		return this.mimeTypes[ext.toLowerCase()]; // || "application/octet-stream";
	}

	_solveVDNamePar( name, parent ) {
		if (!parent && name == "/") {
			return name;
		}
		else if (!parent && name == this.defaultDirectoryName) {
			return "/"+name;
		}
		parent = parent||this.root;
		return parent.fullname + (parent.fullname=="/"?"":"/") + name;
	}

	_solveVirtualDirecory(path) {
		let fullname;
		let names = path.replace( /\\/g, "/" ).split("/");
		while (names.length) {
			path = names.join("/")||"/";
			for (fullname in this.virtualDirectories) {
				if (path == fullname) {
					return this.virtualDirectories[fullname];
				}
			}
			names = names.slice(0,-1);	
		}
		return this.root;
	}
}

module.exports = PrimalServer;

// ---------------------------------------------------------------------------------------------

class VirtualDirectory {
	constructor( params ) {
		this.name = params.name||"/";
		this.path = params.path;
		this.handlerName = params.handlerName||"default";
		this.server = params.server;
		this.parent = params.parent;
		this.defaultDocument = params.defaultDocument;
		this.server.virtualDirectories[this.fullname] = this;
	}

	get fullname() {
		if (this.isRoot()) {
			return this.name == "/" ? this.name : "/" + this.name;
		}
		const fullname = this.parent.fullname;
		if (fullname == "/") {
			return "/" + this.name;
		}
		return fullname + "/" + this.name;
	}

	get handler() {
		return requesthandler.getHandler( this.handlerName );
	}

	get parent() {
		return this.isRoot() ? undefined : (this._parent || this.server.root);
	}

	set parent(value) {
		this._parent = value;
		return value;
	}

	isRoot() {
		return this._parent === false;
	}
}

class RequestContext {
	constructor( server, request, response ) {
		this.p = {
			server: server,
			request: request,
			response: response,
			cookies: parseCookies(request),
			url: require("url").parse( request.url, true, false ),
			origin: request.headers.origin
		};
		this.p.pathName = this._sanitize( this.url.pathname );
		this.p.virtualDirectory = this.server._solveVirtualDirecory(this.pathName);
	}
	
	get cookies() {
		return this.p.cookies;
	}

	get handler() {
		return this.p.virtualDirectory.handler;
	}

	get handlerName() {
		return this.p.virtualDirectory.handlerName;
	}

	get origin() {
		return this.p.origin;
	}

	get path() {
		return this.pathName; 
	}

	get pathName() {
		return this.p.pathName;
	}

	get physicalPath() {
		if (this.virtualDirectory.path == undefined) {
			return undefined;
		}
		if (!this.p.physicalPath) {
			const path = require("path");
			const offset = this.virtualDirectory.fullname == "/" ? 0 : this.virtualDirectory.fullname.length;
			// Changed 20221230: decodeURI function call removed - uri is decoded already in method _sanitize().
			this.p.physicalPath = path.join( this.virtualDirectory.path, this.pathName.substr( offset ).replace( /%23/g, "#" ));
		}
		return this.p.physicalPath;
	}

	get request() {
		return this.p.request;
	}

	get response() {
		return this.p.response;
	}

	get server() {
		return this.p.server;
	}

	get url() {
		return this.p.url;
	}

	get virtualDirectory() {
		return this.p.virtualDirectory;
	}

	isForbidden() {
		if (!this._isPermitted()) {
			const MS = require("path").sep == "\\";
			const path = MS ? this.physicalPath.toLowerCase() : this.physicalPath;
			return !!this.server.forbiddenPaths.find((forbiddenpath) => { 
				return path.substr( 0, forbiddenpath.length ) == forbiddenpath;
			});
		}
		return false;
	}

	setResponseCookie( cookie, encoder ) {
		this.server.setResponseCookie( this.response, cookie, encoder );
	}

	solveAllowedOrigin() {
		let allowed = false;
		this.server.corsAllowOrigin.split(",").forEach((origin) => {
			origin = origin.trim();
			if (!allowed && (origin == "*" || origin == this.origin)) {
				allowed = origin;
			}
		});
		return allowed;
	}

	_isPermitted() {
		if (this.virtualDirectory.path == undefined) { // api
			return true;
		}
		const MS = require("path").sep == "\\";
		const path = MS ? this.physicalPath.toLowerCase() : this.physicalPath;
		return !!this.server.permittedPaths.find((permittedpath) => { 
			return path.substr( 0, permittedpath.length ) == permittedpath;
		});
	}

	_sanitize(url) {
		const path = require("path");
		return path.normalize( decodeURI( url )).replace( /^(\.\.[\/\\])+/, "" ).replace( /\\/g, "/" );
	}
}

// ---------------------------------------------------------------------------------------------
function isReadable(o) {
	return typeof o == "object" && typeof o.read == "function";
}

function parseCookies( request ) {
 	let cookies = {};
	if (request.headers.cookie) {
		request.headers.cookie.split(';').forEach( (cookie) => {
		    let parts = cookie.split('=');
			let name = parts[0].trim();
		    cookies[name] = (parts[1]||"").trim();
		});
	}
	return cookies;
}

function stringifyCookie( cookie, encoder = encodeURIComponent )	{
	let cookieString = "";
	if (cookie.name) {
		cookieString = cookie.name+"="+encoder(cookie.value||"")+";"+(cookie.path||"/");
		if (typeof cookie.domain == "string") {
			cookieString += ";Domain=" + cookie.domain;
		}
		if (typeof cookie.maxAge == "number") {
			cookieString += ";Max-Age=" + cookie.maxAge;
		}
		if (typeof cookie.sameSite == "string") {
			if (cookie.sameSite=="lax"||cookie.sameSite=="strict") {
				cookieString += ";SameSite=" + cookie.sameSite;
			}
		}
		else if (cookie.sameSite) {
			cookieString += ";SameSite=strict";
		}
		if (typeof cookie.expirationDays == "number") {
			cookieString += ";Expires=" 
				+ new Date( new Date().getTime() + (cookie.expirationDays*86400000)).toUTCString();
		}
		else if (cookie.expires instanceof Date) {
			cookieString += ";Expires=" + cookie.expires.toUTCString();
		}
		cookie.httpOnly && (cookieString += ";HttpOnly");
		cookie.secure && (cookieString += ";Secure");
	}
	else {
		console.log( "Cookie Object Error: no name property" );
	}
	return cookieString;
}

function __exists(folder) {
	let exists = true;
	try {
		fs.statSync(folder);
	} catch(error) {
		exists = false;
	}
	return exists;
}