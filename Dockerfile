FROM node:20

RUN apt update && apt install -y yt-dlp ffmpeg

WORKDIR /app
COPY . .
RUN npm install

CMD ["node", "server.js"]
