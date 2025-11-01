FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application files
COPY . .

# Expose Vite dev server port
EXPOSE 8080

# Start development server with host flag to accept connections from outside container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

