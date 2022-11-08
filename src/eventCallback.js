module.exports = class eventCallback {
    constructor() {

    }
    send(eventItem,data){
        const { URL } = require('url');
        eventItem.forEach((v, i) => {
            let url = new URL(v.url);
            var options = {
                method: v.method,
                protocol: url.protocol,
                hostname: url.hostname,
                port: url.port,
                path: v.url,
                timeout: v.timeout,
                headers: {
                    "content-type": "application/json"
                }
            };
            console.log(`<----------开始通知----------->`)
            console.log(options)
            const http = require('http');
            let client = http.request(options,function(res){
                var response = '';
                res.setEncoding('utf8');
                res.on('data', function (chunk) {
                    response += chunk;
                });
                res.on('end', function () {
                    console.log(`<----------请求数据----------->`)
                    console.log(data)
                    console.log(`<----------响应数据----------->`)
                    console.log(response)
                });
                res.on('error',function(error){
                    console.log(error);
                });
            })
            client.write(JSON.stringify(data));
            client.end();
            client.on('error',(e)=>{
                console.log(`<-----------回调失败:${e.message}----------->`)
                console.log(data)
            })
        });
    }
}