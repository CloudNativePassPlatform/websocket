module.exports = class KubeApi {
    constructor(host, port, token) {
        this.host = host;
        this.port = port;
        this.token = token;
    }
    merge(def, obj) {
        if (!obj) {
            return def;
        }
        else if (!def) {
            return obj;
        }

        for (var i in obj) {
            // if its an object
            if (obj[i] != null && obj[i].constructor == Object)
            {
                def[i] = merge(def[i], obj[i]);
            }
            // if its an array, simple values need to be joined.  Object values need to be re-merged.
            else if(obj[i] != null && (obj[i] instanceof Array) && obj[i].length > 0)
            {
                // test to see if the first element is an object or not so we know the type of array we're dealing with.
                if(obj[i][0].constructor == Object)
                {
                    var newobjs = [];
                    // create an index of all the existing object IDs for quick access.  There is no way to know how many items will be in the arrays.
                    var objids = {}
                    for(var x= 0, l= def[i].length ; x < l; x++ )
                    {
                        objids[def[i][x].id] = x;
                    }

                    // now walk through the objects in the new array
                    // if the ID exists, then merge the objects.
                    // if the ID does not exist, push to the end of the def array
                    for(var x= 0, l= obj[i].length; x < l; x++)
                    {
                        var newobj = obj[i][x];
                        if(objids[newobj.id] !== undefined)
                        {
                            def[i][x] = merge(def[i][x],newobj);
                        }
                        else {
                            newobjs.push(newobj);
                        }
                    }

                    for(var x= 0, l = newobjs.length; x<l; x++) {
                        def[i].push(newobjs[x]);
                    }
                }
                else {
                    for(var x=0; x < obj[i].length; x++)
                    {
                        var idxObj = obj[i][x];
                        if(def[i].indexOf(idxObj) === -1) {
                            def[i].push(idxObj);
                        }
                    }
                }
            }
            else
            {
                if (isNaN(obj[i]) || i.indexOf('_key') > -1){
                    def[i] = obj[i];
                }
                else{
                    def[i] += obj[i];
                }
            }
        }
        return def;
    }
    request(api,method='GET',headers={},body='') {
        const options = {
            hostname: this.host,
            port: this.port,
            path: api,
            headers: this.merge({
                // 'Content-Type': 'application/json',
                // 'Content-Length': 0,
                'authorization': `Bearer ${this.token}`
            },headers),
            timeout:30,
            method:method,
            rejectUnauthorized: false
        };
        return new Promise((resolve, reject) => {
            const http = require('https');
            let client = http.request(options, (res) => {
                var data = '';
                res.setEncoding('utf8');
                res.on('data', function (chunk) {
                    data += chunk;
                });
                res.on('end', function () {
                    resolve(data);
                });
                res.on('error',function(error){
                    reject(error)
                });
            });
            if(method!=='GET' && body.length>=1){
                client.write(body);
            }
            client.end();
            client.on('error',(e)=>{
                console.log(`<-----------KubeApi请求失败:${e.message}----------->`)
                console.log(e)
            })
        })
    }
}