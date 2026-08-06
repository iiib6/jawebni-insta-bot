FROM n8nio/n8n:latest

USER root

# Setup permissions for node home directory
RUN mkdir -p /home/node/.n8n && chown -R node:node /home/node/.n8n

# Set environment variables for Render & n8n Editor UI (No trailing slash on N8N_EDITOR_BASE_URL)
ENV N8N_PORT=10000
ENV PORT=10000
ENV N8N_HOST=0.0.0.0
ENV N8N_PROTOCOL=https
ENV N8N_EDITOR_BASE_URL=https://jawebni-insta-bot.onrender.com
ENV WEBHOOK_URL=https://jawebni-insta-bot.onrender.com/
ENV EXECUTIONS_PROCESS=main
ENV NODE_OPTIONS="--max-old-space-size=400"
ENV N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=false

EXPOSE 10000

USER node
