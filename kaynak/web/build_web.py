"""Web sürümünü güncel masaüstü programından (kaynak/template.html) üretir.
   python3 -I build_web.py   → ../../web-demo/index.html  (sunucusuz demo: veriler tarayıcıda, HAYALİ isimler)

Masaüstündeki tüm ekranlar ve algoritma aynen alınır; web'e özgü parçalar eklenir:
  web.css · web_sections.html (Talepler, Kullanıcılar) · web_pages.html (kullanıcı sayfası, talep sayfası, giriş)
  web_app.js (yayınlama, kullanıcılar, talepler, kişisel sayfa, giriş) · api_demo.js (veri katmanı; gerçek sürümde Supabase)
Dosya/şifre kilidi (USB) çıkarılır, kayıt sunucuya (demoda tarayıcıya) yapılır.
"""
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
KAYNAK = os.path.dirname(HERE)
PROJ = os.path.dirname(KAYNAK)
rd = lambda p: open(os.path.join(HERE, p), encoding='utf-8').read()

# ---- sabit veriler ve Kasım örneği: masaüstü build.py ile aynı, isimler hayali (KVKK)
src = open(os.path.join(KAYNAK, 'build.py'), encoding='utf-8').read()
ns = {'__file__': os.path.join(KAYNAK, 'build.py')}
exec(src[:src.index("core = open(")], ns)
fixed, demo = ns['fixed'], ns['demo']
FAKE = """Kemal Arslan|Elif Yıldız|Nazlı Koç|Selin Aydemir|Murat Ekinci|Hakan Demir|Serkan Polat|Derya Uslu|Gamze Erdem|Pınar Yalçın|Melis Karaca|Onur Şahin|Defne Kaplan|Canan Güler|Burak Tekin|Sibel Akın|Nihan Bulut|İrem Aksoy|Tuba Kurt|Ozan Çelik|Tolga Avcı|Emre Kılıç|Can Öztürk|Barış Duman|Cem Yavuz|Volkan Işık|Kerem Aslan|Gizem Çınar|Hande Ateş|Sinan Erol|Uğur Taş|Aslı Özdemir|Neslihan Uçar|Ece Karataş|Fatih Gündüz""".split('|')
REAL = [d['name'] for d in fixed['doctors']]
MAP = dict(zip(REAL, FAKE)); assert len(MAP) == 35
up = lambda s: s.replace('i', 'İ').replace('ı', 'I').upper()
for d in fixed['doctors']: d['name'] = MAP[d['name']]
r, l = demo['rosterText'], demo['leavesText']
for a, b in sorted(MAP.items(), key=lambda x: -len(x[0])):
    r = r.replace(up(a), up(b)); l = l.replace(a, b)
r = r.replace('BARIŞ DUMAN', up(MAP['Barış Duman']))
demo = {'rosterText': r, 'leavesText': l, 'included': [MAP[n] for n in demo['included']]}
ADMIN_DOC = MAP['Defne Kaplan']

# ---- hazır demo verisi (make_seed.py üretir; NOSEED=1 ile tohumsuz derlenir)
SP = os.path.join(HERE, 'demo_seed.json')
SEED = open(SP, encoding='utf-8').read().strip() if os.path.exists(SP) and not os.environ.get('NOSEED') else 'null'

# ---- masaüstü şablonunu web'e çevir
html = open(os.path.join(KAYNAK, 'template.html'), encoding='utf-8').read()
def rep(a, b, n=1):
    global html
    assert html.count(a) == n, (html.count(a), a[:80])
    html = html.replace(a, b)

rep('<title>Gün İçi Çalışma Programı</title>', '<title>Daytime Work Schedule</title>')
rep('</style>', rd('web.css') + '\n</style>')
rep('<header>', '<div id="adminApp" hidden>\n<header>')
rep('<div class="month noprint">Ay:', '<div class="month noprint"><span id="whoAdmin" class="who"></span> Ay:')
rep('<button data-tab="sabit">Sabit veriler</button>', '<button data-tab="sabit">Sabit veriler</button>\n  <button data-tab="talep">Talepler</button>\n  <button data-tab="ben" id="navMe" hidden>Benim sayfam</button>\n  <button data-tab="kullanici">Kullanıcılar</button>')
rep('<!-- ============ YARDIM ============ -->', rd('web_sections.html') + '\n<!-- ============ YARDIM ============ -->')
rep('</main>\n', '</main>\n</div>\n' + rd('web_pages.html'))
rep('<div id="lock"><div id="lockBox" class="lockcard"></div></div>\n', '')
rep('<div class="verbar noprint" id="verBar"></div>', '<div id="pubBar" class="noprint"></div>\n    <div class="verbar noprint" id="verBar"></div>')
# Sabit veriler: şifre/USB kartı → yedekleme
i = html.index('    <h2>Şifre ve yedekleme</h2>'); j = html.index('</div>', html.index('<p class="small">Yedeği geri yüklemek için', i)) + 6
html = html[:i] + '''    <h2>Yedekleme</h2>
    <p class="hint">Veriler sunucuda saklanır. İsterseniz tüm yönetici verilerinin bir kopyasını indirip saklayabilirsiniz.</p>
    <div class="btns"><button class="btn" id="btnBackup">Yedek kopya indir</button><label class="btn">Yedekten geri yükle<input type="file" id="fileRestore" accept=".json" hidden></label><button class="btn" id="btnReset">Sabit verileri varsayılana döndür</button></div>
  </div>''' + html[j:]
