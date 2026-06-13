FROM mcr.microsoft.com/playwright:v1.60.0-jammy

# Create app directory
WORKDIR /app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install npm dependencies (including Playwright)
RUN npm ci

# Bundle app source
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Start the server
CMD [ "npm", "run", "start:testbot" ]
