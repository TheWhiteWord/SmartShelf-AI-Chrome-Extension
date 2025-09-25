#!/usr/bin/env python3
"""
Create basic placeholder icons for SmartShelf Chrome Extension
"""

try:
    from PIL import Image, ImageDraw, ImageFont
    import os
    
    def create_icon(size, filename):
        """Create a simple icon with 'S' text on blue background"""
        # Create image with blue background
        img = Image.new('RGB', (size, size), '#4285f4')
        draw = ImageDraw.Draw(img)
        
        # Calculate font size (roughly 60% of icon size)
        font_size = int(size * 0.6)
        
        try:
            # Try to use default font
            font = ImageFont.load_default()
        except:
            font = None
        
        # Draw white 'S' in center
        text = 'S'
        if font:
            bbox = draw.textbbox((0, 0), text, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
        else:
            # Fallback if font fails
            text_width = font_size // 2
            text_height = font_size
            
        x = (size - text_width) // 2
        y = (size - text_height) // 2
        
        draw.text((x, y), text, fill='white', font=font)
        
        # Save icon
        os.makedirs('extension/icons', exist_ok=True)
        img.save(f'extension/icons/{filename}')
        print(f"✅ Created {filename} ({size}x{size})")
    
    # Create all required icon sizes
    create_icon(16, 'icon16.png')
    create_icon(32, 'icon32.png')  
    create_icon(48, 'icon48.png')
    create_icon(128, 'icon128.png')
    
    print("\n🎉 All icons created successfully!")
    print("📝 You can now re-enable icons in manifest.json")
    print("   Uncomment the 'default_icon' and 'icons' sections")
    
except ImportError:
    print("❌ PIL (Pillow) not found. Install it with:")
    print("   pip install Pillow")
    print("\nAlternatively, create icons manually:")
    print("1. Use any image editor to create 16x16, 32x32, 48x48, 128x128 PNG files")
    print("2. Save them as icon16.png, icon32.png, icon48.png, icon128.png")
    print("3. Place them in extension/icons/ folder")
    print("4. Re-enable icon references in manifest.json")

except Exception as e:
    print(f"❌ Error creating icons: {e}")
    print("Please create icons manually or use online tools.")