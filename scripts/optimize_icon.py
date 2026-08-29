from pathlib import Path
from PIL import Image

source = Path("/home/ubuntu/webdev-static-assets/rural-health-access-icon.png")
target_dir = Path("/home/ubuntu/rural-health-access/assets/images")
targets = ["icon.png", "splash-icon.png", "favicon.png", "android-icon-foreground.png"]

with Image.open(source) as image:
    canvas = image.convert("RGBA")
    canvas.thumbnail((512, 512), Image.Resampling.LANCZOS)
    for filename in targets:
        canvas.save(target_dir / filename, format="PNG", optimize=True, compress_level=9)
