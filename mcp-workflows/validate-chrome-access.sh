#!/bin/bash

# Chrome Developer Mode Validation Script
# Validates accessibility and extension loading permissions for SmartShelf

echo "🔍 Chrome Developer Mode Validation"
echo "=================================="

EXTENSION_PATH="/media/theww/AI/Code/AI/Google_Chrome_Built_In/extension"
MANIFEST_PATH="$EXTENSION_PATH/manifest.json"

# Check if Chrome/Chromium is available
echo "1. Checking Chrome availability..."
CHROME_CMD=""
if command -v google-chrome >/dev/null 2>&1; then
    CHROME_CMD="google-chrome"
elif command -v chromium-browser >/dev/null 2>&1; then
    CHROME_CMD="chromium-browser"
elif command -v chrome >/dev/null 2>&1; then
    CHROME_CMD="chrome"
else
    echo "❌ Chrome/Chromium not found in PATH"
    exit 1
fi

echo "✅ Chrome found: $CHROME_CMD"

# Verify extension directory exists
echo "2. Verifying extension directory..."
if [ ! -d "$EXTENSION_PATH" ]; then
    echo "❌ Extension directory not found: $EXTENSION_PATH"
    exit 1
fi
echo "✅ Extension directory exists: $EXTENSION_PATH"

# Verify manifest.json exists and is valid
echo "3. Validating manifest.json..."
if [ ! -f "$MANIFEST_PATH" ]; then
    echo "❌ Manifest file not found: $MANIFEST_PATH"
    exit 1
fi

# Check if manifest.json is valid JSON
if ! python3 -m json.tool "$MANIFEST_PATH" > /dev/null 2>&1; then
    echo "❌ Invalid JSON in manifest.json"
    exit 1
fi
echo "✅ Manifest.json is valid"

# Check required files exist
echo "4. Checking required extension files..."
REQUIRED_FILES=(
    "background/service-worker.js"
    "content/content-script.js"
    "popup/popup.html"
    "sidepanel/sidepanel.html"
    "options/options.html"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$EXTENSION_PATH/$file" ]; then
        echo "❌ Required file missing: $file"
        exit 1
    fi
done
echo "✅ All required files present"

# Test Chrome launch with developer mode flags
echo "5. Testing Chrome launch with extension flags..."
CHROME_TEST_PROFILE="/tmp/chrome-test-profile-$$"
mkdir -p "$CHROME_TEST_PROFILE"

# Launch Chrome with extension loading flags (background process)
$CHROME_CMD \
    --user-data-dir="$CHROME_TEST_PROFILE" \
    --enable-experimental-web-platform-features \
    --enable-features=Translate,LanguageModel,Summarization,AIWriterAPI,AIRewriterAPI \
    --disable-background-timer-throttling \
    --disable-backgrounding-occluded-windows \
    --disable-renderer-backgrounding \
    --load-extension="$EXTENSION_PATH" \
    --no-first-run \
    --disable-default-apps \
    about:blank &

CHROME_PID=$!
sleep 3

# Check if Chrome process is still running
if ! kill -0 $CHROME_PID 2>/dev/null; then
    echo "❌ Chrome failed to launch with extension"
    exit 1
fi

echo "✅ Chrome launched successfully with extension"

# Kill Chrome test instance
kill $CHROME_PID 2>/dev/null
rm -rf "$CHROME_TEST_PROFILE"

echo ""
echo "🎉 Chrome Developer Mode validation completed successfully!"
echo ""
echo "📋 Extension Loading Instructions:"
echo "1. Open Chrome and navigate to: chrome://extensions/"
echo "2. Enable 'Developer mode' toggle (top right)"
echo "3. Click 'Load unpacked' button"
echo "4. Select directory: $EXTENSION_PATH"
echo "5. Verify extension loads without errors"
echo ""
echo "🔧 MCP Commands Ready:"
echo "- Use '@chrome-devtools navigate_page(\"chrome://extensions/\")' in VS Code"
echo "- Use '@chrome-devtools click(\"#developer-mode\")' to enable developer mode"
echo "- Use '@chrome-devtools click(\"#load-unpacked\")' to load extension"