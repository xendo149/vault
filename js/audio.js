const Sfx = (() => {
  let ctx;
  let masterGain;
  let musicGain;
  let sfxGain;
  let musicStarted = false;
  let muted = false;
  let master = 1;
  let music = 0.7;
  let sfx = 1;

  function ac() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    if (!masterGain) {
      masterGain = ctx.createGain();
      musicGain = ctx.createGain();
      sfxGain = ctx.createGain();
      musicGain.connect(masterGain);
      sfxGain.connect(masterGain);
      masterGain.connect(ctx.destination);
      applyGains();
    }
    return ctx;
  }

  function applyGains() {
    if (!masterGain) return;
    masterGain.gain.value = muted ? 0 : master;
    musicGain.gain.value = music;
    sfxGain.gain.value = sfx;
  }

  function startMusic() {
    if (musicStarted) return;
    const a = ac();
    musicStarted = true;

    const pad = a.createBiquadFilter();
    pad.type = "lowpass";
    pad.frequency.value = 380;
    pad.connect(musicGain);
    [110, 164.81, 220].forEach((freq) => {
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.value = 0.01;
      o.connect(g);
      g.connect(pad);
      o.start();
    });

    const hatNoise = a.createBuffer(1, a.sampleRate * 0.2, a.sampleRate);
    const hatData = hatNoise.getChannelData(0);
    for (let i = 0; i < hatData.length; i += 1) hatData[i] = Math.random() * 2 - 1;

    function hitGain(time, peak, decay) {
      const g = a.createGain();
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(peak, time + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, time + decay);
      g.connect(musicGain);
      return g;
    }

    function kick(time) {
      const o = a.createOscillator();
      const g = hitGain(time, 0.34, 0.18);
      o.type = "sine";
      o.frequency.setValueAtTime(148, time);
      o.frequency.exponentialRampToValueAtTime(46, time + 0.12);
      o.connect(g);
      o.start(time);
      o.stop(time + 0.2);
    }

    function bass(time) {
      const o = a.createOscillator();
      const g = hitGain(time, 0.1, 0.22);
      o.type = "sine";
      o.frequency.value = 55;
      o.connect(g);
      o.start(time);
      o.stop(time + 0.24);
    }

    function snare(time) {
      const o = a.createOscillator();
      const g = hitGain(time, 0.08, 0.12);
      o.type = "triangle";
      o.frequency.value = 196;
      o.connect(g);
      o.start(time);
      o.stop(time + 0.14);
      const src = a.createBufferSource();
      const n = hitGain(time, 0.07, 0.14);
      const f = a.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = 1800;
      src.buffer = hatNoise;
      src.connect(f);
      f.connect(n);
      src.start(time);
      src.stop(time + 0.16);
    }

    function hat(time, open) {
      const src = a.createBufferSource();
      const g = hitGain(time, open ? 0.05 : 0.03, open ? 0.12 : 0.04);
      const f = a.createBiquadFilter();
      f.type = "highpass";
      f.frequency.value = 7000;
      src.buffer = hatNoise;
      src.connect(f);
      f.connect(g);
      src.start(time);
      src.stop(time + (open ? 0.14 : 0.05));
    }

    const step = 60 / 94 / 2;
    let next = a.currentTime + 0.08;
    let index = 0;
    function tick() {
      const horizon = a.currentTime + 0.3;
      while (next < horizon) {
        const beat = index % 16;
        if (beat % 4 === 0) {
          kick(next);
          bass(next);
        }
        if (beat % 4 === 2) snare(next);
        if (beat % 2 === 1) hat(next, beat % 8 === 7);
        next += step;
        index += 1;
      }
    }
    tick();
    setInterval(tick, 120);
  }

  function tone(freq, dur, type = "sine", gain = 0.08, at = 0) {
    const a = ac();
    startMusic();
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, a.currentTime + at);
    g.gain.setValueAtTime(0.0001, a.currentTime + at);
    g.gain.exponentialRampToValueAtTime(gain, a.currentTime + at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + at + dur);
    o.connect(g);
    g.connect(sfxGain);
    o.start(a.currentTime + at);
    o.stop(a.currentTime + at + dur + 0.02);
  }

  function noise(dur, gain = 0.12) {
    const a = ac();
    startMusic();
    const buffer = a.createBuffer(1, Math.max(1, a.sampleRate * dur), a.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = a.createBufferSource();
    const g = a.createGain();
    const f = a.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 1400;
    src.buffer = buffer;
    g.gain.value = gain;
    src.connect(f);
    f.connect(g);
    g.connect(sfxGain);
    src.start();
  }

  return {
    unlock() {
      ac();
      startMusic();
    },
    apply(next) {
      master = Number(next.master);
      music = Number(next.music);
      sfx = Number(next.sfx);
      muted = !!next.mute;
      ac();
      applyGains();
    },
    isMuted: () => muted,
    granted() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, "triangle", 0.07, i * 0.08));
    },
    tap() {
      tone(520, 0.08, "triangle", 0.05);
    },
    buy() {
      tone(220, 0.12, "square", 0.05);
      tone(330, 0.16, "sine", 0.05, 0.05);
    },
    shake() {
      noise(0.18, 0.08);
    },
    crinkle() {
      noise(0.08, 0.05);
    },
    rip() {
      noise(0.45, 0.16);
      tone(140, 0.3, "sawtooth", 0.04);
    },
    flip() {
      tone(480, 0.12, "triangle", 0.06);
      tone(720, 0.16, "sine", 0.04, 0.05);
    },
    common() {
      tone(392, 0.12, "sine", 0.05);
    },
    uncommon() {
      tone(440, 0.12, "sine", 0.06);
      tone(554, 0.16, "sine", 0.05, 0.08);
    },
    rare() {
      [523, 659, 784].forEach((f, i) => tone(f, 0.22, "triangle", 0.07, i * 0.08));
    },
    epic() {
      [349, 440, 554, 698].forEach((f, i) => tone(f, 0.24, "triangle", 0.06, i * 0.09));
    },
    ultra() {
      [392, 523, 659, 830].forEach((f, i) => tone(f, 0.28, "sawtooth", 0.045, i * 0.1));
    },
    grail() {
      noise(0.75, 0.14);
      [98, 147, 196, 294, 392, 587, 784, 1175].forEach((f, i) => tone(f, 0.6, "sawtooth", 0.045, i * 0.08));
    },
    secret() {
      noise(0.4, 0.1);
      [311, 466, 622, 932].forEach((f, i) => tone(f, 0.36, "triangle", 0.05, i * 0.1));
    },
    holy() {
      noise(1.1, 0.18);
      [196, 247, 294, 392, 494, 587, 784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.85, "triangle", 0.05, i * 0.11));
    },
    jackpot() {
      noise(0.9, 0.16);
      [130, 196, 262, 392, 523, 784, 1046].forEach((f, i) => tone(f, 0.7, "sawtooth", 0.04, i * 0.09));
    },
    limited() {
      [220, 277, 330, 440, 554].forEach((f, i) => tone(f, 0.45, "triangle", 0.05, i * 0.1));
    },
    legendary() {
      [261, 329, 392, 523, 659, 784].forEach((f, i) => tone(f, 0.4, "triangle", 0.07, i * 0.12));
    },
    mythic() {
      noise(0.6, 0.12);
      [130, 196, 261, 392, 523, 784, 1046].forEach((f, i) => tone(f, 0.55, "sawtooth", 0.05, i * 0.09));
    },
    win() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.5, "triangle", 0.08, i * 0.14));
    },
    lose() {
      tone(220, 0.4, "sawtooth", 0.06);
      tone(160, 0.5, "sine", 0.06, 0.15);
    },
  };
})();