# Yardım: USB kartı çıkar
i = html.index('    <h2>USB ile kullanım ve şifre</h2>'); i = html.rindex('<div class="card">', 0, i); j = html.index('</div>', html.index('Şifre unutulursa veriler kurtarılamaz', i)) + 6
html = html[:i] + html[j:].lstrip('\n')
# depolama: şifreli dosya → sunucu (demoda tarayıcı)
i = html.index('/* ================= DEPOLAMA ================= */'); j = html.index('/* ================= YARDIMCILAR ================= */')
mf = re.search(r'function migrateFixed\(\) \{.*?\n\}\n', html[i:j], re.S).group(0)
html = html[:i] + '''/* ================= DEPOLAMA (web: sunucu; demoda bu tarayıcı) ================= */
const STORE_KEY = 'gunici-calisma-programi.v1';
let store;
function freshStore() { return { fixed: structuredClone(DEFAULT_FIXED), months: {}, current: null }; }
let saveTimer = null, me = null, viewingAsUser = false, adminStore = null, hidePts = false;
let fileHandle = null, pendingSave = false, saving = false;
function saveStore() {
  if (!me || me.role !== 'admin' || viewingAsUser) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => API.saveAdminState(store).catch(e => alert('Kaydedilemedi: ' + e.message)), 500);
}
function renderFileBar() { const b = document.getElementById('fileBar'); if (b) b.style.display = 'none'; }
''' + 'const DEMO_SEED = ' + SEED + ';\n' + rd('api_demo.js') + '\n' + mf + '\n' + html[j:]
# yayın çubuğu, kullanıcıda puan sütunu gizleme, sürüm yardımcıları
rep('  renderDraftBar(V);\n', '  renderDraftBar(V);\n  renderPubBar(V);\n')
rep('const revs = () => M().revs || [];', 'const revs = () => (M() && M().revs) || [];')
rep('<th>Hekim</th>${dayHead()}<th class="num">Puan</th></tr>${rows}</table>', '<th>Hekim</th>${dayHead()}${hidePts ? \'\' : \'<th class="num">Puan</th>\'}</tr>${rows}</table>')
rep('}).join(\'\')}<td class="num"><b>${nf(sm[i].total)}</b></td></tr>`).join(\'\') + icuNames()', '}).join(\'\')}${hidePts ? \'\' : `<td class="num"><b>${nf(sm[i].total)}</b></td>`}</tr>`).join(\'\') + icuNames()')
rep('<p class="hint noprint">${progVer === \'draft\'', '<p class="hint noprint" ${!document.getElementById(\'userApp\').hidden ? \'hidden\' : \'\'}>${progVer === \'draft\'')
# başlatma: kilit/USB yerine giriş
i = html.index("  $('#btnBackup').onclick = backupCopy;"); j = html.index("if (FS_OK) IDB.get()", i); j = html.index('\n', j) + 1
html = html[:i] + "  $('#btnReset').onclick = () => { if (confirm('Hekim ve oda listeleri varsayılana dönsün mü? (Aylık veriler korunur.)')) { store.fixed = structuredClone(DEFAULT_FIXED); saveStore(); renderSabit(); } };\n  initWeb();\n" + html[j:]
rep('\ninit();\n</script>', '\n' + rd('web_app.js') + '\ninit();\n</script>')

core = open(os.path.join(KAYNAK, 'core.js'), encoding='utf-8').read().replace("if (typeof module !== 'undefined') module.exports = CORE;\n", '')
html = (html.replace('/*__CORE__*/', core).replace('/*__FIXED__*/', json.dumps(fixed, ensure_ascii=False, indent=1))
            .replace('/*__DEMO__*/', json.dumps(demo, ensure_ascii=False)).replace("'Defne Kaplan'", repr(ADMIN_DOC)))
out_dir = os.path.join(PROJ, 'web-demo'); os.makedirs(out_dir, exist_ok=True)
open(os.path.join(out_dir, 'index.html'), 'w', encoding='utf-8').write(html)
print('yazıldı web-demo/index.html', len(html))
print('örnek veri hayali isimlidir (KVKK); gerçek isim kontrolü özel sürümde yapılır')
