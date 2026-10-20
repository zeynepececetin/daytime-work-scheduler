/* ================= WEB SÜRÜMÜ: yayınlama, kullanıcılar, talepler, kişisel sayfa, giriş =================
   Masaüstü programın (template.html) üzerine build_web.py ile eklenir. Masaüstündeki tüm ekran ve
   algoritmalar aynen kullanılır; burada yalnızca web'e özgü parçalar vardır. */

/* ---------- yayınlama (admin) ---------- */
const fmtTs = t => t ? new Date(t).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '';
// yayınlanan sürüm: son kesinleştirilmiş revize program, yoksa orijinal (taslak asla yayınlanmaz)
function pubPayload() {
  const mo = M(), R = revs(), last = R[R.length - 1];
  return {
    cfg: buildCfg().cfg, result: last ? last.state : mo.result, label: last ? `Revize program · Rev. ${last.n}` : 'Orijinal program',
    month: { roster: mo.roster, leaves: mo.leaves, edu: mo.edu || {}, holidaysText: mo.holidaysText, flexNE: mo.flexNE || {} },
    official: official(), doctors: store.fixed.doctors.map(d => ({ name: d.name })), showSummary: !!(store.settings && store.settings.showSummary)
  };
}
async function renderPubBar(V) {
  const ym = store.current, box = $('#pubBar'); if (!box) return;
  if (!M().result) { box.innerHTML = ''; return; }
  const pubd = await API.getPublished(ym);
  if (store.current !== ym) return;
  const pl = pubPayload(), same = pubd && JSON.stringify(pubd.payload) === JSON.stringify(pl);
  const sumChk = `<label class="small" style="margin-left:auto"><input type="checkbox" id="chkSum" ${store.settings && store.settings.showSummary ? 'checked' : ''}> Kullanıcılar puanları da görsün</label>`;
  if (!pubd) box.innerHTML = `<div class="pb draft"><b>Yayınlanmadı</b> — kullanıcılar bu ayı henüz göremez. Yayınlanacak: <b>${esc(pl.label)}</b>. <button class="btn primary" id="btnPub">Yayınla</button>${sumChk}</div>`;
  else if (same) box.innerHTML = `<div class="pb live">✓ <b>Yayında</b> — ${esc(pl.label)} · ${fmtTs(pubd.publishedAt)}${pubd.updatedAt ? ` · son güncelleme ${fmtTs(pubd.updatedAt)}` : ''} <button class="btn" id="btnUnpub">Yayından kaldır</button>${sumChk}</div>`;
  else box.innerHTML = `<div class="pb diff"><b>Yayından sonra değişiklik var</b> — kullanıcılar ${fmtTs(pubd.updatedAt || pubd.publishedAt)} tarihli hali (${esc(pubd.payload.label || '')}) görüyor. <button class="btn primary" id="btnPub">${esc(pl.label)} sürümünü yayınla</button> <button class="btn" id="btnUnpub">Yayından kaldır</button>${sumChk}</div>`;
  const b = $('#btnPub'); if (b) b.onclick = async () => {
    const S2 = C.restoreState(P, pl.result), V2 = S2 ? C.validate(P, S2) : [];
    const R = revs(), EX = new Set(R.length ? R[R.length - 1].exceptions || [] : []), Vo = V2.filter(v => !EX.has(v.msg));
    if (Vo.length && !confirm(`Yayınlanacak programda ${Vo.length} kural ihlali var. Yine de yayınlansın mı?`)) return;
    if (M().draft && !confirm('Kesinleştirilmemiş bir taslak var; taslak yayınlanmaz, son kesinleştirilen sürüm yayınlanır. Devam edilsin mi?')) return;
    await API.publish(ym, pl); renderProgram(); toast('Yayınlandı — kullanıcılar artık görebilir');
  };
  const u = $('#btnUnpub'); if (u) u.onclick = async () => { if (confirm('Bu ay yayından kaldırılsın mı? Kullanıcılar artık göremez.')) { await API.unpublish(ym); renderProgram(); } };
  const c = $('#chkSum'); if (c) c.onchange = () => { store.settings = store.settings || {}; store.settings.showSummary = c.checked; saveStore(); renderPubBar(V); };
}

