/*
-----------------------------------------------------------------------------------------
 api.js
-----------------------------------------------------------------------------------------
 (c) Olli Kekäläinen
 

	Usage example:

		let API;
		let CONFIG;

		namespace("api").init(
			(error) => { console.log(error);},
			start,
			{ entryPoint: "http://www.mysite.net/api" }
		)

		function start(api) {
			API = api;
			// Now the whole API interface is available on the API object.
			API.getConfig((error) => { console.log(error);}, (config) => { CONFIG = config; });
			... etc
	
		}



 20190510
-----------------------------------------------------------------------------------------
*/
(() => {

	"use strict";

	const api  = namespace("api");

	api.init = function( onError, onSuccess, params ) {
		new Api( onError, (api) => { api.API = api; onSuccess(api.API);}, params );
	};


	class Api {

		constructor( onError, onSuccess, params = {}) {
			this.entryPoint = params.entryPoint||location.protocol + "//" + location.host + "/api";
			this.__initInterfase( onError, onSuccess );
		}

		__initInterfase( onError, onSuccess ) {
			this.__request( 
				onError, 
				(api) => {
					for (let name in api) {
						((name) => {
							Api.prototype[name] = function (onError, onSuccess, parameters) {
								this.__request( onError, onSuccess, name, parameters );
							};
						})(name);
					}
					onSuccess(this);
				}, 
				"api" 
			);

		}

		__request( onError, onSuccess, name, parameters ) {

			const request = { name: name, parameters: parameters||{}};
			const xhr = new XMLHttpRequest();

			xhr.addEventListener( "error", (event) => { onError( new Error( "E_LOAD (" + event.type +")"));});
			xhr.addEventListener( "abort", () => { onError( new Error( "E_ABORT" ));});
			xhr.addEventListener( "load", function () {
				try {
					const response = JSON.parse(this.responseText);
					if (response.succeed) {
						onSuccess(response.content);
					}
					else {
						onError(response.error);
					}
				}
				catch (error) {
					onError( new Error("E_PARSE: " + error.message ));
				}
			});
			xhr.open( "POST", this.entryPoint );
			xhr.setRequestHeader( "X-Requested-With", "XMLHttpRequest");
			xhr.setRequestHeader( "Content-Type", "application/json; charset=utf-8" );
			xhr.send( JSON.stringify(request));
		}
	}

})();