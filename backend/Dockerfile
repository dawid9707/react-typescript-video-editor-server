# Obraz bazowy Node.js 22 na lekkim Alpine Linux
FROM node:22-alpine

# Instalacja systemowego pakietu FFmpeg (wraz z kodekami h264, x265, vpx, opus itp.)
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Kopiowanie definicji zależności
COPY package*.json ./

# Instalacja zależności produkcyjnych
RUN npm install --omit=dev

# Kopiowanie kodu aplikacji
COPY . .

# Tworzenie katalogu na pliki tymczasowe
RUN mkdir -p /tmp/freecut-renders && chmod 777 /tmp/freecut-renders

# Port aplikacji
EXPOSE 10000

CMD ["node", "index.js"]
