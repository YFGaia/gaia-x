FROM golang:alpine as builder

WORKDIR /go/src/github.com/YFGaia/gaia-x/apps/admin/server
COPY . .

RUN go env -w GO111MODULE=on \
    && go env -w GOPROXY=https://goproxy.cn,direct \
    && go env -w CGO_ENABLED=0 \
    && go env \
    && go mod tidy \
    && go build -o server .

 FROM alpine:latest

LABEL MAINTAINER="toxingwang@gmail.com"
# 设置时区
ENV TZ=Asia/Shanghai
RUN apk update && apk add --no-cache tzdata openntpd \
    && ln -sf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /go/src/github.com/YFGaia/gaia-x/apps/admin/server

COPY --from=0 /go/src/github.com/YFGaia/gaia-x/apps/admin/server/server ./
COPY --from=0 /go/src/github.com/YFGaia/gaia-x/apps/admin/server/resource ./resource/
COPY --from=0 /go/src/github.com/YFGaia/gaia-x/apps/admin/server/config.docker.yaml ./

# 复制llmadapter包
COPY --from=0 /go/src/github.com/YFGaia/gaia-x/apps/admin/server/service/llmadapter/config/llm ./service/llmadapter/config/llm
COPY --from=0 /go/src/github.com/YFGaia/gaia-x/apps/admin/server/service/llmadapter/rsa_keys ./service/llmadapter/rsa_keys

# 挂载目录：如果使用了sqlite数据库，容器命令示例：docker run -d -v /宿主机路径/gva.db:/go/src/github.com/YFGaia/gaia-x/apps/admin/server/gva.db -p 8888:8888 --name gva-server-v1 gva-server:1.0
# VOLUME ["/go/src/github.com/YFGaia/gaia-x/apps/admin/server"]

EXPOSE 8888
ENTRYPOINT ./server -c config.docker.yaml