/* ---------- kullanıcılar (admin) ---------- */
async function renderUsers() {
  const list = await API.listUsers();
  const byDoc = Object.fromEntries(list.map(u => [u.doctor, u]));
  const rows = store.fixed.doctors.map((d, i) => {
    const u = byDoc[d.name];
    if (d.name === me.doctor) return `<tr><td>${esc(d.name)}</td><td>${esc(me.email)}</td><td><span class="tag nn">yönetici hesabı</span></td><td></td></tr>`;
    const st = !u ? '<span class="tag">davet yok</span>' : !u.active ? '<span class="tag" style="background:var(--bad-bg);color:var(--bad)">erişim kaldırıldı</span>'
      : u.hasAccount ? '<span class="tag nn">aktif</span>' : '<span class="tag" style="background:var(--warn-bg);color:var(--warn)">davetli · hesap açılmadı</span>';
    const act = !u ? `<button class="btn primary" data-act="invite" data-i="${i}">Davet listesine ekle</button>`
      : `<button class="btn" data-act="invite" data-i="${i}">E-postayı kaydet</button>
         ${u.active ? `<button class="btn" data-act="off" data-i="${i}">Erişimi kaldır</button>` : `<button class="btn" data-act="on" data-i="${i}">Erişimi geri ver</button>`}
         <button class="btn" data-act="del" data-i="${i}">Listeden sil</button>`;
    return `<tr><td>${esc(d.name)}</td><td><input type="email" data-i="${i}" value="${esc(u ? u.email : '')}" placeholder="e-posta" style="width:250px"></td><td>${st}</td><td>${act}</td></tr>`;
  }).join('');
  const adm = `<tr style="background:#f4f8ff"><td><b>Yönetici hesabı</b> (${esc(me.email)})</td><td colspan="3">Programdaki hekim kaydı: <select id="admDoc"><option value="">— bağlı değil —</option>${store.fixed.doctors.map(d => `<option ${d.name === me.doctor ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select>
      <span class="small">Bağlıysa yönetici, "Benim sayfam"dan kendi programını görür ve kendi talebini girer.</span></td></tr>`;
  $('#tblUsers').innerHTML = `<tr><th>Hekim</th><th>E-posta (kullanıcı adı)</th><th>Durum</th><th></th></tr>${adm}${rows}`;
  $('#admDoc').onchange = async e => { await API.setAdminDoctor(e.target.value); me.doctor = e.target.value || null; $('#navMe').hidden = !me.doctor; renderUsers(); };
  const n = list.filter(u => u.active && u.hasAccount).length, w = list.filter(u => u.active && !u.hasAccount).length;
  $('#usersMsg').innerHTML = `<div class="msg ok">Yalnızca bu listedeki e-postalar hesap oluşturabilir. ${n} aktif hesap · ${w} davetli (hesabını henüz açmamış).</div>
    <p class="small">Davet edilen kişi siteye girip <b>"İlk kez mi giriyorsunuz? Hesap oluşturun"</b> ile kendi şifresini belirler ve e-postasına gelen doğrulama bağlantısına tıklar. <b>Erişimi kaldır</b>: kişi giriş yapsa bile hiçbir veri göremez. <b>Listeden sil</b>: davet ve hesap silinir.</p>`;
}
async function onUsersClick(e) {
  const t = e.target, act = t.dataset.act; if (!act) return;
  const d = store.fixed.doctors[+t.dataset.i];
  try {
    if (act === 'invite') {
      const email = $(`#tblUsers input[data-i="${t.dataset.i}"]`).value.trim();
      if (!/^[^@\s]+@[^@\s]+\.?[^@\s]*$/.test(email)) { alert('Geçerli bir e-posta yazın.'); return; }
      await API.invite(d.name, email);
    } else if (act === 'off') { if (!confirm(`${d.name} kullanıcısının erişimi kaldırılsın mı?`)) return; await API.setActive(d.name, false); }
    else if (act === 'on') await API.setActive(d.name, true);
    else if (act === 'del') { if (!confirm(`${d.name} davet listesinden ve hesabıyla birlikte silinsin mi?`)) return; await API.removeInvite(d.name); }
    renderUsers();
  } catch (err) { alert(err.message); }
}

