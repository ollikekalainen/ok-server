/*
-----------------------------------------------------------------------------------------
 primal-server.js
-----------------------------------------------------------------------------------------
 (c) Olli Kekäläinen

	
  Primal Server

  	Initialization 
  		new PrimalServer(options)

	Properties


		apiEntryPoint 		string, default: "api"
		
		apiExtensions		array, readonly
		
		defaultDirectory 	string
		
		defaultDocument		string, default: "index.htm"
		
		httpServer			httpServer object, readonly 

		httpsOptions		object, readonly, default: {}

		httpsServer			httpsServer object, readonly 

		logApiRequests 		boolean, default: false
		
		logFileRequests		boolean, default: false
		
		mimeTypes 			object, readonly, default: {
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
							}

		port 				number, default 0
		
		sslPort				number, default 0
	

	Methods

		addForbiddenPath( path ) -> self
			path 	string

		addMimeType( ext, type ) -> self
			ext 	string
			type 	string

		addPermittedPath( path ) -> self
			ext 	string

		addVirtualDirectory( params ) -> VirtualDirectory
			params 	object {
						name: string,
						path: string[,
						handlerName: string, default: "default"]
					}

		extendApi(apiExtension) -> self
			apiExtension 	string | array(string), module name

		getConfig( onError, onSuccess, context )  // called in api.getConfig

		getRemoteIp( request ) -> string
			request 	httpRequest

		getVirtualDirectory( name ) -> VirtualDirectory
			name 		string

		getVirtualDirectoryPath( name ) -> string
			name 		string

		isForbidden(url) -> boolean
		
		isPermitted(url) -> boolean

		loadHandler( module|modulename ) -> self

		onHttpReady() 
			Called when httpServer is started listening. Overwrite in child class.

		onHttpsReady()
			Called when httpsServer is started listening. Overwrite in child class.

		onRequest( context )

			context 	RequestContext

			Overwrite this in child class. Called before the actual handling of the request.
			
		onResponse(params) { 
			Overwrite this in child class. Called before the actual sending of the response.
			
			params.context 		RequestContext
			params.status		number, default: 200
			params.headers 		objects, default: {}
			params.body	 		string/readableStream, default: undefined
	
		removeMimeType(ext) -> self

		setResponseCookie( response, cookie )

			response 	HttpResponse
			cookie 		array:cookie

			cookie properties
				name 			string, mandatory
				value 			string, default: ""
				path  			string, default: "/"
				domain 			string
				expires 		Date
				expirationDays	number
				maxAge 			number
				httpOnly 		boolean
				sameSite 		boolean (true: "strict", false: no sameSiteattribute) or string ("strict"/"lax")
				secure 			boolean


		start( onError, onSuccess )
			onError  	function(error)
			onSuccess 	function()
		
		stop( onClose )
			onClose 	function(), Called when server is stopped listening.



VirtualDirectory

	Properties

		name 		 	string
		path         	string
		handler  		Requesthandler
		handlerName  	string


RequestContext

	Properties

		cookies	 			object, 	request cookies
		handler	 			RequestHandler
		handlerName			string
		path				string, full path in request URL
		pathName	 		string
		request				HttpRequest
		response			HttpResponse
		server				OKServer
		url	 				object
		virtualDirectory	VirtaulDirectory
}
 

 20190503
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
		this.base = undefined;
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

	get defaultDirectory() {
		return this.options.defaultDirectory;
	}

	set defaultDirectory(value) {
		this.options.defaultDirectory = value;
		this._resetBase();
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

	get sslPort() {
		return this.options.sslPort||0;
	}

	set sslPort(value) {
		this.options.sslPort = value;
		return value;
	}

	addForbiddenPath( path ) {
		this.forbiddenPaths.indexOf(path.toLowerCase()) < 0 
			|| this.forbiddenPaths.push(path.toLowerCase());
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
		this.permittedPaths.indexOf(path.toLowerCase()) < 0 
			|| this.permittedPaths.push(path.toLowerCase());
		return this;
	}

	addVirtualDirectory( params ) {
		this.virtualDirectories[params.name||"/"] = new VirtualDirectory(params);
		return this.virtualDirectories[params.name||"/"];
	}

	extendApi(apiExtension) {
		require( "./api" ).extend(apiExtension);
		return this;
	}

	onApiApi( onError, onSuccess, context, iface ) {
		onSuccess(iface);
	}

	onApiGetConfig( onError, onSuccess, context, config ) {
		onSuccess(config);
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

	getVirtualDirectory( name ) {
		return this.virtualDirectories[name];
	}

	getVirtualDirectoryPath( name ) {
		return this.virtualDirectories[name] ? this.virtualDirectories[name].path : undefined;
	}

	isForbidden(url) {
		if (!this.isPermitted(url)) {
			let path = require("path").resolve( this.defaultDirectory + url ).toLowerCase();
			return !!this.forbiddenPaths.find((forbiddenpath) => { 
				return path.substr( 0, forbiddenpath.length ) == forbiddenpath;
			});
		}
		return false;
	}

	isPermitted(url) {
		let path = require("path").resolve( this.defaultDirectory + url ).toLowerCase();
		return !!this.permittedPaths.find((permittedpath) => { 
			return path.substr( 0, permittedpath.length ) == permittedpath;
		});
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

	onRequest(params) { 
		// Overwrite this in an ancestor class. Called before the actual handling of the request.
	}

	onResponse(params) { 
		// Overwrite this in an ancestor class. Called before the actual sending of the response.
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

	start( onError, onSuccess ) {

		this._resetBase();
		this._resetApiRequestHandler();

		if (typeof this.options.virtualDirectories == "object") {
			for (let name in this.options.virtualDirectories) {
				this.addVirtualDirectory({ 
					name: name, 
					path: this.options.virtualDirectories[name].path, 
					handlerName: this.options.virtualDirectories[name].handlerName||"default"
				});
			}
		}

		this.addForbiddenPath( __dirname );
		this._createAccessFilteringRules();

		if (this.port || this.sslPort) {
			if (this.port) {
				try {
					this._servers.http = http.createServer(( request, response ) => { 
						this._onRequest( request, response );
					}).on( "error", (error) => { this._handleStartError( onError, error );}
					).on( "listening", () => { this.onHttpReady();});
					//this._triggerReadiness( onError, () => { this.onHttpReady();});
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
			    	options.passphrase = this.httpsOptions.passphrase;
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
					).on( "listening", () => { this.onHttpsReady();});
					//this._triggerReadiness( onError, () => { this.onHttpsReady();}, "https" );
					this.httpsServer.listen( this.sslPort );
				}
				catch (error) {
					onError(error);
				}
			}
			onSuccess();
		}
		else {
			onError( new Error("E_NOSERVERPORT"));
		}
		return this;
	}

	stop( onClose ) {
		let serverCount = Number(!!this.httpServer) + Number(!!this.httpsServer);
		if (serverCount) {
			this.httpServer && this.httpServer.close(() => { --serverCount || onClose();});
			this.httpsServer && this.httpsServer.close(() => { --serverCount || onClose();});
		}
		else {
			onClose();
		}
		return this;
	}

	_beginsWithFolder( folder, _path ) {
		const path = require("path");
		folder = folder[0]== path.sep  ? folder : path.sep+folder;
		if (_path.substr( 0, folder.length ) == folder) {
			return _path.length == folder.length || _path[folder.length] == path.sep;
		}
		return false;
	}

	_createAccessFilteringRules() {
		let rules = this.options.accessFiltering||[];
		rules.forEach((rule) => {
			if (rule.path) {
				let path = rule.path;
				let permitted = rule.status && rule.status[0] == "p";
				if (!(path.substr(0,1) ==  path.sep || path.substr(1,1) == ":")) {
					path = this.defaultDirectory +  path.sep + path;
				}
				permitted ? this.addPermittedPath(path) : this.addForbiddenPath(path);
			}
		});
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
		const context = new RequestContext( this, request, response );
		if (this.isForbidden( context.pathName )) {
			console.log( this.getRemoteIp(request) + " FORBIDDEN: " + context.pathName );
			this._sendResponse({ context: context, status: 403 });
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

	_resetApiRequestHandler() {
		this.addVirtualDirectory({ name: this.apiEntryPoint, handlerName: "api" });
	}
	
	_resetBase() {
		this.base = this.addVirtualDirectory({ 
			path: this.defaultDirectory, 
			handlerName: "default" 
		});
	}

	_sanitize(url) {
		const path = require("path");
		return path.normalize( decodeURI( url )).replace( /^(\.\.[\/\\])+/,  "" );
	}

	_sendResponse( context, params = {}) {

		// params.status		number, default: 200
		// params.headers 		objects, default: {}
		// params.body	 		string/readableStream, default: undefined

		params.status = params.status||200;
		params.headers = params.headers||{};

		this.onResponse( context, params );
		context.response.writeHead( params.status, params.headers );
		if (params.body == null || params.body == undefined) {
			context.response.end();
		}
		else if (isReadable(params.body)) {
			params.body.on( "open", () => { params.body.pipe(context.response); });
		}
		else {
			context.response.end( "" + params.body );
		}
	}

	_solveMimeName( ext ) {
		return this.mimeTypes[ext.toLowerCase()]; // || "application/octet-stream";
	}

	_solveVirtualDirecory(path) {
		let name;
		for (name in this.virtualDirectories) {
			if (this._beginsWithFolder( name, path )) {
				return this.virtualDirectories[name];
			}
		}
		return this.base;
	}
}

module.exports = PrimalServer;

// ---------------------------------------------------------------------------------------------

class VirtualDirectory {
	constructor( params ) {
		this.name = params.name||"/";
		this.path = params.path;
		this.handlerName = params.handlerName||"default";
	}

	get handler() {
		return requesthandler.getHandler( this.handlerName );
	}
}

class RequestContext {
	constructor( server, request, response ) {
		this.p = {
			server: server,
			request: request,
			response: response,
			cookies: parseCookies(request),
			url: require("url").parse( request.url, true, false )
		};
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

	get path() {
		const path = require("path");
		return this.pathName + (this.pathName == path.sep ? this.server.defaultDocument : "");
	}

	get pathName() {
		return this.p.server._sanitize( this.url.pathname );
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

	setResponseCookie( cookie, encoder ) {
		this.server.setResponseCookie( this.response, cookie, encoder );
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
