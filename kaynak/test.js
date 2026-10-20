const fs = require('fs');
const path = require('path');
const src = process.argv[2] || path.join(__dirname, 'core.js');
let code = fs.readFileSync(src, 'utf8');
if (src.endsWith('.html')) code = code.match(/<script id="core">([\s\S]*?)<\/script>/)[1] + '\nmodule.exports=CORE;';
const m = { exports: {} }; new Function('module', code)(m); const C = m.exports;
const P_DIR = require('path').join(__dirname, '..', 'sample-data') + '/';

const doctors = `Kemal Arslan|0
Elif Yıldız|0
Nazlı Koç|0
Selin Aydemir|0
Murat Ekinci|0
Hakan Demir|1
Serkan Polat|1
Derya Uslu|1
Gamze Erdem|1
Pınar Yalçın|1
Melis Karaca|1
Onur Şahin|1
Defne Kaplan|1
Canan Güler|1
Burak Tekin|1
Sibel Akın|1
Nihan Bulut|1
İrem Aksoy|1
Tuba Kurt|1
Ozan Çelik|1
Tolga Avcı|1
Emre Kılıç|1
Can Öztürk|1
Barış Duman|1
Cem Yavuz|1
Volkan Işık|1
Kerem Aslan|1
Gizem Çınar|1
Hande Ateş|1
Sinan Erol|1
Uğur Taş|1
Aslı Özdemir|1
Neslihan Uçar|1
Ece Karataş|1
Fatih Gündüz|1`.split('\n').map(l => { const [n, b] = l.split('|'); return { name: n, nobet: b === '1' }; });
const areas = `Oda-2|800
Oda-3-4|1500
Oda-6-8|1500
Oda-9|800
Oda-10|800
Oda-11-12|1500
Oda-13|250
Oda-14|400
Oda-15-18|1500
Oda-19-20|2000
Oda-21-22|2000
Oda-24-25|2000
Anjio|500
Oda-34-35|1000
Oda-32-33|1000
Oda-28-30|1000
Septik|500
Doğum-1|1000
Doğum-2|1000
Endoskopi-1|5000
Endoskopi-2|5000
Kons-1|200
Kons-2|200
Poliklinik-1|800
Poliklinik-4|800`.split('\n').map(l => { const [n, p] = l.split('|'); return { name: n, points: +p, type: n.startsWith('Endoskopi') ? 'ENDO' : n.startsWith('Poliklinik') ? 'POL' : 'OR', canEmpty: n.startsWith('Kons') }; });
areas.forEach(a => { if (a.name === 'Septik') a.pairOnly = ['Doğum-1', 'Doğum-2', 'Kons-1', 'Kons-2']; });
const icu = ['Serkan Polat', 'Derya Uslu', 'Gamze Erdem', 'Pınar Yalçın', 'Defne Kaplan', 'Nihan Bulut', 'Neslihan Uçar', 'Fatih Gündüz'];
const names = doctors.map(d => d.name);

// nöbet listesi: görüntüdeki gibi büyük harfli metinle test
const rosterTxt = fs.readFileSync(P_DIR + 'nobet-2026-11.csv', 'utf8').split('\n').slice(1)
  .map(l => l.split(';')).filter(r => r.length > 2)
  .map(r => [C.fmt(r[0]), r[1], r[2].toLocaleUpperCase('tr-TR'), r[3].toLocaleUpperCase('tr-TR')].join('\t')).join('\n')
  .replace('BARIŞ DUMAN', 'BARIŞ DUMAN');
const R = C.parseRoster(rosterTxt, names, 2026);
console.log('roster rows', R.roster.length, 'unknown', R.unknown);
console.log('21.11 ->', R.roster.find(r => r.date === '2026-11-21').names);
const leaveTxt = fs.readFileSync(P_DIR + 'izin-2026-11.csv', 'utf8').split('\n').slice(1).filter(Boolean).map(l => l.split(';').join('\t')).join('\n');
const L = C.parseLeaves(leaveTxt, names, 2026);
console.log('leaves', L.leaves.length, 'unknown', L.unknown);
console.log('match tests', C.matchName('Öztürk', names), C.matchName('Aslan', names), C.matchName('ELİF YILDIZ (08-16)', names));

