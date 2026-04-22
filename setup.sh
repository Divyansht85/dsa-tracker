#!/bin/bash

# ═══════════════════════════════════════════════
#  DSA Tracker – First-time Setup (Mac / Linux)
#  Run: chmod +x setup.sh && ./setup.sh
# ═══════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Detect OS
OS="$(uname -s)"
case "$OS" in
  Darwin*) PLATFORM="mac" ;;
  Linux*)  PLATFORM="linux" ;;
  MINGW*|MSYS*|CYGWIN*) 
    echo "  Windows detected — please run setup.bat instead."
    exit 1 ;;
  *) PLATFORM="linux" ;;
esac

echo ""
echo -e "${CYAN}  ⚡ DSA Revision Tracker – Setup ($PLATFORM)${NC}"
echo "  ─────────────────────────────────────────"
echo ""

# 1. Check Node.js
if ! command -v node &> /dev/null; then
  echo -e "${YELLOW}  ⚠ Node.js not found. Installing...${NC}"
  if [ "$PLATFORM" = "mac" ]; then
    if ! command -v brew &> /dev/null; then
      echo "  ✗ Homebrew not found. Install Node.js from https://nodejs.org/"
      exit 1
    fi
    brew install node
  else
    # Linux — try common package managers
    if command -v apt &> /dev/null; then
      sudo apt update && sudo apt install -y nodejs npm
    elif command -v dnf &> /dev/null; then
      sudo dnf install -y nodejs npm
    elif command -v pacman &> /dev/null; then
      sudo pacman -S --noconfirm nodejs npm
    else
      echo "  ✗ Could not auto-install Node.js. Install from https://nodejs.org/"
      exit 1
    fi
  fi
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

# 4. Determine shell config file
if [ -n "$ZSH_VERSION" ] || [ "$SHELL" = "$(which zsh 2>/dev/null)" ]; then
  SHELL_RC="$HOME/.zshrc"
elif [ -n "$BASH_VERSION" ] || [ "$SHELL" = "$(which bash 2>/dev/null)" ]; then
  SHELL_RC="$HOME/.bashrc"
else
  SHELL_RC="$HOME/.bashrc"
fi

# 5. Set browser-open command based on OS
if [ "$PLATFORM" = "mac" ]; then
  OPEN_CMD="open"
else
  OPEN_CMD="xdg-open"
fi

# 6. Add/update shell alias
if grep -q "# DSA Tracker shortcut" "$SHELL_RC" 2>/dev/null; then
  # Remove old alias lines based on platform
  if [ "$PLATFORM" = "mac" ]; then
    sed -i '' '/# DSA Tracker shortcut/d; /alias dsa=/d' "$SHELL_RC" 2>/dev/null || true
  else
    sed -i '/# DSA Tracker shortcut/d; /alias dsa=/d' "$SHELL_RC" 2>/dev/null || true
  fi
fi

echo "" >> "$SHELL_RC"
echo "# DSA Tracker shortcut" >> "$SHELL_RC"
echo "alias dsa=\"$OPEN_CMD http://localhost:3456 & cd $SCRIPT_DIR && npm start\"" >> "$SHELL_RC"
echo -e "${GREEN}  ✓ Added 'dsa' alias to $SHELL_RC${NC}"

# 7. Done
echo ""
echo -e "${CYAN}  ✅ Setup complete!${NC}"
echo ""
echo "  ┌─────────────────────────────────────────┐"
echo "  │  Open a NEW terminal and type:  dsa     │"
echo "  │  Stop with Ctrl+C (auto-saves to Git)   │"
echo "  └─────────────────────────────────────────┘"
echo ""
