import os
from PIL import Image, ImageDraw

def draw_logo(size):
    # Create an image with transparent background
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Scale factor from 32x32 viewbox
    F = size / 32.0
    
    # Rounded rect coordinates
    x1, y1 = 4 * F, 4 * F
    x2, y2 = 28 * F, 28 * F
    rx = 6 * F
    
    # Draw dark rounded rectangle
    draw.rounded_rectangle([x1, y1, x2, y2], radius=rx, fill="#111111")
    
    # Line width scaled
    stroke_width = max(1.0, 2.5 * F)
    r_cap = stroke_width / 2.0
    
    # Draw paths
    # Line 1: Horizontal bar (10, 11) to (22, 11)
    lx1_1, ly1_1 = 10 * F, 11 * F
    lx2_1, ly2_1 = 22 * F, 11 * F
    draw.line([lx1_1, ly1_1, lx2_1, ly2_1], fill="#ffffff", width=int(round(stroke_width)))
    
    # Line 2: Vertical stem (16, 11) to (16, 22)
    lx1_2, ly1_2 = 16 * F, 11 * F
    lx2_2, ly2_2 = 16 * F, 22 * F
    draw.line([lx1_2, ly1_2, lx2_2, ly2_2], fill="#ffffff", width=int(round(stroke_width)))
    
    # Line 3: Middle branch (16, 16.5) to (20.5, 16.5)
    lx1_3, ly1_3 = 16 * F, 16.5 * F
    lx2_3, ly2_3 = 20.5 * F, 16.5 * F
    draw.line([lx1_3, ly1_3, lx2_3, ly2_3], fill="#ffffff", width=int(round(stroke_width)))
    
    # Draw round linecaps
    endpoints = [
        (lx1_1, ly1_1),
        (lx2_1, ly2_1),
        (lx2_2, ly2_2),
        (lx2_3, ly2_3)
    ]
    for cx, cy in endpoints:
        draw.ellipse([cx - r_cap, cy - r_cap, cx + r_cap, cy + r_cap], fill="#ffffff")
        
    return img

def main():
    target_dir = "/Users/sasi/antigravity/Talentflow/extension/icons"
    os.makedirs(target_dir, exist_ok=True)
    
    sizes = [16, 48, 128]
    for size in sizes:
        img = draw_logo(size)
        path = os.path.join(target_dir, f"icon-{size}.png")
        img.save(path, "PNG")
        print(f"Generated {size}x{size} icon at: {path}")

if __name__ == "__main__":
    main()
