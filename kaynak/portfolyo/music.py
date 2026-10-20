"""Portfolyo videosu için özgün fon müziği (telifsiz, bu betikle üretilir).
Canlı ama sakin: 108 BPM, Do majör, I–V–vi–IV; arpej + pad + bas + hafif ritim. 40 sn, 48 kHz stereo.
Kullanım: python music.py <çıktı.wav>"""
import sys
import numpy as np, soundfile as sf

SR, BPM = 48000, 96
DUR = float(sys.argv[2]) if len(sys.argv) > 2 else 76.0
BEAT = 60 / BPM; BAR = 4 * BEAT
N = int(SR * DUR)
rng = np.random.default_rng(7)
L = np.zeros(N); R = np.zeros(N); verb_send = np.zeros((2, N))

def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
def add(buf, start, sig):
    i = int(start * SR)
    if i >= N: return
    j = min(N, i + len(sig)); buf[i:j] += sig[: j - i]
def env_adsr(n, a, d, s, r, sus_len):
    t = np.arange(n) / SR; e = np.zeros(n)
    a_n, d_n = int(a * SR), int(d * SR); s_end = int(sus_len * SR)
    e[:a_n] = np.linspace(0, 1, a_n, endpoint=False)
    e[a_n:a_n + d_n] = np.linspace(1, s, d_n, endpoint=False)
    e[a_n + d_n:s_end] = s
    rel = np.arange(n - s_end) / SR; e[s_end:] = s * np.exp(-rel / r)
    return e
def onepole_lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); acc = 0.0
    for i in range(len(x)): acc = (1 - a) * x[i] + a * acc; y[i] = acc
    return y

# akorlar (MIDI): C, G, Am, F
CH = [[48, 55, 60, 64], [43, 50, 59, 62], [45, 52, 57, 60], [41, 48, 57, 60]]
ARP = [[60, 64, 67, 72], [59, 62, 67, 71], [57, 60, 64, 69], [57, 60, 65, 69]]
BASS = [36, 43, 45, 41]
nbars = int(np.ceil(DUR / BAR))
DRUM_IN, DRUM_OUT = 2, nbars - 2          # ritim 3. ölçüde girer, son 2 ölçüde çekilir

