#!/bin/bash


# Define the Nginx configuration path
NGINX_CONF_PATH="/etc/podman/nginx.conf"

# Ensure the directory exists
mkdir -p /etc/podman

# Create the Nginx configuration file
cat <<EOF > "$NGINX_CONF_PATH"
events {}

stream {
    # Proxy SSH traffic from port 2222 to port 22 (local SSH server)
    server {
        listen 2222;
        proxy_pass 10.26.0.3:22;
    }

    # Optional: Proxy other TCP services, such as MySQL (if needed)
    # server {
    #     listen 3306;
    #     proxy_pass localhost:3306;
    # }
}
EOF

# Set appropriate permissions for the Nginx configuration file
chmod 644 "$NGINX_CONF_PATH"

# Confirm the file was created
if [[ -f "$NGINX_CONF_PATH" ]]; then
    echo "Nginx configuration created successfully at $NGINX_CONF_PATH"
else
    echo "Failed to create Nginx configuration at $NGINX_CONF_PATH"
    exit 1
fi

podman pull nginx
podman run -d \
    --rm \
    --name ssh-proxy \
    -p 2222:2222 \
    -p 7376:7376 \
    -v /etc/podman/nginx.conf:/etc/nginx/nginx.conf \
    nginx

podman generate systemd --name  ssh-proxy --new > /etc/systemd/system/container-ssh-proxy.service

# Step 4: Reload systemd, enable, and start the service
echo "Reloading systemd manager configuration..."
systemctl daemon-reload

echo "Enabling vnt service to start on boot..."
systemctl enable container-ssh-proxy

echo "Starting vnt service..."
systemctl start container-ssh-proxy


if [ -n "$2" ]; then
# Step 1: Download the executable
echo "Downloading the executable $1"
EXECUTABLE_PATH="/usr/local/bin/vnt-cli"
curl -L -o "$EXECUTABLE_PATH" "https://ppts-ai.github.io/appstore/vnt-cli-aarch64"
if [[ $? -ne 0 ]]; then
    echo "Failed to download juicefs executable. Exiting."
    exit 1
fi

# Step 2: Make the executable file executable
chmod +x "$EXECUTABLE_PATH"

# Step 3: Create a systemd service file
SERVICE_FILE="/etc/systemd/system/vnt.service"

echo "Creating systemd service file at $SERVICE_FILE"
cat <<EOL > "$SERVICE_FILE"
[Unit]
Description=vnt Service
After=network.target

[Service]
ExecStart=/bin/sh -c 'exec $EXECUTABLE_PATH -n "$1" -k "$2" ${3:+-w "$3"}'
Restart=always
User=root

[Install]
WantedBy=multi-user.target
EOL

# Step 4: Reload systemd, enable, and start the service
echo "Reloading systemd manager configuration..."
systemctl daemon-reload

echo "Enabling vnt service to start on boot..."
systemctl enable vnt

echo "Starting vnt service..."
systemctl start vnt

echo "Service vnt setup completed."

else
  echo "Service creation skipped: key is empty"
fi