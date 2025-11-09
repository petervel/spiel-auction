FROM node:18-alpine

# Create app directory
WORKDIR /app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json yarn.lock ./

# Install app dependencies
RUN yarn install --frozen-lockfile

COPY prisma ./prisma/

COPY . .

RUN yarn build

RUN npx prisma generate

# COPY entrypoint.sh /usr/local/bin/entrypoint.sh

EXPOSE 3000

# RUN chmod +x /usr/local/bin/entrypoint.sh

# ENTRYPOINT [ "/usr/local/bin/entrypoint.sh" ]

CMD [  "yarn", "start" ]
