FROM registry-harbor.yafex.cn/base/node:20-slim AS base
WORKDIR /app
COPY . .
RUN yarn config set registry https://registry.npmmirror.com \
    && yarn \
    && yarn build


FROM registry-harbor.yafex.cn/base/nginx:alpine
LABEL MAINTAINER="toxingwang@gmail.com"

# 创建nginx配置目录
RUN mkdir -p /etc/nginx/conf.d

# 添加nginx配置
COPY ./.docker-compose/nginx/my.conf /etc/nginx/conf.d/my.conf

# 复制构建好的文件
COPY --from=base /app/dist /usr/share/nginx/html

# 检查文件
RUN ls -al /usr/share/nginx/html

# nginx默认暴露8080端口
EXPOSE 8080

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/ || exit 1 