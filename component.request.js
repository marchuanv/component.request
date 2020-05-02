const http = require("http");
const logging = require("logging");
const component = require("component.secure");
const deferredRequests = [];

const startHttpServer = async ({ privatePort }) => {
    const http = require('http');
    const httpServer = http.createServer();
    httpServer.on("request", (request, response)=>{
        let body = '';
        request.on('data', chunk => {
            body += chunk.toString(); // convert buffer to string
        });
        request.on('end', async () => {
            let res = { headers: {} };
            const host = request.headers["host"].split(":")[0];
            const port = Number(request.headers["host"].split(":")[1]) || 80;
            logging.write("Component Server",`retrieved host: ${host} and port: ${publicPort} from header.`);
            const requestUrl = `${host}:${publicPort}${request.url}`;
            logging.write("Component Server",`received request for ${requestUrl}`);

            try {
                res = await component.http.secure.handle({ 
                    host, 
                    publicPort, 
                    path: request.url, 
                    requestHeaders: request.headers, 
                    requestData: body, 
                    callback: ({data, fromhost, fromport }) => {
                        return new Promise(async (resolve) => {
                            const deferredRequestIndex = deferredRequests.findIndex(dr => dr.fromhost === fromhost && dr.fromport === fromport && dr.path === request.url);
                            if (deferredRequestIndex > -1){
                                const deferredRequest = deferredRequests.splice(deferredRequestIndex,1)[0];
                                if (deferredRequest){
                                    deferredRequest.results.statusCode = 200;
                                    resolve(deferredRequest.results);
                                } else {
                                    resolve({});
                                }
                            } else {
                                const handler = module.exports.http.handlers.find( h => h.publicHost === publicHost && h.publicPort === publicPort && h.path ===  request.url);
                                let results;
                                let isDeferred = false;
                                const id = setInterval(()=>{
                                    if (results){
                                        clearInterval(id);
                                        if (isDeferred === true){
                                            deferredRequests.push({ fromhost, fromport, path: request.url, results });
                                        } else {
                                            results.statusCode = 200;
                                            resolve(results);
                                        }
                                    } else {
                                        if (isDeferred === false){
                                            logging.write("Component Server",`deferring ${requestUrl} request`);
                                            isDeferred = true;
                                            resolve({ data: "Request Deferred", contentType: "text/plain", statusCode: 202 });
                                        }
                                    }
                                },1000);
                                results = await handler.callback({data, fromhost, fromport });
                            }
                        });
                    }
                });
            } catch(err) {
                logging.write("Component Server"," ", err.toString());
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
    logging.write("Component Server", `listening on port ${privatePort}`);
};

const handleRequest =  ({ publicHost, publicPort, privatePort, path, security, callback }) => {
    module.exports.http.handlers.push({ publicHost, publicPort, path, callback });
    component.http.handlers.push({ publicHost, publicPort, path, security });
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

const sendRequest = async ({ host, port, path, method, headers, data, retryCount = 1 }) => {
    const requestUrl = `${host}:${port}${path}`;
    logging.write("Component Client",`sending request to ${requestUrl}`);
    let results = await component.http.secure.send({ host, port, path, requestHeaders: headers, data, callback: async ({ requestHeaders, data }) => {
        return await httpRequest({ host, port, path, method, headers: requestHeaders, data });
    }});
    logging.write("Component Client",`received response from ${requestUrl}`);
    if (results.error || results.statusCode === 202) {
        logging.write("Component Client",`request was deferred or failed, retrying ${retryCount} of 3`);
        if (retryCount === 3){
            if (results.error ) {
                throw results.error;
            }
            if (results.statusCode === 202){
                const message = `deferred request for ${requestUrl} did not finish.`;
                logging.write("Component Client",message);
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
        start: startHttpServer,
        handlers: []
    }
};