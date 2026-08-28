# Use a standard, lightweight Node environment
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy ONLY the package blueprint files first
COPY package.json package-lock.json* ./

# Install dependencies cleanly inside the Linux container
RUN npm install

# Now copy the rest of your application code (src, uploads, etc.)
# Because of .dockerignore, this skips the huge node_modules folder
COPY . .

# Expose the port your Express app runs on
EXPOSE 3000

# Start the application
CMD ["node", "src/index.js"]