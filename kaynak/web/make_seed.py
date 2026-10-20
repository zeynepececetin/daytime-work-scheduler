"""Web demosunun hazır örnek verisini üretir → demo_seed.json
   python3 -I make_seed.py   (ardından build_web.py tohumla yeniden derler)

Portfolyo sahnelerindeki kurulum (portfolyo/scenes.js → base()) Chrome headless'ta çalıştırılır:
Kasım 2026 ay bilgileri girilir, program oluşturulup yayınlanır, Aralık izin talepleri eklenir.
Sonuç tarayıcı deposundan alınıp demoya gömülür; demoya ilk girişte admin ve kullanıcı bu verileri görür."""
import os, sys, json, re, subprocess, tempfile, time
HERE = os.path.dirname(os.path.abspath(__file__)); KAYNAK = os.path.dirname(HERE); PROJ = os.path.dirname(KAYNAK)
CH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
subprocess.run([sys.executable, '-I', os.path.join(HERE, 'build_web.py')], check=True, env={**os.environ, 'NOSEED': '1'})
html = open(os.path.join(PROJ, 'web-demo', 'index.html'), encoding='utf-8').read()
scenes = open(os.path.join(KAYNAK, 'portfolyo', 'scenes.js'), encoding='utf-8').read()
dump = """
(async () => {
  while (document.title !== 'READY') await new Promise(r => setTimeout(r, 100));
  await API.saveAdminState(store);
  const data = {};
  for (const k of ['state', 'pub', 'round', 'req', 'invites', 'accounts', 'adminDoctor']) { const v = localStorage.getItem('gicp-demo:' + k); if (v) data[k] = JSON.parse(v); }
  const pre = document.createElement('pre'); pre.id = 'SEED'; pre.textContent = JSON.stringify(data); document.body.appendChild(pre);
})();"""
with tempfile.TemporaryDirectory() as td:
    page = os.path.join(td, 'seed.html')
    open(page, 'w', encoding='utf-8').write(html.replace('</body>', '<script>' + scenes + '</script>\n<script>' + dump + '</script>\n</body>'))
    r = subprocess.run([CH, '--headless=new', '--disable-gpu', '--no-first-run', f'--user-data-dir={os.path.join(td, "ud")}', '--virtual-time-budget=120000',
                        '--dump-dom', 'file://' + page + '#shots-ay'], capture_output=True, text=True, timeout=300)
m = re.search(r'<pre id="SEED">(.*?)</pre>', r.stdout, re.S)
err = re.search(r'<pre id="OUT"[^>]*>(.*?)</pre>', r.stdout, re.S)
if err and '"error"' in err.group(1): sys.exit('sahne hatası: ' + err.group(1)[:500])
if not m: sys.exit('tohum alınamadı')
data = json.loads(m.group(1).replace('&quot;', '"').replace('&lt;', '<').replace('&gt;', '>').replace('&amp;', '&'))
data.pop('accounts', None)   # hesaplar demoda varsayılan haliyle kurulur (yönetici + ilk hekim, şifre demo123)
assert data['state']['months']['2026-11']['result'] and '2026-11' in data['pub'], 'program ya da yayın eksik'
json.dump({'v': time.strftime('%Y%m%d%H%M%S'), 'data': data}, open(os.path.join(HERE, 'demo_seed.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('demo_seed.json yazıldı:', ', '.join(data))