/* ---------- talepler: ortak ---------- */
const roundOpen = r => !!(r && r.open && todayKey() <= r.deadline);
const ymLabel = ym => { const [y, m] = ym.split('-').map(Number); return `${C.AYLAR[m - 1]} ${y}`; };
const nextYm = () => { const n = new Date(); const t = new Date(n.getFullYear(), n.getMonth() + 1, 1); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`; };
function monthDays(ym) { const [y, m] = ym.split('-').map(Number), out = []; for (let d = 1; d <= 31; d++) { const k = C.key(y, m, d); if (C.toDate(k).getUTCMonth() !== m - 1) break; out.push(k); } return out; }
const isWork = (k, hol) => { const w = C.dow(k); return w >= 1 && w <= 5 && !hol.includes(k); };
function holidaysOf(ym) { ensureMonth(ym); const y = +ym.slice(0, 4); return store.months[ym].holidaysText.split(/[\n,;]+/).map(x => C.parseDate(x, y)).filter(Boolean); }
const RT = { yillik: ['Yıllık izin', 'Yİ'], kongre: ['Kongre izni', 'K'], rapor: ['Rapor', 'R'], diger: ['Diğer', 'D'] };
// web takvimi. opts: { sel: Map(gün → tür), hol, onToggle, readOnly, counts, type: () => tür }
function reqCal(el, ym, opts) {
  const days = monthDays(ym), first = (C.dow(days[0]) + 6) % 7;
  let h = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(x => `<div class="h">${x}</div>`).join('') + '<div></div>'.repeat(first);
  for (const k of days) {
    const n = +k.slice(8);
    if (!isWork(k, opts.hol)) { h += `<div class="d off">${n}${opts.hol.includes(k) ? '<small>tatil</small>' : ''}</div>`; continue; }
    const t = opts.sel ? opts.sel.get(k) : null;
    if (opts.readOnly) {
      const c = opts.counts ? (opts.counts[k] || 0) : 0;
      h += `<div class="d ro ${c ? 'heat' + Math.min(3, Math.ceil(c / 2)) : ''}" title="${c ? c + ' kişi' : ''}"><span class="n">${n}</span>${c ? `<span class="badge">${c}</span>` : ''}</div>`;
    } else h += `<button type="button" class="d ${t ? 't t-' + t : ''}" data-k="${k}" aria-pressed="${!!t}" aria-label="${C.fmt(k)}"><span class="n">${n}</span>${t ? `<span class="tl">${RT[t][1]}</span>` : ''}</button>`;
  }
  el.innerHTML = h;
  el.onclick = opts.readOnly ? null : e => {
    const b = e.target.closest('button.d'); if (!b) return;
    const k = b.dataset.k, cur = opts.sel.get(k), ty = opts.type ? opts.type() : 'yillik';
    if (cur === ty) opts.sel.delete(k); else opts.sel.set(k, ty);
    reqCal(el, ym, opts); if (opts.onToggle) opts.onToggle();
  };
}
function confirmDlg(title, html, ok, cancel) {
  return new Promise(res => {
    const dlg = $('#dlg'); let done = false;
    const fin = v => { if (done) return; done = true; dlg.onclose = null; if (dlg.open) dlg.close(); res(v); };
    $('#dlgHd').textContent = title;
    $('#dlgBd').innerHTML = html + `<div class="btns" style="justify-content:flex-end;margin-top:14px">${cancel ? `<button class="btn" id="cdNo">${cancel}</button>` : ''}<button class="btn primary" id="cdYes">${ok}</button></div>`;
    $('#cdYes').onclick = () => fin(true); const no = $('#cdNo'); if (no) no.onclick = () => fin(false);
    dlg.onclose = () => fin(false);
    dlg.showModal();
  });
}
function toast(t) { const d = document.createElement('div'); d.textContent = t; Object.assign(d.style, { position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', background: '#14213d', color: '#fff', padding: '10px 16px', borderRadius: '10px', zIndex: 200, fontSize: '14px' }); document.body.appendChild(d); setTimeout(() => d.remove(), 2200); }
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); toast('Kopyalandı — e-postaya ya da WhatsApp\'a yapıştırabilirsiniz'); }
  catch (e) { await confirmDlg('Metni kopyalayın', `<textarea style="min-height:200px" onfocus="this.select()">${esc(t)}</textarea>`, 'Tamam'); }
}
const dayChip = (d, ty, st, attrs = '') => `<${attrs ? 'button' : 'span'} class="chip ${st === 'approved' ? 'ap' : st === 'rejected' ? 'rj' : ''}" ${attrs} title="${RT[ty || 'yillik'][0]} · ${st === 'approved' ? 'onaylandı' : st === 'rejected' ? 'reddedildi' : 'bekliyor'}">${dShort(d)}<span class="ty">${RT[ty || 'yillik'][1]}</span></${attrs ? 'button' : 'span'}>`;

/* ---------- talepler: kullanıcı ---------- */
let reqState = null;
async function renderUReq() {
  const box = $('#uReq'); if (!box) return;
  const r = await API.getRound();
  if (!r || !me || !me.doctor) { box.innerHTML = ''; return; }
  const mine = await API.getMyRequest(r.ym), open = roundOpen(r);
  if (mine && mine.status === 'submitted') {
    const chips = mine.none ? '<span class="chip">Bu ay izin talebim yok</span>' : mine.days.map(d => dayChip(d, (mine.types || {})[d], (mine.decisions || {})[d])).join('');
    box.innerHTML = `<div class="reqbanner done"><div><b>${ymLabel(r.ym)} talebiniz gönderildi</b> · ${fmtTs(mine.submittedAt)}<div style="margin-top:6px">${chips}</div>
      ${mine.none ? '' : '<div class="small" style="margin-top:4px">Gri: bekliyor · Yeşil: onaylandı · Üstü çizili: reddedildi. Yİ yıllık izin · K kongre · R rapor · D diğer.</div>'}<div class="small">Değişiklik için yönetici ile görüşün.</div></div></div>`;
  } else if (open) {
    box.innerHTML = `<div class="reqbanner"><div><b>${ymLabel(r.ym)}</b> için izin talepleri toplanıyor.<br><span class="small">Son gün: <b>${C.fmt(r.deadline)}</b>${mine && mine.status === 'reopened' ? ' · talebiniz yönetici tarafından yeniden açıldı' : ''}</span></div><button class="btn primary big" id="btnReq">Talep gir</button></div>`;
    $('#btnReq').onclick = () => openReqPage(r, mine);
  } else box.innerHTML = r.ym >= todayKey().slice(0, 7) ? `<div class="reqbanner closed"><span><b>${ymLabel(r.ym)}</b> için talep toplama kapalı${mine ? '' : ' — talep göndermediniz'}.</span></div>` : '';
}
function openReqPage(r, mine) {
  const sel = new Map(mine && !mine.none ? mine.days.map(d => [d, (mine.types || {})[d] || 'yillik']) : []);
  let ty = 'yillik';
  reqState = { r, sel, init: JSON.stringify([...sel].sort()) };
  $('#reqTitle').textContent = `${ymLabel(r.ym)} · izin talebim`;
  $('#reqHint').innerHTML = `Önce izin türünü seçin, sonra o türdeki <b>mesai günlerine</b> dokunun; tekrar dokunursanız işaret kalkar. Son gün: <b>${C.fmt(r.deadline)}</b>`;
  const drawType = () => { $('#reqType').innerHTML = Object.entries(RT).map(([k, [t]]) => `<button type="button" class="t-${k} ${k === ty ? 'on' : ''}" data-t="${k}">${t}</button>`).join(''); };
  $('#reqType').onclick = e => { const b = e.target.closest('[data-t]'); if (b) { ty = b.dataset.t; drawType(); } };
  const upd = () => { const c = {}; sel.forEach(t => { c[t] = (c[t] || 0) + 1; }); $('#reqCount').innerHTML = sel.size ? `<b>${sel.size}</b> gün işaretlendi · ${Object.entries(c).map(([t, n]) => `${RT[t][0]} ${n}`).join(' · ')}` : 'Henüz gün işaretlenmedi'; };
  drawType(); reqCal($('#reqCal'), r.ym, { sel, hol: r.holidays || [], onToggle: upd, type: () => ty }); upd();
  $('#userApp').hidden = true; $('#reqPage').hidden = false; window.scrollTo(0, 0);
}
const reqDirty = () => !!reqState && JSON.stringify([...reqState.sel].sort()) !== reqState.init;
function leaveReqPage() { reqState = null; $('#reqPage').hidden = true; $('#userApp').hidden = false; renderUReq(); }
async function closeReqPage() {
  if (reqDirty() && !(await confirmDlg('Talebiniz gönderilmedi!', '<p>İşaretlediğiniz günler <b>kaydedilmedi</b> ve yöneticiye <b>ulaşmadı</b>.</p><p>Göndermek için <b>“Talebi kesinleştir ve gönder”</b> butonuna basmalısınız.</p>', 'Göndermeden çık', 'Sayfada kal'))) return;
  leaveReqPage();
}
async function sendReq(none) {
  const { r, sel } = reqState, days = [...sel.keys()].sort(), types = Object.fromEntries(sel);
  if (none && days.length) { if (!(await confirmDlg('Bu ay izin talebim yok', `<p>İşaretlediğiniz ${days.length} gün silinecek ve <b>"bu ay izin talebim yok"</b> olarak gönderilecek. Gönderdikten sonra değişiklik yapamazsınız.</p>`, 'Evet, gönder', 'Vazgeç'))) return; }
  else if (none) { if (!(await confirmDlg('Bu ay izin talebim yok', '<p>Bu ay için izin talebiniz olmadığı yöneticiye bildirilecek. Gönderdikten sonra değişiklik yapamazsınız.</p>', 'Gönder', 'Vazgeç'))) return; }
  else if (!days.length) { if (!(await confirmDlg('Hiç gün işaretlemediniz', '<p><b>"Bu ay izin talebim yok"</b> olarak gönderilsin mi?</p>', 'Evet, gönder', 'Vazgeç'))) return; none = true; }
  else if (!(await confirmDlg('Talebi gönder', `<p><b>${days.length} gün</b> yöneticiye gönderilecek:</p><p>${days.map(d => dayChip(d, types[d])).join('')}</p><p class="small">Gönderdikten sonra değişiklik yapamazsınız.</p>`, 'Gönder', 'Vazgeç'))) return;
  try { await API.submitMyRequest(r.ym, none ? [] : days, none, none ? {} : types); }
  catch (e) { await confirmDlg('Gönderilemedi', `<p>${esc(e.message)}</p>`, 'Tamam'); return; }
  reqState = null;
  await confirmDlg('Talebiniz gönderildi ✓', `<p>${ymLabel(r.ym)} talebiniz yöneticiye ulaştı. Onay durumunu ana sayfanızdan takip edebilirsiniz.</p>`, 'Tamam');
  leaveReqPage();
}

/* ---------- talepler: yönetici ---------- */
let trYm = null;
const SITE = () => /^https?:/.test(location.protocol) ? location.origin + location.pathname : '(site adresi)';
const sigOf = () => (store.settings && store.settings.signature) || (me && me.doctor ? me.doctor.split(' ')[0] : 'Yönetici');
function noticeText(r, reminder) {
  const L = ymLabel(r.ym), dl = C.fmt(r.deadline);
  if (reminder) return `Değerli arkadaşlar,\n${L} gün içi çalışma programı izin talebini henüz göndermeyen arkadaşlarımızın en geç ${dl} tarihine kadar ${SITE()} üzerinden talebini iletmesini rica ederim. “Talebi kesinleştir ve gönder” butonuna basılmayan talepler bana ulaşmaz.\nİyi çalışmalar dilerim\n${sigOf()}`;
  return `Değerli arkadaşlar,\n${L} gün içi çalışma programı için izin talepleri (yıllık izin, kongre izni, rapor, diğer) toplanmaktadır. En geç ${dl} tarihine kadar izinli olacağınız mesai günlerini bildiriniz.\nTalep girişi: ${SITE()} → “Talep gir” → izin türünü ve günleri işaretleyin → “Talebi kesinleştir ve gönder”.\nİzin talebiniz yoksa “Bu ay izin talebim yok” seçeneğini kullanınız.\nİyi çalışmalar dilerim\n${sigOf()}`;
}
async function renderTalep() {
  const r = await API.getRound();
  if (!trYm) trYm = r ? r.ym : nextYm();
  const [y, m] = trYm.split('-').map(Number), ny = new Date().getFullYear();
  $('#trMonth').innerHTML = C.AYLAR.map((a, i) => `<option value="${i + 1}" ${i + 1 === m ? 'selected' : ''}>${a}</option>`).join('');
  $('#trYear').innerHTML = [ny, ny + 1, ny + 2].map(k => `<option ${k === y ? 'selected' : ''}>${k}</option>`).join('');
  const same = !!(r && r.ym === trYm), open = same && roundOpen(r);
  if (same) $('#trDeadline').value = r.deadline;
  $('#trDeadline').min = todayKey();
  $('#trOpen').classList.toggle('onA', open); $('#trClose').classList.toggle('onK', !open);
  $('#trState').innerHTML = open ? `<span class="tag nn">Açık · son gün ${C.fmt(r.deadline)}</span>`
    : same && r.open ? '<span class="tag">Son tarih geçti — kendiliğinden kapandı</span>'
    : r && !same && roundOpen(r) ? `<span class="tag" style="background:var(--warn-bg);color:var(--warn)">Şu an ${ymLabel(r.ym)} için açık</span>` : '<span class="tag">Kapalı</span>';
  const reqs = await API.listRequests(trYm);
  const users = (await API.listUsers()).filter(u => u.active);
  const sent = new Set(reqs.filter(q => q.status === 'submitted').map(q => q.doctor));
  const notYet = users.filter(u => !sent.has(u.doctor));
  $('#trNotify').innerHTML = same ? `<div class="notify">
    <div class="ntop"><b>Bildirim metinleri</b> <span class="small">— e-posta gövdesine ya da WhatsApp'a yapıştırın. Kopyalamadan önce metni düzenleyebilirsiniz.</span>
      <label class="small" style="margin-left:auto">İmza: <input type="text" id="nSig" value="${esc(sigOf())}" style="width:140px"></label></div>
    <div class="ntxt"><div class="nh">Duyuru <button class="btn primary" id="nCopy">Kopyala</button></div><textarea id="nText">${esc(noticeText(r))}</textarea></div>
    <div class="ntxt"><div class="nh">Hatırlatma <span class="small">(henüz göndermeyen ${notYet.length} kişi)</span> <button class="btn" id="rCopy">Kopyala</button></div><textarea id="rText">${esc(noticeText(r, true))}</textarea></div>
    <div class="btns"><button class="btn" id="nAddr">Tüm alıcı adreslerini kopyala (${users.length})</button><button class="btn" id="rAddr" ${notYet.length ? '' : 'disabled'}>Göndermeyenlerin adreslerini kopyala (${notYet.length})</button></div>
    <div class="small">E-posta gönderirken adresleri <b>Gizli (BCC)</b> alanına yapıştırın; böylece alıcılar birbirinin adresini görmez.</div></div>` : '';
  const on = (id, f) => { const b = document.getElementById(id); if (b) b.onclick = f; };
  on('nCopy', () => copyText($('#nText').value)); on('rCopy', () => copyText($('#rText').value));
  on('nAddr', () => copyText(users.map(u => u.email).join(', '))); on('rAddr', () => copyText(notYet.map(u => u.email).join(', ')));
  const sg = $('#nSig'); if (sg) sg.onchange = () => { store.settings = store.settings || {}; store.settings.signature = sg.value.trim(); saveStore(); renderTalep(); };
  renderReqTable(reqs, users, same ? (r.holidays || holidaysOf(trYm)) : holidaysOf(trYm));
  const mo = store.months[trYm];
  $('#trTransferMsg').textContent = mo && mo.reqTransferredAt ? `Son aktarma: ${fmtTs(mo.reqTransferredAt)} — ${(mo.leaves || []).filter(l => l.src === 'talep').length} izin kaydı.` : '';
}
function renderReqTable(reqs, users, hol) {
  const byDoc = Object.fromEntries(reqs.map(q => [q.doctor, q])), counts = {};
  let pend = 0, nSent = 0, nNone = 0;
  for (const q of reqs) if (q.status === 'submitted') {
    nSent++; if (q.none) nNone++;
    for (const d of q.days) { const st = (q.decisions || {})[d]; if (st !== 'rejected') counts[d] = (counts[d] || 0) + 1; if (!st) pend++; }
  }
  const inv = new Set(users.map(u => u.doctor)); if (me.doctor) inv.add(me.doctor);
  $('#trSummary').innerHTML = `<div class="status"><span class="pill info">Gönderen: ${nSent} (talebi yok: ${nNone})</span><span class="pill info">Göndermeyen: ${users.filter(u => !(byDoc[u.doctor] && byDoc[u.doctor].status === 'submitted')).length}</span><span class="pill ${pend ? 'bad' : 'ok'}">Onay bekleyen gün: ${pend}</span></div>
    <p class="small">Takvimdeki sayı: o gün izin isteyen kişi sayısı (reddedilenler hariç).</p>`;
  const heat = document.createElement('div'); heat.className = 'wcal mini';
  $('#trHeat').innerHTML = ''; $('#trHeat').appendChild(heat);
  reqCal(heat, trYm, { readOnly: true, hol, counts });
  const rows = store.fixed.doctors.map((d, i) => {
    const q = byDoc[d.name];
    let st, chips = '', act = `<button class="btn" data-act="edit" data-i="${i}">${q ? 'Adına düzenle' : 'Adına gir'}</button>`;
    if (!q) st = inv.has(d.name) ? '<span class="tag">göndermedi</span>' : '<span class="tag">davetli değil</span>';
    else if (q.status === 'reopened') st = '<span class="tag" style="background:var(--warn-bg);color:var(--warn)">geri alındı · yeniden girebilir</span>';
    else {
      st = `<span class="tag nn">gönderdi</span> <span class="small">${fmtTs(q.submittedAt)}${q.by === 'admin' ? ' (yönetici)' : ''}</span>`;
      chips = q.none ? '<span class="chip">izin talebi yok</span>' : q.days.map(dd => dayChip(dd, (q.types || {})[dd], (q.decisions || {})[dd], `data-act="cyc" data-i="${i}" data-d="${dd}"`)).join('');
      act = `${q.none || !q.days.length ? '' : `<button class="btn" data-act="all" data-i="${i}">Hepsini onayla</button>`} <button class="btn" data-act="reopen" data-i="${i}">Talebini geri al</button> ` + act;
    }
    return `<tr><td>${esc(d.name)}</td><td>${st}</td><td style="white-space:normal;max-width:420px">${chips}</td><td>${act}</td></tr>`;
  }).join('');
  $('#tblReq').innerHTML = `<tr><th>Hekim</th><th>Durum</th><th>Günler <span class="small">(tıklayarak onayla / reddet · Yİ yıllık · K kongre · R rapor · D diğer)</span></th><th></th></tr>${rows}`;
}
async function onReqTableClick(e) {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const d = store.fixed.doctors[+b.dataset.i], act = b.dataset.act;
  const q = (await API.listRequests(trYm)).find(x => x.doctor === d.name);
  if (act === 'cyc') { const cur = (q.decisions || {})[b.dataset.d]; await API.decide(trYm, d.name, { [b.dataset.d]: !cur ? 'approved' : cur === 'approved' ? 'rejected' : null }); }
  else if (act === 'all') { const ch = {}; q.days.forEach(x => { ch[x] = 'approved'; }); await API.decide(trYm, d.name, ch); }
  else if (act === 'reopen') { if (!confirm(`${d.name} kişisinin talebi geri alınsın mı? Kişi yeniden talep girebilecek (önceki işaretleri hazır gelir).`)) return; await API.reopenRequest(trYm, d.name); }
  else if (act === 'edit') {
    const sel = new Map(q && !q.none ? q.days.map(x => [x, (q.types || {})[x] || 'yillik']) : []), r = await API.getRound();
    const hol = r && r.ym === trYm ? (r.holidays || []) : holidaysOf(trYm);
    let ty = 'yillik';
    $('#dlgHd').textContent = `${d.name} · ${ymLabel(trYm)} (yönetici girişi)`;
    $('#dlgBd').innerHTML = `<div class="tsel" id="admType"></div><div class="wcal" id="admCal" style="max-width:380px"></div><div class="btns" style="justify-content:flex-end"><button class="btn" id="admNone">Talebi yok olarak kaydet</button><button class="btn primary" id="admSave">Kaydet</button></div>`;
    const drawType = () => { $('#admType').innerHTML = Object.entries(RT).map(([k, [t]]) => `<button type="button" class="t-${k} ${k === ty ? 'on' : ''}" data-t="${k}">${t}</button>`).join(''); };
    $('#admType').onclick = ev => { const x = ev.target.closest('[data-t]'); if (x) { ty = x.dataset.t; drawType(); } };
    drawType(); reqCal($('#admCal'), trYm, { sel, hol, type: () => ty });
    $('#admSave').onclick = async () => { await API.adminSetRequest(trYm, d.name, [...sel.keys()], false, Object.fromEntries(sel)); $('#dlg').close(); renderTalep(); };
    $('#admNone').onclick = async () => { await API.adminSetRequest(trYm, d.name, [], true, {}); $('#dlg').close(); renderTalep(); };
    $('#dlg').showModal(); return;
  }
  renderTalep();
}
// onaylanan günler → Ay bilgileri → İzinler (ardışık aynı türdeki günler tek kayıt; önceki aktarmaların yerine geçer)
async function transferRequests() {
  const reqs = (await API.listRequests(trYm)).filter(q => q.status === 'submitted' && !q.none);
  const pend = reqs.reduce((a, q) => a + q.days.filter(d => !(q.decisions || {})[d]).length, 0);
  if (pend && !confirm(`${pend} gün henüz onaylanmadı ya da reddedilmedi; bunlar aktarılmayacak. Devam edilsin mi?`)) return;
  ensureMonth(trYm);
  const mo = store.months[trYm], hol = holidaysOf(trYm), wd = monthDays(trYm).filter(k => isWork(k, hol)), out = [];
  for (const q of reqs) {
    const ap = q.days.filter(d => (q.decisions || {})[d] === 'approved').sort();
    let run = null;
    for (const d of ap) {
      const t = (q.types || {})[d] || 'yillik', prev = run && wd[wd.indexOf(d) - 1];
      if (run && run.type === t && prev === run.last) { run.last = d; continue; }
      if (run) out.push(run); run = { name: q.doctor, type: t, from: d, last: d };
    }
    if (run) out.push(run);
  }
  mo.leaves = (mo.leaves || []).filter(l => l.src !== 'talep').concat(out.map(r => ({ name: r.name, type: r.type, from: r.from, to: r.last > r.from ? r.last : '', src: 'talep' })));
  mo.reqTransferredAt = new Date().toISOString(); saveStore(); renderTalep();
  toast(`${ymLabel(trYm)} izinlerine aktarıldı (${out.length} kayıt)`);
}

/* ---------- kullanıcı sayfası ---------- */
let uList = [], uView = 'ben', uShowSum = false, uPub = null;
async function startUser() {
  $('#userApp').hidden = false; $('#adminApp').hidden = true; $('#login').hidden = true;
  $('#whoUser').textContent = me.role === 'admin' ? (me.doctor || me.name) : me.name;
  $('#btnBackAdmin').hidden = me.role !== 'admin';
  renderUReq();
  uList = await API.listPublished();
  $('#uMonth').innerHTML = uList.length ? uList.map(p => `<option value="${p.ym}">${ymLabel(p.ym)}</option>`).join('') : '<option>—</option>';
  if (!uList.length) { $('#uView').innerHTML = '<div class="msg warn">Henüz yayınlanmış bir çalışma programı yok.</div>'; $('#uViews').innerHTML = ''; $('#uBtns').innerHTML = ''; return; }
  await loadUserMonth(uList[0].ym);
}
async function loadUserMonth(ym) {
  uPub = await API.getPublished(ym);
  if (!uPub) return;
  const pl = uPub.payload;
  store = { fixed: { official: pl.official, doctors: pl.doctors, areas: pl.cfg.areas }, months: { [ym]: { ...pl.month } }, current: ym };
  progVer = null; baseS = null; BRK = null;
  P = C.prepare(pl.cfg);
  S = C.restoreState(P, pl.result);
  SN = shortNames(P.docs.map(d => d.name));
  uShowSum = !!pl.showSummary; hidePts = !uShowSum;
  $('#uBadge').innerHTML = `<span class="tag nn">${esc(pl.label || '')}</span> ` + (uPub.updatedAt ? `<span class="tag" style="background:#fff0e0;color:#8a4b00">Güncellendi: ${fmtTs(uPub.updatedAt)}</span>` : `<span class="tag">Yayınlandı: ${fmtTs(uPub.publishedAt)}</span>`);
  renderUser();
}
function renderUser() {
  if (!S) { $('#uView').innerHTML = '<div class="msg bad">Bu ayın programı açılamadı.</div>'; return; }
  const tabs = [['ben', 'Benim programım'], ['gunluk', 'Günlük program'], ['kisigun', 'Tüm hekimler · gün gün']].concat(uShowSum ? [['ozet', 'Puan özeti']] : []);
  if (!tabs.some(t => t[0] === uView)) uView = 'ben';
  $('#uViews').innerHTML = tabs.map(([k, t]) => `<button data-v="${k}" class="${k === uView ? 'on' : ''}">${t}</button>`).join('');
  const sm = C.summary(P, S);
  if (uView === 'ben') {
    $('#uBtns').innerHTML = `<button class="btn" id="uPdfMe">PDF indir / yazdır</button><button class="btn" id="uXlsMe">Excel indir</button>`;
    $('#uView').innerHTML = viewMine(sm);
  } else {
    $('#uBtns').innerHTML = `<button class="btn" id="uOff">Resmi liste (Excel)</button><button class="btn" id="uPdf">Günlük program PDF</button><button class="btn" id="uJpg">Günlük program JPEG</button><button class="btn" id="uKPdf">Kişi bazlı PDF</button><button class="btn" id="uKJpg">Kişi bazlı JPEG</button>`;
    $('#uView').innerHTML = uView === 'gunluk' ? viewGunluk(sm, []) : uView === 'kisigun' ? viewKisiGun(sm, []) : viewOzet(sm);
  }
  const on = (id, f) => { const b = document.getElementById(id); if (b) b.onclick = f; };
  on('uOff', exportOfficialXlsx); on('uPdf', () => printModel(dailyModel())); on('uJpg', () => jpgModel(dailyModel()));
  on('uKPdf', () => printModel(personModel())); on('uKJpg', () => jpgModel(personModel()));
  on('uPdfMe', printMine); on('uXlsMe', exportMine);
}
function myIndex() { return P.docs.findIndex(d => d.name === me.doctor); }
function myRows() {
  const i = myIndex(), duty = new Set((uPub.payload.cfg.roster || []).filter(r => r.names.includes(me.doctor)).map(r => r.date));
  const OFFT = { NE: ['Nöbet ertesi', 'c-ne'], 'İ': ['İzinli', 'c-izin'], YB: ['Yoğun bakım nöbeti (gündüz yanık / dış anestezi)', 'c-yb'], OD: ['Odasız', 'c-idle'], DIS: ['Programda değil', 'c-idle'] };
  return P.days.map((k, d) => {
    let task = '', note = '', cls = '';
    const o = P.off[i][d];
    if (o) [task, cls] = OFFT[o];
    else { const a = S.where[d][i]; if (a >= 0) { task = P.areas[a].name; cls = P.areas[a].type === 'POL' ? 'c-pol' : P.areas[a].type === 'ENDO' ? 'c-endo' : ''; const E = S.coverOf[d][a]; if (E >= 0) { task += ' / ' + P.areas[E].name; note = 'bu gün iki odada'; cls = 'c-cover'; } } }
    if (duty.has(k)) note = (note ? note + ' · ' : '') + 'nöbetçi';
    return { k, day: C.GUN_KISA[C.dow(k)], task, note, cls };
  });
}
function viewMine(sm) {
  const i = myIndex();
  if (i < 0) return `<div class="msg warn">Bu ayın gün içi programında yer almıyorsunuz (ör. yoğun bakım görevi).</div>`;
  const s = sm[i];
  return `<div class="pers-cards"><div>Çalışma günü<b>${s.work}</b></div><div>Poliklinik<b>${s.pol}</b></div><div>Endoskopi<b>${s.endo}</b></div><div>İki odaya bakılan gün<b>${s.covers}</b></div><div>Nöbet ertesi<b>${s.ne}</b></div><div>İzinli<b>${s.izin}</b></div>${uShowSum ? `<div>Oda puanı<b>${nf(s.total)}</b></div>` : ''}</div>
  <div class="scroll" style="max-height:none"><table class="pers"><tr><th>Tarih</th><th>Gün</th><th>Görev</th><th>Not</th></tr>${myRows().map(r => `<tr><td>${C.fmt(r.k)}</td><td>${r.day}</td><td class="${r.cls}">${esc(r.task)}</td><td class="small">${esc(r.note)}</td></tr>`).join('')}</table></div>`;
}
function printMine() {
  const i = myIndex(); if (i < 0) return;
  const s = C.summary(P, S)[i], pa = $('#printArea');
  pa.innerHTML = `<div class="ph"><b>${esc(me.doctor)} — ${esc(printTitle())}</b><span>${esc(printSub())}</span></div>
    <table class="pt" style="font-size:9pt;table-layout:auto"><thead><tr><th class="rn">Tarih</th><th>Gün</th><th>Görev</th><th>Not</th></tr></thead><tbody>
    ${myRows().map(r => `<tr><th class="rn">${C.fmt(r.k)}</th><td>${r.day}</td><td class="${r.cls === 'c-pol' ? 'p' : r.cls === 'c-endo' ? 'e' : r.cls === 'c-ne' ? 'n' : r.cls === 'c-izin' ? 'i' : ''}">${esc(r.task)}</td><td>${esc(r.note)}</td></tr>`).join('')}</tbody></table>
    <p style="font-size:9pt;margin-top:3mm">Çalışma günü: ${s.work} · Poliklinik: ${s.pol} · Endoskopi: ${s.endo} · Nöbet ertesi: ${s.ne} · İzinli: ${s.izin}${uShowSum ? ' · Oda puanı: ' + nf(s.total) : ''}</p>`;
  const st = document.createElement('style'); st.textContent = '@media print{@page{size:A4 portrait;margin:0}}'; document.head.appendChild(st);
  pa.style.zoom = ''; pa.style.width = (210 * 96 / 25.4) + 'px';
  window.addEventListener('afterprint', () => { st.remove(); pa.style.width = ''; }, { once: true });
  window.print();
}
function exportMine() {
  const i = myIndex(); if (i < 0) return;
  const s = C.summary(P, S)[i];
  const rows = [['Tarih', 'Gün', 'Görev', 'Not']].concat(myRows().map(r => [C.fmt(r.k), r.day, { v: r.task, s: r.cls === 'c-pol' ? 2 : r.cls === 'c-endo' ? 3 : r.cls === 'c-ne' ? 5 : r.cls === 'c-izin' ? 6 : 0 }, r.note]));
  rows.push([], ['Çalışma günü', s.work], ['Poliklinik', s.pol], ['Endoskopi', s.endo], ['Nöbet ertesi', s.ne], ['İzinli', s.izin]);
  if (uShowSum) rows.push(['Oda puanı', s.total]);
  const { y, m } = curYM();
  const blob = xlsx([{ name: 'Kişisel program', rows, widths: [14, 12, 26, 30], freeze: false }]);
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `Programim-${y}-${String(m).padStart(2, '0')}.xlsx`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
// yönetici → kendi kullanıcı sayfası (yönetici verisi korunur)
async function enterUserView() {
  clearTimeout(saveTimer); await API.saveAdminState(store);
  adminStore = store; viewingAsUser = true; P = null; S = null;
  window.scrollTo(0, 0); startUser();
}
function exitUserView() {
  if (reqDirty() && !confirm('Talebiniz gönderilmedi; çıkarsanız işaretledikleriniz kaybolur. Çıkılsın mı?')) return;
  reqState = null; $('#reqPage').hidden = true;
  store = adminStore; adminStore = null; viewingAsUser = false; P = null; S = null; hidePts = false;
  $('#userApp').hidden = true; $('#adminApp').hidden = false; setTab('ay');
}

/* ---------- giriş ---------- */
let lgMode = 'in';
function showLogin(msg, ok) {
  $('#adminApp').hidden = true; $('#userApp').hidden = true; $('#login').hidden = false;
  const up = lgMode === 'up';
  $('#lgSub').textContent = up ? 'İlk giriş · hesap oluşturma (yalnızca davetli e-postalar)' : 'Anestezi ve Reanimasyon · giriş';
  $('#lgPw2').hidden = !up; $('#lgPw2').required = up;
  $('#lgPw').placeholder = up ? 'Şifre belirleyin (en az 8 karakter)' : 'Şifre';
  $('#lgPw').autocomplete = up ? 'new-password' : 'current-password';
  $('#lgBtn').textContent = up ? 'Hesap oluştur' : 'Giriş';
  $('#lgToggle').textContent = up ? 'Hesabım var, giriş yapacağım' : 'İlk kez mi giriyorsunuz? Hesap oluşturun';
  $('#lgMsg').innerHTML = msg ? `<div class="msg ${ok ? 'ok' : 'bad'}">${esc(msg)}</div>` : '';
  if (API.mode === 'demo' && !/shots/.test(location.hash)) { const h = API.demoHint(); $('#lgDemo').innerHTML = `<div class="msg warn" style="margin-top:12px">Örnek verili deneme hesabı — yönetici: <b>${h.admin}</b> · kullanıcı: <b>${esc(h.ready)}</b> (şifre <b>demo123</b>)<br><a href="#" id="lgReset">Örnek verileri sıfırla</a></div>`; $('#lgReset').onclick = async e => { e.preventDefault(); if (confirm('Tüm veriler (hesaplar, programlar, talepler) silinip baştan başlansın mı?')) { await API.resetDemo(); location.reload(); } }; }
  setTimeout(() => $('#lgEmail').focus(), 50);
}
async function startAdmin() {
  $('#login').hidden = true; $('#userApp').hidden = true; $('#adminApp').hidden = false;
  $('#whoAdmin').innerHTML = `${esc(me.doctor || me.name)} · <a href="#" id="lnkLogout" style="color:#fff">Çıkış</a>`;
  $('#lnkLogout').onclick = e => { e.preventDefault(); logout(); };
  $('#navMe').hidden = !me.doctor;
  store = (await API.loadAdminState()) || freshStore();
  migrateFixed();
  if (!store.current) { const n = new Date(); const t = new Date(n.getFullYear(), n.getMonth() + 1, 1); store.current = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`; }
  ensureMonth(store.current);
  buildMonthSelects(); P = null; S = null; progVer = null;
  setTab('ay');
}
async function logout() { clearTimeout(saveTimer); if (viewingAsUser) { store = adminStore; viewingAsUser = false; } if (me && me.role === 'admin') await API.saveAdminState(store); await API.signOut(); location.reload(); }
async function boot() {
  me = await API.session();
  if (!me) return showLogin();
  $('#login').hidden = true;
  if (me.role === 'admin') startAdmin(); else startUser();
}
function initWeb() {
  const setTab0 = setTab;
  setTab = t => { if (t === 'ben') { enterUserView(); return; } setTab0(t); if (t === 'talep') renderTalep(); if (t === 'kullanici') renderUsers(); };
  document.querySelectorAll('nav button').forEach(b => b.onclick = () => setTab(b.dataset.tab));
  $('#tblUsers').addEventListener('click', onUsersClick);
  $('#tblReq').addEventListener('click', onReqTableClick);
  $('#trTransfer').onclick = transferRequests;
  const trSel = () => { trYm = `${$('#trYear').value}-${String($('#trMonth').value).padStart(2, '0')}`; renderTalep(); };
  $('#trMonth').onchange = trSel; $('#trYear').onchange = trSel;
  $('#trOpen').onclick = async () => {
    const dl = $('#trDeadline').value;
    if (!dl) { alert('Önce son tarihi seçin.'); return; }
    if (dl < todayKey()) { alert('Son tarih bugünden önce olamaz.'); return; }
    const r = await API.getRound();
    if (r && r.ym !== trYm && roundOpen(r) && !confirm(`${ymLabel(r.ym)} için toplama açık. Kapatılıp ${ymLabel(trYm)} için açılsın mı?`)) return;
    await API.setRound({ ym: trYm, deadline: dl, open: true, holidays: holidaysOf(trYm), openedAt: new Date().toISOString() });
    renderTalep();
  };
  $('#trClose').onclick = async () => { const r = await API.getRound(); if (r && r.ym === trYm && r.open) { r.open = false; await API.setRound(r); } renderTalep(); };
  $('#trDeadline').onchange = async () => { const r = await API.getRound(); const dl = $('#trDeadline').value; if (r && r.ym === trYm && r.open && dl && dl >= todayKey()) { r.deadline = dl; await API.setRound(r); renderTalep(); } };
  $('#reqSend').onclick = () => sendReq(false);
  $('#reqNone').onclick = () => sendReq(true);
  $('#reqBack').onclick = closeReqPage;
  $('#loginForm').onsubmit = async e => {
    e.preventDefault();
    if (lgMode === 'up') {
      const pw = $('#lgPw').value;
      if (pw.length < 8) return showLogin('Şifre en az 8 karakter olmalı.');
      if (pw !== $('#lgPw2').value) return showLogin('Şifreler aynı değil.');
      try { const m = await API.signUp($('#lgEmail').value, pw); lgMode = 'in'; $('#lgPw').value = ''; $('#lgPw2').value = ''; showLogin(m, true); }
      catch (err) { showLogin(err.message); }
      return;
    }
    try { me = await API.signIn($('#lgEmail').value, $('#lgPw').value); $('#lgPw').value = ''; me.role === 'admin' ? startAdmin() : startUser(); }
    catch (err) { showLogin(err.message); }
  };
  $('#lgToggle').onclick = e => { e.preventDefault(); lgMode = lgMode === 'up' ? 'in' : 'up'; showLogin(); };
  $('#lgForgot').onclick = async e => { e.preventDefault(); const em = $('#lgEmail').value.trim(); if (!em) { showLogin('Önce e-posta adresinizi yazın.'); return; } alert(await API.resetPassword(em)); };
  $('#btnLogoutU').onclick = logout;
  $('#btnBackAdmin').onclick = exitUserView;
  $('#uMonth').onchange = e => loadUserMonth(e.target.value);
  $('#uViews').addEventListener('click', e => { const v = e.target.dataset.v; if (v) { uView = v; renderUser(); } });
  $('#btnBackup').onclick = () => { const b = new Blob([JSON.stringify(store)], { type: 'application/json' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `calisma-verileri-yedek-${todayKey()}.json`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); };
  $('#fileRestore').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; f.text().then(t => { const d = JSON.parse(t); if (!d.fixed || !d.months) throw 0; if (!confirm('Tüm yönetici verileri yedektekiyle değiştirilsin mi?')) return; store = d; migrateFixed(); saveStore(); buildMonthSelects(); setTab('ay'); }).catch(() => alert('Bu dosya bir yedek dosyası değil.')); };
  window.addEventListener('beforeunload', e => { if (me && me.role === 'admin') { clearTimeout(saveTimer); API.saveAdminState(viewingAsUser ? adminStore : store); } if (reqDirty()) { e.preventDefault(); e.returnValue = ''; } });
  boot();
}
