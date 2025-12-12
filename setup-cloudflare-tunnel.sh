#!/bin/bash

# VergeOS AI Interface - Cloudflare Tunnel Setup Script
# This script helps configure a Cloudflare Tunnel for the VergeOS AI Interface

set -e

echo "=============================================="
echo "VergeOS AI Interface - Cloudflare Tunnel Setup"
echo "=============================================="
echo ""

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "Error: cloudflared is not installed."
    echo ""
    echo "Install it with:"
    echo "  macOS:   brew install cloudflared"
    echo "  Linux:   See https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
    echo ""
    exit 1
fi

# Check if logged in
echo "Checking Cloudflare authentication..."
if ! cloudflared tunnel list &> /dev/null; then
    echo "You need to authenticate with Cloudflare first."
    echo "Running: cloudflared tunnel login"
    cloudflared tunnel login
fi

echo ""
echo "Current tunnels:"
cloudflared tunnel list
echo ""

# Prompt for tunnel name
read -p "Enter tunnel name (or existing tunnel name) [vergeos-ai]: " TUNNEL_NAME
TUNNEL_NAME=${TUNNEL_NAME:-vergeos-ai}

# Check if tunnel exists
if cloudflared tunnel list | grep -q "$TUNNEL_NAME"; then
    echo "Using existing tunnel: $TUNNEL_NAME"
else
    echo "Creating new tunnel: $TUNNEL_NAME"
    cloudflared tunnel create "$TUNNEL_NAME"
fi

# Get tunnel ID
TUNNEL_ID=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')
echo "Tunnel ID: $TUNNEL_ID"

# Prompt for hostname
read -p "Enter hostname for the application (e.g., ai.yourdomain.com): " HOSTNAME

if [ -z "$HOSTNAME" ]; then
    echo "Error: Hostname is required"
    exit 1
fi

# Prompt for service URL
read -p "Enter service URL [http://vergeos-ai.vergeos-ai.svc.cluster.local:3001]: " SERVICE_URL
SERVICE_URL=${SERVICE_URL:-http://vergeos-ai.vergeos-ai.svc.cluster.local:3001}

# Create/update config file
CONFIG_DIR="$HOME/.cloudflared"
CONFIG_FILE="$CONFIG_DIR/config-vergeos-ai.yml"

mkdir -p "$CONFIG_DIR"

echo "Creating tunnel configuration at $CONFIG_FILE"

cat > "$CONFIG_FILE" << EOF
tunnel: $TUNNEL_ID
credentials-file: $CONFIG_DIR/$TUNNEL_ID.json

ingress:
  - hostname: $HOSTNAME
    service: $SERVICE_URL
  - service: http_status:404
EOF

echo ""
echo "Configuration created:"
cat "$CONFIG_FILE"
echo ""

# Create DNS record
read -p "Create DNS record for $HOSTNAME? [y/N]: " CREATE_DNS

if [[ "$CREATE_DNS" =~ ^[Yy]$ ]]; then
    echo "Creating DNS record..."
    cloudflared tunnel route dns "$TUNNEL_NAME" "$HOSTNAME"
    echo "DNS record created: $HOSTNAME -> $TUNNEL_ID.cfargotunnel.com"
fi

echo ""
echo "=============================================="
echo "Setup Complete!"
echo "=============================================="
echo ""
echo "Next steps:"
echo ""
echo "1. To run the tunnel locally:"
echo "   cloudflared tunnel --config $CONFIG_FILE run"
echo ""
echo "2. To deploy to Kubernetes, create a secret with your tunnel credentials:"
echo "   kubectl create secret generic cloudflared-credentials \\"
echo "     --from-file=credentials.json=$CONFIG_DIR/$TUNNEL_ID.json \\"
echo "     -n cloudflare"
echo ""
echo "3. Set up Cloudflare Access for authentication:"
echo "   - Go to https://one.dash.cloudflare.com/"
echo "   - Navigate to Access > Applications"
echo "   - Add a self-hosted application for $HOSTNAME"
echo "   - Configure your access policy (email, domain, etc.)"
echo ""
echo "See CLOUDFLARE-TUNNEL-SETUP.md for detailed instructions."
echo ""
