FROM node:lts
WORKDIR /mesh-order-poster
COPY . .
RUN yarn
CMD yarn start:delay
