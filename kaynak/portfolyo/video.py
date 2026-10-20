"""Portfolyo videosu kareleri: 1920×1080, 30 fps, İngilizce açıklama yazıları.
   python3 video.py  → frames/*.jpg  (sonra: swift encode.swift frames video.mp4 30)"""
import os, shutil
from PIL import Image, ImageDraw, ImageFont, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__)); SH = os.path.join(HERE, 'shots'); OUT = os.path.join(HERE, 'frames')
W, H, FPS = 1920, 1080, 30
F = '/System/Library/Fonts/Supplemental/'
font = lambda s, b=False: ImageFont.truetype(F + ('Arial Bold.ttf' if b else 'Arial.ttf'), s)
NAVY = (20, 33, 61); BLUE = (31, 111, 235)
ease = lambda t: t * t * (3 - 2 * t)
cache = {}
def img(n):
    if n not in cache:
        im = Image.open(os.path.join(SH, n + '.png')).convert('RGB')
        if im.width > 2600: im = im.resize((2600, round(im.height * 2600 / im.width)), Image.LANCZOS)
        cache[n] = im
    return cache[n]

def kb(n, r0, r1):
    """Ken Burns: kaynak üzerindeki dikdörtgen (oran 0–1: x, y, genişlik) r0 → r1"""
    im = img(n)
    def f(t):
        e = ease(t); x, y, w = [a + (b - a) * e for a, b in zip(r0, r1)]
        cw = w * im.width; ch = cw * H / W
        box = (x * im.width, y * im.height, x * im.width + cw, y * im.height + ch)
        return im.crop(tuple(round(v) for v in box)).resize((W, H), Image.BILINEAR)
    return f

def phone(n, top=0.0, bot=0.25, side=None):
    """telefon görüntüsü: ortada çerçeveli, yavaşça aşağı kayar; yanında büyük yazı"""
    im = img(n); ph_h = 960; ph_w = 472
    sc = ph_w / im.width; full = im.resize((ph_w, round(im.height * sc)), Image.LANCZOS)
    bg = Image.new('RGB', (W, H), (238, 242, 248))
    def f(t):
        fr = bg.copy(); d = ImageDraw.Draw(fr)
        off = round((top + (bot - top) * ease(t)) * max(0, full.height - ph_h))
        scr = full.crop((0, off, ph_w, off + ph_h))
        x0, y0 = 1180, (H - ph_h) // 2
        d.rounded_rectangle((x0 - 16, y0 - 16, x0 + ph_w + 16, y0 + ph_h + 16), 46, fill=NAVY)
        fr.paste(scr, (x0, y0))
        if side:
            yy = 360
            for i, line in enumerate(side):
                d.text((170, yy), line, font=font(58 if i == 0 else 38, i == 0), fill=NAVY if i == 0 else (60, 70, 90)); yy += 86 if i == 0 else 56
        return fr
    return f

def card(lines, sub=None, dark=True):
    def f(t):
        fr = Image.new('RGB', (W, H), NAVY if dark else (246, 247, 249)); d = ImageDraw.Draw(fr)
        a = min(1, t * 4)
        col = lambda c: tuple(round(bg + (cc - bg) * a) for cc, bg in zip(c, NAVY if dark else (246, 247, 249)))
        y = 360 if sub else 420
        for i, (txt, sz, b, c) in enumerate(lines):
            d.text((160, y), txt, font=font(sz, b), fill=col(c)); y += sz + 34
        if sub:
            y += 30
            for s in sub: d.text((160, y), s, font=font(32), fill=col((170, 190, 220) if dark else (90, 100, 120))); y += 52
        return fr
    return f

