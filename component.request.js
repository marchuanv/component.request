const http = require("http");
const logging = require("component.logging");
module.exports = { 
    send: ({ host, port, path, method, headers, data, retryCount = 1  }) => {
        return new Promise((resolve, reject) => {
            
            const requestUrl = `${host}:${port}${path}`;

            if (typeof data !== "string"){
                logging.write("Sending Request",`input data provided for ${requestUrl} is not a string`);
                return reject("data provided is not a string");
            }
            
            delete headers["content-length"];
            headers["Content-Length"] = Buffer.byteLength(data);
            logging.write("Sending Request",`sending request to ${requestUrl}`);
            const request = http.request({ host, port, path, method, timeout: 30000, headers }, (response) => {
                response.setEncoding('utf8');
                let rawData="";
                response.on('data', (chunk) => {
                    rawData += chunk;
                });
                response.on('end',() => {
                    logging.write("Sending Request",`recieved response from ${requestUrl}`);
                    resolve({ data: rawData, headers: response.headers, statusCode: response.statusCode, statusMessage: response.statusMessage });
                });
            });
            request.on('error', async (error) => {
                logging.write("Sending Request",`error sending request retry ${retryCount} of 3`, error);
                retryCount = retryCount + 1;
                if (retryCount <= 3){
                    const res = await module.exports.send({ host, port, path, method, headers, data, retryCount });
                    resolve(res);
                } else {
                    resolve({ data: error, headers: request.headers, statusCode: 500, statusMessage: "Connection Error" });
                }
            });
            request.write(data);
            request.end();
        });
    }
};
