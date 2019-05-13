/*
-----------------------------------------------------------------------------------------
 api.js
-----------------------------------------------------------------------------------------
 (c) Olli Kekäläinen





  20190513
----------------------------------------------------------------------------------------
*/

"use strict";

class Api {
	constructor () {
		this.iface = {};
		const api = this;
		this.add([
			{ name: "api", description: { text: "API sprecifications" }, worker: (context) => { 
				context.server.onApiApi( context.onError, context.onSuccess, context, api.iface );
			}},
			{ name: "getConfig", description: { text: "Clnent configuration options" }, worker: (context) => { 
				context.server.onApiGetConfig( context.onError, context.onSuccess, context, {} );
			}}
		]);
	}
	
	add(entry) {
		(Array.isArray(entry)?entry:[entry]).forEach((ent) => {
			if (this._validateDefinition(ent)) {
				this.iface[ent.name] = {
					parameters: ent.parameters || {},
					worker: ent.worker || function () {
						this.onError(
							helper.newError(
								).Message( "Request '" + this.requestName 
									+ "' does not have worker function assigned." 
								).Code( "E_NOWORKER"
							)
						);
					},
					description: ent.description||{},
					cargo: {}
				};
			}
		});
	}

	extend(module) {
		(Array.isArray(module) ? module : [module]).forEach((mod) => { require(mod); });
	}

	_validateDefinition(definition) {
		let valid = false;
		let error;
		let msg = "API definition error: ";
		if (typeof definition == "object" && !Array.isArray(definition)) {
			if (typeof definition.name == "string") {
				if (typeof definition.worker == "function") {
					if (!definition.description 
					  || (typeof definition.description == "object" 
					  && !Array.isArray(definition.description))) {
						if (definition.parameters == undefined) {
							valid = true;
						}
						else if (typeof definition.parameters == "object") {
							error = this._validateDefinitionParameters(definition);
							valid = !error;
						}
						else {
							error = new Error( msg + "request named `" + definition.name 
								+ "´ has invalid paremeters property." );
						}
					}
					else {
						error = new Error( msg + "description property of the request named `" 
							+ definition.name + "´ should be an object." );
					}
				}
				else {
					error = new Error( msg + "worker property of the request named `" 
						+ definition.name + "´ should be a function." );
				}
			}
			else {
				error = new Error( msg + "invalid name property." );
			}
		}
		else {
			error = new Error( msg + "should be an object." );
		}
		error && console.log(error);
		return valid;
	}

	_validateDefinitionParameters(definition) {
		let msg = "API definition error: ";
		let p, _msg;
		for (let name in definition.parameters) {
			p = definition.parameters[name];
			if (typeof p !== "object" || Array.isArray(p)) {
				 _msg = "(should be an object).";
			}
			else if (!p.type) {
				 _msg = "(missing type property).";
			}
			else if (typeof p.type !== "string") {
				 _msg = "(type property should be a string).";
			}
			else if ("string,boolean,number,object".indexOf(p.type) < 0) {
				 _msg = "(invalid string in type property).";
			}
			else if (!(p.mandatory == undefined || typeof p.mandatory == "boolean")) {
				 _msg = "(property `mandatory´ should be a boolean value).";
			}
			else if (p.default !== undefined && typeof p.default !== p.type) {
				 _msg = "(value type of the property `default´ should be" 
				 	+ " the same as the value of the property `type´).";
			}
			if (_msg) {
				return new Error( msg + "request named `" + definition.name 
					+ "´ has invalid paremeter `" + name + "´ " + _msg );
			}
			if (!p.description) {
				 p.description = {};
			}
		}
		return;
	}
}

module.exports = exports = new Api();
