#!/usr/bin/env bash
set -e

echo "🚀 Starting Scenario Analysis System Full-Stack Setup..."

# 1. Check for required tools
if ! command -v bun &> /dev/null; then
    echo "❌ Error: 'bun' is not installed. Please install it from https://bun.sh"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "⚠️ Warning: 'docker' is not running. Database initialization will be skipped."
fi

# 2. Install workspace dependencies
echo "📦 Installing dependencies via Bun Workspaces..."
bun install

# 3. Setup Environment Variables
if [ ! -f .env ]; then
    echo "📄 Generating .env from .env.example..."
    cp .env.example .env
    echo "⚠️ Please ensure you fill in the API keys in the .env file."
else
    echo "✅ .env file already exists. Skipping."
fi

# 4. Start Local Database
if command -v docker &> /dev/null; then
    echo "🐘 Orchestrating PostgreSQL via Docker Compose..."
    docker compose up -d
    echo "✅ Database is running on localhost:5432"
fi

# 5. IDE Specific Configurations
echo "⚙️ Applying IDE settings (VS Code & Cursor)..."
mkdir -p .vscode
cat <<EOF > .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "eslint.workingDirectories": [{"mode": "auto"}]
}
EOF

echo "✅ All set! The environment is cleanly initialized for collaboration."
echo "👉 Use 'bun test' to verify the core logic."
echo "👉 Use 'cd apps/web && bun dev' to start the Dashboard."
