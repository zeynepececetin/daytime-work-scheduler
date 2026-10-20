"""Portfolyo ekran görüntüleri: web-demo + scenes.js → cap.html → Chrome headless.
   python3 capture.py [sahne ...]   → shots/*.png, shots/rapor.pdf, shots/resmi.xlsx"""
import os, sys, subprocess, tempfile, json, base64, re, shutil
HERE = os.path.dirname(os.path.abspath(__file__)); PROJ = os.path.dirname(os.path.dirname(HERE))
CH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
html = open(os.path.join(PROJ, 'web-demo', 'index.html'), encoding='utf-8').read()
open(os.path.join(HERE, 'cap.html'), 'w', encoding='utf-8').write(html.replace('</body>', '<script>' + open(os.path.join(HERE, 'scenes.js'), encoding='utf-8').read() + '</script>\n</body>'))
os.makedirs(os.path.join(HERE, 'shots'), exist_ok=True)
DESK = ['resmiimg', 'ay', 'izin', 'talepler', 'kullanici', 'gunluk', 'ozet', 'kisigun', 'uyari', 'degisiklik', 'revize', 'login']
PHONE = ['p-login', 'p-home', 'p-cal']
def chrome(args, url):
    with tempfile.TemporaryDirectory() as ud:
        return subprocess.run([CH, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', f'--user-data-dir={ud}', '--virtual-time-budget=120000', '--run-all-compositor-stages-before-draw'] + args + [url], capture_output=True, text=True, timeout=300)
cap = 'file://' + os.path.join(HERE, 'cap.html')
want = sys.argv[1:] or DESK + PHONE + ['rapor', 'resmi']
for s in want:
    out = os.path.join(HERE, 'shots', s)
    if s in PHONE:
        h = 1500 if s in ('p-cal', 'p-gunluk') else 844
        chrome(['--window-size=390,%d' % h, '--force-device-scale-factor=3', f'--screenshot={out}.png'], 'file://' + os.path.join(HERE, 'wrap.html') + f'?h={h}#shots-{s}')
    elif s == 'rapor':
        chrome(['--no-pdf-header-footer', f'--print-to-pdf={out}.pdf'], cap + '#shots-rapor')
    elif s == 'resmi':
        r = chrome(['--dump-dom'], cap + '#shots-resmi')
        m = re.search(r'<pre id="OUT"[^>]*>(.*?)</pre>', r.stdout, re.S)
        o = json.loads(m.group(1).replace('&quot;', '"').replace('&amp;', '&')) if m else {}
        if o.get('xlsx'): open(out + '.xlsx', 'wb').write(base64.b64decode(o['xlsx']))
        print(s, 'hata' if o.get('error') else 'ok', o.get('error', '')[:300])
        continue
    else:
        hh = 1100 if s in ('degisiklik', 'revize', 'ozet', 'kisigun', 'gunluk') else 900
        chrome(['--window-size=1440,%d' % hh, '--force-device-scale-factor=2', f'--screenshot={out}.png'], cap + '#shots-' + s)
    print(s, 'ok' if os.path.exists(out + ('.pdf' if s == 'rapor' else '.png')) else 'YOK')
