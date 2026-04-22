#!/bin/bash

# ═══════════════════════════════════════════════
#  DSA Tracker – First-time Setup Script
#  Run: chmod +x setup.sh && ./setup.sh
# ═══════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}  ⚡ DSA Revision Tracker – Setup${NC}"
echo "  ─────────────────────────────────"
echo ""

# 1. Check Node.js
if ! command -v node &> /dev/null; then
  echo -e "${YELLOW}  ⚠ Node.js not found. Installing via Homebrew...${NC}"
  if ! command -v brew &> /dev/null; then
    echo "  ✗ Homebrew not found. Please install Node.js manually:"
    echo "    https://nodejs.org/"
    exit 1
  fi
  brew install node
fi
echo -e "${GREEN}  ✓ Node.js $(node -v)${NC}"

# 2. Install dependencies
echo "  📦 Installing dependencies..."
cd "$SCRIPT_DIR"
npm install --silent
echo -e "${GREEN}  ✓ Dependencies installed${NC}"

# 3. Create db.json if missing
if [ ! -f "$SCRIPT_DIR/db.json" ]; then
  echo "[]" > "$SCRIPT_DIR/db.json"
  echo -e "${GREEN}  ✓ Created empty db.json${NC}"
else
  echo -e "${GREEN}  ✓ db.json already exists${NC}"
fi

# 4. Add shell alias
SHELL_RC="$HOME/.zshrc"
if [ -n "$BASH_VERSION" ]; then
  SHELL_RC="$HOME/.bashrc"
fi

if grep -q "# DSA Tracker shortcut" "$SHELL_RC" 2>/dev/null; then
  # Remove old alias and re-add with current path
  sed -i '' '/# DSA Tracker shortcut/d; /alias dsa=/d' "$SHELL_RC" 2>/dev/null || true
fi

echo "" >> "$SHELL_RC"
echo "# DSA Tracker shortcut" >> "$SHELL_RC"
echo "alias dsa=\"open http://localhost:3456 & cd $SCRIPT_DIR && npm start\"" >> "$SHELL_RC"
echo -e "${GREEN}  ✓ Added 'dsa' alias to $SHELL_RC${NC}"

# 5. Done
echo ""
echo -e "${CYAN}  ✅ Setup complete!${NC}"
echo ""
echo "  ┌─────────────────────────────────────────┐"
echo "  │  Open a NEW terminal and type:  dsa     │"
echo "  │  Stop with Ctrl+C (auto-saves to Git)   │"
echo "  └─────────────────────────────────────────┘"
echo ""
