// import KubeApi from "./src/kube-api";
var KubeApi = require("./src/kube-api");
var eventCallback = require("./src/eventCallback");
var ws = require("nodejs-websocket")
const random = require('string-random');
const querystring = require('querystring');
var os = require("os")
let hostname = os.hostname();
var getKubeAPi = () => {
    const fs = require('fs');
    return new KubeApi('kubernetes.default.svc', 443, fs.readFileSync('/etc/token').toString());
}
let connections = {};
ws.createServer(async (conn) => {
    let regex = /\/(.*)\/(.*)\/(.*)\/(.*)/;
    let route = conn.path.match(regex);
    let workspace = route[1] // workspace;
    let namespace = route[2] // namespace;
    let channelName = route[3] // channelName;
    let ConnectionKey = route[4] // ConnectionKey;
    let connectionId = ''
    let connectionIdRand;
    do {
        connectionId = random(16, {
            numeric: true,
            letters: false,
            special: false,
        });
        connectionIdRand = JSON.parse(await getKubeAPi().request(`/apis/service.manager/v1/namespaces/${workspace}-${namespace}/websocket-connection/${workspace}-${namespace}-${channelName}-${connectionId}`));
    } while (typeof connections[connectionId] != 'undefined' || connectionIdRand.code !== 404);
    connections[connectionId] = {
        conn: conn,
        connectionId: connectionId,
        origin: conn.headers.origin,
        "user-agent": conn.headers["user-agent"],
    };

    // 检查企业空间
    let workspace_res = JSON.parse(await getKubeAPi().request(`/apis/service.manager/v1/workspace/${workspace}`));
    if (workspace_res.code === 404) {
        console.warn(`工作空间:${workspace}不存在`)
        conn.close();
        return;
    }
    console.log(`工作空间:${workspace}存在`)
    // 检查命名空间
    let namespace_res = await getKubeAPi().request(`/apis/service.manager/v1/group/${namespace}`);
    if (namespace_res.code === 404) {
        console.warn(`命名空间:${workspace}不存在`)
        conn.close();
        return;
    }
    console.log(`命名空间:${workspace}存在`)
    // 检查通道
    let channel_res = JSON.parse(await getKubeAPi().request(`/apis/service.manager/v1/namespaces/${workspace}-${namespace}/webstocket-channel/${channelName}`));
    if (channel_res.code === 404) {
        console.warn(`通信通道:${channelName}不存在`)
        conn.close();
        return;
    }
    connections[connectionId].channel = channel_res;
    console.log(`通信通道:${channelName}存在`)
    console.log(`<---------开始创建连接信息----------->`)
    let addConnection = await getKubeAPi().request(`/apis/service.manager/v1/namespaces/${workspace}-${namespace}/websocket-connection`, 'POST', {
        'Content-Type': 'application/json'
    }, JSON.stringify({
        'apiVersion': "service.manager/v1",
        'kind': "WebSocketConnection",
        'metadata': {
            'name': `${workspace}-${namespace}-${channelName}-${connectionId}`,
            'namespace': `${workspace}-${namespace}`,
            'labels': {
                'connectionId': connectionId,
                'workspace': workspace,
                'namespace': namespace,
                'channelName': channelName
            }
        },
        'spec': {
            'node': hostname,
            'channel': channelName,
            'uri': conn.path,
            'origin': conn.headers.origin
        }
    }))
    new eventCallback().send(connections[connectionId].channel.spec.event.onOpen, {
        event: 'onOpen',
        ConnectionKey: ConnectionKey,
        channelName: channelName,
        connectionId: connectionId,
        origin: conn.headers.origin,
        "user-agent": conn.headers["user-agent"],
        workspace: workspace,
        namespace: namespace,
    })
    console.log(`<---------新建连接:${connectionId}--------->`)
    conn.on("text", function (str) {
        console.log(`<-----------接收数据:${str}-------->`)
        new eventCallback().send(connections[connectionId].channel.spec.event.onMessage, {
            event: 'onMessage',
            ConnectionKey: ConnectionKey,
            channelName: channelName,
            connectionId: connectionId,
            origin: conn.headers.origin,
            "user-agent": conn.headers["user-agent"],
            workspace: workspace,
            namespace: namespace,
            body: str
        })
    })
    conn.on("close", async function (code, reason) {
        console.log(`<---------连接关闭:${connectionId}---------->`)
        new eventCallback().send(connections[connectionId].channel.spec.event.onClose, {
            event: 'onClose',
            ConnectionKey: ConnectionKey,
            channelName: channelName,
            connectionId: connectionId,
            origin: conn.headers.origin,
            "user-agent": conn.headers["user-agent"],
            workspace: workspace,
            namespace: namespace
        })
        getKubeAPi().request(`/apis/service.manager/v1/namespaces/${workspace}-${namespace}/websocket-connection/${connectionId}`,'DELETE')
    })
}).listen(8001, '0.0.0.0', () => {
    console.log(`WebSocket Server running at http://127.0.0.1:8001/`);
})
const http = require('http');
/**
 *
 * @type {Server<typeof IncomingMessage, typeof ServerResponse>}
 */
