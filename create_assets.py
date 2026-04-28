#!/usr/bin/env python3
"""Create favicon and OG image for ChainScout"""
from PIL import Image, ImageDraw, ImageFont
import os

# Create favicon (32x32, 48x48, 64x64)
favicon_sizes = [32, 48, 64]
favicon_color = "#10B981"  # Emerald green
text_color = "#FFFFFF"  # White

print("Creating favicon...")
favicon_images = []

for size in favicon_sizes:
    img = Image.new('RGB', (size, size), favicon_color)
    draw = ImageDraw.Draw(img)
    
    # Try to use a nice font, fallback to default
    try:
        font = ImageFont.truetype("arial.ttf", size // 2)
    except:
        font = ImageFont.load_default()
    
    # Draw "CS" text centered
    text = "CS"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (size - text_width) // 2
    y = (size - text_height) // 2
    
    draw.text((x, y), text, fill=text_color, font=font)
    favicon_images.append(img)

# Save as favicon.ico (will save all sizes)
favicon_images[0].save(
    'public/favicon.ico',
    format='ICO',
    sizes=[(s, s) for s in favicon_sizes]
)
print(f"✓ Created favicon.ico with sizes: {favicon_sizes}")

# Create OG image (1200x630)
print("Creating OG image...")
og_width, og_height = 1200, 630
og_img = Image.new('RGB', (og_width, og_height), "#0F172A")  # Dark background

draw = ImageDraw.Draw(og_img)

# Draw a gradient-like effect with the emerald color
# Draw top accent bar
draw.rectangle([(0, 0), (og_width, 80)], fill=favicon_color)

# Draw text
try:
    title_font = ImageFont.truetype("arial.ttf", 80)
    subtitle_font = ImageFont.truetype("arial.ttf", 40)
except:
    title_font = ImageFont.load_default()
    subtitle_font = ImageFont.load_default()

title = "ChainScout"
subtitle = "Web3 Security Scanner"

# Draw title
title_bbox = draw.textbbox((0, 0), title, font=title_font)
title_width = title_bbox[2] - title_bbox[0]
title_x = (og_width - title_width) // 2
draw.text((title_x, 150), title, fill=text_color, font=title_font)

# Draw subtitle
subtitle_bbox = draw.textbbox((0, 0), subtitle, font=subtitle_font)
subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
subtitle_x = (og_width - subtitle_width) // 2
draw.text((subtitle_x, 300), subtitle, fill=favicon_color, font=subtitle_font)

# Save OG image
og_img.save('public/og-image.png')
print("✓ Created og-image.png (1200x630)")

print("\n✅ All assets created successfully!")
print("- public/favicon.ico (32x32, 48x48, 64x64)")
print("- public/og-image.png (1200x630)")
