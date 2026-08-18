# Built directly (not via docker-compose): from the repo root, run
#   docker build -f docker/Dockerfile -t <image> .
# docker-compose.yml only runs the pre-built image pulled from ECR.

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --force
COPY angular.json tsconfig.json tsconfig.app.json ./
COPY src ./src
RUN npx ng build --configuration production

FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/Read-Spreadsheet /usr/share/nginx/html
