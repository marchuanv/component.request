const componentRequest = require("./component.request.js");
const logging = require("logging");
logging.config([ "Sending Request" ]);
(async()=>{

    await componentRequest.send({
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

    await componentRequest.send({
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
       
})().catch((err)=>{
    console.error(err);
});