const cfg = {
  year: 2026, month: 11, doctors, areas,
  forbidden: { 'Elif Yıldız': ['Poliklinik-1', 'Poliklinik-4', 'Kons-1', 'Kons-2'] },
  exemptPOL: ['Elif Yıldız'], exemptENDO: [],
  included: names.filter(n => !icu.includes(n)), holidays: [], leaves: L.leaves, roster: R.roster,
};
if (process.env.REQ) {
  const LOW = ['Kons-1', 'Kons-2', 'Oda-13', 'Oda-14', 'Anjio'];
  cfg.areas = cfg.areas.map(a => ({ ...a, low: LOW.includes(a.name) }));
  cfg.lowReq = { 'Kerem Aslan': ['2026-11-03', '2026-11-10', '2026-11-11', '2026-11-12'], 'Aslı Özdemir': ['2026-11-10', '2026-11-12', '2026-11-13'],
    'Kemal Arslan': ['2026-11-10', '2026-11-12'], 'İrem Aksoy': ['2026-11-10'], 'Ece Karataş': ['2026-11-10', '2026-11-06'], 'Sinan Erol': ['2026-11-10'] };
  cfg.flexDoctors = ['Elif Yıldız']; cfg.flexNE = { 'Elif Yıldız': ['2026-11-27'] };
  cfg.polPref = { 'Kerem Aslan': ['2026-11-04', '2026-11-05', '2026-11-18', '2026-11-19', '2026-11-26'], 'Aslı Özdemir': ['2026-11-12', '2026-11-13'], 'Kemal Arslan': ['2026-11-02', '2026-11-09'], 'Canan Güler': ['2026-11-12', '2026-11-13'], 'Kemal': [] };
  cfg.avoid = [{ name: 'Kemal Arslan', days: ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'], rooms: ['Oda-19-20', 'Oda-21-22', 'Oda-24-25', 'Oda-15-18'] },
    { name: 'Kemal Arslan', days: ['2026-11-23', '2026-11-24'], rooms: ['Endoskopi-1', 'Endoskopi-2'] }, { name: 'Aslı Özdemir', days: ['2026-11-10', '2026-11-11', '2026-11-12'], rooms: ['Anjio', 'Septik', 'Doğum-1', 'Doğum-2'] }];
  cfg.endoPref = { 'Kerem Aslan': ['2026-11-24', '2026-11-25'], 'İrem Aksoy': ['2026-11-16', '2026-11-17', '2026-11-18'] };
}
if (process.env.PREV) { // geçen ay olarak bir çözümü kullan → aylar arası dönüşüm testi
  const P0 = C.prepare(cfg), r0 = C.solve(P0, { seed: 99 });
  cfg.prevStats = C.prevStats(C.serialize(P0, r0.S), cfg.areas);
  const ones = Object.entries(cfg.prevStats.pol).filter(([, n]) => n === 1).length;
  console.log('geçen ay: poliklinik 1 kez', ones, '/ 2 kez', Object.values(cfg.prevStats.pol).filter(n => n === 2).length, '· endoskopi 1 kez', Object.values(cfg.prevStats.endo).filter(n => n === 1).length);
}
if (process.env.CLOSE) { // kapalı oda senaryosu: Oda-19-20 ilk iki hafta, Poliklinik-1 bir hafta, Kons-1 tüm ay
  const rng = (a, b) => { const o = []; for (let k = a; k <= b; k = C.addDays(k, 1)) o.push(k); return o; };
  cfg.closed = { 'Oda-19-20': rng('2026-11-02', '2026-11-13'), 'Poliklinik-1': rng('2026-11-16', '2026-11-20'), 'Kons-1': rng('2026-11-01', '2026-11-30') };
}
const PV = cfg.prevStats; if (process.env.NOROT) delete cfg.prevStats;
const P = C.prepare(cfg);
console.log('N', P.N, 'D', P.D, 'avail', P.avail.map(a => a.length).join(','));
P.warnings.forEach(w => console.log('  warn', w.t, w.msg));
const seeds = (process.env.SEEDS || '1,2,3').split(',').map(Number);
for (const seed of seeds) {
  const t0 = Date.now();
  const res = C.solve(P, { seed, iters: +(process.env.ITERS || 1500000), T0: process.env.T0 ? +process.env.T0 : undefined, T1: process.env.T1 ? +process.env.T1 : undefined });
  const v = C.validate(P, res.S);
  const sm = C.summary(P, res.S);
  const diffs = sm.map(s => s.diff);
  const sd = Math.sqrt(diffs.reduce((a, x) => a + x * x, 0) / diffs.length);
  console.log(`seed ${seed}: ${Date.now() - t0} ms, viol ${v.length}, maxAbsDiff ${Math.max(...diffs.map(Math.abs)).toFixed(0)}, rms ${sd.toFixed(0)}, reps ${sm.reduce((a, s) => a + s.rep, 0)}, target(full) ${Math.max(...P.target).toFixed(0)}`);
  v.slice(0, 10).forEach(x => console.log('   V', x.t, x.msg));
  { let sep = 0, bad = 0; const sp = P.areas.findIndex(a => a.name === 'Septik'); for (let d = 0; d < P.D; d++) { const E = res.S.coverOf[d][sp], p = res.S.coverBy[d][sp]; const o = E >= 0 ? E : p; if (o >= 0) { sep++; if (!['Doğum-1', 'Doğum-2', 'Kons-1', 'Kons-2'].includes(P.areas[o].name)) bad++; } } console.log('   Septik paylaşımı', sep, 'gün · kurala aykırı', bad); }
  if (process.env.REQ) { const av = C.avoids(P, res.S); console.log('   uygun olmayan oda', av.filter(x => x.ok).length + '/' + av.length, av.filter(x => !x.ok).map(x => x.day + ' ' + x.name + ' → ' + x.room).join('; ')); const pf = C.prefs(P, res.S); console.log('   pol/endo tercih', pf.filter(x => x.ok).length + '/' + pf.length, pf.map(x => x.name.split(' ')[0] + '-' + x.kind[0] + ':' + x.got.map(d => d.slice(8)).join(',') + (x.ok ? '' : ' ✗')).join(' ')); const rq = C.requests(P, res.S); console.log('   talepler', rq.filter(r => r.ok).length + '/' + rq.length, rq.filter(r => !r.ok).map(r => C.fmt(r.day) + ' ' + r.name + ' → ' + r.area + (r.cover ? ' (+telafi)' : '')).join('; ')); const b = P.docs.findIndex(d => d.name === 'Elif Yıldız'); console.log('   Elif NE günleri', P.days.filter((_, d) => P.off[b][d] === 'NE').join(','), 'hedef', Math.round(P.target[b]), 'top', res.S.total[b]); }
  { const ro = C.rotation(P, res.S), pe = ro.filter(r => r.kind !== 'oda'), od = ro.filter(r => r.kind === 'oda');
    if (PV) { let ov = 0, pw = 0; P.docs.forEach((d, i) => { const rs = new Set(PV.rooms[d.name] || []); P.OR.forEach(u => { if (rs.has(P.areas[u].name)) ov += res.S.cnt[i * P.A + u]; }); const g = P.POL.reduce((s, u) => s + res.S.cnt[i * P.A + u], 0), w = PV.pol[d.name] === 1 ? 2 : PV.pol[d.name] === 2 ? 1 : 0; if (w && g === w && d.name !== 'Elif Yıldız') pw++; }); console.log('   ölçüm: geçen ayki odalarda görev', ov, '· poliklinik dönüşümü uyan', pw); }
    console.log('   dönüşüm pol/endo', pe.filter(r => r.ok).length + '/' + pe.length, '· geçen ayki odaya tekrar (görev)', od.reduce((s, r) => s + r.rooms.length, 0)); }
  if (process.env.SHOW) sm.forEach(s => console.log(`   ${s.name.padEnd(22)} gün ${String(s.work).padStart(2)} ne ${s.ne} izin ${s.izin} pol ${s.pol} endo ${s.endo} telafi ${s.covers} hedef ${s.target.toFixed(0)} top ${s.total} fark ${s.diff.toFixed(0)}`));
}

if (process.env.REPAIR) { // ay içi revizyon: rapor + oda kapanışı + yeni hekim + ayrılan hekim, 10 Kasım'dan itibaren
  const base = C.solve(P, { seed: 7 }), sv = C.serialize(P, base.S);
  const cfg2 = JSON.parse(JSON.stringify(cfg));
  cfg2.leaves.push({ name: 'Uğur Taş', from: '2026-11-10', to: '2026-11-13', type: 'rapor' });
  cfg2.closed = { 'Oda-21-22': ['2026-11-16', '2026-11-17', '2026-11-18'] };
  cfg2.doctors.push({ name: 'Yeni Hekim', nobet: true }); cfg2.included.push('Yeni Hekim'); cfg2.joins = { 'Yeni Hekim': '2026-11-16' };
  cfg2.exits = { 'Gizem Çınar': '2026-11-23' };
  const P2 = C.prepare(cfg2), S0 = C.restoreState(P2, sv), from = P2.days.indexOf('2026-11-10');
  console.log('onarım öncesi ihlal', C.validate(P2, S0).length);
  for (const [seed, lambda, iters] of (process.env.LAMS || '2e4').split(',').flatMap(l => [1, 2, 3].map(sd => [sd, +l, +l < 2e4 ? 800000 : 400000]))) {
    const t0 = Date.now(), r = C.repair(P2, S0, { from, seed, lambda, iters }), v = C.validate(P2, r.S);
    process.stdout.write(`λ=${lambda} `);
    let ch = 0, past = 0; for (let d = 0; d < P2.D; d++) for (let a = 0; a < P2.A; a++) if (r.S.slot[d][a] !== S0.slot[d][a] || r.S.coverBy[d][a] !== S0.coverBy[d][a]) { ch++; if (d < from) past++; }
    const sm = C.summary(P2, r.S), yh = sm.find(x => x.name === 'Yeni Hekim');
    console.log(`onarım seed ${seed}: ${Date.now() - t0} ms, ihlal ${v.length}, değişen hücre ${ch} (geçmiş ${past}), maxAbsDiff ${Math.max(...sm.map(x => Math.abs(x.diff))).toFixed(0)}, yeni hekim ${yh.work} gün, hedef ${yh.target.toFixed(0)}, puan ${yh.total}`);
    v.slice(0, 5).forEach(x => console.log('   V', x.t, x.msg));
  }
}
