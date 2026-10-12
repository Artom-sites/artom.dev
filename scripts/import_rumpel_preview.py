#!/usr/bin/env python3
"""Import Rumpel-Pumpel's official Webflow preview as a static portfolio thumbnail."""
from pathlib import Path
from io import BytesIO
import requests
from PIL import Image, ImageOps
url="https://screenshots.webflow.com/sites/68ee3ad9cd93ebe4dea420d4/20260105140443_11a2ab000d45c97b9704336376a03d51.png"
r=requests.get(url,timeout=45,headers={"User-Agent":"Mozilla/5.0"})
r.raise_for_status()
im=Image.open(BytesIO(r.content))
im.load()
print("Webflow preview:",im.size)
if im.width<300 or im.height<200:raise ValueError("Preview too small")
# Make a 16:9 portfolio visual, preserving top of the Webflow page.
im=ImageOps.exif_transpose(im).convert("RGB")
target=16/9
w,h=im.size
if w/h>target:
    nw=round(h*target);left=(w-nw)//2;im=im.crop((left,0,left+nw,h))
else:
    nh=round(w/target);im=im.crop((0,0,w,min(nh,h)))
im.thumbnail((1600,900),Image.Resampling.LANCZOS)
dst=Path("img/rumpel-pumpel.webp")
dst.parent.mkdir(parents=True,exist_ok=True)
im.save(dst,"WEBP",quality=85,method=6)
print("Saved",dst,dst.stat().st_size)
