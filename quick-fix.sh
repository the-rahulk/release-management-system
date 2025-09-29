#!/bin/bash

echo "🚀 ReleaseMaster Quick Fix Script"
echo "================================="

# Backup original package.json
echo "📦 Backing up original package.json..."
cp package.json package.json.backup

# Use the fixed package.json
echo "📦 Installing corrected package.json..."
cp package-fixed.json package.json

# Clean install
echo "🧹 Cleaning old dependencies..."
rm -rf node_modules package-lock.json

echo "📦 Installing dependencies..."
npm install

# Install additional missing dependencies
echo "📦 Installing additional required dependencies..."
npm install react@^18.3.1 react-dom@^18.3.1
npm install --save-dev @types/react@^18.3.11 @types/react-dom@^18.3.1

echo "✅ Dependencies installed successfully!"
echo ""
echo "Next steps:"
echo "1. Set up your PostgreSQL database:"
echo "   - Windows: run setup-db.bat"
echo "   - Linux/macOS: run ./setup-db.sh"
echo ""
echo "2. Run database migrations:"
echo "   npm run db:push"
echo ""
echo "3. Start the application:"
echo "   npm run dev"
echo ""
echo "4. Open http://localhost:5000 in your browser"
echo ""
echo "🎉 Setup complete! Check SETUP.md for detailed instructions."