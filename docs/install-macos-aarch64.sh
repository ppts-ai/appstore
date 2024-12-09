#!/bin/bash


# Define the Caddyfile path
CADDYFILE_PATH="/etc/podman/Caddyfile"

# Ensure the directory exists
mkdir -p /etc/podman

# Create the Caddyfile with the desired content
cat <<EOF > "$CADDYFILE_PATH"
:2222 {
	reverse_proxy 192.168.127.2:22
}

:7376 {
	reverse_proxy 192.168.127.2:8376
}
EOF

# Set appropriate permissions for the Caddyfile
chmod 644 "$CADDYFILE_PATH"

# Confirm the file was created
if [[ -f "$CADDYFILE_PATH" ]]; then
    echo "Caddyfile created successfully at $CADDYFILE_PATH"
else
    echo "Failed to create Caddyfile at $CADDYFILE_PATH"
    exit 1
fi

podman run -d \
    --name ssh-proxy \
    -p 2222:2222 \
    -p 7376:7376 \
    -v /etc/podman/Caddyfile:/etc/caddy/Caddyfile:ro \
    caddy caddy run --config /etc/caddy/Caddyfile

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