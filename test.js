const component = require("./component.request.js");
const componentSecure = require("component.request.secure");
const logging = require("logging");
logging.config(["Component Client","Component Server","Component Secure Client","Component Secure Server"]);
(async()=>{
    
    const { hashedPassphrase, salt } = componentSecure.http.secure.hashPassphrase("secure1");
    component.http.handle({ publicHost: "localhost", publicPort: 5000, privatePort: 5000, path:"/test", security:{ username: "admin1", hashedPassphrase, hashedPassphraseSalt: salt }, callback: async () => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ contentType: "text/plain", data: "Hello World From Port 6000"});
            },2000);
        });
    }});

    let { headers, statusCode, data } = await component.http.send({
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
        // ({ statusCode, data } = await component.http.send({
        //     host: "localhost", 
        //     port: 5000, 
        //     path: "/test", 
        //     method:"POST", 
        //     headers: { 
        //         "Content-Type":"text/plain", 
        //         token: headers.token,
        //         encryptionkey: headers.encryptionkey
        //     }, 
        //     data: "Hello World From Client" 
        // }));
        // if (statusCode === 200){
        //     console.log("CLIENT SEND RESULTS: ",data);
        // } else {
        //     throw new Error(`TEST FAILED: http status ${statusCode}`);
        // }
    } else {
        throw new Error(`TEST FAILED: http status ${statusCode}`);
    }
       
})().catch((err)=>{
    console.error(err);
});