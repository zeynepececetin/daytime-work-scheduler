import json, csv, os, datetime as dt
HERE = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.dirname(HERE)  # kaynak/ klasörünün bir üstü = proje klasörü

def tr_upper(s):
    return s.replace('i', 'İ').replace('ı', 'I').upper()

doctors = []
for line in open(os.path.join(HERE, 'test.js'), encoding='utf-8').read().split('const doctors = `')[1].split('`')[0].split('\n'):
    n, b = line.split('|')
    doctors.append({'name': n, 'nobet': b == '1', 'forbidden': []})
for d in doctors:
    if d['name'] == 'Elif Yıldız':
        d['forbidden'] = ['Poliklinik-1', 'Poliklinik-4', 'Kons-1', 'Kons-2']
        d['exPOL'] = True
# resmi listede (idare şablonu) her odanın sütun başlığı
OFFNAME = {'Poliklinik-1': 'POLK-1', 'Oda-2': '2 ODA', 'Oda-3-4': '3-4 ODA', 'Oda-6-8': '6-8 ODA', 'Oda-9': '9 ODA', 'Oda-10': '10 ODA', 'Oda-11-12': '11-12.ODA',
           'Oda-13': '13 ODA', 'Oda-14': '14 ODA', 'Oda-15-18': '15-18 ODA', 'Oda-19-20': '19-20 ODA', 'Oda-21-22': '21-22 ODA', 'Oda-24-25': '24-25 ODA', 'Anjio': 'ANJİO',
           'Poliklinik-4': 'POLK-4', 'Oda-34-35': '34-35 ODA', 'Oda-32-33': '32-33 ODA', 'Oda-28-30': '28-30 ODA', 'Septik': 'D-SEPTİK', 'Doğum-1': 'DOĞUM-1', 'Doğum-2': 'DOĞUM-2',
           'Endoskopi-1': 'ENDO-1', 'Endoskopi-2': 'ENDO-2', 'Kons-1': 'KONS-1', 'Kons-2': 'KONS-2'}
areas = []
for line in open(os.path.join(HERE, 'test.js'), encoding='utf-8').read().split('const areas = `')[1].split('`')[0].split('\n'):
    n, p = line.split('|')
    t = 'ENDO' if n.startswith('Endoskopi') else 'POL' if n.startswith('Poliklinik') else 'OR'
    areas.append({'name': n, 'points': int(p), 'type': t, 'canEmpty': n.startswith('Kons'), 'low': n in ('Kons-1', 'Kons-2', 'Oda-13', 'Oda-14', 'Anjio'),
                  'offName': OFFNAME.get(n, ''), 'pairOnly': ['Doğum-1', 'Doğum-2', 'Kons-1', 'Kons-2'] if n == 'Septik' else []})
fixed = {'doctors': doctors, 'areas': areas}

rows = list(csv.DictReader(open(os.path.join(PROJ, 'sample-data', 'nobet-2026-11.csv'), encoding='utf-8'), delimiter=';'))
lines = []
for r in rows:
    d = dt.date.fromisoformat(r['Tarih']).strftime('%d.%m.%Y')
    m = r['Merkez']
    if '+' in m:
        m = '"' + '\n'.join(tr_upper(x.strip()) for x in m.split('+')) + '"'
    else:
        m = tr_upper(m)
    dg = tr_upper(r['Doğum'])
    if dg == tr_upper('Barış Duman'):
        dg = 'BARIŞ DUMAN'   # görüntüdeki kesik yazım
    lines.append('\t'.join([d, m, dg]))
roster = '\n'.join(lines)
leaves = '\n'.join(' ; '.join([r['Ad Soyad'], dt.date.fromisoformat(r['Başlangıç']).strftime('%d.%m.%Y'), dt.date.fromisoformat(r['Bitiş']).strftime('%d.%m.%Y')])
                   for r in csv.DictReader(open(os.path.join(PROJ, 'sample-data', 'izin-2026-11.csv'), encoding='utf-8'), delimiter=';'))
icu = ['Serkan Polat', 'Derya Uslu', 'Gamze Erdem', 'Pınar Yalçın', 'Defne Kaplan', 'Nihan Bulut', 'Neslihan Uçar', 'Fatih Gündüz']
demo = {'rosterText': roster, 'leavesText': leaves, 'included': [d['name'] for d in doctors if d['name'] not in icu]}

core = open(os.path.join(HERE, 'core.js'), encoding='utf-8').read().replace("if (typeof module !== 'undefined') module.exports = CORE;\n", '')
html = open(os.path.join(HERE, 'template.html'), encoding='utf-8').read()
html = html.replace('/*__CORE__*/', core).replace('/*__FIXED__*/', json.dumps(fixed, ensure_ascii=False, indent=1)).replace('/*__DEMO__*/', json.dumps(demo, ensure_ascii=False))
out = os.path.join(PROJ, 'CalismaProgrami.html')
open(out, 'w', encoding='utf-8').write(html)
print('yazıldı', out, len(html))
