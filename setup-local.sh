#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "🚀 Starting local environment setup for TailCraft Hub..."

# 1. Detect Host Operating System
OS_TYPE="Unknown"
case "$OSTYPE" in
  darwin*)  OS_TYPE="macOS" ;;
  linux*)   OS_TYPE="Linux" ;;
  msys*)    OS_TYPE="Windows (Git Bash)" ;;
  cygwin*)  OS_TYPE="Windows (Cygwin)" ;;
  *)        OS_TYPE="$OSTYPE" ;;
esac

echo "🖥️  Detected OS: ${OS_TYPE}"

# 2. Check if Docker engine is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker daemon is not running."
    echo "💡 Please ensure Docker Desktop (or Docker Engine on Linux) is installed and active."
    exit 1
fi
echo "✅ Docker daemon is running."

# 3. Generate secure RCON credentials if .env.local does not exist
if [ ! -f .env.local ]; then
    echo "🔑 Generating secure credentials..."
    
    # Cross-platform secure token generation
    if command -v openssl &> /dev/null; then
        RCON_SECRET=$(openssl rand -base64 12)
    else
        # Fallback if openssl is not present
        RCON_SECRET=$(LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 16)
    fi
    
    cat <<EOF > .env.local
# Local Environment Configuration - TailCraft Hub
RCON_HOST=localhost
RCON_PORT=25575
RCON_PASSWORD=${RCON_SECRET}
DOCKER_CONTAINER_NAME=tailcraft-mc-local
EOF
    echo "✅ File .env.local created automatically."
else
    echo "ℹ️ File .env.local already exists. Keeping current credentials."
fi

# Load environment variables for docker compose
export $(grep -v '^#' .env.local | xargs)

# 4. Spin up the Minecraft container (supports both 'docker compose' V2 and legacy 'docker-compose')
echo "📦 Deploying Minecraft container (Paper engine)..."
if docker compose version > /dev/null 2>&1; then
    docker compose up -d
else
    docker-compose up -d
fi

# 5. Wait for RCON service activation (Healthcheck)
echo "⏳ Waiting for Minecraft server to initialize (this may take 1-2 minutes on first run)..."

MAX_ATTEMPTS=30
ATTEMPT=1

until docker logs tailcraft-mc-local 2>&1 | grep -q "RCON running on"; do
    if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
        echo ""
        echo "⚠️ Server initialization is taking longer than expected, but will continue starting in the background."
        break
    fi
    printf "."
    sleep 3
    ATTEMPT=$((ATTEMPT + 1))
done

echo ""
echo "🎉 Local Environment Successfully Deployed!"
echo "-------------------------------------------------------"
echo "🎮 Test Minecraft Server: localhost:25565"
echo "🔧 RCON Port: 25575"
echo "📄 Configuration saved to: .env.local"
echo "-------------------------------------------------------"
