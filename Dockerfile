FROM n8nio/n8n:latest

USER root

# Ensure home directory permissions are completely open for node user
RUN mkdir -p /home/node/.n8n && chown -R node:node /home/node && chmod -R 777 /home/node

# Set environment variables for Render & n8n v1.x
ENV DB_TYPE=sqlite
ENV DB_SQLITE_DATABASE=/home/node/.n8n/database.sqlite
ENV N8N_USER_FOLDER=/home/node
ENV N8N_PORT=10000
ENV PORT=10000
ENV N8N_HOST=0.0.0.0
ENV N8N_PROTOCOL=https
ENV N8N_EDITOR_BASE_URL=https://jawebni-insta-bot.onrender.com
ENV N8N_WEBHOOK_URL=https://jawebni-insta-bot.onrender.com/
ENV N8N_SECURE_COOKIE=false
ENV NODE_OPTIONS="--max-old-space-size=400"
ENV N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=false

EXPOSE 10000

USER node
