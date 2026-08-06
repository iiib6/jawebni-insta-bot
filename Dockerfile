FROM n8nio/n8n:latest

USER root

# Ensure home directory permissions are completely open for node user
RUN mkdir -p /home/node/.n8n && chown -R node:node /home/node && chmod -R 777 /home/node

# Set environment variables for Render & PostgreSQL
ENV DB_TYPE=postgresdb
ENV DB_POSTGRESDB_HOST=dpg-d9qf2ff10e5c739hrpl0-a
ENV DB_POSTGRESDB_PORT=5432
ENV DB_POSTGRESDB_DATABASE=jawebni_db
ENV DB_POSTGRESDB_USER=jawebni_db_user
ENV DB_POSTGRESDB_PASSWORD=ywiN9d37JcCLFpvHQNDQU7ACTrHZRHKL
ENV DB_POSTGRESDB_SSL_REJECT_UNAUTHORIZED=false

# Fixed Encryption Key for saving credentials permanently
ENV N8N_ENCRYPTION_KEY=jawebni_secret_key_2026_super_secure

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
