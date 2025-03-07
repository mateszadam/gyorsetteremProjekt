FROM node:alpine
WORKDIR /usr/app
COPY package.json .
RUN npm install\ 
    && npm install typescript -g

COPY . .



RUN tsc


EXPOSE 5005
EXPOSE 5006



# Command to run the application
CMD ["node", "./dist/App.js"]

