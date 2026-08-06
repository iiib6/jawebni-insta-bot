FROM n8nio/n8n:latest

USER root

# Create directory and set permissions for default node user
RUN mkdir -p /home/node/.n8n && chown -R node:node /home/node/.n8n

# Set Render default port 10000
ENV N8N_PORT=10000
ENV PORT=10000
ENV N8N_HOST=0.0.0.0
ENV N8N_PROTOCOL=https
ENV N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=false

EXPOSE 10000

USER node
