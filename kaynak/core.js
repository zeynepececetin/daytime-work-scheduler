/* ================= ÇEKİRDEK: tarih, isim, hazırlık, çözücü, doğrulama ================= */
const CORE = (() => {
  const H = 1e9;       // kesin kural ihlali cezası
  const REP = 20;      // aynı ameliyathane odasında 2. görev (T1) — mümkünse kaçınılır, puan dengesi önceliklidir
  const WL = 2e6;      // düşük puanlı oda talebi karşılanmazsa (güçlü tercih; kesin kuraldan zayıf, puan dengesinden güçlü)
  const WP = 5e5;      // poliklinik/endoskopi gün tercihi karşılanmazsa (tercih; kesin kurallardan çok zayıf)
  const WA = 1e5;      // gün bazlı uygun olmayan oda (puan dengesinden güçlü)
  const WR = 3e4;      // poliklinik/endoskopi aylar arası dönüşümü (geçen ay 1 → bu ay 2, 2 → 1); puan dengesinden güçlü
  const WO = 10;       // geçen ay çalışılan ameliyathane odasına yeniden görev (en zayıf tercih; puan dengesinden de sonra)
  const WE = 5000;      // liste dışı boş odada puan sırası cezası (en düşük puanlı önce)
  const GUNLER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const GUN_KISA = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

  // ---------- tarih ----------
  const pad = n => String(n).padStart(2, '0');
  const key = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
  const toDate = k => { const [y, m, d] = k.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const fromDate = t => key(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
  const addDays = (k, n) => { const t = toDate(k); t.setUTCDate(t.getUTCDate() + n); return fromDate(t); };
  const dow = k => toDate(k).getUTCDay();
  const fmt = k => { const [y, m, d] = k.split('-'); return `${d}.${m}.${y}`; };

  const foldLow = s => String(s || '').toLocaleLowerCase('tr-TR').replace(/[çğıöşüâîû]/g, c => ({ 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' }[c]));
  const AY_F = AYLAR.map(foldLow);
  const AY_RE = AY_F.join('|');

  function parseDate(s, defYear) {
    if (s == null) return null;
    s = String(s).trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return key(+m[1], +m[2], +m[3]);
    m = s.match(/(?:^|[^\d])(\d{1,2})[./-](\d{1,2})[./-](\d{4}|\d{2})(?![\d])/) || s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
    if (m) { let y = +m[3]; if (y < 100) y += 2000; if (+m[2] >= 1 && +m[2] <= 12 && +m[1] >= 1 && +m[1] <= 31) return key(y, +m[2], +m[1]); }
    m = foldLow(s).match(new RegExp(`^(\\d{1,2})\\s*(${AY_RE})[a-z]*(?:\\s+(\\d{4}))?`));
    if (m) { const y = m[3] ? +m[3] : defYear; if (y) return key(y, AY_F.indexOf(m[2]) + 1, +m[1]); }
    m = s.match(/^(\d{1,2})[./](\d{1,2})$/);
    if (m && defYear) return key(defYear, +m[2], +m[1]);
    if (/^\d{5}(\.0+)?$/.test(s)) { // Excel seri tarih
      const t = new Date(Date.UTC(1899, 11, 30)); t.setUTCDate(t.getUTCDate() + Math.floor(Number(s))); return fromDate(t);
    }
    return null;
  }

  // Serbest metindeki tarih aralıkları: "5-8 Kasım ve 14-17 Kasım", "6 Kasım ve 23 kasımda", "28 Ekim - 3 Kasım", "05.11.2026 - 08.11.2026"
  function textRanges(t, defYear) {
    let f = foldLow(t);
    const out = [];
    const r2 = new RegExp(`(\\d{1,2})\\s*(${AY_RE})[a-z]*\\s*(?:-|–|ile)\\s*(\\d{1,2})\\s*(${AY_RE})[a-z]*(?:\\s+(\\d{4}))?`, 'g');
    f = f.replace(r2, (_, d1, a1, d2, a2, y) => {
      const yy = y ? +y : defYear, m1 = AY_F.indexOf(a1) + 1, m2 = AY_F.indexOf(a2) + 1;
      out.push([key(m1 > m2 ? yy - 1 : yy, m1, +d1), key(yy, m2, +d2)]); return ' ';
    });
    const r1 = new RegExp(`(\\d{1,2})(?:\\s*(?:-|–|ile)\\s*(\\d{1,2}))?\\s*(${AY_RE})[a-z]*(?:\\s+(\\d{4}))?`, 'g');
    f = f.replace(r1, (_, d1, d2, a, y) => {
      const yy = y ? +y : defYear, mo = AY_F.indexOf(a) + 1;
      out.push([key(yy, mo, +d1), key(yy, mo, +(d2 || d1))]); return ' ';
    });
    const nd = [...f.matchAll(/(\d{1,2})[./](\d{1,2})[./](\d{2,4})/g)].map(m => key(+m[3] < 100 ? 2000 + +m[3] : +m[3], +m[2], +m[1]));
    for (let i = 0; i < nd.length; i += 2) out.push([nd[i], nd[i + 1] || nd[i]]);
    return out.map(([a, b]) => a <= b ? [a, b] : [b, a]);
  }

  // K1: nöbet ertesi günü
  function ertesiOf(k) {
    const w = dow(k);
    if (w >= 1 && w <= 4) return addDays(k, 1); // Pzt–Per → ertesi gün
    if (w === 5) return addDays(k, 5);          // Cuma → sonraki Çarşamba
    if (w === 6) return addDays(k, 2);          // Cumartesi → Pazartesi
    return addDays(k, 1);                        // Pazar → Pazartesi
  }

  // ---------- isim eşleştirme ----------
  // Türkçe harfler sadeleştirilir (İ/I, Ş/S …) — "ISIK" ile "IŞIK" eşleşsin
  const FOLD = { 'Ç': 'C', 'Ğ': 'G', 'İ': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U', 'Â': 'A', 'Î': 'I', 'Û': 'U' };
  const norm = s => String(s || '').replace(/\(.*?\)/g, ' ')
    .toLocaleUpperCase('tr-TR').replace(/[ÇĞİÖŞÜÂÎÛ]/g, c => FOLD[c]).replace(/[^A-Z ]/g, ' ').replace(/\s+/g, ' ').trim();

  function matchName(raw, names) {
    const n = norm(raw);
    if (!n) return null;
    const N = names.map(norm);
    let i = N.indexOf(n);
    if (i >= 0) return names[i];
    const n0 = n.replace(/ /g, ''); i = N.findIndex(x => x.replace(/ /g, '') === n0);   // bitişik yazım (ör. "SELİN KAYA")
    if (i >= 0) return names[i];
    if (n.length >= 6) { // kesik yazılmış isim (ör. "SELİN KARAKOYUNL")
      const c = names.filter((_, j) => N[j].startsWith(n));
      if (c.length === 1) return c[0];
    }
    const c2 = names.filter((_, j) => N[j].split(' ').includes(n)); // tek kelime (ör. "Selin")
    if (c2.length === 1) return c2[0];
    return null;
  }

  // Excel'den yapıştırılan sekmeli metni (tırnaklı çok satırlı hücreler dahil) çözer
  function parseTSV(text) {
    const rows = []; let row = [], cell = '', q = false;
    const sep = text.includes('\t') ? '\t' : ';';
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += ch;
      } else if (ch === '"' && cell === '') q = true;
      else if (ch === sep) { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(r => r.some(c => c.trim() !== ''));
  }

  // Nöbet listesi: her satır = tarih + nöbetçi hücreleri. Bir hücrede birden çok isim olabilir.
  function parseRoster(text, names, defYear) {
    const out = [], unknown = [];
    const dayWords = new Set(GUNLER.map(norm));
    for (const r of parseTSV(text)) {
      let date = null, startCol = 0;
      for (let c = 0; c < r.length; c++) { date = parseDate(r[c], defYear); if (date) { startCol = c + 1; break; } }
      if (!date) continue;
      const list = [];
      for (let c = startCol; c < r.length; c++) {
        for (const part of r[c].split(/\n|\+|\/|,|;/)) {
          if (!part.trim() || dayWords.has(norm(part))) continue;
          const m = matchName(part, names);
          if (m) { if (!list.includes(m)) list.push(m); }
          else if (norm(part)) unknown.push(`${fmt(date)}: "${part.trim()}"`);
        }
      }
      out.push({ date, names: list });
    }
    return { roster: out, unknown };
  }

  // İzinler: her satır = isim + başlangıç (+ bitiş)
  function parseLeaves(text, names, defYear) {
    const out = [], unknown = [];
    for (const r0 of parseTSV(String(text || '').replace(/[\u2060\u200b\u200e\u200f\ufeff]/g, ''))) {
      const r = r0.map(c => c.trim()).filter(Boolean);
      if (!r.length) continue;
      if (r.length >= 2 && parseDate(r[1], defYear)) { // tablo: ad | başlangıç | (bitiş)  ya da  ad | "5-8 Kasım"
        const nm = matchName(r[0], names);
        if (!nm) { unknown.push(`"${r[0]}"`); continue; }
        let rg;
        if (r.length >= 3 && parseDate(r[2], defYear)) rg = [[parseDate(r[1], defYear), parseDate(r[2], defYear)]];
        else rg = textRanges(r.slice(1).join(' - '), defYear);
        if (!rg.length) rg = [[parseDate(r[1], defYear), parseDate(r[1], defYear)]];
        for (const [a, b] of rg) out.push({ name: nm, from: a <= b ? a : b, to: a <= b ? b : a });
        continue;
      }
      // serbest metin: "3. Selin: 5-8 Kasım ve 25-27 Kasım izin alacağım"
      const line = r.join(' ').replace(/^\s*\d{1,2}\s*[.)-]\s*/, '');
      const ranges = textRanges(line, defYear);
      if (!ranges.length) continue;
      const ci = line.indexOf(':'), di = line.search(/\d/);
      const namePart = (ci >= 0 && (di < 0 || ci < di) ? line.slice(0, ci) : line.slice(0, di < 0 ? line.length : di)).replace(/[.,;:–-]+\s*$/, '').trim();
      const nm = matchName(namePart, names);
      if (!nm) { unknown.push(`"${namePart || line}"`); continue; }
      for (const [a, b] of ranges) out.push({ name: nm, from: a, to: b });
    }
    return { leaves: out, unknown };
  }

  // Önceki aydan nöbet ertesi bu aya düşen günler (ör. son cuma, cumartesi)
  function prevDates(y, m) {
    const start = key(y, m, 1), out = [];
    for (let k = addDays(start, -7); k < start; k = addDays(k, 1)) if (ertesiOf(k) >= start) out.push(k);
    return out;
  }

  // ---------- hazırlık ----------
  function prepare(cfg) {
    const warnings = [];
    const docs = cfg.doctors.filter(d => cfg.included.includes(d.name));
    const N = docs.length;
    const areas = cfg.areas, A = areas.length;
    const pts = areas.map(a => +a.points || 0);
    const OR = [], POL = [], ENDO = [];
    areas.forEach((a, i) => (a.type === 'POL' ? POL : a.type === 'ENDO' ? ENDO : OR).push(i));
    const listEmpty = OR.filter(i => areas[i].canEmpty);
    const nonList = OR.filter(i => !areas[i].canEmpty).sort((x, y) => pts[x] - pts[y]);
    const emptyRank = new Array(A).fill(0);
    nonList.forEach((i, r) => { emptyRank[i] = r; });

    const hol = new Set(cfg.holidays || []);
    const days = [];
    for (let d = 1; d <= 31; d++) {
      const k = key(cfg.year, cfg.month, d), t = toDate(k);
      if (t.getUTCMonth() !== cfg.month - 1) break;
      const w = t.getUTCDay();
      if (w === 0 || w === 6 || hol.has(k)) continue;
      days.push(k);
    }
    const D = days.length;
    const dayIdx = Object.fromEntries(days.map((k, i) => [k, i]));
    const nameIdx = Object.fromEntries(docs.map((d, i) => [d.name, i]));
    const off = docs.map(() => new Array(D).fill(null));
    const izin = new Array(N).fill(0), neCount = new Array(N).fill(0);
    const lvType = docs.map(() => new Array(D).fill(null));   // izin türü: yillik | kongre | rapor (hepsi hedefi aynı oranda düşürür)

    for (const L of cfg.leaves || []) {
      const i = nameIdx[L.name]; if (i === undefined) continue;
      for (let k = L.from; k <= L.to; k = addDays(k, 1)) {
        const d = dayIdx[k];
        if (d !== undefined && off[i][d] !== 'İ') { off[i][d] = 'İ'; lvType[i][d] = L.type || 'yillik'; izin[i]++; }
      }
    }
    // ay ortasında katılan / ayrılan hekim: programda olmadığı günler 'DIS' (hedef çalıştığı gün oranında)
    const partial = new Uint8Array(N);
    for (const [nm, k0] of Object.entries(cfg.joins || {})) { const i = nameIdx[nm]; if (i === undefined) continue; days.forEach((k, d) => { if (k < k0 && !off[i][d]) { off[i][d] = 'DIS'; izin[i]++; partial[i] = 1; } }); }
    for (const [nm, k0] of Object.entries(cfg.exits || {})) { const i = nameIdx[nm]; if (i === undefined) continue; days.forEach((k, d) => { if (k >= k0) { if (off[i][d] === 'İ') izin[i]--; if (off[i][d] !== 'DIS') { off[i][d] = 'DIS'; izin[i]++; partial[i] = 1; } } }); }
    const shifts = new Array(N).fill(0);
    const flex = new Set(cfg.flexDoctors || []);   // esnek nöbet izni: otomatik nöbet ertesi yok, günleri elle seçilir
    for (const r of cfg.roster || []) {
      for (const nm of r.names) {
        const i = nameIdx[nm]; if (i === undefined) continue;
        if (r.date.slice(0, 7) === key(cfg.year, cfg.month, 1).slice(0, 7)) shifts[i]++;
        if (flex.has(nm)) continue;
        const d = dayIdx[ertesiOf(r.date)];
        if (d !== undefined && !off[i][d]) { off[i][d] = 'NE'; neCount[i]++; }
      }
    }
    // yoğun bakım nöbetçisi gündüz yanık / dış anestezide çalışır → programa dahilse o gün odaya verilmez (hedef değişmez)
    const ybCount = new Array(N).fill(0);
    for (const r of cfg.ybDuty || []) for (const nm of r.names) {
      const i = nameIdx[nm], d = dayIdx[r.date]; if (i === undefined || d === undefined) continue;
      if (!off[i][d]) { off[i][d] = 'YB'; ybCount[i]++; }
      else if (off[i][d] !== 'YB') warnings.push({ t: 'UYARI', msg: `${fmt(r.date)}: ${nm} yoğun bakım nöbetçisi ama o gün ${off[i][d] === 'İ' ? 'izinli' : 'nöbet ertesi'}.` });
    }
    // hekim sayısı açık odaları aşan günlerde odasız kalacağı seçilen hekim (hedef değişmez)
    for (const r of cfg.idle || []) { const i = nameIdx[r.name], d = dayIdx[r.date]; if (i !== undefined && d !== undefined && !off[i][d]) off[i][d] = 'OD'; }
    for (const [nm, list] of Object.entries(cfg.flexNE || {})) {
      const i = nameIdx[nm]; if (i === undefined || !flex.has(nm)) continue;
      for (const k of list) { const d = dayIdx[k]; if (d !== undefined && !off[i][d]) { off[i][d] = 'NE'; neCount[i]++; } }
    }

    const avail = days.map((_, d) => docs.map((_, i) => i).filter(i => !off[i][d]));
    // kapalı oda günleri: { oda adı: [gün] } → open[d][a]
    const open = days.map(() => new Uint8Array(A).fill(1));
    for (const [nm, list] of Object.entries(cfg.closed || {})) { const a = areas.findIndex(x => x.name === nm); if (a < 0) continue; for (const k of list) { const d = dayIdx[k]; if (d !== undefined) open[d][a] = 0; } }
    const openOR = open.map(o => OR.filter(a => o[a])), nOpen = open.map(o => o.reduce((s, x) => s + x, 0));
    const totalPts = open.reduce((s, o) => s + pts.reduce((t, p, a) => t + (o[a] ? p : 0), 0), 0);
    // yalnız belirli odalarla paylaşılabilen odalar (ör. Septik): pairOK[a*A+b] (iki yönlü, kesin kural)
    const pairOK = new Uint8Array(A * A).fill(1);
    areas.forEach((x, a) => { const only = (x.pairOnly || []).filter(Boolean); if (!only.length) return; areas.forEach((y, b) => { if (a !== b && !only.includes(y.name)) { pairOK[a * A + b] = 0; pairOK[b * A + a] = 0; } }); });
    const w = docs.map((_, i) => D ? (D - izin[i]) / D : 0);
    const sw = w.reduce((s, x) => s + x, 0) || 1;
    const target = w.map(x => totalPts * x / sw);

    const forb = docs.map(d => (cfg.forbidden[d.name] || []).map(n => areas.findIndex(a => a.name === n)).filter(i => i >= 0));
    const exPOL = docs.map(d => (cfg.exemptPOL || []).includes(d.name));
    const exENDO = docs.map(d => (cfg.exemptENDO || []).includes(d.name));
    const nobetsiz = docs.map(d => !d.nobet);

    // uyarılar (girdi kaynaklı)
    days.forEach((k, d) => {
      const n = avail[d].length, nA = nOpen[d], lE = listEmpty.filter(a => open[d][a]).length;
      if (n > nA) warnings.push({ t: 'K12', msg: `${fmt(k)}: müsait hekim (${n}) açık oda sayısını (${nA}) aşıyor — ${n - nA} hekim için "odasız kalacak" seçimi gerekiyor.` });
      const k2 = nA - n;
      if (k2 > lE) warnings.push({ t: 'BİLGİ', msg: `${fmt(k)}: ${k2} odaya başka odadaki hekim ek olarak bakacak (paylaşılabilir ${lE} oda var) — ek ${k2 - lE} oda en düşük puanlılardan seçilecek.` });
      if (k2 > openOR[d].length - k2) warnings.push({ t: 'UYARI', msg: `${fmt(k)}: ek bakılacak oda sayısı, bakabilecek hekim sayısını aşıyor.` });
    });
    docs.forEach((doc, i) => {
      const n = avail.reduce((s, a) => s + (a.includes(i) ? 1 : 0), 0);
      const need = (exPOL[i] ? 0 : 1) + (exENDO[i] ? 0 : 1);
      if (n < need) warnings.push({ t: 'K7/K8', msg: `${doc.name}: ay içinde yalnızca ${n} çalışma günü var — poliklinik/endoskopi "en az 1" şartı karşılanamayabilir.` });
      if (shifts[i] > 3) warnings.push({ t: 'BİLGİ', msg: `${doc.name}: bu ay ${shifts[i]} nöbet (beklenen en fazla 3).` });
    });
    const capOf = U => open.reduce((s, o) => s + U.filter(u => o[u]).length, 0);
    const polSoft = capOf(POL) < docs.filter((_, i) => !exPOL[i]).length, endoSoft = capOf(ENDO) < docs.filter((_, i) => !exENDO[i]).length;
    if (polSoft) warnings.push({ t: 'UYARI', msg: `Poliklinik kapanışları nedeniyle bu ay poliklinik kapasitesi (${capOf(POL)} gün) herkese en az 1 gün vermeye yetmiyor — K7 'en az 1' şartı bu ay uyarı olarak izlenir.` });
    if (endoSoft) warnings.push({ t: 'UYARI', msg: `Endoskopi kapanışları nedeniyle bu ay endoskopi kapasitesi (${capOf(ENDO)} gün) herkese en az 1 gün vermeye yetmiyor — K8 'en az 1' şartı bu ay uyarı olarak izlenir.` });
    const polEligible = docs.filter((_, i) => !exPOL[i]).length;
    if (!polSoft && !endoSoft && (polEligible < D || N - exENDO.filter(Boolean).length < D))
      warnings.push({ t: 'UYARI', msg: `Programa dahil hekim sayısı (${N}) mesai günü sayısının (${D}) altında — poliklinik/endoskopi kuralı tam sağlanamaz.` });

    // düşük puanlı oda talepleri (güçlü tercih)
    const isLow = new Uint8Array(A); OR.forEach(a => { if (areas[a].low) isLow[a] = 1; });
    const reqDays = docs.map(() => []);
    for (const [nm, list] of Object.entries(cfg.lowReq || {})) {
      const i = nameIdx[nm]; if (i === undefined) continue;
      for (const k of list) {
        const d = dayIdx[k]; if (d === undefined) continue;
        if (off[i][d]) { warnings.push({ t: 'TALEP', msg: `${fmt(k)}: ${nm} o gün ${off[i][d] === 'İ' ? 'izinli' : 'nöbet ertesi'}; düşük puanlı oda talebi uygulanmadı.` }); continue; }
        reqDays[i].push(d);
      }
    }
    // poliklinik / endoskopi gün tercihleri: { hekim: [günler] } → hekim başına gün kümesi (boşsa tercih yok)
    const prefOf = obj => docs.map(d => { const l = (obj || {})[d.name]; return l && l.length ? new Set(l.map(k => dayIdx[k]).filter(x => x !== undefined)) : null; });
    const polPref = prefOf(cfg.polPref), endoPref = prefOf(cfg.endoPref);
    const isPOL = new Uint8Array(A), isENDO = new Uint8Array(A); POL.forEach(a => { isPOL[a] = 1; }); ENDO.forEach(a => { isENDO[a] = 1; });
    // gün bazlı uygun olmayan odalar: hekim → Map(gün indeksi → Set(alan))
    const aIdx = Object.fromEntries(areas.map((a, j) => [a.name, j]));
    const avoid = docs.map(() => new Map());
    for (const row of cfg.avoid || []) {
      const i = nameIdx[row.name]; if (i === undefined) continue;
      const rooms = (row.rooms || []).map(n => aIdx[n]).filter(x => x !== undefined); if (!rooms.length) continue;
      for (const k of row.days || []) { const d = dayIdx[k]; if (d === undefined) continue; const st = avoid[i].get(d) || new Set(); rooms.forEach(a => st.add(a)); avoid[i].set(d, st); }
    }
    docs.forEach((doc, i) => {
      const lows = new Set(reqDays[i]);
      for (const [kind, pf] of [['poliklinik', polPref[i]], ['endoskopi', endoPref[i]]]) if (pf && [...pf].every(d => lows.has(d)))
        warnings.push({ t: 'TALEP', msg: `${doc.name}: ${kind} için seçilen günlerin hepsi düşük puanlı oda istenen günler — iki istekten biri karşılanamaz.` });
    });
    // aylar arası dönüşüm (geçen ayın programı varsa): poliklinik/endoskopi sayısı ve çalışılan ameliyathane odaları
    const pv = cfg.prevStats || null;
    const want = g => docs.map((d, i) => { const n = pv && pv[g] ? pv[g][d.name] : undefined; return (g === 'pol' ? exPOL : exENDO)[i] ? 0 : n === 1 ? 2 : n === 2 ? 1 : 0; });
    const wantPol = want('pol'), wantEndo = want('endo');
    const prevRoom = docs.map(d => { const u = new Uint8Array(A); for (const n of (pv && pv.rooms && pv.rooms[d.name]) || []) { const a = aIdx[n]; if (a !== undefined && areas[a].type === 'OR') u[a] = 1; } return u; });
    for (const nm of flex) { const i = nameIdx[nm]; if (i !== undefined && shifts[i] && !(cfg.flexNE || {})[nm]?.length) warnings.push({ t: 'BİLGİ', msg: `${nm}: esnek nöbet izni açık, bu ay ${shifts[i]} nöbeti var ama izin günü seçilmedi.` }); }
    return { cfg, docs, N, areas, A, pts, OR, POL, ENDO, listEmpty, nonList, emptyRank, days, D, off, izin, neCount, shifts, ybCount, lvType, partial, avail, open, openOR, nOpen, pairOK, polSoft, endoSoft, target, totalPts, forb, exPOL, exENDO, nobetsiz, isLow, reqDays, flex, polPref, endoPref, isPOL, isENDO, avoid, hasPrev: !!pv, wantPol, wantEndo, prevRoom, warnings };
  }

  // ---------- durum ----------
  // slot[d][a] = hekim | -1 ; where[d][i] = alan | -1 (çalışmıyor) | -2 (boşta)
  // coverBy[d][E] = boş E odasına bakan alan ; coverOf[d][a] = a alanının baktığı boş oda
  function emptyState(P) {
    const S = { slot: [], where: [], coverBy: [], coverOf: [], empties: [], cnt: new Int16Array(P.N * P.A), total: new Float64Array(P.N) };
    for (let d = 0; d < P.D; d++) {
      S.slot.push(new Int16Array(P.A).fill(-1));
      S.where.push(new Int16Array(P.N).fill(-1));
      S.coverBy.push(new Int16Array(P.A).fill(-1));
      S.coverOf.push(new Int16Array(P.A).fill(-1));
      S.empties.push([]);
    }
    return S;
  }

  function recount(P, S) {
    S.cnt.fill(0); S.total.fill(0);
    for (let d = 0; d < P.D; d++) for (let a = 0; a < P.A; a++) {
      const i = S.slot[d][a];
      if (i >= 0) { S.cnt[i * P.A + a]++; S.total[i] += P.pts[a]; }
      else if (S.coverBy[d][a] >= 0) { const c = S.slot[d][S.coverBy[d][a]]; if (c >= 0) { S.cnt[c * P.A + a]++; S.total[c] += P.pts[a]; } }
    }
  }

  function cloneState(S) {
    return {
      slot: S.slot.map(x => x.slice()), where: S.where.map(x => x.slice()),
      coverBy: S.coverBy.map(x => x.slice()), coverOf: S.coverOf.map(x => x.slice()),
      empties: S.empties.map(x => x.slice()), cnt: S.cnt.slice(), total: S.total.slice()
    };
  }

  function shuffle(a, rng) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  function initState(P, rng) {
    const S = emptyState(P);
    const { A } = P;
    const isForb = (i, a) => P.forb[i].includes(a);
    const unitCnt = new Int16Array(P.N * A);
    const grp = { POL: new Int16Array(P.N), ENDO: new Int16Array(P.N) };
    const remain = new Int16Array(P.N);
    P.avail.forEach(av => av.forEach(i => remain[i]++));

    for (let d = 0; d < P.D; d++) {
      const av = shuffle(P.avail[d].slice(), rng);
      const used = new Set();
      // 1) poliklinik ve endoskopi (K7, K8, K13)
      for (const g of ['POL', 'ENDO']) {
        for (const u of P[g]) {
          if (!P.open[d][u]) continue;
          const ex = g === 'POL' ? P.exPOL : P.exENDO;
          let best = -1, bs = Infinity;
          for (const i of av) {
            if (used.has(i) || isForb(i, u)) continue;
            let s = 0;
            if (unitCnt[i * A + u] > 0) s += 1000;
            if (grp[g][i] >= 2) s += 1000;
            if (ex[i]) s += 500;
            const pf = (g === 'POL' ? P.polPref : P.endoPref)[i]; if (pf) s += pf.has(d) ? -60 : 400;
            const av = P.avoid[i].get(d); if (av && av.has(u)) s += 300;
            if (grp[g][i] === 0) s -= 100 / Math.max(1, remain[i]); else s += 10;
            const wn = (g === 'POL' ? P.wantPol : P.wantEndo)[i]; if (wn === 1 && grp[g][i] >= 1) s += 200; else if (wn === 2 && grp[g][i] === 1) s -= 30;
            s += rng();
            if (s < bs) { bs = s; best = i; }
          }
          if (best < 0) best = av.find(i => !used.has(i));
          if (best === undefined || best < 0) continue;
          used.add(best); S.slot[d][u] = best; S.where[d][best] = u;
          unitCnt[best * A + u]++; grp[g][best]++;
        }
      }
      av.forEach(i => remain[i]--);
      // 2) boş odalar (K10)
      const rest = av.filter(i => !used.has(i));
      const oOR = P.openOR[d], lE = P.listEmpty.filter(a => P.open[d][a]), nL = P.nonList.filter(a => P.open[d][a]);
      let k = Math.max(0, oOR.length - rest.length);
      const empt = [];
      if (k > 0) {
        if (k <= lE.length) empt.push(...shuffle(lE.slice(), rng).slice(0, k));
        else { empt.push(...lE); empt.push(...nL.slice(0, k - lE.length)); }
      }
      S.empties[d] = empt;
      // 3) ameliyathane odaları
      const rooms = shuffle(oOR.filter(a => !empt.includes(a)), rng);
      const pool = shuffle(rest.slice(), rng);
      // nöbetsiz hekimler boşta kalmasın (K5)
      pool.sort((x, y) => P.nobetsiz[y] - P.nobetsiz[x]);
      for (const i of pool.filter(i => P.reqDays[i].includes(d))) {
        const ri = rooms.findIndex(a => P.isLow[a] && !isForb(i, a));
        if (ri < 0) continue;
        const a = rooms.splice(ri, 1)[0]; pool.splice(pool.indexOf(i), 1);
        S.slot[d][a] = i; S.where[d][i] = a;
      }
      for (const a of rooms) {
        let bi = -1, bs = Infinity;
        pool.forEach((i, j) => { const av = P.avoid[i].get(d); const s = (isForb(i, a) ? 1e6 : 0) + (av && av.has(a) ? 1e3 : 0) + rng(); if (s < bs) { bs = s; bi = j; } });
        if (bi < 0) break;
        const i = pool.splice(bi, 1)[0];
        S.slot[d][a] = i; S.where[d][i] = a;
      }
      pool.forEach(i => { S.where[d][i] = -2; });
      // 4) boş odalara bakan (K10, K14: yalnızca ameliyathane odasından)
      const providers = shuffle(P.OR.filter(a => S.slot[d][a] >= 0), rng);
      for (const E of empt) {
        let bj = -1, bs = Infinity;
        providers.forEach((a, j) => { const s = (isForb(S.slot[d][a], E) ? 1e6 : 0) + (P.pairOK[a * P.A + E] ? 0 : 1e7) + (P.reqDays[S.slot[d][a]].includes(d) ? 1e5 : 0) + P.pts[a] / 100 + rng(); if (s < bs) { bs = s; bj = j; } });
        if (bj < 0) continue;
        const a = providers.splice(bj, 1)[0];
        S.coverBy[d][E] = a; S.coverOf[d][a] = E;
      }
    }
    recount(P, S);
    return S;
  }

  // ---------- maliyet ----------
  function docCost(P, S, i) {
    const A = P.A, b = i * A, c0 = S.cnt;
    let c = 0, g = 0;
    for (const u of P.POL) { const v = c0[b + u]; g += v; if (v > 1) c += H * (v - 1); }
    if (!P.exPOL[i] && g < 1) c += P.polSoft || P.partial[i] ? 1e6 : H; if (g > 2) c += H * (g - 2);
    if (P.wantPol[i] && g !== P.wantPol[i]) c += WR;
    g = 0;
    for (const u of P.ENDO) { const v = c0[b + u]; g += v; if (v > 1) c += H * (v - 1); }
    if (!P.exENDO[i] && g < 1) c += P.endoSoft || P.partial[i] ? 1e6 : H; if (g > 2) c += H * (g - 2);
    if (P.wantEndo[i] && g !== P.wantEndo[i]) c += WR;
    const pr = P.prevRoom[i];
    for (const u of P.OR) { const v = c0[b + u]; if (v > 2) c += H * (v - 2) + REP; else if (v === 2) c += REP; if (v && pr[u]) c += WO * v; }
    for (const u of P.forb[i]) c += H * c0[b + u];
    for (const d of P.reqDays[i]) { const a = S.where[d][i]; if (a < 0 || !P.isLow[a] || S.coverOf[d][a] >= 0) c += WL; }
    for (const [d, st] of P.avoid[i]) { const a = S.where[d][i]; if (a < 0) continue; if (st.has(a)) c += WA; const E = S.coverOf[d][a]; if (E >= 0 && st.has(E)) c += WA; }
    const pp = P.polPref[i], ep = P.endoPref[i];
    if (pp || ep) for (let d = 0; d < P.D; d++) {
      const a = S.where[d][i]; if (a < 0) continue;
      if (pp && P.isPOL[a] && !pp.has(d)) c += WP;
      if (ep && P.isENDO[a] && !ep.has(d)) c += WP;
    }
    const dv = (S.total[i] - P.target[i]) / 10;
    return c + dv * dv;
  }
  function dayCost(P, S, d) {
    let c = 0;
    let nonL = 0;
    for (const E of S.empties[d]) {
      if (!P.areas[E].canEmpty) { c += WE * P.emptyRank[E]; nonL++; }
      if (P.areas[E].type !== 'OR') c += H;   // K13
      const p = S.coverBy[d][E];
      if (p < 0) c += H; else if (!P.pairOK[p * P.A + E]) c += H;
    }
    if (nonL) for (const a of P.listEmpty) if (P.open[d][a] && S.slot[d][a] >= 0) { c += H; break; }   // K10: önce paylaşılabilir odalar
    for (let i = 0; i < P.N; i++) if (S.where[d][i] === -2 && P.nobetsiz[i]) c += H;
    return c;
  }
  function totalCost(P, S) {
    let c = 0;
    for (let i = 0; i < P.N; i++) c += docCost(P, S, i);
    for (let d = 0; d < P.D; d++) c += dayCost(P, S, d);
    return c;
  }

  // ---------- hamleler ----------
  function giveArea(P, S, d, i, a, sgn) { // hekim i'nin a alanındaki (ve baktığı boş odadaki) sayımı
    if (a < 0) return;
    S.cnt[i * P.A + a] += sgn; S.total[i] += sgn * P.pts[a];
    const E = S.coverOf[d][a];
    if (E >= 0) { S.cnt[i * P.A + E] += sgn; S.total[i] += sgn * P.pts[E]; }
  }

  function moveSwap(P, S, d, x, y) {
    const ax = S.where[d][x], ay = S.where[d][y];
    giveArea(P, S, d, x, ax, -1); giveArea(P, S, d, y, ay, -1);
    S.where[d][x] = ay; S.where[d][y] = ax;
    if (ax >= 0) S.slot[d][ax] = y; if (ay >= 0) S.slot[d][ay] = x;
    giveArea(P, S, d, x, ay, +1); giveArea(P, S, d, y, ax, +1);
  }

  function moveCover(P, S, d, E, a1) { // boş E odasını a1 alanındaki hekime ver
    const a0 = S.coverBy[d][E];
    const c0 = S.slot[d][a0], c1 = S.slot[d][a1];
    S.cnt[c0 * P.A + E]--; S.total[c0] -= P.pts[E];
    S.cnt[c1 * P.A + E]++; S.total[c1] += P.pts[E];
    S.coverOf[d][a0] = -1; S.coverOf[d][a1] = E; S.coverBy[d][E] = a1;
  }

  function moveEmpty(P, S, d, E, R) { // E dolar, R boşalır; R'deki hekim E'ye geçer, bakan aynı kalır
    const ap = S.coverBy[d][E], c = S.slot[d][ap], z = S.slot[d][R];
    S.cnt[z * P.A + R]--; S.total[z] -= P.pts[R];
    S.cnt[z * P.A + E]++; S.total[z] += P.pts[E];
    S.cnt[c * P.A + E]--; S.total[c] -= P.pts[E];
    S.cnt[c * P.A + R]++; S.total[c] += P.pts[R];
    S.slot[d][E] = z; S.where[d][z] = E; S.slot[d][R] = -1;
    S.coverBy[d][E] = -1; S.coverBy[d][R] = ap; S.coverOf[d][ap] = R;
    const L = S.empties[d]; L[L.indexOf(E)] = R;
  }

  // ---------- çözücü (benzetimli tavlama) ----------
  function solve(P, opt = {}) {
    const seed = opt.seed ?? (Math.random() * 1e9) | 0;
    const rng = mulberry32(seed);
    const iters = opt.iters ?? 1500000;
    let S = opt.init ? cloneState(opt.init) : initState(P, rng);
    let cost = totalCost(P, S);
    let best = cloneState(S), bestCost = cost;
    const T0 = opt.T0 ?? 1000, T1 = opt.T1 ?? 1;
    const working = P.days.map((_, d) => P.avail[d].slice());
    const step = opt.onProgress ? Math.floor(iters / 50) : 0;
    // onarım kipi (ay içi revizyon): yalnız d0 ve sonrası değişir; referanstan her farklı hücre LAM cezası alır
    const d0 = opt.from || 0, REF = opt.ref || null, LAM = opt.lambda || 0;
    const chg = d => { if (!REF) return 0; let n = 0; for (let a = 0; a < P.A; a++) if (S.slot[d][a] !== REF.slot[d][a] || S.coverBy[d][a] !== REF.coverBy[d][a]) n++; return n * LAM; };
    if (d0 >= P.D) return { S, seed, cost };
    cost += P.days.reduce((t, _, d) => t + chg(d), 0);

    for (let it = 0; it < iters; it++) {
      const T = T0 * Math.pow(T1 / T0, it / iters);
      const d = d0 + Math.floor(rng() * (P.D - d0));
      const r = rng();
      const W = working[d];
      if (W.length < 2) continue;
      let delta, undo;
      const c0d = REF ? chg(d) : 0;
      if (opt.fill && r > 0.93) {   // odası olmayan hekimi kendi hekimi olmayan bir odaya yerleştir / odadan çıkar
        const x = W[Math.floor(rng() * W.length)], ax = S.where[d][x];
        if (ax === -2) {
          const E = S.empties[d].length ? S.empties[d][Math.floor(rng() * S.empties[d].length)] : -1; if (E < 0) continue;
          const ap = S.coverBy[d][E], before = docCost(P, S, x) + (ap >= 0 && S.slot[d][ap] >= 0 ? docCost(P, S, S.slot[d][ap]) : 0) + dayCost(P, S, d);
          const fill = () => { if (S.coverBy[d][E] >= 0) { const q = S.coverBy[d][E], c = S.slot[d][q]; if (c >= 0) { S.cnt[c * P.A + E]--; S.total[c] -= P.pts[E]; } S.coverOf[d][q] = -1; S.coverBy[d][E] = -1; } S.slot[d][E] = x; S.where[d][x] = E; S.cnt[x * P.A + E]++; S.total[x] += P.pts[E]; const L = S.empties[d]; L.splice(L.indexOf(E), 1); };
          fill();
          delta = docCost(P, S, x) + (ap >= 0 && S.slot[d][ap] >= 0 ? docCost(P, S, S.slot[d][ap]) : 0) + dayCost(P, S, d) - before;
          undo = () => { S.slot[d][E] = -1; S.where[d][x] = -2; S.cnt[x * P.A + E]--; S.total[x] -= P.pts[E]; S.empties[d].push(E); if (ap >= 0) { S.coverBy[d][E] = ap; S.coverOf[d][ap] = E; const c = S.slot[d][ap]; if (c >= 0) { S.cnt[c * P.A + E]++; S.total[c] += P.pts[E]; } } };
        } else continue;
      } else if (r < 0.75 || S.empties[d].length === 0) {
        const x = W[Math.floor(rng() * W.length)];
        let y = W[Math.floor(rng() * W.length)];
        if (x === y) continue;
        const before = docCost(P, S, x) + docCost(P, S, y) + (S.where[d][x] === -2 || S.where[d][y] === -2 ? dayCost(P, S, d) : 0);
        moveSwap(P, S, d, x, y);
        const after = docCost(P, S, x) + docCost(P, S, y) + (S.where[d][x] === -2 || S.where[d][y] === -2 ? dayCost(P, S, d) : 0);
        delta = after - before; undo = () => moveSwap(P, S, d, x, y);
      } else if (r < 0.88) {
        const L = S.empties[d], E = L[Math.floor(rng() * L.length)];
        const a1 = P.OR[Math.floor(rng() * P.OR.length)];
        const a0 = S.coverBy[d][E];
        if (a1 === a0 || S.slot[d][a1] < 0 || S.coverOf[d][a1] >= 0) continue;
        if (a0 < 0) {   // bakanı olmayan odaya bakan ata
          const c1 = S.slot[d][a1], before = docCost(P, S, c1) + dayCost(P, S, d);
          S.coverBy[d][E] = a1; S.coverOf[d][a1] = E; S.cnt[c1 * P.A + E]++; S.total[c1] += P.pts[E];
          delta = docCost(P, S, c1) + dayCost(P, S, d) - before;
          undo = () => { S.coverBy[d][E] = -1; S.coverOf[d][a1] = -1; S.cnt[c1 * P.A + E]--; S.total[c1] -= P.pts[E]; };
          if (REF) delta += chg(d) - c0d;
          if (delta <= 0 || rng() < Math.exp(-delta / T)) cost += delta; else undo();
          continue;
        }
        const c0 = S.slot[d][a0], c1 = S.slot[d][a1];
        const before = docCost(P, S, c0) + docCost(P, S, c1) + dayCost(P, S, d);
        moveCover(P, S, d, E, a1);
        delta = docCost(P, S, c0) + docCost(P, S, c1) + dayCost(P, S, d) - before;
        undo = () => moveCover(P, S, d, E, a0);
      } else {
        const L = S.empties[d], E = L[Math.floor(rng() * L.length)];
        const inList = P.areas[E].canEmpty;
        const cand = opt.fill ? P.OR : inList ? P.listEmpty : P.nonList;
        const R = cand[Math.floor(rng() * cand.length)];
        const ap = S.coverBy[d][E];
        if (ap < 0 && opt.fill) {   // onarım: R'deki hekim bakanı olmayan E'ye kayar, R boşalır
          if (R === E || S.slot[d][R] < 0 || S.coverOf[d][R] >= 0) continue;
          const z = S.slot[d][R], before = docCost(P, S, z) + dayCost(P, S, d);
          const sh = (from, to) => { S.slot[d][to] = z; S.where[d][z] = to; S.slot[d][from] = -1; S.cnt[z * P.A + from]--; S.total[z] -= P.pts[from]; S.cnt[z * P.A + to]++; S.total[z] += P.pts[to]; const L = S.empties[d]; L[L.indexOf(to)] = from; };
          sh(R, E);
          delta = docCost(P, S, z) + dayCost(P, S, d) - before;
          undo = () => sh(E, R);
        } else {
        if (R === E || ap < 0 || S.slot[d][R] < 0 || S.coverOf[d][R] >= 0) continue;
        const c = S.slot[d][ap], z = S.slot[d][R];
        if (c === z) continue;
        const before = docCost(P, S, c) + docCost(P, S, z) + dayCost(P, S, d);
        moveEmpty(P, S, d, E, R);
        delta = docCost(P, S, c) + docCost(P, S, z) + dayCost(P, S, d) - before;
        undo = () => moveEmpty(P, S, d, R, E);
        }
      }
      if (REF) delta += chg(d) - c0d;
      if (delta <= 0 || rng() < Math.exp(-delta / T)) cost += delta;
      else undo();
      if (it % 1000 === 0 && cost < bestCost - 1e-9) { bestCost = cost; best = cloneState(S); }
      if (step && it % step === 0) opt.onProgress(it / iters);
    }
    // son durum en iyiyse onu al
    const tc = X => totalCost(P, X) + (REF ? P.days.reduce((t, _, d) => { let n = 0; for (let a = 0; a < P.A; a++) if (X.slot[d][a] !== REF.slot[d][a] || X.coverBy[d][a] !== REF.coverBy[d][a]) n++; return t + n * LAM; }, 0) : 0);
    if (tc(S) <= tc(best)) best = S;
    recount(P, best);
    return { S: best, seed, cost: tc(best) };
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // ---------- doğrulama (kurallardan bağımsız, baştan kontrol) ----------
  function validate(P, S) {
    const v = [];
    const nm = i => P.docs[i].name, an = a => P.areas[a].name;
    for (let d = 0; d < P.D; d++) {
      const day = fmt(P.days[d]);
      const seen = new Map();
      for (let a = 0; a < P.A; a++) {
        const i = S.slot[d][a];
        if (!P.open[d][a]) { if (i >= 0 || S.coverBy[d][a] >= 0) v.push({ t: 'KAPALI', msg: `${day}: ${an(a)} o gün kapalı ama görev yazılmış.` }); continue; }
        if (i >= 0) {
          if (seen.has(i)) v.push({ t: 'K6', msg: `${day}: ${nm(i)} aynı gün iki alanda.` });
          seen.set(i, a);
          if (P.off[i][d]) { const o = P.off[i][d]; v.push({ t: o === 'İ' ? 'K3' : o === 'YB' ? 'YB' : o === 'OD' ? 'K12' : o === 'DIS' ? 'PROGRAM' : 'K1', msg: `${day}: ${nm(i)} ${o === 'İ' ? 'izinli' : o === 'YB' ? 'yoğun bakım nöbetçisi (yanık / dış anestezi)' : o === 'OD' ? 'odasız kalacak olarak seçilmiş' : o === 'DIS' ? 'o gün programda değil (katılış/ayrılış)' : 'nöbet ertesi'} ama odada görevli.` }); }
          if (P.forb[i].includes(a)) v.push({ t: 'K4', msg: `${day}: ${nm(i)} muaf olduğu odada (${an(a)}).` });
        } else {
          const p = S.coverBy[d][a];
          if (P.areas[a].type !== 'OR') v.push({ t: 'K13', msg: `${day}: ${an(a)} kendi hekimi olmadan kaldı.` });
          if (p < 0 || S.slot[d][p] < 0) v.push({ t: 'K10', msg: `${day}: ${an(a)} odasına bakan hekim yok.` });
          else {
            const c = S.slot[d][p];
            if (P.areas[p].type !== 'OR') v.push({ t: 'K14', msg: `${day}: ${an(a)} odasına ${an(p)} biriminden bakılıyor.` });
            if (P.forb[c].includes(a)) v.push({ t: 'K4', msg: `${day}: ${nm(c)} muaf olduğu odaya (${an(a)}) telafi olarak bakıyor.` });
            if (!P.pairOK[p * P.A + a]) v.push({ t: 'K15', msg: `${day}: ${an(a)} ile ${an(p)} birlikte paylaştırılamaz (oda eşleştirme kuralı).` });
          }
        }
      }
      for (const i of P.avail[d]) if (!seen.has(i) && P.nobetsiz[i]) v.push({ t: 'K5', msg: `${day}: nöbet tutmayan ${nm(i)} için oda atanmadı.` });
      const nEmpty = P.areas.filter((_, a) => P.open[d][a] && S.slot[d][a] < 0).length;
      const listE = P.listEmpty.filter(a => P.open[d][a] && S.slot[d][a] < 0).length;
      if (nEmpty > listE && listE < P.listEmpty.filter(a => P.open[d][a]).length) v.push({ t: 'K10', msg: `${day}: paylaşılabilir odalar dururken başka bir oda paylaştırılmış.` });
    }
    for (let i = 0; i < P.N; i++) {
      const b = i * P.A;
      for (const [g, ex, kod, ad] of [['POL', P.exPOL, 'K7', 'poliklinik'], ['ENDO', P.exENDO, 'K8', 'endoskopi']]) {
        const n = P[g].reduce((s, u) => s + S.cnt[b + u], 0);
        if (!ex[i] && n < 1 && !(g === 'POL' ? P.polSoft : P.endoSoft) && !P.partial[i]) v.push({ t: kod, msg: `${nm(i)}: hiç ${ad} görevi yok.` });
        if (n > 2) v.push({ t: kod, msg: `${nm(i)}: ${n} ${ad} görevi (en fazla 2).` });
        for (const u of P[g]) if (S.cnt[b + u] > 1) v.push({ t: kod, msg: `${nm(i)}: ${an(u)} biriminde ${S.cnt[b + u]} kez (en fazla 1).` });
      }
      for (const u of P.OR) if (S.cnt[b + u] > 2) v.push({ t: 'K9', msg: `${nm(i)}: ${an(u)} odasında ${S.cnt[b + u]} kez (en fazla 2).` });
    }
    return v;
  }

  // ---------- kaydetme / geri yükleme ----------
  function serialize(P, S) {
    return { days: P.days, docs: P.docs.map(d => d.name), areas: P.areas.map(a => a.name),
      slot: S.slot.map(x => Array.from(x)), coverBy: S.coverBy.map(x => Array.from(x)) };
  }
  // kayıtlı programı adlara göre geri yükler: ay içinde hekim/oda eklenip çıkarılsa da eski günler korunur
  function restoreState(P, sv) {
    if (!sv || !sv.slot || !sv.days) return null;
    const S = emptyState(P);
    const dI = Object.fromEntries(P.days.map((k, d) => [k, d])), docI = Object.fromEntries(P.docs.map((x, i) => [x.name, i])), arI = Object.fromEntries(P.areas.map((x, a) => [x.name, a]));
    sv.days.forEach((k, sd) => {
      const d = dI[k]; if (d === undefined) return;
      sv.areas.forEach((an, sa) => {
        const a = arI[an]; if (a === undefined) return;
        const si = sv.slot[sd][sa], i = si >= 0 ? docI[sv.docs[si]] : undefined;
        if (i !== undefined && S.where[d][i] < 0) { S.slot[d][a] = i; S.where[d][i] = a; }
        const cb = sv.coverBy[sd][sa], p = cb >= 0 ? arI[sv.areas[cb]] : undefined;
        if (p !== undefined) S.coverBy[d][a] = p;
      });
    });
    normalize(P, S);
    return S;
  }
  // tutarlılık: where/coverOf/empties slot ve coverBy'den yeniden kurulur, sayımlar yenilenir
  function normalize(P, S) {
    for (let d = 0; d < P.D; d++) {
      S.where[d].fill(-1); S.coverOf[d].fill(-1); S.empties[d] = [];
      for (let a = 0; a < P.A; a++) if (S.slot[d][a] >= 0) S.where[d][S.slot[d][a]] = a;
      for (let a = 0; a < P.A; a++) {
        const p = S.coverBy[d][a];
        if (p < 0) continue;
        if (S.slot[d][a] >= 0 || p === a || S.slot[d][p] < 0 || S.coverOf[d][p] >= 0) { S.coverBy[d][a] = -1; continue; }
        S.coverOf[d][p] = a;
      }
      for (let a = 0; a < P.A; a++) if (P.open[d][a] && S.slot[d][a] < 0) S.empties[d].push(a);
      for (const i of P.avail[d]) if (S.where[d][i] === -1) S.where[d][i] = -2;
    }
    recount(P, S);
    return S;
  }

  // ---------- ay içi revizyon: "en az değişiklik" onarımı ----------
  // S0: mevcut program (yeni girdilerle geri yüklenmiş), from: ilk değiştirilebilir gün indeksi
  function repair(P, S0, opt = {}) {
    const from = opt.from || 0, S = cloneState(S0);
    for (let d = from; d < P.D; d++) {
      for (let a = 0; a < P.A; a++) {
        const i = S.slot[d][a];
        if (i >= 0 && (P.off[i][d] || !P.open[d][a])) S.slot[d][a] = -1;   // artık çalışamayan / kapalı oda
        if (!P.open[d][a]) S.coverBy[d][a] = -1;
        const p = S.coverBy[d][a]; if (p >= 0 && !P.pairOK[p * P.A + a]) S.coverBy[d][a] = -1;
      }
    }
    normalize(P, S);
    const REF = cloneState(S0);
    const res = solve(P, { seed: opt.seed, iters: opt.iters ?? 400000, T0: opt.T0 ?? 300, T1: 1, from, ref: REF, lambda: opt.lambda ?? 2e4, fill: true, init: S });
    return res;
  }

  // ---------- talepler ----------
  function requests(P, S) {
    const out = [];
    P.docs.forEach((doc, i) => {
      for (const d of P.reqDays[i]) {
        const a = S.where[d][i], ok = a >= 0 && !!P.isLow[a] && S.coverOf[d][a] < 0;
        out.push({ i, d, name: doc.name, day: P.days[d], ok, area: a >= 0 ? P.areas[a].name : null, cover: a >= 0 && S.coverOf[d][a] >= 0 });
      }
    });
    return out;
  }
  // gün bazlı uygun olmayan odalar: ihlal edilen (kişi, gün) çiftleri
  function avoids(P, S) {
    const out = [];
    P.docs.forEach((doc, i) => {
      for (const [d, st] of P.avoid[i]) {
        const a = S.where[d][i], E = a >= 0 ? S.coverOf[d][a] : -1;
        const hit = a >= 0 && st.has(a) ? P.areas[a].name : E >= 0 && st.has(E) ? P.areas[E].name + ' (telafi)' : null;
        out.push({ i, name: doc.name, day: P.days[d], ok: !hit, room: hit });
      }
    });
    return out;
  }
  // poliklinik/endoskopi gün tercihleri: kişi başına, tercih dışı günlere düşen görevler
  function prefs(P, S) {
    const out = [];
    P.docs.forEach((doc, i) => {
      for (const [kind, pf, isT] of [['Poliklinik', P.polPref[i], P.isPOL], ['Endoskopi', P.endoPref[i], P.isENDO]]) {
        if (!pf) continue;
        const bad = [], got = [];
        for (let d = 0; d < P.D; d++) { const a = S.where[d][i]; if (a >= 0 && isT[a]) { got.push(P.days[d]); if (!pf.has(d)) bad.push(P.days[d]); } }
        out.push({ i, name: doc.name, kind, ok: !bad.length, got, bad });
      }
    });
    return out;
  }

  // aylar arası dönüşüm: poliklinik/endoskopi hedef sayıları ve geçen ay çalışılan odalara yeniden görevler
  function rotation(P, S) {
    const out = [];
    P.docs.forEach((doc, i) => {
      const b = i * P.A, rep = P.OR.filter(u => P.prevRoom[i][u] && S.cnt[b + u]).map(u => P.areas[u].name);
      for (const [kind, w, U] of [['Poliklinik', P.wantPol[i], P.POL], ['Endoskopi', P.wantEndo[i], P.ENDO]]) {
        if (!w) continue;
        const got = U.reduce((s, u) => s + S.cnt[b + u], 0);
        out.push({ i, name: doc.name, kind, want: w, got, ok: got === w });
      }
      out.push({ i, name: doc.name, kind: 'oda', rooms: rep });
    });
    return out;
  }
  // kayıtlı bir ay programından (serialize çıktısı) kişi başına poliklinik/endoskopi sayısı ve çalışılan odalar
  function prevStats(sv, areas) {
    if (!sv || !sv.slot) return null;
    const ty = Object.fromEntries((areas || []).map(a => [a.name, a.type]));
    const pol = {}, endo = {}, rooms = {};
    const add = (nm, an) => {
      const t = ty[an] || (/^Poliklinik/i.test(an) ? 'POL' : /^Endoskopi/i.test(an) ? 'ENDO' : 'OR');
      if (t === 'POL') pol[nm] = (pol[nm] || 0) + 1; else if (t === 'ENDO') endo[nm] = (endo[nm] || 0) + 1;
      else { const r = rooms[nm] || (rooms[nm] = []); if (!r.includes(an)) r.push(an); }
    };
    sv.slot.forEach((row, d) => row.forEach((i, a) => {
      if (i >= 0) { add(sv.docs[i], sv.areas[a]); return; }
      const p = sv.coverBy[d][a], c = p >= 0 ? row[p] : -1;
      if (c >= 0) add(sv.docs[c], sv.areas[a]);
    }));
    sv.docs.forEach(n => { pol[n] = pol[n] || 0; endo[n] = endo[n] || 0; });
    return { pol, endo, rooms };
  }

  // ---------- özet ----------
  function summary(P, S) {
    return P.docs.map((doc, i) => {
      const b = i * P.A;
      let work = 0, covers = 0, rep = 0;
      for (let d = 0; d < P.D; d++) {
        const a = S.where[d][i];
        if (a >= 0) { work++; if (S.coverOf[d][a] >= 0) covers++; }
      }
      for (const u of P.OR) if (S.cnt[b + u] === 2) rep++;
      const pol = P.POL.reduce((s, u) => s + S.cnt[b + u], 0);
      const endo = P.ENDO.reduce((s, u) => s + S.cnt[b + u], 0);
      return { i, name: doc.name, nobet: doc.nobet, work, ne: P.neCount[i], izin: P.izin[i], shifts: P.shifts[i], covers, rep, pol, endo, target: P.target[i], total: S.total[i], diff: S.total[i] - P.target[i] };
    });
  }

  return { H, GUNLER, GUN_KISA, AYLAR, key, toDate, addDays, dow, fmt, parseDate, ertesiOf, norm, matchName, parseTSV, parseRoster, parseLeaves, textRanges, prevDates, prepare, solve, validate, requests, prefs, avoids, rotation, prevStats, summary, serialize, restoreState, normalize, repair, recount, totalCost, moveSwap, moveCover, moveEmpty, cloneState, emptyState };
})();
if (typeof module !== 'undefined') module.exports = CORE;
