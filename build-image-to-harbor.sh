#!/usr/bin/env bash

set -e
cd /tmp
# 后端项目
rm -fR websocket
git clone git@github.com:CloudNativePassPlatform/websocket.git
cd websocket
docker login --username=河南货行千里 registry.cn-hangzhou.aliyuncs.com

docker build -t registry.cn-hangzhou.aliyuncs.com/huoxingqianli/websocket:$@ .

docker push registry.cn-hangzhou.aliyuncs.com/huoxingqianli/websocket:$@