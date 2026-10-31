"""Genera los tamaños del ícono (iOS + macOS) sin canal alfa, como exige App Store."""
import json, sys, os
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
base = Image.open(src).convert('RGB')
images = [{"idiom": "universal", "platform": "ios", "size": "1024x1024", "filename": "icon-ios-1024.png"}]
base.save(os.path.join(out, 'icon-ios-1024.png'))
for pt in (16, 32, 128, 256, 512):
    for scale in (1, 2):
        px = pt * scale
        name = f'icon-mac-{pt}@{scale}x.png'
        base.resize((px, px), Image.LANCZOS).save(os.path.join(out, name))
        images.append({"idiom": "mac", "scale": f"{scale}x", "size": f"{pt}x{pt}", "filename": name})
with open(os.path.join(out, 'Contents.json'), 'w') as f:
    json.dump({"images": images, "info": {"author": "xcode", "version": 1}}, f, indent=2)