def caption(fr, text, t, sub=None):
    a = min(1, t * 5, (1 - t) * 6) if t < 1 else 0
    if a <= 0: return fr
    ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    f1, f2 = font(46, True), font(30)
    w = max(d.textlength(text, font=f1), d.textlength(sub or '', font=f2)) + 90
    h = 120 if sub else 96
    x0, y0 = 70, H - h - 60
    d.rounded_rectangle((x0, y0, x0 + w, y0 + h), 22, fill=(20, 33, 61, round(225 * a)))
    d.rectangle((x0, y0 + 18, x0 + 8, y0 + h - 18), fill=(*BLUE, round(255 * a)))
    d.text((x0 + 40, y0 + 22), text, font=f1, fill=(255, 255, 255, round(255 * a)))
    if sub: d.text((x0 + 40, y0 + 76), sub, font=f2, fill=(200, 212, 235, round(255 * a)))
    return Image.alpha_composite(fr.convert('RGBA'), ov).convert('RGB')

# (süre sn, kare üretici, açıklama, alt açıklama)
SCENES = [
    (5.0, card([('Daytime Work Schedule', 92, True, (255, 255, 255)), ('Fair, rule-based monthly room assignments', 44, False, (201, 211, 230)), ('for an anesthesiology department', 44, False, (201, 211, 230))]), None, None),
    (6.5, kb('resmiimg', (0.0, 0.0, 0.55), (0.42, 0.08, 0.55)), 'Every month: ~27 doctors × 25 rooms × 21 working days', 'scheduled by hand — with many rules and equal workloads expected'),
    (6.5, kb('ay', (0.0, 0.0, 1.0), (0.02, 0.10, 0.70)), 'Built around the department’s real monthly workflow', 'roster → intensive care → leave → requests → generate → official list'),
    (7.0, phone('p-cal', 0.0, 0.15, ['Leave requests', 'Doctors pick the leave type', 'and tap the days on their phone.', 'Nothing is sent until they confirm.']), None, None),
    (6.0, kb('talepler', (0.0, 0.08, 0.80), (0.04, 0.14, 0.62)), 'The scheduler approves each day with one click', 'a heat map shows how many doctors asked for each day'),
    (8.0, kb('gunluk', (0.0, 0.0, 1.0), (0.0, 0.32, 0.62)), 'The whole month is built in seconds', 'an optimisation algorithm keeps all 15 hard rules — every time'),
    (7.0, kb('ozet', (0.0, 0.30, 0.70), (0.18, 0.36, 0.70)), 'Workloads balanced', 'largest gap ≈ 0.2% from each doctor’s fair target in test runs'),
    (8.0, kb('degisiklik', (0.0, 0.0, 1.0), (0.02, 0.10, 0.78)), 'Someone falls ill mid-month?', 'affected days turn red — the program proposes fixes, past days stay locked'),
    (6.0, kb('revize', (0.0, 0.0, 1.0), (0.0, 0.18, 0.72)), 'Every revision is saved and versioned', 'the original plan is never overwritten'),
    (4.5, kb('rapor', (0.0, 0.0, 1.0), (0.04, 0.04, 0.80)), 'Official change report for the administration', None),
    (6.5, phone('p-home', 0.0, 0.55, ['Personal schedules', 'Each doctor sees their own month:', 'rooms, clinic days, days off.']), None, None),
    (6.0, card([('Daytime Work Schedule', 64, True, (255, 255, 255))], ['Desktop version in use by the department from November 2026.', 'Built with AI-assisted development.', 'All names shown are fictional (personal data protection).']), None, None),
]
XF = 0.5   # geçiş (sn)
if os.path.exists(OUT): shutil.rmtree(OUT)
os.makedirs(OUT)
k = 0; prev_tail = None
for si, (dur, gen, cap, sub) in enumerate(SCENES):
    n = round(dur * FPS)
    for i in range(n):
        t = i / (n - 1)
        fr = gen(t)
        if cap: fr = caption(fr, cap, min(1, max(0, (i / FPS - 0.4) / max(0.1, dur - 0.9))), sub)
        if prev_tail is not None and i < XF * FPS:   # önceki sahneden çapraz geçiş
            fr = Image.blend(prev_tail, fr, i / (XF * FPS))
        fr.save(os.path.join(OUT, f'{k:05d}.jpg'), quality=90); k += 1
    prev_tail = fr
print('kare', k, 'süre', round(k / FPS, 1), 'sn')
