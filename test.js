const componentRequest = require("./component.request.js");
const componentRequestSecure = require("component.request.secure");
const logging = require("logging");
logging.config([  "Request Listener", "Sending Secured Request", "Sending Request","Receiving Request",  "Handling Request", "Handling Secure Request"]);
(async()=>{
    
    const { hashedPassphrase, salt } = componentRequestSecure.hashPassphrase("secure1");

    componentRequest.listen( {privatePort: 5000 });
    componentRequest.handle({ publicHost: "localhost", publicPort: 5000, privatePort: 5000, path:"/test", security:{ username: "admin1", hashedPassphrase, hashedPassphraseSalt: salt }, callback: async () => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ contentType: "text/plain", data: "Hello World From Port 6000"});
            },2000);
        });
    }});

    let { headers, statusCode, data } = await componentRequest.send({
        host: "localhost", 
        port: 5000, 
        path: "/test", 
        method:"POST", 
        headers: { 
            "Content-Type":"text/plain", 
            username: "admin1", 
            passphrase: "secure1",
            fromhost: "localhost",
            fromport: 6000
        }, 
        data: "Hello World From Client" 
    });
    if (statusCode === 200){
        console.log("CLIENT SEND RESULTS: ",data);
        ({ statusCode, data } = await componentRequest.send({
            host: "localhost", 
            port: 5000, 
            path: "/test", 
            method:"POST", 
            headers: { 
                "Content-Type":"text/plain", 
                token: headers.token,
                encryptionkey: headers.encryptionkey
            }, 
            data: "Hello World From Client" 
        }));
        if (statusCode === 200){
            console.log("CLIENT SEND RESULTS: ",data);
        } else {
            throw new Error(`TEST FAILED: http status ${statusCode}`);
        }
    } else {
        throw new Error(`TEST FAILED: http status ${statusCode}`);
    }
       
})().catch((err)=>{
    console.error(err);
});