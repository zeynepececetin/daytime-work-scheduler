/* ================= VERİ KATMANI — DEMO (her şey bu tarayıcıda; sunucu yok) =================
   Gerçek sürümde aynı fonksiyonlar Supabase'e bağlanır. Davet listesi kontrolü orada
   veritabanında (tetikleyici + erişim kuralları) yapılır; burada aynı davranış taklit edilir. */
const API = (() => {
  const K = k => 'gicp-demo:' + k;
  const get = (k, d) => { try { const v = localStorage.getItem(K(k)); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const set = (k, v) => { try { localStorage.setItem(K(k), JSON.stringify(v)); } catch (e) { } };
  const fold = s => s.toLocaleLowerCase('tr-TR').replace(/[çğıöşü]/g, c => ({ 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u' }[c])).replace(/[^a-z ]/g, '');
  const demoEmail = n => { const t = fold(n).split(' ').filter(Boolean); return `${t[0]}.${t[t.length - 1]}@demo`; };
  const ADMIN = 'yonetici@demo';
  const norm = e => String(e || '').trim().toLowerCase();
  // davet listesi: { email, doctor, active }   hesaplar: { email, pw }
  function invites() {
    let v = get('invites', null);
    if (!v) { v = DEFAULT_FIXED.doctors.map(d => ({ email: demoEmail(d.name), doctor: d.name, active: true })); set('invites', v); }
    return v;
  }
  function accounts() {
    let a = get('accounts', null);
    if (!a) { a = [{ email: ADMIN, pw: 'demo123' }, { email: demoEmail(DEFAULT_FIXED.doctors[0].name), pw: 'demo123' }]; set('accounts', a); }
    return a;
  }
  function who(email) {
    if (email === ADMIN) return { id: ADMIN, email, name: 'Yönetici', doctor: get('adminDoctor', 'Defne Kaplan'), role: 'admin' };
    const inv = invites().find(x => x.email === email);
    if (!inv || !inv.active) return null; // davetli değil ya da erişimi kaldırılmış → hiçbir veri göremez
    return { id: email, email, name: inv.doctor, doctor: inv.doctor, role: 'user' };
  }
  return {
    mode: 'demo',
    demoHint: () => ({ admin: ADMIN, ready: accounts()[1].email, invited: invites().find(x => !accounts().some(a => a.email === x.email)).email }),
    async signIn(email, pw) {
      email = norm(email);
      const a = accounts().find(x => x.email === email && x.pw === pw);
      if (!a) throw new Error('E-posta ya da şifre hatalı.');
      const u = who(email);
      if (!u) throw new Error('Bu hesabın erişimi yok. Admin ile görüşün.');
      set('session', email); return u;
    },
    async signUp(email, pw) {
      email = norm(email);
      if (email !== ADMIN && !invites().some(x => x.email === email && x.active)) throw new Error('Bu e-posta adresi davetli değil. Admin ile görüşün.');
      if (accounts().some(x => x.email === email)) throw new Error('Bu e-posta ile zaten bir hesap var. "Giriş" yapın; şifrenizi unuttuysanız "Şifremi unuttum"u kullanın.');
      const a = accounts(); a.push({ email, pw }); set('accounts', a);
      return 'Hesabınız oluşturuldu. (Gerçek sürümde önce e-postanıza gelen doğrulama bağlantısına tıklamanız gerekir.) Şimdi giriş yapabilirsiniz.';
    },
    async session() { const e = get('session', null); return e ? who(e) : null; },
    async signOut() { localStorage.removeItem(K('session')); },
    async resetPassword() { return 'Demo sürümünde e-posta gönderilmez. Gerçek sürümde e-postanıza şifre yenileme bağlantısı gelir.'; },
    // admin çalışma verisi (taslaklar dahil) — yalnızca admin
    async loadAdminState() { return get('state', null); },
    async saveAdminState(st) { set('state', st); },
    // yayınlanmış aylar — erişimi olan tüm kullanıcılar okur
    async listPublished() {
      return Object.values(get('pub', {})).map(p => ({ ym: p.ym, publishedAt: p.publishedAt, updatedAt: p.updatedAt, version: p.version }))
        .sort((a, b) => b.ym.localeCompare(a.ym));
    },
    async getPublished(ym) { return get('pub', {})[ym] || null; },
    async publish(ym, payload) {
      const all = get('pub', {}), old = all[ym], now = new Date().toISOString();
      all[ym] = { ym, payload, publishedAt: old ? old.publishedAt : now, updatedAt: old ? now : null, version: (old ? old.version : 0) + 1 };
      set('pub', all); return all[ym];
    },
    async unpublish(ym) { const all = get('pub', {}); delete all[ym]; set('pub', all); },
    // davet listesi — admin
    async listUsers() {
      const acc = new Set(accounts().map(a => a.email));
      return invites().map(v => ({ ...v, hasAccount: acc.has(v.email) }));
    },
    async invite(doctor, email) {
      email = norm(email);
      const v = invites();
      if (email === ADMIN || v.some(x => x.email === email && x.doctor !== doctor)) throw new Error('Bu e-posta başka bir kayıtta kullanılıyor.');
      const cur = v.find(x => x.doctor === doctor);
      if (cur) { if (cur.email !== email && accounts().some(a => a.email === cur.email)) set('accounts', accounts().filter(a => a.email !== cur.email)); cur.email = email; cur.active = true; }
      else v.push({ email, doctor, active: true });
      set('invites', v);
    },
    async setActive(doctor, active) { const v = invites(); const x = v.find(i => i.doctor === doctor); if (x) { x.active = active; set('invites', v); } },
    async removeInvite(doctor) {
      const v = invites(), x = v.find(i => i.doctor === doctor); if (!x) return;
      set('accounts', accounts().filter(a => a.email !== x.email)); set('invites', v.filter(i => i !== x));
    },
    // admin hesabının bağlı olduğu hekim kaydı (admin aynı zamanda programdaki bir hekim)
    async setAdminDoctor(name) { set('adminDoctor', name || null); },
    // ---- talep toplama (Aşama 2)
    async getRound() { return get('round', null); },
    async setRound(r) { set('round', r); },
    async listRequests(ym) { return Object.values(get('req', {})).filter(r => r.ym === ym); },
    async getMyRequest(ym) { const u = await this.session(); if (!u || !u.doctor) return null; return get('req', {})[ym + '|' + u.doctor] || null; },
    async submitMyRequest(ym, days, none, types) {
      const u = await this.session(); if (!u || !u.doctor) throw new Error('Oturum bulunamadı.');
      const r = get('round', null), today = new Date().toISOString().slice(0, 10);
      if (!r || r.ym !== ym || !r.open || today > r.deadline) throw new Error('Talep toplama kapalı ya da son tarih geçti.');
      const all = get('req', {}), k = ym + '|' + u.doctor, cur = all[k];
      if (cur && cur.status === 'submitted') throw new Error('Talebiniz zaten gönderilmiş; değişiklik için admin ile görüşün.');
      all[k] = { ym, doctor: u.doctor, days: days.slice().sort(), types: types || {}, none: !!none, status: 'submitted', submittedAt: new Date().toISOString(), by: 'user', decisions: {} };
      set('req', all); return all[k];
    },
    async adminSetRequest(ym, doctor, days, none, types) {
      const all = get('req', {}), k = ym + '|' + doctor, old = all[k], dec = {};
      for (const d of days) if (old && old.decisions && old.decisions[d]) dec[d] = old.decisions[d];
      all[k] = { ym, doctor, days: days.slice().sort(), types: types || {}, none: !!none, status: 'submitted', submittedAt: new Date().toISOString(), by: 'admin', decisions: dec };
      set('req', all);
    },
    async reopenRequest(ym, doctor) { const all = get('req', {}), r = all[ym + '|' + doctor]; if (r) { r.status = 'reopened'; set('req', all); } },
    async decide(ym, doctor, changes) { // changes: { 'YYYY-MM-DD': 'approved' | 'rejected' | null }
      const all = get('req', {}), r = all[ym + '|' + doctor]; if (!r) return;
      r.decisions = r.decisions || {};
      for (const [d, v] of Object.entries(changes)) { if (v) r.decisions[d] = v; else delete r.decisions[d]; }
      set('req', all);
    },
    async resetDemo() { ['invites', 'accounts', 'state', 'pub', 'session', 'users', 'round', 'req', 'adminDoctor'].forEach(k => localStorage.removeItem(K(k))); }
  };
})();
