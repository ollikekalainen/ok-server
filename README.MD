

# ok-server

**ok-server** is simple HTTP server implemented with node.js HttpSever. It can be extended by adding 
it new request handlers for the desired endpoints. It includes two default request handlers. One for
file requests and one for the API requests. It's API request handler is easily extendable. 
File handler supports partial file requests in addition to normal file transfer. 



\
<a name="table-of-contents"></a>
## Table of contents

* [Installation](#installation)
* [Usage](#usage)
    * [Module](#usage.module)
        * [Functions](#usage.module.functions)
        * [Properties](#usage.module.properties)
    * [Starting server](#usage.starting-server)
        * [Initializing with createSever](#usage.starting-server.initializing-with-createsever)
        * [Extendeding server class](#usage.starting-server.extendeding-server-class)
        * [Initializing with extended server class](#usage.starting-server.initializing-with-extended-server-class)
        * [Creating initial options file](#usage.starting-server.creating-initial-options-file)
* [Request-Handlers](#request-handlers)
    * [Implementing and utilizing a new request handler](#request-handlers.implementing-and-utilizing-a-new-request-handler)
    * [Request handler prototype](#request-handlers.request-handler-prototype)
    * [Replacing the default request handler](#request-handlers.replacing-the-default-request-handler)
* [API System](#api-system)
    * [API request](#api-system.api-request)
    * [API response](#api-system.api-response)
    * [Pre-defined API requests](#api-system.pre-defined-api-requests)
        * [api](#api-system.pre-defined-api-requests.api)
        * [getConfig](#api-system.pre-defined-api-requests.getconfig)
    * [Extending API](#api-system.extending-api)
        * [Implementing API extension module](#api-system.extending-api.implementing-api-extension-module)
        * [Loading API extension module](#api-system.extending-api.loading-api-extension-module)
        * [Defining new API requests](#api-system.extending-api.defining-new-api-requests)
        * [API worker functions](#api-system.extending-api.api-worker-functions-(#and-context))
* [Reference](#reference)
    * [Module ok-server](#reference.module-ok-server)
        * [Methods](#reference.module-ok-server.methods)
        * [Properties](#reference.module-ok-server.properties)
    * [OKServer class](#reference.okserver-class)
        * [Initialization](#reference.okserver-class.initialization)
        * [Options](#reference.okserver-class.options)
        * [Methods](#reference.okserver-class.methods)
        * [Properties](#reference.okserver-class.properties)
    * [VirtualDirectory class](#reference.virtualdirectory-class)
        * [Initialization](#reference.virtualdirectory-class.initialization)
        * [Properties](#reference.virtualdirectory-class.properties)
    * [Context class](#reference.context-class)
        * [Initialization](#reference.context-class.initialization)
        * [Properties](#reference.context-class.properties)
    * [RequestContext class](#reference.requestcontext-class)
        * [Initialization](#reference.requestcontext-class.initialization)
        * [Properties](#reference.requestcontext-class.properties)
    * [Module requesthandler](#reference.module-requesthandler)
        * [Properties](#reference.module-requesthandler.properties)
        * [Functions](#reference.module-requesthandler.functions)
    * [RequestHandler class](#reference.requesthandler-class)
        * [Initialization](#reference.requesthandler-class.initialization)
        * [Properties](#reference.requesthandler-class.properties)
        * [Methods](#reference.requesthandler-class.methods)
* [Examples](#examples)



\
<a name="installation"></a>
## Installation

npm install ok-server



<a name="usage"></a>
## Usage

<a name="usage.starting-server"></a>
### Starting server

OKServer object can be initailized with [*createServer*](#reference.module-ok-server.methods) function of ok-server module or instantiating
it with new keyword using ok-server property [*OKServer*](#reference.module-ok-server.properties). Both methods enable extending of the OKServer 
class. Extending is preferable because it enables the use of event methods of the class.

<a name="usage.starting-server.initializing-with-createsever"></a>
#### Initializing with createSever

     
    const okserver = require( "ok-server" );
    const server = okserver.createServer({
        logFolder: __dirname + "/log",
        pulseFolder: __dirname,
        optionsFile: __dirname + "/my-server.json"
    });
     
    

<a name="usage.starting-server.extendeding-server-class"></a>
#### Extendeding server class

     
    const okserver = require( "ok-server" );
     
    class MyServer extends okserver.OKServer {
        constructor(options) {
            super(options);
            this.addMimeType({
                ".mp3": "audio/mpeg",
                ".wav": "audio/x-wav"
            });
        }
    }
      
        

<a name="usage.starting-server.initializing-with-extended-server-class"></a>
#### Initializing with extended server class

     
    const okserver = require( "ok-server" );
    const server = okserver.createServer({
        serverClass: MyServer,
        logFolder: __dirname + "/log",
        pulseFolder: __dirname,
        optionsFile: __dirname + "/my-server.json"
    });
     
    class MyServer extends okserver.OKServer {
        constructor(options) {
            super(options);
            this.addMimeType({
                ".mp3": "audio/mpeg",
                ".wav": "audio/x-wav"
            });
        }
    }

  -- or --
      
    class MyServer extends require( "ok-server" ).OKServer {
        constructor(options) {
            super(options);
            this.addMimeType({
                ".mp3": "audio/mpeg",
                ".wav": "audio/x-wav"
            });
        }
    }

    const server = MyServer({
        logFolder: __dirname + "/log",
        pulseFolder: __dirname,
        optionsFile: __dirname + "/my-server.json"
    });
     



<a name="usage.starting-server.creating-initial-options-file"></a>
#### Creating initial options file

Initial options file can be created by executing following source with command line flag
/initServerOptions. It will create an option file including default option values. Default 
option values can also changed as can be seen in the example.

    
    const okserver = require( "ok-server" );
    const options = okserver.defaultOptions;
    options.port = 3099;
    options.defaultDirectory = "/sites/my-test/site";
    options.mimeTypes[".mp3"] = "audio/mpeg";
    options.mimeTypes[".wav"] = "audio/x-wav";
    okserver.createServer({
        optionsFile: "/sites/my-test/my-server.json"
    });



\
<a name="request-handlers"></a>
## Request Handlers

**ok-server** has two request handlers pre-implemented. Requests on api entry point are handled
by the *api* request handler. File requests on both default directory and all virtual directories 
are handled by default the *default* hanlder.



<a name="request-handlers.implementing-and-utilizing-a-new-request-handler"></a>
### Implementing and utilizing a new request handler

Request handlers can be implemented by creating a new request handler javascript module and loading
it with server's [*loadHandler*](#reference.okserver-class.methods.loadHandler) method. The module source must follow a structure similar to the one 
below. The following three conditions must be met:

1. New request handler class must extend [*RequestHandler*](#reference.requestcontext) class defined in requesthandler.js,
2. The class instances must be given a proper name representing the handle name.
3. Module must export the new *RequestHandler* class defined in it.

The request handler is utilized by defining it as a virtual directory request handler.
This is done using the server's [*addVirtualDirectory*](#reference.okserver-class.methods.addVirtualDirectory) method by adding the handler name 
to the handlerName parameter.



<a name="request-handlers.request-handler-prototype"></a>
### Request handler prototype

    const RequestHandler = require( "ok-server" ).RequestHandler;
      
    class TestRequestHandler extends RequestHandler {
        constructor (params = {}) {
            params.name = "test"; // handler name
            super(params);
        }
            
        onRequest( context ) {
            const responseHeaders = {};
            let responseBody = "";
            let statusCode = 200;
            // The code that inspects the request, adds response headers needed, and 
            // constructs a proper response body as string/ReadableStream
            this.sendResponse( context, { 
                status: statusCode, 
                headers: responseHeaders, 
                body: responseBody 
            });
        }
    }
      
    module.exports = TestRequestHandler;

 

<a name="request-handlers.replacing-the-default-request-handler"></a>
### Replacing the default request handler

After the server is initialized, the default request handler can be replaced with the server
method [*loadHandler*](#reference.okserver-class.methods.loadHandler). The request handler object in the module has to be named as "default".
See *Request handler prototype* above.



\
<a name="api-system"></a>
## API System

**ok-server** has simple and easy facilities to create API services. These facilities includes 
means to define API requests, more specifically their names and parameters. API system will
validate parameters of the requests and reponds with error message in case of invalid or missing 
parameters,

API request are send on client (browser) side as http requests with POST method 
API request name and parameters as json in the body of the https request.

It also have two predefined API services.



<a name="api-system.api-request"></a>
### API-request

API request are easily done with the following function:

    function apiRequest( onError, onSuccess, name, parameters = {}) {
        
        const apiRoot = location.protocol + "//" + location.host + "/api";
        const request = { name: name, parameters: parameters };
        const xhr = new XMLHttpRequest();
        
        xhr.addEventListener( "error", () => { onError( new Error( "E_LOAD" ));});
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
        xhr.setRequestHeader( "X-Requested-With", "XMLHttpRequest" );
        xhr.setRequestHeader( "Content-Type", "application/json; charset=utf-8" );
        xhr.send( JSON.stringify(request));
    }



<a name="api-system.api-response"></a>
### API-response

Response payload for API requests contains stringified json object. In case of success the json
object is following.

&emsp;**{**\
&emsp;&emsp;&emsp;**succeed**: **true**,\
&emsp;&emsp;&emsp;**requestName**: *string*,\
&emsp;&emsp;&emsp;**content**: *array|boolean|number|object|string*,\
&emsp;&emsp;&emsp;**elapsed**: *number*\
&emsp;**}**

\
The response *content* property may contain a value of be any json-compatible data type. *Elapsed* 
property indicates the elapsed time of handling of the request as milliseconds.

In case of error the response payload contains following json object.

&emsp;**{**\
&emsp;&emsp;&emsp;**succeed**: **false**,\
&emsp;&emsp;&emsp;**requestName**: *string*,\
&emsp;&emsp;&emsp;**error: {**\
&emsp;&emsp;&emsp;&emsp;&emsp;**code**: *string*,\
&emsp;&emsp;&emsp;&emsp;&emsp;**message**: *string*\
&emsp;&emsp;&emsp;**}**,\
&emsp;&emsp;&emsp;**elapsed**: *number*\
&emsp;**}**

\
<a name="api-system.pre-defined-api-requests"></a>
### Pre-defined API requests

<a name="api-system.pre-defined-api-requests.api"></a>
#### api

The content property of the response to the api request *api* contains complete specifications 
of the all currently implemneted API services as they are defined with [*okserver.defineApiRequest()*](#reference.module-ok-server.methods.defineApiRequest).

&emsp;**{**\
&emsp;&emsp;&emsp;**&lt;request-name(1)&gt;**:\
&emsp;&emsp;&emsp;&emsp;&emsp;**parameters**: **{**\
&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;**&lt;parameter-name(1)&gt;**: **{**\
&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;**type**: *string*,\
&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;**mandatory**: *boolean*,\
&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;**description**: *object*,\
&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;**default**: *boolean|number|object|string*\
&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;**}**,\
&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;...,\
&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;**&lt;parameter-name(n)&gt;**: **{**\
&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;**type**: *string*,\
&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;**mandatory**: *boolean*,\
&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;**description**: *object*,\
&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;**default**: *boolean|number|object|string*\
&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;**}**\
&emsp;&emsp;&emsp;&emsp;&emsp;**}**,\
&emsp;&emsp;&emsp;&emsp;&emsp;**description**: *object*,\
&emsp;&emsp;&emsp;&emsp;&emsp;**cargo**: *object*\
&emsp;&emsp;&emsp;},\
&emsp;&emsp;&emsp;...,\
&emsp;&emsp;&emsp;**&lt;request-name(n)&gt;**: **{**\
&emsp;&emsp;&emsp;&emsp;&emsp;...\
&emsp;&emsp;&emsp;**}**\
&emsp;**}**


\
<a name="api-system.pre-defined-api-requests.getconfig"></a>
#### getConfig

By default, the content property of the response to the api request *getConfig* contains an empty 
object. In order to include the desired values to the object the [*onApiGetConfig*](#reference.ok-server-class.methods.onApiGetConfig) method
of the *OKServer* can be overwritten and the content filled with the name-values pairs as wanted.



<a name="api-system.extending-api"></a>
### Extending API

<a name="api-system.extending-api.implementing-api-extension-module"></a>
#### Implementing API extension module

First thing to do is creating a new API module. Below is an example of the possible content of 
the module.

    const okserver = require("ok-server");
      
    okserver.defineApiRequest([ 
        { 
            name: "myService1", 
            parameters: {}, 
            worker: __myService1 
        },
        { 
            name: "myService2", 
            parameters: {
                firstname: {
                    type: "string",
                    mandatory: true,
                    description: { text: "First name" }
                },
                lastname: {
                    type: "string",
                    mandatory: true,
                    description: { text: "Last name" }
                },
                title: {
                    type: "string",
                    mandatory: false,
                    default: "Mrs."
                    description: { text: "Title" }
                }
            }, 
            worker: ( context ) => {
                // For array functions context is passed as function parameter
                const p = context.request.parameters;
                context.onSuccess( "Hello " 
                    + p.title + " " 
                    + p.firstname + " " 
                    + p.lastname + "!"
                );
            }
        }
    ]);
        
    function __myService1() {
        // In regular functions context is available as this keyword
        const ip = this.server.getRemoteIp( this.httpRequest ); 
        this.onSuccess(ip);
    }


<a name="api-system.extending-api.loading-api-extension-module"></a>
#### Loading API extension module

API extnesion modules are loaded with OKServer 
[*extendApi*](#reference.okserver-class.methods.extendApi) method.

<a name="api-system.extending-api.defining-new-api-requests"></a>
#### Defining new API requests

<a name="api-system.extending-api.api-worker-functions-(and-context)"></a>
#### API worker functions

An API request will get associated worker function to be called. To this function is passed a 
[*Context*](#reference.context-class) object. If the function is an array function, *Context* object is passed as 
function parameter. In case of regular functions the context is available also as a value of *this*
keyword.



\
<a name="reference"></a>
## Reference

<a name="reference.module-ok-server"></a>
### Module ok-server

<a name="reference.module-ok-server.methods"></a>
#### Functions

-   **okserver.createServer( options )**

	-	**options**  See server [*options*](#reference.okserver-class.options).

		**Return value**: *OKServer*
<a name="reference.module-ok-server.methods.defineApiRequest"></a>
-   **okserver.defineApiRequest(definition)**
          
    -   **definition**      *object*\
        &emsp;**{**\
        &emsp;&emsp;&emsp;**name**: *string*,\
        &emsp;&emsp;&emsp;**parameters**: {\
        &emsp;&emsp;&emsp;&emsp;&emsp;**&lt;parameter-name(1)&gt;**: {\
        &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;**type**: *string* ("string"|"number"|"boolean"|"object")**[**,\
        &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;**mandatory**: *boolean* **][**,\
        &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;**default**: *string|number|boolean|object* **][**,\
        &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;**description**: *object*]\
        &emsp;&emsp;&emsp;&emsp;&emsp;},\
        &emsp;&emsp;&emsp;&emsp;&emsp;...,\
        &emsp;&emsp;&emsp;&emsp;&emsp;**&lt;parameter-name(n)&gt;**: {\
        &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;**type**: *string* ("string"|"number"|"boolean"|"object")**[**,\
        &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;**mandatory**: *boolean* **][**,\
        &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;**default**: *string|number|boolean|object* **][**,\
        &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;**description**: *object* **]**\
        &emsp;&emsp;&emsp;&emsp;&emsp;}\
        &emsp;&emsp;&emsp;**}**,\
        &emsp;&emsp;&emsp;**worker**: *function* **[**,\
        &emsp;&emsp;&emsp;**description**: *object* **]**\
        &emsp;**}**

    -   **Return value**: *none*


<a name="reference.module-ok-server.properties"></a>
#### Properties

-   **defaultOptions**     *object*
-   **OKServer**           *class*
-   **RequestHandler**     *class*



<a name="reference.okserver-class"></a>
### OKServer class

<a name="reference.okserver-class.initialization"></a>
#### Initialization
    
&emsp;&emsp;new require("ok-server").OKServer(options);
     

<a name="reference.okserver-class.options"></a>
#### Options

-   **accessFiltering**:     *array*, contains filter objects
    - filter:
        - **path**: *string*
        - **status**: *string* ("forbidden"|"permitted")
-   **apiEntryPoint**:       *string*, default: "api"
-   **apiExtensions**:       *array*, default: []
-   **defaultDirectory**:    *string*, default: __dirname + "/examples/site"
-   **defaultDocument**:     *string*, default: "index.htm"
-   **httpsOptions**:        *object*
    &emsp;&emsp;default: **{ pfx**: "%LANNS_PFX%", **passphrase**: "%LANNS_PHRASE%" **}**
-   **logApiRequests**:      *boolean*, default: false
-   **logFileRequests**:     *boolean*, default: false
-   **mimeTypes**:           *object*,\
    &emsp;&emsp;**{**\
    &emsp;&emsp;&emsp;&emsp;**&lt;extension(1)&gt;**: *string*,\
    &emsp;&emsp;&emsp;&emsp;...,\
    &emsp;&emsp;&emsp;&emsp;**&lt;extension(n)&gt;**: *string*\
	&emsp;&emsp;**}**

-   **optionsFile**:         *string*, default: \__dirname + "options.js"
    
    Name of the JSON file where options are read from. Options in the file are overwritten by the options passed as 
    options parameter to the createServer function or OKServer constructor.
                        
-   **port**:                *number*, default: 3002
-   **pulseFolder**:         *string*, if not set, pulse does not start
-   **pulseInterval**:       *number*, default: 1000
-   **serverClass**:         *class*, *default*: OKServer
-   **sslPort**:             *number*, default: 0
-   **virtualDirectories**:  *object*,\
    &emsp;&emsp;**{**\
    &emsp;&emsp;&emsp;&emsp;**&lt;name(1)&gt;**: **{ path**: *string*, **handler**: *string* **}**,\
    &emsp;&emsp;&emsp;&emsp;...,\
    &emsp;&emsp;&emsp;&emsp;**&lt;name(n)&gt;**: **{ path**: *string*, **handler**: *string* **}**\
    &emsp;&emsp;**}**


<a name="reference.okserver-class.methods"></a>
#### Methods

-   **addForbiddenPath( path )**
    - **path**: string
    - **return value**: *OKServer*

    Adds a forbidden path to the server. This path is not accessible for the client.

-   **addMimeType( fileExtension, type )**
    - **fileExtension**: *string*
    - **type**: *string*
    - **return value**: *OKServer*

-   **addPermittedPath( path )**
    - **path**: *string*
    - **return value**: *OKServer*
<a name="reference.okserver-class.methods.addVirtualDirectory"></a>
-   **addVirtualDirectory( params )**
    - **params** *object*
        - **name**: *string*
        - **path**: *string*
        - **handlerName**: *string*, default: "default"
    - **return value**: *VirtualDirectory*
<a name="reference.okserver-class.methods.extendApi"></a>
-   **extendApi(apiExtensionModule)**
    - **apiExtensionModule**: *string* value representing the name of the module or *array* of module names as string values
    - **return value**: *OKServer*

-   **getRemoteIp( request )**
    - **request**:     *HttpRequest*
    - **return value**: *string*

-   **getVirtualDirectory(name)**
    - **name**: *string*
    - **return value**: *VirtualDirectory*

-   **getVirtualDirectoryPath( name )**
    - **name**: *string*
    - **return value**: *string*

-   **isForbidden(url) -> boolean**
    - **return value**: *boolean*
    
-   **isPermitted(url) -> boolean**
    - **return value**: *boolean*
<a name="reference.okserver-class.methods.loadHandler"></a>
-   **loadHandler( module|modulename )**
    - **module**: *string* value representing the name of the module or *module*
    - **return value**: *OKServer*

-   **removeMimeType(ext)**
    - **return value**: *OKServer*

-   **setResponseCookie( response, cookie, encoder )**
    - **response:** *HttpResponse*
    - **cookie** *object | array:object*
        - **name** *string*, mandatory
        - **value** *string*, default: "", encoded with encodeURIComponent()
        - **path** *string*, default: "/"
        - **domain** *string*
        - **expires** *Date*
        - **expirationDays** *number*
        - **maxAge** *number*
        - **httpOnly** *boolean*
        - **sameSite** *boolean* (true: "strict", false: no sameSite attribute) or string ("strict"/"lax")
        - **secure** *boolean*
    - **encoder** *function*, default: encodeURIComponent

-   **start( onError, onSuccess )**
    - **onError**: *function(error)*
    - **onSuccess**: *function()*
    
-   **stop( onClose )**
    - **onClose**: *function()*, Called when server is stopped listening.

-   **onApiApi( onError, onSuccess, context, iface )**
    - **onError**: *function(error)*
    - **onSuccess**: *function(alteredIface)*
    - **context**: *Context*, see requesthandler-api.js
    - **iface**: *object*, API definitions object
<a name="reference.ok-server-class.methods.onApiGetConfig"></a>
-   **onApiGetConfig( onError, onSuccess, context, config )**
    - **onError**: *function(error)*
    - **onSuccess**: *function(alteredConfig)*
    - **context**: *Context*, see requesthandler-api.js
    - **config**: *object*
        It is a configuration object that will be delivered to the client's getConfig query.

-   **onHttpReady()**\
        Overwrite this in child class. Called when httpServer is started listening.

-   **onHttpsReady()**\
        Overwrite this in child class. Called when httpsServer is started listening.

-   **onRequest(context)**
    - **context**     *RequestContext*
    
    Overwrite this in child class. Called before the actual handling of the request.

-   **onResponse( context, params )**
    - **context**: *RequestContext*
    - **params.status**: *number*, default: 200
    - **params.headers**: *objects*, default: {}
    - **params.body**: *string/ReadableStream*, default: undefined

    Overwrite this in child class. Called before the actual sending of the response.
       

<a name="reference.okserver-class.properties"></a>
#### Properties

-   **apiEntryPoint**       *string*, default: "api"
-   **apiExtensions**       *array*, readonly
-   **defaultDirectory**    *string*
-   **defaultDocument**     *string*, default: "index.htm"
-   **httpServer**          *HttpServer*, readonly undefined if port option is not set 
-   **httpsOptions**        *object*, readonly, default: {}
-   **httpsServer**         *HttpsServer*, readonly, undefined if sslPort option is not set 
-   **logApiRequests**      *boolean*, default: false
-   **logFileRequests**     *boolean*, default: false
-   **mimeTypes**           *object*, readonly\
    OKServer supports following MIME types by default: 
    - **css**           text/css; charset=utf-8
    - **htm**           text/html; charset=utf-8
    - **html**          text/html; charset=utf-8
    - **js**            application/javascript; charset=utf-8
    - **json**          application/json; charset=utf-8
    - **bmp**           image/bmp
    - **gif**           image/gif
    - **jpeg**          image/jpeg
    - **jpg**           image/jpeg
    - **png**           image/png
    - **pnz**           image/png
    - **tif**           image/tiff
    - **tiff**          image/tiff
    - **pfd**           application/pdf
    - **txt**           text/plain; charset=utf-8
-   **port**                *number*, default 0
-   **sslPort**             *number*, default 0
    


<a name="reference.virtualdirectory-class"></a>
### VirtualDirectory class

<a name="reference.virtualdirectory-class.initialization"></a>
#### Initialization

VirtualDirectory objects are initialized by the OKServer and are accessible with
the method *getVirtaulDirectory*.

<a name="reference.virtualdirectory-class.properties"></a>
#### Properties
 
-   **name**            Name of the virtual directory as string
-   **path**            Virtual directory path as string
-   **handler**         Handler associated to the virtual directory
-   **handlerName**     String value representing the name of the handler associated to the virtual directory

           

<a name="reference.context-class"></a>
### Context class

<a name="reference.context-class.initialization"></a>
#### Initialization

Context objects are initialized by the OKServer's API System and passed to a API services'
worker functions as the first parameter (and also as #this# keyword if the worker function is not an array function).

<a name="reference.context-class.properties"></a>
#### Properties

-   **cookies**             *object* of requests cookies
-   **httpRequest**         *HttpRequest*
-   **httpResponse**        *HttpResponse*
-   **onError**             *callback* function(Error)
-   **onSuccess**           *callback* function(responseContent)
-   **request**             *reuest* object as it was in http request body
-   **requestHandler**      *ApiRequestHandler*
-   **requestName**         *string*
-   **server**              *OKServer*
-   **started**             *number*, time when request is received (as new Date().getTime())



<a name="reference.requestcontext"></a>
### RequestContext

<a name="reference.requestcontext.initialization"></a>
#### Initialization

RequestContext objects are initialized by the OKServer on every clinet request and passed to 
appropriate request handler as the only parameter of the onRequest method.

<a name="reference.requestcontext.properties"></a>
#### Properties

-   **cookies**       *object*, request cookies
-   **handler**       *RequestHandler*
-   **handlerName**   *string*
-   **path**          *string*, full path in request URL
-   **pathName**      *string*
-   **request**       *HttpRequest*
-   **response**      *HttpResponse*
-   **server**        *OKServer*
-   **url**           *object*
-   **virtualDirectory**      *VirtaulDirectory*


<a name="reference.requestcontext.methods"></a>
#### Methods

-   **setResponseCookie( cookie, encoder )**
    - **cookie** *object | array:object*
        - **name** *string*, mandatory
        - **value** *string*, default: "", encoded with encodeURIComponent()
        - **path** *string*, default: "/"
        - **domain** *string*
        - **expires** *Date*
        - **expirationDays** *number*
        - **maxAge** *number*
        - **httpOnly** *boolean*
        - **sameSite** *boolean* (true: "strict", false: no sameSite attribute) or string ("strict"/"lax")
        - **secure** *boolean*
    - **encoder** *function*, default: encodeURIComponent



<a name="reference.module-requesthandler"></a>
### Module requesthandler

<a name="reference.module-requesthandler.properties"></a>
#### Properties

-   **RequestHandler** *class RequestHandler*

<a name="reference.module-requesthandler.methods"></a>
#### Methods

-   **requesthandler.getHandler( handlerName )**
    - **handlerName**     *string*
    - **Return value**: *object* 
        inherited from RequestHandler



<a name="reference.requesthandler-class"></a>
### RequestHandler class

<a name="reference.requesthandler-class.initialization"></a>
#### Initialization

&emsp;&emsp;new RequestHandler(params)

-   **params**  *object*
    - **server**  *OKServer*
    - **name**    *string*

<a name="reference.requesthandler-class.properties"></a>
#### Properties

-   **options**     *object*
     Shortcut to OKServer.options

-   **serve**       *OKServer*

<a name="reference.requesthandler-class.methods"></a>
#### Methods

-   **getRemoteIp( request )**
    - **request**     *HttpRequest*
    - **Return value**: *string*

-   **sendResponse( context, params )**
    - **context**: *RequestContext*
    - **params**  *object*
        - **status** *number*, default: 200
        - **headers** *objects*, default: {}
        - **body** *string/ReadableStream*, default: undefined
        
-   **setResponseCookie( response, cookies, encoder )**
    - **response** *HttpResponse*
    - **cookie** *object | array:object*
        - **name** *string*, mandatory
        - **value** *string*, default: "", encoded with encoder function passed as the 3rd parameter
        - **path** *string*, default: "/"
        - **domain** *string*
        - **expires** *Date*
        - **expirationDays** *number*
        - **maxAge** *number*
        - **httpOnly** *boolean*
        - **sameSite** *string* ("strict"/"lax") or *boolean* (true: "strict", false: no sameSite attribute included)
        - **secure** *boolean*
    - **encoder** *function*, default: encodeURIComponent

-   **solveMimeName( extension )**
    - **extension** *string*
    - **Return value**: *string*

-   **onRequest( context )**
    - **context**     *RequestContext*

-   **decodeURI( uri )**
    - **uri**     *string*
    - **Return value**: *string*


\
<a name="examples"></a>
## Examples

later...

