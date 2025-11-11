FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Copy the database file
COPY medications.db ./

# Expose port
EXPOSE 5000

# Start the application
CMD ["node", "server.js"]