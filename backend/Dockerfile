FROM node:24-slim

# Without this, Prisma can't detect the installed libssl version and
# silently falls back to the wrong engine binary variant.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json yarn.lock ./
COPY prisma ./prisma/

# Install app dependencies
RUN yarn install

COPY . .

RUN yarn build
# RUN npx prisma generate

# COPY entrypoint.sh /usr/local/bin/entrypoint.sh

EXPOSE 3000

# RUN chmod +x /usr/local/bin/entrypoint.sh

# ENTRYPOINT [ "/usr/local/bin/entrypoint.sh" ]

CMD [  "yarn", "start" ]
