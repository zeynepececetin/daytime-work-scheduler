# Kaynak dosyalar (geliştirme için)

`CalismaProgrami.html` bu dosyalardan üretilir. Programı değiştirmek için:

1. `core.js` (atama algoritması, kurallar, doğrulama) ve/veya `template.html` (arayüz) düzenlenir.
2. `python3 -I build.py` → `../CalismaProgrami.html` yeniden yazılır (sabit veriler ve Kasım 2026 demo verisi gömülür).
3. `node test.js ../CalismaProgrami.html` → Kasım 2026 verisiyle kural/puan testi (ihlal 0 olmalı).

Veri dosyası biçimi (`gicp-enc-1`: PBKDF2-SHA256 + AES-256-GCM) korunmalı; aksi halde mevcut şifreli veri dosyaları açılamaz.