const server = http.createServer((req, res) => {
    // 发送消息
    req.on('data', async (data) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        let requestData = JSON.parse(data.toString());
        let action = '';
        let body = '';
        if (req.url === '/sendMessage') {
            action = 'sendMessage'
            body = requestData.body
        } else if (req.url === '/closeConnection') {
            // 关闭连接
            action = 'closeConnection'
        }
        let query = querystring.stringify({
            'connectionId': requestData.connectionId
        });
        let result = JSON.parse(await getKubeAPi().request(`/apis/service.manager/v1/websocket-connection?labelSelector=${query}&limit=1`))
        if (result.items.length <= 0) {
            res.end(JSON.stringify({"status": "链接不存在"}));
            return;
        }
        let [ConnectionInfo] = result.items;

        let ChannelInfo = JSON.parse(await getKubeAPi().request(`/apis/service.manager/v1/namespaces/${ConnectionInfo.metadata.namespace}/webstocket-channel/${ConnectionInfo.spec.channel}`))
        console.log(ChannelInfo)
        if (ChannelInfo.spec.channelKey !== requestData.channelKey) {
            res.end(JSON.stringify({"status": "通道秘钥错误"}));
            return;
        }

        console.log(`<---------------发布任务------------------>`)
        console.log(ConnectionInfo)
        /**
         * 发布任务
         */
        getKubeAPi().request(`/apis/service.manager/v1/namespaces/${ConnectionInfo.metadata.namespace}/websocket-connection-task`, 'POST', {
            'Context-Type': 'application/json'
        }, JSON.stringify({
            apiVersion: "service.manager/v1",
            kind: "WebSocketConnectionTask",
            metadata: {
                name: 'task-' + random(16, {
                    numeric: true,
                    letters: false,
                    special: false,
                }),
                namespace: ConnectionInfo.metadata.namespace,
                labels: {
                    node: ConnectionInfo.spec.node
                }
            },
            spec: {
                node: ConnectionInfo.spec.node,
                connectionId: requestData.connectionId,
                task: action,
                body: body
            }
        }))
        res.end(JSON.stringify({"status": "Success"}));
    })
});
server.listen(3000, '0.0.0.0', () => {
    console.log(`Message Server running at http://127.0.0.1:3000/`);
});
/**
 * 定时消费本节点的数据
 */
setInterval(async () => {
    let query = querystring.stringify({
        'node': hostname
    });
    let result = JSON.parse(await getKubeAPi().request(`/apis/service.manager/v1/websocket-connection-task?labelSelector=${query}&limit=1`))
    if (result.items.length <= 0) {
        return;
    }
    let [taskItem] = result.items;
    console.log(`<-----------------消费任务----------------->`)
    console.log(taskItem)
    if(typeof connections[taskItem.spec.connectionId] != 'undefined'){
        if (taskItem.spec.task === 'sendMessage') {
            connections[taskItem.spec.connectionId].conn.sendText(taskItem.spec.body);
        } else {
            connections[taskItem.spec.connectionId].conn.close();
            connections[taskItem.spec.connectionId] = undefined;
        }
    }else{
        console.log('<-------------连接信息错误----------->')
    }
    await getKubeAPi().request(`/apis/service.manager/v1/namespaces/${taskItem.metadata.namespace}/websocket-connection-task/${taskItem.metadata.name}`, 'DELETE')
}, 1000)