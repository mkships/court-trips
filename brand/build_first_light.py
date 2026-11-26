"""Build the approved First Light asset kit from its preserved SVG masters.

python3 brand/build_first_light.py
node brand/render_first_light.cjs

The existing wordmark and the website are not modified by this export pipeline.
"""
from pathlib import Path
import re
import json
import base64
from html import escape

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'first-light'
SRC = OUT / 'source'
BLUE, GREEN, BALL, INK, PAPER = '#2d5d8c', '#3a6e52', '#dcf343', '#16233a', '#faf8f1'

def read(name):
    s = (SRC/name).read_text()
    vb = re.search(r'viewBox="([^"]+)"', s).group(1)
    body = re.sub(r'^<svg[^>]*>|</svg>\s*$', '', s.strip())
    body = re.sub(r'<title>.*?</title>', '', body)
    return body, vb

EM, EMVB = read('emblem.svg')
WM, WMVB = read('wordmark.svg')
WMR, _ = read('wordmark-reversed.svg')
MI, MIVB = read('favicon.svg')
MID, _ = read('favicon-dark.svg')

def svg(body, vb, title):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-label="{escape(title)}"><title>{escape(title)}</title>{body}</svg>\n'

def place(body, x, y, w, h=None, vb=EMVB, uid=''):
    if uid:
        ids = re.findall(r'\bid="([^"]+)"', body)
        for id_ in ids:
            body = body.replace(f'id="{id_}"', f'id="{uid}-{id_}"').replace(f'url(#{id_})', f'url(#{uid}-{id_})')
    return f'<svg x="{x}" y="{y}" width="{w}" height="{h or w}" viewBox="{vb}">{body}</svg>'

def save(name, body, vb, title):
    f = OUT/name
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(svg(body, vb, title))

def recolor(body, color):
    for c in [BLUE,GREEN,BALL,INK,'#ffffff']:
        body = body.replace(c, color)
    return body

def art(theme):
    if theme == 'primary': return EM, WM
    if theme == 'reversed':
        return EM.replace(BLUE, '#ffffff').replace(GREEN, '#ffffff'), WMR
    color={'ink':INK, 'black':'#000000', 'white':'#ffffff'}[theme]
    return recolor(EM,color), recolor(WM,color)

VARIANTS={}
for theme in ['primary','reversed','ink','black','white']:
    mark, word = art(theme)
    horizontal=place(mark,0,0,154,uid='horizontal')+place(word,174,55,455,94,WMVB)
    stacked=place(mark,64,12,384,uid='stacked')+place(word,48,378,416,85.8,WMVB)
    for category, body, vb in [
        ('horizontal',horizontal,'0 0 644 154'),
        ('stacked',stacked,'0 0 512 512'),
        ('emblem',mark,EMVB),
        ('wordmark',word,WMVB),
    ]:
        save(f'logos/{category}/{theme}.svg',body,vb,f'Court Trips — {category} — {theme}')
        VARIANTS[(category,theme)]=(body,vb)

for theme, body in [('light',MI),('dark',MID)]:
    save(f'favicons/favicon-{theme}.svg',body,MIVB,f'Court Trips favicon — {theme}')
auto=(MI.replace(BLUE,'var(--court)').replace(GREEN,'var(--land)').replace(BALL,'var(--ball)'))
style=f'<style>:root{{--court:{BLUE};--land:{GREEN};--ball:{BALL}}}@media(prefers-color-scheme:dark){{:root{{--court:#9dc4e5;--land:#86b79a}}}}</style>'
save('favicons/favicon.svg',style+auto,MIVB,'Court Trips adaptive favicon')
save('favicons/safari-pinned-tab.svg',recolor(MI,'#000000'),MIVB,'Court Trips pinned tab')

for theme,bg,mark in [
    ('paper',PAPER,EM),('white','#ffffff',EM),
    ('ink',INK,art('reversed')[0]),('green',GREEN,art('reversed')[0]),
]:
    body=f'<rect width="256" height="256" fill="{bg}"/>{mark}'
    save(f'app-icons/app-{theme}.svg',body,EMVB,f'Court Trips app icon — {theme}')
maskable=f'<rect width="256" height="256" fill="{PAPER}"/><g transform="translate(17.92 17.92) scale(.86)">{EM}</g>'
save('app-icons/app-maskable.svg',maskable,EMVB,'Court Trips maskable app icon')
(OUT/'app-icons/site.webmanifest').write_text(json.dumps({
    'name':'Court Trips','short_name':'Court Trips','start_url':'/','scope':'/',
    'display':'standalone','background_color':PAPER,'theme_color':GREEN,
    'icons':[
        {'src':f'icon-{s}.png','sizes':f'{s}x{s}','type':'image/png','purpose':'any'} for s in [192,512]
    ]+[
        {'src':f'icon-maskable-{s}.png','sizes':f'{s}x{s}','type':'image/png','purpose':'maskable'} for s in [192,512]
    ],
},indent=2)+'\n')

def text(x,y,s,size=16,color=INK,weight=400,font='Helvetica Neue, Helvetica, Arial, sans-serif'):
    return f'<text x="{x}" y="{y}" fill="{color}" font-family="{font}" font-size="{size}" font-weight="{weight}">{escape(s)}</text>'

def rect(x,y,w,h,bg,rx=0):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{bg}"/>'

