#!/bin/bash


# Define the Nginx configuration path
LIBP2P_CONF_PATH="/etc/libp2p/server.yaml"

# Ensure the directory exists
mkdir -p /etc/libp2p

# Create the Nginx configuration file
cat <<EOF > "$LIBP2P_CONF_PATH"
peer_key: "$4"
ssh_server: 127.0.0.1:$3
network:
  enable_nat: true
  listen_addrs:
    - "/ip4/0.0.0.0/udp/11211/quic"
    - "/ip6/::/udp/11211/quic"
    - "/ip4/0.0.0.0/tcp/11211"
    - "/ip6/::/tcp/11211"
    - "/ip4/0.0.0.0/tcp/11212/ws"
    - "/ip6/::/tcp/11212/ws"
  relays:
    - "$2"
acl:
  allow_peers: []
  allow_subnets: []
EOF

# Set appropriate permissions for the Nginx configuration file
chmod 644 "$LIBP2P_CONF_PATH"

# Step 1: Download the executable
echo "Downloading the executable $1"
EXECUTABLE_PATH="/usr/local/bin/libp2p-proxy"
curl -L -o "$EXECUTABLE_PATH" "https://ppts-ai.github.io/appstore/libp2p-proxy.linux-arm64"
if [[ $? -ne 0 ]]; then
    echo "Failed to download libp2p-proxy executable. Exiting."
    exit 1
fi

# Step 2: Make the executable file executable
chmod +x "$EXECUTABLE_PATH"

# Step 3: Create a systemd service file
SERVICE_FILE="/etc/systemd/system/libp2p.service"

echo "Creating systemd service file at $SERVICE_FILE"
cat <<EOL > "$SERVICE_FILE"
[Unit]
Description=libp2p Service
After=network.target

[Service]
ExecStart=/bin/sh -c 'exec $EXECUTABLE_PATH -config $LIBP2P_CONF_PATH'
Restart=always
User=root

[Install]
WantedBy=multi-user.target
EOL

# Step 4: Reload systemd, enable, and start the service
echo "Reloading systemd manager configuration..."
systemctl daemon-reload

echo "Enabling libp2p service to start on boot..."
systemctl enable libp2p

echo "Starting vnt service..."
systemctl start libp2p

echo "Service libp2p setup completed."

else
  echo "Service creation skipped: key is empty"
fi


curl -s -L https://nvidia.github.io/libnvidia-container/stable/rpm/nvidia-container-toolkit.repo |  sudo tee /etc/yum.repos.d/nvidia-container-toolkit.repo
sudo yum install -y nvidia-container-toolkit
sudo nvidia-ctk cdi generate --output=/etc/cdi/nvidia.yaml
sudo nvidia-ctk cdi list