for b in range(nbars):
    t0 = b * BAR; c = b % 4
    # ---- pad: yumuşak akor, hafif detune (geniş stereo)
    n = int((BAR + 1.2) * SR); t = np.arange(n) / SR
    e = env_adsr(n, 0.35, 0.6, 0.75, 0.8, BAR)
    for m in CH[c][1:]:
        f = hz(m)
        for side, det in ((0, -0.004), (1, 0.004)):
            ff = f * (1 + det)
            s = (np.sin(2 * np.pi * ff * t) + 0.32 * np.sin(4 * np.pi * ff * t) + 0.12 * np.sin(6 * np.pi * ff * t)) * e * 0.035
            add(L if side == 0 else R, t0, s); add(verb_send[side], t0, s * 0.6)
    # ---- bas: kök ses, 8'lik sekme
    for k in range(8):
        if b >= nbars - 1 and k > 0: break
        m = BASS[c] + (12 if k % 4 == 3 else 0)
        n = int(BEAT / 2 * SR * 0.95); t = np.arange(n) / SR; f = hz(m)
        s = (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)) * np.exp(-t / 0.22) * np.minimum(1, t / 0.006) * 0.16
        if b < DRUM_IN: s *= 0.6
        add(L, t0 + k * BEAT / 2, s); add(R, t0 + k * BEAT / 2, s)
    # ---- arpej: 8'lik pluck, sağ-sol dönüşümlü, gecikmeli yankı
    pat = [0, 1, 2, 3, 2, 1, 2, 3]
    for k, p in enumerate(pat):
        m = ARP[c][p] + 12; f = hz(m)
        n = int(0.9 * SR); t = np.arange(n) / SR
        s = (np.sin(2 * np.pi * f * t) + 0.45 * np.sin(4 * np.pi * f * t) * np.exp(-t / 0.08) + 0.18 * np.sin(6 * np.pi * f * t) * np.exp(-t / 0.05))
        s *= np.exp(-t / 0.28) * np.minimum(1, t / 0.004) * (0.075 if k % 2 == 0 else 0.06)
        if b == nbars - 1 and k > 3: break
        pan = 0.35 if k % 2 == 0 else 0.65
        st = t0 + k * BEAT / 2
        add(L, st, s * (1 - pan) * 1.4); add(R, st, s * pan * 1.4)
        add(R, st + 3 * BEAT / 4, s * 0.35 * (1 - pan)); add(L, st + 3 * BEAT / 4, s * 0.35 * pan)   # ping-pong yankı
        add(verb_send[0], st, s * 0.5); add(verb_send[1], st, s * 0.5)
    # ---- ritim
    if DRUM_IN <= b < DRUM_OUT:
        for k in range(4):
            st = t0 + k * BEAT
            if k in (0, 2):  # kick
                n = int(0.32 * SR); t = np.arange(n) / SR
                ph = 2 * np.pi * np.cumsum(48 + 70 * np.exp(-t / 0.035)) / SR
                s = np.sin(ph) * np.exp(-t / 0.16) * 0.42; add(L, st, s); add(R, st, s)
            if k in (1, 3):  # yumuşak clap/snap
                n = int(0.22 * SR); t = np.arange(n) / SR; nz = rng.standard_normal(n)
                nz = nz - onepole_lp(nz, 900); nz = onepole_lp(nz, 6000)
                s = nz * np.exp(-t / 0.07) * 0.11; add(L, st, s * 0.9); add(R, st, s * 1.1); add(verb_send[0], st, s * 0.5); add(verb_send[1], st, s * 0.5)
        for k in range(8):  # hi-hat 8'lik, vuruş arası vurgulu
            n = int(0.08 * SR); t = np.arange(n) / SR; nz = rng.standard_normal(n)
            nz = nz - onepole_lp(nz, 7000)
            s = nz * np.exp(-t / (0.035 if k % 2 else 0.02)) * (0.05 if k % 2 else 0.028)
            add(L, t0 + k * BEAT / 2, s * 0.8); add(R, t0 + k * BEAT / 2, s * 1.2)
        if b % 4 == 3:  # dört ölçüde bir küçük geçiş: son vuruşta hafif tom
            n = int(0.3 * SR); t = np.arange(n) / SR
            s = np.sin(2 * np.pi * np.cumsum(140 + 60 * np.exp(-t / 0.05)) / SR) * np.exp(-t / 0.12) * 0.12
            add(L, t0 + 3.5 * BEAT, s); add(R, t0 + 3.5 * BEAT, s)

# ---- reverb: sentetik oda yanıtı (FFT konvolüsyon)
ir_n = int(1.9 * SR); t = np.arange(ir_n) / SR
for ch, out in ((0, L), (1, R)):
    ir = rng.standard_normal(ir_n) * np.exp(-t / 0.45); ir = onepole_lp(ir, 5500); ir[: int(0.012 * SR)] = 0; ir /= np.sqrt(np.sum(ir ** 2))
    m = 1 << int(np.ceil(np.log2(N + ir_n)))
    wet = np.fft.irfft(np.fft.rfft(verb_send[ch], m) * np.fft.rfft(ir, m), m)[:N]
    out += wet * 0.55

mix = np.stack([L, R], 1)
mix[: int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))[:, None]
fade = int(2.2 * SR); mix[-fade:] *= np.linspace(1, 0, fade)[:, None] ** 1.5
mix = np.tanh(mix * 1.4) / np.tanh(1.4)                         # yumuşak sıkıştırma
mix *= 0.89 / np.max(np.abs(mix))
sf.write(sys.argv[1], mix.astype(np.float32), SR)
print('müzik', DUR, 'sn, tepe', round(float(np.max(np.abs(mix))), 2))
