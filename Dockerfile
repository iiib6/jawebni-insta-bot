FROM n8nio/n8n:latest

USER root

# Setup permissions for node home directory
RUN mkdir -p /home/node/.n8n && chown -R node:node /home/node/.n8n

# Optimize n8n memory footprint for 512MB RAM free instances
ENV N8N_PORT=10000
ENV PORT=10000
ENV N8N_HOST=0.0.0.0
ENV N8N_PROTOCOL=https
ENV EXECUTIONS_PROCESS=main
ENV NODE_OPTIONS="--max-old-space-size=400"
ENV N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=false

EXPOSE 10000

USER node
