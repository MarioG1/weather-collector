FROM node:18-alpine
ENV NODE_ENV=production

WORKDIR /app
COPY ["package.json", "package-lock.json*", "./"]

RUN npm install --omit=dev

COPY build/ .

CMD ["node", "index.js"]
