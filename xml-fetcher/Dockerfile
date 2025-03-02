# xml-fetcher/Dockerfile

FROM node:alpine3.21

# Set the working directory
WORKDIR /app

# Copy the package.json and package-lock.json
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install

# Copy the rest of the application code
COPY . .

# Compile TypeScript to JavaScript
RUN yarn tsc

# Set the command to run the fetch script
CMD ["npm", "start"]
