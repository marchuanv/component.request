const http = require("http");
const component = require("component");
let sendRequest;
component.register(module).then(({ request }) => {
    const { host, port } = request;
    sendRequest = ({ path, method, headers, data, retryCount = 1 }) => {
        return new Promise((resolve, reject) => {
            const requestUrl = `${host}:${port}${path}`;
            if (typeof data !== "string"){
                request.log(`input data provided for ${requestUrl} is not a string`);
                return reject("data provided is not a string");
            }
            delete headers["content-length"];
            headers["Content-Length"] = Buffer.byteLength(data);
            request.log(`sending request to ${requestUrl}`);
            const req = http.request({ host, port, path, method, timeout: 30000, headers }, (response) => {
                response.setEncoding('utf8');
                let rawData="";
                response.on('data', (chunk) => {
                    rawData += chunk;
                });
                response.on('end',() => {
                    request.log(`recieved response from ${requestUrl}`);
                    resolve({ data: rawData, headers: response.headers, statusCode: response.statusCode, statusMessage: response.statusMessage });
                });
            });
            req.on('error', async (error) => {
                request.log(`error sending request retry ${retryCount} of 3`, error);
                retryCount = retryCount + 1;
                if (retryCount <= 3){
                    const res = await sendRequest({ path, method, headers, data, retryCount });
                    resolve(res);
                } else {
                    resolve({ data: error, headers: req.headers, statusCode: 500, statusMessage: "Connection Error" });
                }
            });
            req.write(data);
            req.end();
        });
    }
});
module.exports = { 
    send: async ({ path, method, headers, data }) => {
        return await sendRequest({ path, method, headers, data });
    }
};