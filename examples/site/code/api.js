/*
-----------------------------------------------------------------------------------------
 api.js
-----------------------------------------------------------------------------------------
 (c) Olli Kekäläinen

 




 20190329
-----------------------------------------------------------------------------------------
*/
(() => {

	"use strict";

	const api  = namespace("api");

	let API;

	api.get = function( onError, onSuccess, params ) {
		API ? onSuccess(API) : (API = new Api( onError, onSuccess, params ));
	};

	class Api {

		constructor( onError, onSuccess, params = {}) {
			API = this;
			params.root && (this.root = params.root);
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

		get url() {
			return this.__url ? this.__url :  this.root + "api";
		}

		set url(url) {
			this.__url = url;
			return this.url;
		}

		__request( onError, onSuccess, name, parameters ) {

			const apiRoot = location.protocol + "//" + location.host + "/api";
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
			xhr.open( "POST", apiRoot );
			xhr.setRequestHeader( "X-Requested-With", "XMLHttpRequest");
			xhr.setRequestHeader( "Content-Type", "application/json; charset=utf-8" );
			xhr.send( JSON.stringify(request));
		}

		__request_with_jquery( onError, onSuccess, name, parameters ) {
			let request = { name: name, parameters: parameters||{}};
			$.ajax({
				type: "POST",
			  	url: this.url, 
			  	error: (a,b,c) => { onError(c);},
			  	data: JSON.stringify(request),
				success: (response) => { 
					name == "getConfig" && (this.url = response.content.apiUrl);
					response.succeed ? onSuccess(response.content) : onError(response.error);
				},
				cache: false,
				headers: {},
				contentType: "application/json; charset=utf-8"
			});
		}
	}

})();