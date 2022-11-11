#### 基于kubernetes 的 WebSocket 通信中间件
> 
> 负责完成 Server 常驻进程
> 
> 负责 `onOpen` `onMessage` `onClose` 相关事件任务通知
>
> 负责 `sendMessage` `closeConnection` 相关连接信息处理
>

#### 组件安装
```bash
kubectl apply -f https://raw.githubusercontent.com/CloudNativePassPlatform/websocket/master/install.yaml
```

#### 路由配置
```bash
kubectl apply -f https://raw.githubusercontent.com/CloudNativePassPlatform/websocket/master/ingress.yaml
```

#### 连接地址
> 
> 格 [ws|wss]://ingress-host/workspace/namespace/channelName/ConnectionKey
>
> 示例 wss://socket.domain.com/demo-enterprise/demo-namespace/demo-channel/123321123
>

#### 通道创建

```bash
kubectl apply -f ./demo-channel.yaml
```

```yaml
apiVersion: service.manager/v1
kind: WebStocketChannel
metadata:
  # 通道名称
  name: demo
  # 命名空间
  namespace: huoxingqianli-php-group
spec:
  # 通道Key 用于指令Server交互授权
  channelKey: "7982798319129837892739812"
  event:
    # 连接成功 回调事件 可在回调内校验ConnectionKey
    onOpen:
      - url: http://192.168.33.2:7001/onOpen
        timeout: 30
        method: POST
    # 消息到达 回调事件 回调内可灵活处理业务逻辑
    onMessage:
      - url: http://192.168.33.2:7001/onMessage
        timeout: 30
        method: POST
    # 连接断开时 回调事件 用于业务系统下线以及清除遗留数据处理
    onClose:
      - url: http://192.168.33.2:7001/onClose
        timeout: 30
        method: POST
```

#### 指令服务

###### 发送消息
> \[http|https\]://socket.domain.com/sendMessage
>
> Content-Type: application/json
>
> ```json
> {
>     "channelKey":"7982798319129837892739812",
>     "connectionId":"1824781217635638",
>     "body":"你好这里是戒尺"
> }
> ```

###### 关闭连接
> \[http|https\]://socket.domain.com/closeConnection
>
> Content-Type: application/json
>
> ```json
> {
>     "channelKey":"7982798319129837892739812",
>     "connectionId":"1824781217635638"
> }
> ```