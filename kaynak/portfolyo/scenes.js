// Portfolyo ekran görüntüleri: web sürümü, hayali veriler. Sahne adı #ad ile seçilir; hazır olunca document.title = 'READY'.
window.print = () => { }; window.alert = () => { }; window.confirm = () => true; window.prompt = () => '';
const W = ms => new Promise(r => setTimeout(r, ms));
const USER = 'kerem.aslan@demo', ADM = 'yonetici@demo';
const DEC_MARKS = { '2026-12-07': 'yillik', '2026-12-08': 'yillik', '2026-12-18': 'kongre' };
let OUT = {};
async function base() {
  await API.resetDemo();
  me = await API.signIn(ADM, 'demo123'); await startAdmin();
  $('#btnDemo').click(); await W(200);
  const mo = M();
  mo.leaves.unshift({ name: 'Sinan Erol', type: 'kongre', from: '2026-11-18', to: '2026-11-20' }, { name: 'Gizem Çınar', type: 'rapor', from: '2026-11-24', to: '2026-11-25' });
  mo.steps = { 2: 'ok', 3: 'ok', 4: 'ok', 5: 'ok' };
  const icu = store.fixed.doctors.map(d => d.name).filter(n => !mo.included.includes(n));
  Object.keys(mo.roster).filter(k => k >= '2026-11-01').sort().forEach((k, i) => { const l = mo.roster[k]; while (l.length < 4) l.push(''); l[2] = icu[i % icu.length]; l[3] = icu[(i + 3) % icu.length]; });
  mo.lowReq = { 'Tuba Kurt': ['2026-11-10', '2026-11-11'] }; mo.polPref = { 'Hakan Demir': ['2026-11-04', '2026-11-05', '2026-11-12'] };
  mo.avoid = [{ name: 'Onur Şahin', days: ['2026-11-16', '2026-11-17'], rooms: ['Oda-19-20', 'Oda-21-22'] }];
  mo.closed = { 'Oda-32-33': ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27'] };
  const E = ['prof.dr. A. KARA', 'doç.dr. B. TUNA', 'prof.dr. C. ERGİN', 'prof.dr. C. ERGİN', 'doç.dr. D. SOY', 'doç.dr. E. ÖNAL'];
  mo.edu = {}; workDays().forEach((k, i) => { mo.edu[k] = E.map((n, j) => j === 2 && i % 3 === 0 ? 'doç.dr. B. TUNA' : n); });
  const { cfg, fx } = buildCfg(false); P = C.prepare(cfg);
  const res = C.solve(P, { iters: 900000, seed: 5 });
  Object.assign(mo, { result: C.serialize(P, res.S), snap: fx, inputSig: sig(cfg), seed: 5, revs: [], draft: null });
  saveStore(); progVer = null; P = null;
  await API.publish('2026-11', pubPayload());
  await API.setRound({ ym: '2026-12', deadline: '2026-11-20', open: true, holidays: [], openedAt: new Date().toISOString() });
  const reqs = { 'Hakan Demir': { '2026-12-03': 'yillik', '2026-12-04': 'yillik' }, 'Tuba Kurt': { '2026-12-14': 'kongre', '2026-12-15': 'kongre', '2026-12-16': 'kongre' }, 'Onur Şahin': { '2026-12-21': 'yillik', '2026-12-22': 'yillik', '2026-12-23': 'yillik', '2026-12-24': 'yillik' },
    'Gizem Çınar': { '2026-12-09': 'diger' }, 'Sinan Erol': { '2026-12-28': 'yillik', '2026-12-29': 'yillik', '2026-12-30': 'yillik', '2026-12-31': 'yillik' }, 'Aslı Özdemir': { '2026-12-15': 'rapor', '2026-12-16': 'rapor' }, 'Ozan Çelik': { '2026-12-04': 'yillik' }, 'Can Öztürk': { '2026-12-21': 'kongre', '2026-12-22': 'kongre' } };
  for (const [d, t] of Object.entries(reqs)) await API.adminSetRequest('2026-12', d, Object.keys(t), false, t);
  await API.adminSetRequest('2026-12', 'Murat Ekinci', [], true, {});
  await API.decide('2026-12', 'Hakan Demir', { '2026-12-03': 'approved', '2026-12-04': 'approved' });
  await API.decide('2026-12', 'Tuba Kurt', { '2026-12-14': 'approved', '2026-12-15': 'approved', '2026-12-16': 'approved' });
  await API.decide('2026-12', 'Onur Şahin', { '2026-12-21': 'approved', '2026-12-22': 'approved', '2026-12-23': 'approved', '2026-12-24': 'rejected' });
  await API.decide('2026-12', 'Sinan Erol', { '2026-12-28': 'approved', '2026-12-29': 'approved' });
}
async function asUser() { await API.signOut(); await API.signUp(USER, 'sifre1234').catch(() => { }); me = await API.signIn(USER, 'sifre1234'); await startUser(); await W(300); }
async function adminProgram(v) { setTab('program'); view = v; renderProgram(); await W(400); window.scrollTo(0, 0); }
async function changeFlow(apply) {
  await adminProgram('gunluk');
  changeDialog(); $('#chType').value = 'absent'; $('#chType').onchange(); $('#chDoc').value = 'Kerem Aslan'; $('#chLv').value = 'rapor'; $('#chFrom').value = '2026-11-16'; $('#chTo').value = '2026-11-18'; $('#chSave').click();
  M().draft.from = '2026-11-16'; saveStore(); renderProgram(); await W(100);
  makeProposals(); await W(200); while ($('#overlay').style.display !== 'none') await W(200); await W(200);
  if (apply) { applyProposal(2); await W(200); document.getElementById('drSave').click(); await W(300); }
}
const SC = {
  async login() { await API.signOut(); showLogin(); $('#lgEmail').value = USER; $('#lgPw').value = 'sifre1234'; },
  async ay() { setTab('ay'); await W(300); window.scrollTo(0, 0); },
  async acik() { setTab('ay'); await W(300); document.getElementById('openRooms').scrollIntoView(); window.scrollBy(0, -140); },
  async izin() { setTab('ay'); await W(300); ['step1', 'step2'].forEach(id => { document.getElementById(id).style.display = 'none'; }); window.scrollTo(0, 0); },
  async talepler() { trYm = '2026-12'; setTab('talep'); await W(500); document.querySelector('#tab-talep .card').style.display = 'none'; document.querySelectorAll('#tblReq tr').forEach((tr, i) => { if (i && !tr.querySelector('.tag.nn')) tr.style.display = 'none'; }); window.scrollTo(0, 0); },
  async kullanici() { setTab('kullanici'); await W(500); window.scrollTo(0, 0); },
  async gunluk() { await adminProgram('gunluk'); },
  async ozet() { await adminProgram('ozet'); },
  async kisigun() { await adminProgram('kisigun'); },
  async uyari() { await adminProgram('uyari'); },
  async degisiklik() { await changeFlow(false); document.querySelectorAll('#tab-program .outs, #tab-program > .card > .btns, #pubBar, #status').forEach(e => { e.style.display = 'none'; }); window.scrollTo(0, 0); },
  async revize() { await changeFlow(true); setVer('rev'); await W(200); const dt = document.querySelector('#verBar details'); if (dt) dt.open = true; window.scrollTo(0, 0); },
  async rapor() { await changeFlow(true); printReport(1); },
  async resmi() { await adminProgram('gunluk'); const oc = URL.createObjectURL; let blob = null; URL.createObjectURL = b => { blob = b; return 'blob:x'; }; HTMLAnchorElement.prototype.click = function () { }; exportOfficialXlsx(); URL.createObjectURL = oc; const u8 = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); OUT.xlsx = btoa(s); },
  async resmiimg() {   // resmi liste Excel'inin içeriği, şablon görünümünde (ilk sütunlar ve günler)
    await adminProgram('gunluk');
    const G = officialGrid(), nc = 13, rows = G.rows.slice(0, 16); document.body.style.background = '#fff'; document.documentElement.style.background = '#fff';
    const td = (v, b) => `<td style="border:1px solid #444;padding:4px 6px;font:${b ? 700 : 400} 11px Arial;text-align:center;white-space:nowrap">${esc(v)}</td>`;
    document.body.innerHTML = `<div style="background:#fff;padding:18px"><table style="border-collapse:collapse"><tr><td colspan="${nc}" style="border:2px solid #000;padding:8px;font:700 14px Arial;text-align:center">${esc(G.title)}</td></tr>
      <tr>${G.cols.slice(0, nc).map(c => `<td style="border:1px solid #444;padding:4px 6px;font:700 9px Arial;text-align:center;white-space:pre-line;background:#fff">${esc(c[0].trim())}</td>`).join('')}</tr>
      ${rows.map(r => `<tr>${r.cells.slice(0, nc).map((v, j) => td(j ? v : C.fmt(v).replace(/\./g, '/'), j > 0)).join('')}</tr>`).join('')}</table></div>`;
    window.scrollTo(0, 0);
  },
  async 'p-login'() { await SC.login(); },
  async 'p-home'() { await asUser(); },
  async 'p-cal'() { await asUser(); $('#btnReq').click(); await W(100); for (const [k, t] of Object.entries(DEC_MARKS)) { document.querySelector(`#reqType [data-t="${t}"]`).click(); document.querySelector(`#reqCal button[data-k="${k}"]`).click(); } await W(300); },
  async 'p-gunluk'() { await asUser(); uView = 'gunluk'; renderUser(); await W(300); },
};
(async () => {
  try {
    const st = document.createElement('style'); st.textContent = '*{transition:none!important;animation:none!important}'; document.head.appendChild(st);
    await W(200);
    const name = decodeURIComponent(location.hash.slice(1)).replace(/^shots-?/, '');
    await base();
    await SC[name]();
    await W(400);
  } catch (e) { OUT.error = String(e && e.stack || e); }
  const pre = document.createElement('pre'); pre.id = 'OUT'; pre.style.display = 'none'; pre.textContent = JSON.stringify(OUT); document.body.appendChild(pre);
  document.title = 'READY';
})();
