

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
        * [Functions](#reference.module-ok-server.methods)
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
        * [Functions](#reference.module-requesthandler.functions)
        * [Properties](#reference.module-requesthandler.properties)
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
2. The class instances must be given a proper name representing the handler name.
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
            // constructs a proper response body as string/stream.Readable
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

API request is sent on client (browser) side as http requests with POST method.
The API request name and the request parameters are added to the body of the http request 
as the json object.

It also have two predefined API services.



<a name="api-system.api-request"></a>
### API-request

The request object added to the body of the API request must be as follows.

&emsp;**{**\
&emsp;&emsp;&emsp;**name**: *string*,\
&emsp;&emsp;&emsp;**parameters**: **{**\
&emsp;&emsp;&emsp;&emsp;**&lt;parameter-name(1)&gt;**: *boolean|number|object|string*,\
&emsp;&emsp;&emsp;&emsp;...,\
&emsp;&emsp;&emsp;&emsp;**&lt;parameter-name(n)&gt;**: *boolean|number|object|string*\
&emsp;&emsp;&emsp;**}**\
&emsp;**}**


API request are done with the following function.

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

The response payload to the API request contains a stringified json object. In case of success the json
object is as follows.

&emsp;**{**\
&emsp;&emsp;&emsp;**succeed**: **true**,\
&emsp;&emsp;&emsp;**requestName**: *string*,\
&emsp;&emsp;&emsp;**content**: *array|boolean|number|object|string*,\
&emsp;&emsp;&emsp;**elapsed**: *number*\
&emsp;**}**

\
The response *content* property may contain the value of of any json-compatible data type. *Elapsed* 
property indicates the elapsed time of processing the request in milliseconds..

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

The content property of the response to the API request *api* contains complete specifications 
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

This API service is especially useful for creating automatic client-side API module. See an
example of the source file 
[here](https://github.com/ollikekalainen/ok-server/blob/master/examples/site/code/api.js).


<a name="api-system.pre-defined-api-requests.getconfig"></a>
#### getConfig

By default, the content property of the response to the api request *getConfig* contains an empty 
object. In order to include the desired values to the object the [*onApiGetConfig*](#reference.ok-server-class.methods.onApiGetConfig) method
of the *OKServer* can be overwritten and the content filled with the name-values pairs as wanted.

\
<a name="api-system.extending-api"></a>
### Extending API

<a name="api-system.extending-api.implementing-api-extension-module"></a>
#### Implementing API extension module

The first thing is to create a new API extnesion module. Below is an example of the possible content of the module.

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

API extension modules are loaded with OKServer 
[*extendApi*](#reference.okserver-class.methods.extendApi) method.

<a name="api-system.extending-api.defining-new-api-requests"></a>
#### Defining new API requests

New API request is defined the API extension module with the OKServer method 
[*defineApiRequest*](#reference.module-ok-server.methods.defineApiRequest).

<a name="api-system.extending-api.api-worker-functions-(and-context)"></a>
#### API worker functions

The API request causes the worker function associated with it to be called. To this function is passed a 
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

-   **okserver.createServer( options )** - Creates an OKServer object with the desired options.

	-	**options**  See server [*options*](#reference.okserver-class.options).

		**Return value**: *OKServer*
<a name="reference.module-ok-server.methods.defineApiRequest"></a>
-   **okserver.defineApiRequest(definition)** - Creates the definition of a new API service.
          
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

-   **defaultOptions**     *object* - default options object whose values are used on creating and starting the server in the case 
    these values are not overwritten in the options file or passed as the options parameter when creating the server.
    These option values are also written to the options file when it is created.
-   **OKServer**           *class* - OKServer class for instantiating server object or extending one.
-   **RequestHandler**     *class* - RequestHandler class for extending RequestHandler in order to create 
    a [new request handler](#request-handlers.request-handler-prototype).


\
<a name="reference.okserver-class"></a>
### OKServer class

<a name="reference.okserver-class.initialization"></a>
#### Initialization
    
&emsp;&emsp;new require("ok-server").OKServer(options);
     

<a name="reference.okserver-class.options"></a>
#### Options

-   **accessFiltering**     *array* - Contains access filtering objects with following properties.
    - filter:
        - **path** *string*
        - **status** *string* ("forbidden"|"permitted")
-   **apiEntryPoint**       *string* - Name of the virtual folder that serves as the entry point for the API requests. Default value is "api".
-   **apiExtensions**       *array* - Full names of the API extension mofule files to be loaded before the server starts. Default is [].
-   **defaultDirectory**    *string* - The full folder name of the file request default directory for situations where the URL does not contain a path. Default value is __dirname + "/examples/site".
-   **defaultDocument**     *string* - Name of the default HTML document. Default value is "index.htm".
-   **httpsOptions**        *object* - Contains options needed in creating HttpsServer. Can be either **{ pfx**: *string*, **passphrase**: *string* **}** or **{ key**: *string*, **cert**: *string* **}**.
        Default value is **{ pfx**: "%OKSERVER_PFX%", **passphrase**: "%OKSERVER_PHRASE%" **}**.
-   **logApiRequests**      *boolean* - Indicates whether the API requests are written to the log file. Default value is false.
-   **logFileRequests**     *boolean* - Indicates whether the file requests are written to the log file. Default value is false.
-   **mimeTypes**           *object* - Includes MIME types supported by the server as the following object.

    &emsp;&emsp;**{**\
    &emsp;&emsp;&emsp;&emsp;**&lt;extension(1)&gt;**: *string*,\
    &emsp;&emsp;&emsp;&emsp;...,\
    &emsp;&emsp;&emsp;&emsp;**&lt;extension(n)&gt;**: *string*\
	&emsp;&emsp;**}**

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

-   **optionsFile**         *string* - The full name of the JSON options file where the server's options are read from. 
        Options in the file are overwritten by the options passed as 
        options parameter to the createServer function or OKServer constructor. Default value is \__dirname + "options.json".
    
    Name of the JSON file where options are read from. 
                        
-   **port**                *number* - Port number for the *http.Server*. If set as 0, the server is not instantiated. Default value is 3002.
-   **pulseFolder**         *string* - Full name of the folder where the pulse file is written. The purpose of the Pulse is prevent the server 
        starting if the script is re-run. If the options is not set, pulse does not start.
-   **pulseInterval**       *number* - The interval as milliseconds where the pulse file is rewritten. Default value is 1000.
-   **serverClass**         *class* - The class of the server object to create. It must be inherited from the *OKServer*. Default value is *OKServer*.
-   **sslPort**             *number*  - Port number for the *https.Server*. If set as 0, the server is not instantiated. Default value is 3002.
-   **virtualDirectories**  *object*,\
    &emsp;&emsp;**{**\
    &emsp;&emsp;&emsp;&emsp;**&lt;name(1)&gt;**: **{ path**: *string*, **handler**: *string* **}**,\
    &emsp;&emsp;&emsp;&emsp;...,\
    &emsp;&emsp;&emsp;&emsp;**&lt;name(n)&gt;**: **{ path**: *string*, **handler**: *string* **}**\
    &emsp;&emsp;**}**


<a name="reference.okserver-class.methods"></a>
#### Methods

-   **addForbiddenPath( path )** - Adds a forbidden path to the server. This path is not accessible for the client.
    - **path** string
    - **return value**: *OKServer*

-   **addMimeType( fileExtension, type )** - Adds a new type into the server's supported MIME types list.
    - **fileExtension** *string*
    - **type** *string*
    - **return value**: *OKServer*

-   **addPermittedPath( path )** - Adds a permitted path to the server. It is only meaninful if the parent of the added path is a forbidden path.
    - **path** *string*
    - **return value**: *OKServer*
<a name="reference.okserver-class.methods.addVirtualDirectory"></a>
-   **addVirtualDirectory( params )** - Adds a new virtual directory to the server and associates a request handler for it.
    - **params** *object*
        - **name** *string*
        - **path** *string*
        - **handlerName** *string*, default: "default"
    - **return value**: [*VirtualDirectory*](#reference.virtualdirectory-class) - If the *path* 
            parameter is included and the folder contained by the parameter does not exist, the reurn value is *undefined*.
<a name="reference.okserver-class.methods.extendApi"></a>
-   **extendApi(apiExtensionModule)** - Extends the API system with new api extension modules.
    - **apiExtensionModule** *string* - The name of the module or *array* of module names as string values
    - **return value**: *OKServer*
<a name="reference.okserver-class.methods.getRemoteIp"></a>
-   **getRemoteIp( request )** - Solves the remote IP address of the http request.
    - **request**     *http.IncomingMessage*
    - **return value**: *string*

<a name="reference.okserver-class.methods.getVirtualDirectory"></a>
-   **getVirtualDirectory(name)** - Returns a virtual directory by it's name.
    - **name** *string*
    - **return value**: [*VirtualDirectory*](#reference.virtualdirectory-class)

-   **getVirtualDirectoryPath( name )** - Returns the path of the virtual directory by the name of the directory.
    - **name** *string*
    - **return value**: *string*

-   **isForbidden(url) -> boolean** - Indicates whether the url points to a forbidden path.
    - **return value**: *boolean*
    
-   **isPermitted(url) -> boolean** - Indicates whether the url points to a permitted path.
    - **return value**: *boolean*
<a name="reference.okserver-class.methods.loadHandler"></a>
-   **loadHandler( module|modulename )** - Loads a new request handler module
    - **module** *string* - The name of the module or *module*
    - **return value**: *OKServer*

-   **removeMimeType(ext)** - Removes a MIME type from the list of the supported MIME types.
    - **return value**: *OKServer*
<a name="reference.okserver-class.methods.setResponseCookie"></a>
-   **setResponseCookie( response, cookie, encoder )** - Adds a cookie to the Http response by adding a Set-Cookie header.
    - **response:** *http.ServerResponse*
<a name="reference.okserver-class.methods.setResponseCookie.cookie"></a>
    - **cookie** *object|array* - Cookie object or array of cookie objects.
        - **name** *string*, mandatory
        - **value** *string*, default: "" (encoded with the encodeURIComponent function)
        - **path** *string*, default: "/"
        - **domain** *string*
        - **expires** *Date*
        - **expirationDays** *number*
        - **maxAge** *number*
        - **httpOnly** *boolean*
        - **sameSite** *boolean* (true: "strict", false: no sameSite attribute) or string ("strict"/"lax")
        - **secure** *boolean*
<a name="reference.okserver-class.methods.setResponseCookie.encoder"></a>
    - **encoder** *function*, default: encodeURIComponent

-   **start( params )** - Starts the server i.e. the *http.Server* or *https.Server* or both.
    -   **params**  *object*
        - **onError** *function(error)* - Called in the case of error.
        - **onSuccess** *function()* - Called when server is started listening.
    
-   **stop( onStop )** - Stops the server.
    - **onStop** *function()* - Called when server is stopped listening.

-   **onApiApi( onError, onSuccess, context, iface )** - An event method that is triggered just before the response to the request [*api*](#api-system.pre-defined-api-requests.api) is sent.
Provides an opportunity to modify API specifications, for example, to complete api documentation. Overwrite this in child class.
    - **onError** *function(error)* - To be called in the case of error.
    - **onSuccess** *function(alteredIface)* - The function must be called in order for the http response to be sent.
    - **context** *Context* - see requesthandler-api.js
    - **iface** *object* - API definitions object
<a name="reference.ok-server-class.methods.onApiGetConfig"></a>
-   **onApiGetConfig( onError, onSuccess, context, config )** - An event method that is triggered just before the response to the request 
        [*getConfig*](#api-system.pre-defined-api-requests.getconfig) is sent.
        Provides the opportunity to complete the configuration data sent to the client. Overwrite this in child class.
    - **onError** *function(error)* - To be called in the case of error.
    - **onSuccess** *function(alteredConfig)* - The function must be called in order for the http response to be sent.
    - **context** *Context* - See requesthandler-api.js
    - **config** *object* - Configuration object that will be delivered as the response to the client's [*getConfig*](#api-system.pre-defined-api-requests.getconfig) request.

-   **onHttpReady()** - An event method that is triggered when httpServer is started listening. Overwrite this in child class.

-   **onHttpsReady()**  - An event method that is triggered when httpsServer is started listening. Overwrite this in child class.

-   **onRequest(context)** - An event method that is triggered before the actual handling of the request. Overwrite this in child class.
    - **context**     *RequestContext* - The [*RequestContext*](#reference.requestcontext-class) object.
    
-   **onResponse( context, params )** - An event method that is triggered the actual sending of the response. Overwrite this in child class.
    - **context** *RequestContext* - The [*RequestContext*](#reference.requestcontext-class) object.
    - **params.status** *number* - The Http Status code.
    - **params.headers** *objects*, Http response headrers.
    - **params.body** *string/stream.Readable* - The content for the response body.
       

<a name="reference.okserver-class.properties"></a>
#### Properties

-   **apiEntryPoint**       *string* - API entry point. Default is "api".
-   **apiExtensions**       *array* (readonly) - Full names of the API extension mofule files to be loaded before the server starts. 
-   **defaultDirectory**    *string* - Full folder name of the default directory.
-   **defaultDocument**     *string* - Default document.
-   **httpServer**          *http.Server* (readonly) - Node.js *http.Server* object. Property is undefined if the *port* option is set as 0.
-   **httpsOptions**        *object* (readonly) - Server options as object.
-   **httpsServer**         *https.Server* (readonly)  - Node.js *https.Server* object. Property is undefined if the *sslPort* option is set as 0.
-   **logApiRequests**      *boolean* - Indicates whether API requests are written in to the log file.
-   **logFileRequests**     *boolean* - Indicates whether file requests are written in to the log file.
-   **mimeTypes**           *object* (readonly) - Includes MIME types the server is supporting.
-   **port**                *number* - *http.Server* port number .
-   **sslPort**             *number* - *https.Server* port number.
    


<a name="reference.virtualdirectory-class"></a>
### VirtualDirectory class

<a name="reference.virtualdirectory-class.initialization"></a>
#### Initialization

VirtualDirectory objects are initialized by the OKServer and are accessible with
the method [*getVirtaulDirectory*](#reference.okserver-class.methods.getVirtualDirectory).

<a name="reference.virtualdirectory-class.properties"></a>
#### Properties
 
-   **name**        *string* - Name of the virtual directory.
-   **path**        *string* - Virtual directory path.
-   **handler**     *RequestHandler* - The [request handler](#reference.requesthandler-class) associated to the virtual directory.
-   **handlerName** *string* - The name of the handler associated to the virtual directory.

           

<a name="reference.context-class"></a>
### Context class

<a name="reference.context-class.initialization"></a>
#### Initialization

Context objects are initialized by the OKServer's API System and passed to a API services'
worker functions as the first parameter (and also as #this# keyword if the worker function is not an array function).

<a name="reference.context-class.properties"></a>
#### Properties

-   **cookies**             *object* - Request cookies as an object.
-   **httpRequest**         *http.IncomingMessage* - Request as the node.js IncomingMessage object.
-   **httpResponse**        *http.ServerResponse* - Response as the node.js ServerResponse object.
-   **onError**             *callback function(Error)* - A callback function to be called in the case of error.
-   **onSuccess**           *callback function(responseContent)* - A callback function to be called in the case of success. 
        The responseContent parameter will be assigned as the value of the content property of the API response object.
-   **request**             *reuest* API request object as it is in http request body.
-   **requestHandler**      *ApiRequestHandler* - ApiRequestHandler object.
-   **requestName**         *string* - The name of the request made by a client.
-   **server**              *OKServer* - The instance of OKServer.
-   **started**             *number* - The request time as milliseconds (Date().getTime()).



<a name="reference.requestcontext-class"></a>
### RequestContext class

<a name="reference.requestcontext-class.initialization"></a>
#### Initialization

RequestContext objects are initialized by the OKServer on every client request and passed to 
the appropriate request handler as the only parameter of the onRequest method.

<a name="reference.requestcontext-class.properties"></a>
#### Properties

-   **cookies**       *object* - Requests cookies.
-   **handler**       *RequestHandler* - Request Handler object.
-   **handlerName**   *string* - Name of the Request Handler serving the request.
-   **path**          *string* - The full path in request URL.
-   **pathName**      *string* - The pathname in request URL.
-   **request**       *http.IncomingMessage* - Request as the node.js IncomingMessage object.
-   **response**      *http.ServerResponse* - Response as the node.js ServerResponse object.
-   **server**        *OKServer* - The instance of the OKServer.
-   **url**           *object* - Server's url parsed to the node.js URL object.
-   **virtualDirectory** *VirtaulDirectory* - The virtual direcory object the request url pathname points to.


<a name="reference.requestcontext-class.methods"></a>
#### Methods

-   **setResponseCookie( cookie, encoder )** - Adds a cookie to the Http response by adding a Set-Cookie header.
    - **cookie** *object|array* - See [*OKServer.setResponseCookie()*](#reference.okserver-class.methods.setResponseCookie.cookie)
    - **encoder** *function*,  - See [*OKServer.setResponseCookie()*](#reference.okserver-class.methods.setResponseCookie.encoder)


<a name="reference.module-requesthandler"></a>
### Module requesthandler

<a name="reference.module-requesthandler.functions"></a>
#### Functions

-   **requesthandler.getHandler( handlerName )** - Get the Request Handler object by it's name.
    - **handlerName**     *string* - Name of the handler.
    - **Return value**: *object* - Request Handler object inherited from RequestHandler.

<a name="reference.module-requesthandler.properties"></a>
#### Properties

-   **RequestHandler** *class RequestHandler* - The RequestHandler class for the Request Handler inheritance.


<a name="reference.requesthandler-class"></a>
### RequestHandler class

<a name="reference.requesthandler-class.initialization"></a>
#### Initialization

Objects inherit from *RequestHandler* are instantiated by the OKServer when 
[*loadHandler*](#reference.okserver-class.methods.loadHandler) method is called.

<a name="reference.requesthandler-class.properties"></a>
#### Properties

-   **options**     *object* - Shortcut to [OKServer.options](#reference.okserver-class.options)
-   **server**       *OKServer* - OKServer object.

<a name="reference.requesthandler-class.methods"></a>
#### Methods

-   **getRemoteIp( request )** - Shortcut to [OKServer.getRemoteIp()](#reference.okserver-class.methods.getRemoteIp).
    - **request**     *http.IncomingMessage*
    - **Return value**: *string* - IP address as string.

-   **sendResponse( context, params )** - Sends response to the client.
    - **context**: *RequestContext* - [RequestContext](#reference.requestcontext-class) object.
    - **params**  *object*
        - **status** *number*  - The Http Status code. Default value is 200.
        - **headers** *objects* - Http response headrers. Default value is {}.
        - **body** *string/stream.Readable* - The content for the response body. Default value is undefined (means that the response body is not included).

-   **setResponseCookie( response, cookies, encoder )**  - See [*OKServer.setResponseCookie()*](#reference.okserver-class.methods.setResponseCookie)

-   **solveMimeName( extension )** - Get MIME Type by file extension.
    - **extension** *string* - File extension.
    - **Return value**: *string* - MIME type.

-   **onRequest( context )** - OKServer calls this method for every client request addressed to the handler of the method. onRequest should handle sending of a response to the client.
    - **context**     *RequestContext* - [RequestContext](#reference.requestcontext-class) object.

-   **decodeURI( uri )**
    - **uri**     *string*  - URI string.
    - **Return value**: *string* - Decoded URI string.


\
<a name="examples"></a>
## Examples

later...

