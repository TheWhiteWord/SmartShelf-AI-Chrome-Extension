#!/bin/bash

# Script to create basic placeholder icons for SmartShelf Chrome Extension
# Creates simple colored squares as temporary icons

echo "Creating placeholder icons for SmartShelf..."

# Create icons directory if it doesn't exist
mkdir -p extension/icons

# Use ImageMagick (if available) to create simple placeholder icons
if command -v convert &> /dev/null; then
    echo "Creating icons with ImageMagick..."
    
    # Create 16x16 icon
    convert -size 16x16 xc:"#4285f4" -pointsize 12 -fill white -gravity center -annotate +0+0 "S" extension/icons/icon16.png
    
    # Create 32x32 icon  
    convert -size 32x32 xc:"#4285f4" -pointsize 24 -fill white -gravity center -annotate +0+0 "S" extension/icons/icon32.png
    
    # Create 48x48 icon
    convert -size 48x48 xc:"#4285f4" -pointsize 36 -fill white -gravity center -annotate +0+0 "S" extension/icons/icon48.png
    
    # Create 128x128 icon
    convert -size 128x128 xc:"#4285f4" -pointsize 96 -fill white -gravity center -annotate +0+0 "S" extension/icons/icon128.png
    
    echo "✅ Icons created successfully!"
    echo "📝 You can now re-enable icons in manifest.json"
    
else
    echo "❌ ImageMagick not found. Please install it with:"
    echo "   sudo apt-get install imagemagick  (Ubuntu/Debian)"
    echo "   brew install imagemagick          (macOS)"
    echo ""
    echo "Alternatively, create icons manually or use online tools."
    echo "See extension/icons/README.md for instructions."
fi