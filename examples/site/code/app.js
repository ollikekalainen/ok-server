/*
-----------------------------------------------------------------------------------------
 app.js
-----------------------------------------------------------------------------------------
 (c) Olli Kekäläinen

 
	



 20190329
-----------------------------------------------------------------------------------------
*/
(() => {

	"use strict";

	const helper = namespace("helper");
	const app = namespace("app");

	let APP;

	app.get = ( onError, onSuccess, params ) => {
		APP ? onSuccess(APP) : (APP = new App( params ).start( onError, onSuccess ));
	}

	class App {

		constructor( params ) {
			this.config = params.config||{};
			this.serverConfig = params.serverConfig||{};
			this.api = params.api;
			this.root = params.root;
			this.qs = helper.parseQuery(location.search);
			this.id = "main-screen";
		}

		start( onError, onSuccess ) {
			const q = helper.queue();
			q.add( 
				() => { 
					$("body").append( helper.getTemplate("main-screen").render({ id: this.id }));
					q.proceed();
				},
				() => { this.constructPage( onError, q.next()); },
				() => { onSuccess(this); }
			).proceed();
			return this;
		}

		constructPage( onError, onSuccess ) {
			const q = helper.queue();
			q.add( 
				() => { this.api.myIpAddress( onError, q.next())},
				(ip) => {
					$("#"+this.id).append("Your IP address is " + ip + "<br>" );
					$("#"+this.id).append( helper.getTemplate("link").render({ href: "test/myfile.txt" }));
					q.proceed();
				},
				onSuccess							
			).proceed()
		}

	}

})();
