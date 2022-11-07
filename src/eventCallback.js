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
            const http = require('http');
            let client = http.request(options,function(res){
                var data = '';
                res.setEncoding('utf8');
                res.on('data', function (chunk) {
                    data += chunk;
                });
                res.on('end', function () {
                    console.log('回调完成')
                    console.log(data)
                });
                res.on('error',function(error){
                    console.log(error);
                });
            })
            client.write(JSON.stringify(data));
            client.end();
        });
    }
}