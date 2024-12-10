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
        proxy_pass 10.26.0.3:2022;
    }

    # Optional: Proxy other TCP services, such as MySQL (if needed)
    server {
         listen 1082;
         proxy_pass 10.26.0.3:1080;
     }
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

podman pull harbor.ppts.ai/xkuma/socks5
podman pull podman pull harbor.ppts.ai/library/nginx:1.27.3-alpine
podman run -d \
    --rm \
    --name ssh-proxy \
    -p 2222:2222 \
    -p 2022:2022 \
    -p 7376:7376 \
    -v /etc/podman/nginx.conf:/etc/nginx/nginx.conf \
    harbor.ppts.ai/library/nginx:1.27.3-alpine

podman run -d -p 1080:1080 harbor.ppts.ai/xkuma/socks5

podman generate systemd --name  ssh-proxy --new > /etc/systemd/system/container-ssh-proxy.service
podman generate systemd --name  socks5-proxy --new > /etc/systemd/system/container-socks5-proxy.service

# Step 4: Reload systemd, enable, and start the service
echo "Reloading systemd manager configuration..."
systemctl daemon-reload

echo "Enabling vnt service to start on boot..."
systemctl enable container-ssh-proxy
systemctl enable container-socks5-proxy

echo "Starting vnt service..."
systemctl start container-socks5-proxy
systemctl start container-ssh-proxy


if [ -n "$2" ]; then
# Step 1: Download the executable
echo "Downloading the executable $1"
EXECUTABLE_PATH="/usr/local/bin/vnt-cli"
curl -L -o "$EXECUTABLE_PATH" "https://ppts-ai.github.io/appstore/vnt-cli-x86_64"
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
ExecStart=/bin/sh -c 'exec $EXECUTABLE_PATH --mapping tcp:0.0.0.0:2022-127.0.0.1:22 -n "$1" -k "$2" ${3:+-w "$3"}'
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


# Step 1: Download the executable
echo "Downloading the executable"
EXECUTABLE_PATH="/usr/local/bin/juicefs"
curl -L -o "$EXECUTABLE_PATH" "https://ppts-ai.github.io/juicefs/juicefs-x86_64"
if [[ $? -ne 0 ]]; then
    echo "Failed to download juicefs executable. Exiting."
    exit 1
fi

# Step 2: Make the executable file executable
chmod +x "$EXECUTABLE_PATH"

# Step 3: Create a systemd service file
SERVICE_FILE="/etc/systemd/system/juicefs.service"

echo "Creating systemd service file at $SERVICE_FILE"
cat <<EOL > "$SERVICE_FILE"
[Unit]
Description=JuiceFS Service
After=network.target

[Service]
ExecStart=$EXECUTABLE_PATH
Restart=always
User=root
Environment=APP=ai.ppts.appstore
Environment=REGION=asia
Environment=DB_PATH=/etc/models.db
Environment=MOUNT_PATH=/mnt/models

[Install]
WantedBy=multi-user.target
EOL

# Step 4: Reload systemd, enable, and start the service
echo "Reloading systemd manager configuration..."
systemctl daemon-reload

echo "Enabling juicefs service to start on boot..."
systemctl enable juicefs

echo "Starting juicefs service..."
systemctl start juicefs

echo "Service juicefs setup completed."


curl -s -L https://nvidia.github.io/libnvidia-container/stable/rpm/nvidia-container-toolkit.repo |  sudo tee /etc/yum.repos.d/nvidia-container-toolkit.repo
sudo yum install -y nvidia-container-toolkit
sudo nvidia-ctk cdi generate --output=/etc/cdi/nvidia.yaml
sudo nvidia-ctk cdi list