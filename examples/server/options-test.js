const okserver = require( "/www/ok-server" );
const options = okserver.defaultOptions;
options.port = 3099;
options.defaultDirectory = "/sites/my-test";
options.mimeTypes[".mp3"] = "audio/mpeg";
options.mimeTypes[".wav"] = "audio/x-wav";
okserver.createServer({
    optionsFile: __dirname + "/options-test.json"
});
