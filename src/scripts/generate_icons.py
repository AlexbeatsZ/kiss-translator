import os
from PIL import Image, ImageDraw, ImageFont

def create_base_icon(size=1024, is_active=False):
    # Create high-res RGBA image with supersampling
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Outer rounded rectangle (Squircle)
    margin = int(size * 0.04)
    radius = int(size * 0.22)
    
    # Background gradient approximation with rounded rect
    bg_color = (24, 34, 54, 255) # Deep Nocturne Indigo
    border_color = (60, 80, 120, 255)
    
    draw.rounded_rectangle(
        [(margin, margin), (size - margin, size - margin)],
        radius=radius,
        fill=bg_color,
        outline=border_color,
        width=int(size * 0.02)
    )
    
    # Top-left "文"
    font_zh_path = "C:/Windows/Fonts/msyh.ttc"
    font_en_path = "C:/Windows/Fonts/segoeuib.ttf"
    
    font_zh = ImageFont.truetype(font_zh_path, int(size * 0.44))
    font_en = ImageFont.truetype(font_en_path, int(size * 0.46))
    
    # "文" character position
    zh_color = (245, 247, 250, 255) # Crisp Ivory White
    en_color = (124, 156, 255, 255) # Translation Indigo Blue
    
    # Draw "文"
    draw.text((int(size * 0.16), int(size * 0.12)), "文", font=font_zh, fill=zh_color)
    
    # Draw "A"
    draw.text((int(size * 0.52), int(size * 0.42)), "A", font=font_en, fill=en_color)
    
    # If active state, add green status badge at bottom-right
    if is_active:
        badge_radius = int(size * 0.16)
        badge_cx = int(size * 0.80)
        badge_cy = int(size * 0.80)
        
        # Border for badge
        draw.ellipse(
            [(badge_cx - badge_radius - int(size * 0.03), badge_cy - badge_radius - int(size * 0.03)),
             (badge_cx + badge_radius + int(size * 0.03), badge_cy + badge_radius + int(size * 0.03))],
            fill=(18, 24, 38, 255)
        )
        # Green circle
        draw.ellipse(
            [(badge_cx - badge_radius, badge_cy - badge_radius),
             (badge_cx + badge_radius, badge_cy + badge_radius)],
            fill=(34, 197, 94, 255)
        )
        # White checkmark
        check_points = [
            (badge_cx - int(badge_radius * 0.45), badge_cy),
            (badge_cx - int(badge_radius * 0.1), badge_cy + int(badge_radius * 0.4)),
            (badge_cx + int(badge_radius * 0.5), badge_cy - int(badge_radius * 0.35))
        ]
        draw.line(check_points, fill=(255, 255, 255, 255), width=int(size * 0.045), joint="curve")
        
    return img

def generate_all_icons():
    base_icon = create_base_icon(1024, is_active=False)
    active_icon = create_base_icon(1024, is_active=True)
    
    sizes = [16, 32, 48, 128, 192]
    out_dir = "public/images"
    os.makedirs(out_dir, exist_ok=True)
    
    # Save PNGs
    for s in sizes:
        resized_base = base_icon.resize((s, s), Image.Resampling.LANCZOS)
        resized_base.save(os.path.join(out_dir, f"logo{s}.png"), "PNG")
        
        resized_active = active_icon.resize((s, s), Image.Resampling.LANCZOS)
        resized_active.save(os.path.join(out_dir, f"logo{s}_active.png"), "PNG")
        print(f"Generated logo{s}.png and logo{s}_active.png")
        
    # Save favicon.ico with multi-resolutions
    ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128)]
    base_icon.save("public/favicon.ico", format="ICO", sizes=ico_sizes)
    print("Generated public/favicon.ico with sizes:", ico_sizes)

if __name__ == "__main__":
    generate_all_icons()
