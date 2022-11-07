// import KubeApi from "./src/kube-api";
var KubeApi = require("./src/kube-api");
var eventCallback = require("./src/eventCallback");
var ws = require("nodejs-websocket")
const random = require('string-random');

var getKubeAPi = () => {
    // console.log(KubeApi)
    let token = "eyJhbGciOiJSUzI1NiIsImtpZCI6IklJUHdpWFZIWTZVWHl6ZVRYRGJiYjdMb2Z2bVFMcGdfb0RiMHB1SjVleWcifQ.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9uYW1lc3BhY2UiOiJzeXN0ZW0tZGVmYXVsdCIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VjcmV0Lm5hbWUiOiJzZXJ2aWNlLW1hbmFnZXItc2VjcmV0Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZXJ2aWNlLWFjY291bnQubmFtZSI6InNlcnZpY2UtbWFuYWdlciIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VydmljZS1hY2NvdW50LnVpZCI6ImZmOWUxYTMwLWE5MmItNDk5ZC05MDk0LTE4MjNjYTZhMGE0OCIsInN1YiI6InN5c3RlbTpzZXJ2aWNlYWNjb3VudDpzeXN0ZW0tZGVmYXVsdDpzZXJ2aWNlLW1hbmFnZXIifQ.h00SOOev0RhRvhsXmvev9Q4f_eNxndLxl3nb6ZMiOzHBJEQyTQBuz5gX5k5KbfMLd58B1x_P3yJ1QYSWbyn2_E3zkXzx8r_is2Sae1_lHzAHPFD294TJkbNKCNSNMdOFPtMpN8CFhY1xVSr3bw65QGJiA7z-ZQW7F_hAu41PLWdQRkY-87-89wqYc_PG1WFhp3JYAgW9-QnSjha253JWK1SrCuq1cWIU4CXe194bXVBH-TjiKV3w4v-q0W2dgnFEma-UmjWQ7nifgE8cIV5ayieZ4NYbCRsqAfOarXclPgUpOS1oacZWu0bCbdM4UghQyS2hYI61f7zYzuXCXnPxuw";
    return new KubeApi('kube-api.huoxingqianli.cn',6443,token);
}
let connections = {};
console.log("Server Started");
ws.createServer((conn) => {
    let connectionId = random(32);
    connections[connectionId] = {
        conn: conn,
        connectionId: connectionId,
        origin:conn.headers.origin,
        "user-agent":conn.headers["user-agent"],
    };
    let regex = /\/(.*)\/(.*)\/(.*)\/(.*)/;
    let route = conn.path.match(regex);
    let workspace = route[1] // workspace;
    let namespace = route[2] // namespace;
    let channelName = route[3] // channelName;
    let ConnectionKey = route[4] // ConnectionKey;
    // 检查企业空间
    getKubeAPi().request(`/apis/service.manager/v1/workspace/${workspace}`).then((workspace_res)=>{
        if(JSON.parse(workspace_res).code===404){
            console.warn(`工作空间:${workspace}不存在`)
            conn.close();
            return;
        }
        console.log(`工作空间:${workspace}存在`)
        // 检查命名空间
        getKubeAPi().request(`/apis/service.manager/v1/group/${namespace}`).then((namespace_res)=>{
            if(JSON.parse(namespace_res).code===404){
                console.warn(`命名空间:${workspace}不存在`)
                conn.close();
                return;
            }
            console.log(`命名空间:${workspace}存在`)
            // 检查通道
            getKubeAPi().request(`/apis/service.manager/v1/namespaces/${workspace}-${namespace}/webstocket-channel/${channelName}`).then((channel_res)=>{
                if(JSON.parse(channel_res).code===404){
                    console.warn(`通信通道:${channelName}不存在`)
                    conn.close();
                    return;
                }
                connections[connectionId].channel = JSON.parse(channel_res);
                console.log(`通信通道:${channelName}存在`)
                new eventCallback().send(JSON.parse(channel_res).spec.event.onOpen,{
                    event:'onOpen',
                    ConnectionKey:ConnectionKey,
                    channelName:channelName,
                    connectionId:connectionId,
                    origin:conn.headers.origin,
                    "user-agent":conn.headers["user-agent"],
                    workspace:workspace,
                    namespace:namespace,
                })
                // console.log(JSON.parse(channel_res).spec.event);
            })
        })
    })
    console.log(`<---------新建连接:${connectionId}--------->`)
    conn.on("text", function (str) {
        console.log(`<-----------接收数据:${str}-------->`)
        // console.log(str);
        new eventCallback().send(connections[connectionId].channel.spec.event.onMessage,{
            event:'onMessage',
            ConnectionKey:ConnectionKey,
            channelName:channelName,
            connectionId:connectionId,
            origin:conn.headers.origin,
            "user-agent":conn.headers["user-agent"],
            workspace:workspace,
            namespace:namespace,
            body:str
        })
    })
    conn.on("close", function (code, reason) {
        console.log(`<---------连接关闭:${connectionId}---------->`)
        new eventCallback().send(connections[connectionId].channel.spec.event.onClose,{
            event:'onClose',
            ConnectionKey:ConnectionKey,
            channelName:channelName,
            connectionId:connectionId,
            origin:conn.headers.origin,
            "user-agent":conn.headers["user-agent"],
            workspace:workspace,
            namespace:namespace
        })
    })
}).listen(8001)
const http = require('http');

const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer((req, res) => {
    // 发送消息
    req.on('data',(data)=>{
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        let requestData = JSON.parse(data.toString());
        if(typeof connections[requestData.connectionId] !== "object"){
            res.end(JSON.stringify({"status":"链接不存在"}));
            return;
        }
        if(connections[requestData.connectionId].channel.spec.channelKey!==requestData.channelKey){
            res.end(JSON.stringify({"status":"通道秘钥错误"}));
            return;
        }
        if(req.url==='/sendMessage'){
            connections[requestData.connectionId].conn.sendText(requestData.body);
            res.end(JSON.stringify({"status":"Success"}));
        }else if(req.url==='/closeConnection'){
            // 关闭连接
            connections[requestData.connectionId].conn.close();
            connections[requestData.connectionId] = undefined;
            res.end(JSON.stringify({"status":"Success"}));
        }
    })
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});