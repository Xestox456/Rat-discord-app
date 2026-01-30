FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm install --production

# Copy the rest of the bot
COPY . .

# Start the bot
CMD ["node", "index.js"]