illustration=(OUT/'illustrations/court-trips-editorial-transparent.png').read_bytes()
data='data:image/png;base64,'+base64.b64encode(illustration).decode()
art_def=f'<defs><symbol id="editorial" viewBox="0 0 1254 1254"><image width="1254" height="1254" href="{data}"/></symbol></defs>'
def illustration_at(x,y,size):
    return f'<use href="#editorial" x="{x}" y="{y}" width="{size}" height="{size}"/>'

# Ready-to-use social cover and square brand artwork; preserve the illustration.
body=rect(0,0,1200,630,PAPER)+art_def
body+=place(VARIANTS[('horizontal','primary')][0],50,44,470,112,'0 0 644 154','social-logo')
body+=text(58,283,'Find your next',45,font='Georgia, serif')+text(58,341,'great court escape.',45,font='Georgia, serif')
body+=text(60,403,'Tennis, pickleball and padel',21)+text(60,434,'camps, clinics and getaways.',21)
body+=text(60,559,'courttrips.com',20,BLUE)+illustration_at(589,9,610)
save('social/open-graph.svg',body,'0 0 1200 630','Court Trips — social sharing cover')
body=rect(0,0,1080,1080,PAPER)+art_def+illustration_at(115,0,850)
body+=place(WM,230,890,620,128,WMVB)+text(434,1040,'courttrips.com',20,BLUE)
save('social/square.svg',body,'0 0 1080 1080','Court Trips — square brand artwork')

# Compact visual index of the logo system. White/reversed art is shown on ink.
parts=[rect(0,0,1600,1600,PAPER),text(56,62,'COURT TRIPS / FIRST LIGHT ASSET KIT',17,INK,600),
       text(56,106,'Approved artwork, ready for different uses.',32,INK,600)]
themes=['primary','reversed','ink','white']
for col,theme in enumerate(themes):
    x=48+col*388
    bg=INK if theme in ['reversed','white'] else '#ffffff'
    fg='#ffffff' if bg==INK else INK
    parts+=[rect(x,144,372,1030,bg,16),text(x+22,181,theme.title(),17,fg,600)]
    for category,y,w,h in [('horizontal',226,336,80),('stacked',351,300,300),('emblem',680,228,228),('wordmark',992,336,70)]:
        body,vb=VARIANTS[(category,theme)]
        parts+=[place(body,x+(372-w)/2,y,w,h,vb,f'{theme}-{category}')]
for i,(theme,bg) in enumerate([('paper',PAPER),('white','#ffffff'),('ink',INK),('green',GREEN)]):
    x=74+i*180
    mark=EM if i<2 else art('reversed')[0]
    parts += [rect(x,1255,124,124,bg,26),place(mark,x,1255,124,uid=f'app-swatch{i}'),text(x,1412,theme.title(),14)]
parts += [text(64,1220,'APP ICONS',15,INK,600),text(850,1220,'FAVICONS / ACTUAL SIZE',15,INK,600)]
for row,(body,bg) in enumerate([(MI,'#ffffff'),(MID,INK)]):
    y=1254+row*100
    parts += [rect(844,y,670,76,bg,10)]
    for j,size in enumerate([16,24,32,48]):
        x=873+j*150
        parts += [place(body,x,y+(76-size)/2,size,vb=MIVB,uid=f'favicon-{row}-{size}')]
parts += [text(56,1520,'SVG + transparent PNG • pure black and maskable exports are included in the download.',17)]
save('previews/asset-overview.svg',''.join(parts),'0 0 1600 1600','Court Trips complete asset overview')

# Editorial usage examples, kept distinct from destination photography.
parts=[rect(0,0,1440,1270,PAPER),art_def,
       text(54,58,'THE ILLUSTRATION / A BRAND WORLD',16,INK,600),
       text(54,107,'Give it room to tell the travel story.',34,INK,600)]
parts += [rect(48,150,1344,440,'#ffffff',16),text(78,188,'01  ABOUT / BRAND INTRODUCTION',13,BLUE,600),
          place(WM,88,238,420,87,WMVB),text(88,384,'Good places.',35,font='Georgia, serif'),
          text(88,431,'Great company. More time on court.',29,font='Georgia, serif'),
          text(90,490,'Discover the camps, clinics and getaways',18),text(90,520,'that make a holiday worth taking.',18),
          illustration_at(855,160,420)]
parts += [rect(48,630,652,548,'#ffffff',16),text(78,670,'02  NEWSLETTER WELCOME / EDITORIAL OPENER',13,BLUE,600),
          illustration_at(210,690,330),text(87,1060,'Your next court escape starts here.',25,font='Georgia, serif'),
          text(88,1106,'Use once at the top of a welcome email or seasonal note.',16)]
parts += [rect(740,630,652,548,'#ffffff',16),text(770,670,'03  TRAVEL GUIDE / SOCIAL COVER',13,BLUE,600),
          illustration_at(902,690,330),place(WM,882,1038,370,76,WMVB),text(929,1140,'The Court Trips travel edit',20,font='Georgia, serif')]
parts += [text(55,1230,'Start with the About page and newsletter welcome. Let the emblem handle everyday branding.',17)]
save('previews/illustration-uses.svg',''.join(parts),'0 0 1440 1270','Court Trips illustration usage examples')

(OUT/'palette.json').write_text(json.dumps({'court_blue':BLUE,'garden_green':GREEN,'ball':BALL,'ink':INK,'paper':PAPER},indent=2)+'\n')
print(f'Built SVG masters in {OUT}')
