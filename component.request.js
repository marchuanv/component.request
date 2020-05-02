const http = require("http");
const logging = require("logging");
const requestHandler = require("component.request.handler");
const componentRequestSecure = require("component.request.secure");

const startHttpServer = async ({ privatePort }) => {
    const http = require('http');
    const httpServer = http.createServer();
    httpServer.on("request", (request, response)=>{
        let body = '';
        request.on('data', chunk => {
            body += chunk.toString();
        });
        request.on('end', async () => {
            let res = { headers: {} };
            const host = request.headers["host"].split(":")[0];
            const port = Number(request.headers["host"].split(":")[1]) || 80;
            logging.write("Server Request",`retrieved host: ${host} and port: ${publicPort} from header.`);
            const requestUrl = `${host}:${publicPort}${request.url}`;
            logging.write("Server Request",`received request for ${requestUrl}`);
            try {
                res = await requestHandler.callback({ host, port, path: request.url, headers: request.headers, data: body });
            } catch(err) {
                logging.write("Server Request"," ", err.toString());
                const message = "Internal Server Error";
                res.statusCode = 500;
                res.statusMessage = message;
                res.headers = { "Content-Type":"text/plain", "Content-Length": Buffer.byteLength(message) };
                res.data = message;
            } finally {
                response.writeHead( res.statusCode, res.statusMessage, res.headers).end(res.data);
            }
        });
    });
    httpServer.listen(privatePort);
    logging.write("Server Request", `listening on port ${privatePort}`);
};

const httpRequest = ({ host, port, path, method, headers, data }) => {
    return new Promise((resolve) => {
        delete headers["content-length"];
        headers["Content-Length"] = Buffer.byteLength(data);
        const request = http.request({ host, port, path, method, timeout: 30000, headers }, (response) => {
            response.setEncoding('utf8');
            let rawData="";
            response.on('data', (chunk) => {
                rawData += chunk;
            });
            response.on('end',() => {
                resolve({ data: rawData, headers: response.headers, statusCode: response.statusCode, statusMessage: response.statusMessage });
            });
        });
        request.on('error', async (error) => {
            resolve({ error });
        });
        request.write(data);
        request.end();
    });
};

const handleRequest =  ({ publicHost, publicPort, privatePort, path, security, callback }) => {
    requestHandler.register({ publicHost, publicPort, privatePort, path, security, callback });
};

const sendRequest = async ({ host, port, path, method, headers, data, retryCount = 1 }) => {
    const requestUrl = `${host}:${port}${path}`;
    logging.write("Client Request",`sending request to ${requestUrl}`);
    let results = await componentRequestSecure.send({ host, port, path, requestHeaders: headers, data, callback: async ({ requestHeaders, data }) => {
        return await httpRequest({ host, port, path, method, headers: requestHeaders, data });
    }});
    logging.write("Client Request",`received response from ${requestUrl}`);
    if (results.error || results.statusCode === 202) {
        logging.write("Client Request",`request was deferred or failed, retrying ${retryCount} of 3`);
        if (retryCount === 3){
            if (results.error ) {
                throw results.error;
            }
            if (results.statusCode === 202){
                const message = `deferred request for ${requestUrl} did not finish.`;
                logging.write("Client Request",message);
                throw new Error(message);
            }
        }
        retryCount = retryCount + 1;

        for(const head in results.headers){
            headers[head] = results.headers[head];
        };
        results = await sendRequest({  host, port, path, method, headers, data, retryCount });
    }
    return results;
};

module.exports = { 
    http: { 
        handle: handleRequest, 
        send: sendRequest,
        startServer: startHttpServer
    }
};