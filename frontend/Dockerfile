FROM node:20-alpine

# Create and change to the app directory
WORKDIR /app

# Copy package.json and yarn.lock
COPY package.json yarn.lock ./

# Install dependencies using Yarn
RUN yarn install

# Copy the rest of the application files
COPY . .

# Build the application for production
RUN yarn build

# Expose the frontend port
EXPOSE 5173

# Start the Vite development server
CMD ["yarn", "dev"]
