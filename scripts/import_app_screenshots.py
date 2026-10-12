#!/usr/bin/env python3
"""Fetch publicly listed App Store iPhone screenshots into the portfolio repo."""
import html, json, re, sys, time
from pathlib import Path
from urllib.parse import urlparse, unquote
import requests
from bs4 import BeautifulSoup

BASE=Path("img/apps")
BASE.mkdir(parents=True, exist_ok=True)
S=requests.Session()
S.headers.update({"User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36"})
APPS={"mychoir":("6759878768",8),"mysongs":("6814960554",5)}

def urls_for(app_id):
    for country in ("us","ua","de","gb"):
        try:
            data=S.get("https://itunes.apple.com/lookup",params={"id":app_id,"country":country},timeout=25).json()
            found=data.get("results",[{}])
            shots=found[0].get("screenshotUrls",[]) if found else []
            if shots:
                print("lookup",app_id,country,len(shots))
                return shots
        except Exception as e: print("lookup error",str(e))
    return []

def from_page(app_id):
    candidates=[]
    for country in ("us","de"):
        page=S.get(f"https://apps.apple.com/{country}/app/id{app_id}",timeout=40)
        print("page",country,page.status_code,len(page.content))
        soup=BeautifulSoup(page.text,"html.parser")
        for img in soup.select("img"):
            alt=(img.get("alt") or "").lower()
            par=img
            tag=""
            for _ in range(5):
                if par is None: break
                tag+=" "+' '.join(par.get("class",[]))
                par=par.parent
            if "screenshot" not in (alt+" "+tag).lower():continue
            src=img.get("src") or img.get("data-src")
            if not src:
                source=img.find_parent("picture")
                if source:
                    p=source.select_one("source[srcset]")
                    if p:src=p.get("srcset","").split()[0]
            if src and "mzstatic.com" in src:
                candidates.append(html.unescape(src).split("?")[0])
        if candidates:break
    return list(dict.fromkeys(candidates))

def normalize(url):
    url=html.unescape(url).replace("\\u002F","/")
    # Apple image CDN accepts the original thumb path with size transformation.
    if "/image/thumb/" in url:
        url=re.sub(r"/[^/]+$", "/600x0w.webp",url)
    return url

report={}
for name,(app_id,count) in APPS.items():
    urls=urls_for(app_id)
    if not urls:
        urls=from_page(app_id)
    saved=[]
    for i,url in enumerate(urls[:count],1):
        try:
            src=normalize(url)
            resp=S.get(src,timeout=40)
            resp.raise_for_status()
            if not resp.headers.get("content-type","").startswith("image/"):raise ValueError("not an image")
            file=BASE/f"{name}-{i:02}.webp"
            file.write_bytes(resp.content)
            saved.append(str(file))
            print("saved",file,len(resp.content))
        except Exception as e: print("image error",i,str(e))
    report[name]={"expected":count,"found":len(urls),"saved":len(saved),"files":saved}
Path("img/apps/manifest.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False,indent=2))
if sum(v["saved"] for v in report.values())==0:sys.exit("No screenshots downloaded; stopping without publishing blanks.")
