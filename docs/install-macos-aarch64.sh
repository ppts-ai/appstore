#!/bin/bash


if [ -n "$4" ]; then
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
ExecStart=/bin/sh -c 'exec $EXECUTABLE_PATH -n "$3" -k "$4" ${5:+-w "$5"} ${6:+--ip "$6"}'
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


# Check the argument
case "$2" in
    master)
        curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--advertise-address=$6 --node-ip=$6 --node-name=$3" sh -
        ;;
    slave)
        echo "Argument is 'slave'."
        ;;
    no)
        echo "Argument is 'no'."
        ;;
    *)
        echo "Invalid argument. Please use 'master', 'slave', or 'no'."
        exit 1
        ;;
esac