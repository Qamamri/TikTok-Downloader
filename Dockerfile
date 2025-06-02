FROM node:20

# Install yt-dlp
RUN apt-get update && \
    apt-get install -y wget ffmpeg && \
    wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# Create app directory
WORKDIR /app

# Copy files
COPY package*.json ./
RUN npm install
COPY . .

# Expose the port Railway expects
ENV PORT=3000
EXPOSE 3000

# Start the app
CMD ["npm", "start"]
