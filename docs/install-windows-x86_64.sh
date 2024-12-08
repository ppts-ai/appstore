#!/bin/bash


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