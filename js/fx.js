const Fx = (() => {
  let canvas;
  let ctx;
  let bits = [];
  let rockets = [];
  let shake = 0;
  let running = false;

  function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
  }

  function burst({ x, y, color, count = 40, speed = 6, life = 50, size = 3, gravity = 0.08 }) {
    const q = document.body.dataset.gfx || "high";
    if (q === "low") return;
    const scaled = q === "medium" ? Math.max(1, Math.round(count * 0.4)) : count;
    for (let i = 0; i < scaled; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const s = Math.random() * speed + 0.6;
      bits.push({
        x: x * devicePixelRatio,
        y: y * devicePixelRatio,
        vx: Math.cos(a) * s * devicePixelRatio,
        vy: Math.sin(a) * s * devicePixelRatio,
        life,
        max: life,
        color,
        size: (Math.random() * size + 1) * devicePixelRatio,
        gravity,
      });
    }
  }

  function launch(color, fromX) {
    const h = window.innerHeight;
    rockets.push({
      x: (fromX ?? Math.random() * window.innerWidth) * devicePixelRatio,
      y: h * devicePixelRatio,
      vy: -(7 + Math.random() * 6) * devicePixelRatio,
      color,
      boom: (h * (0.18 + Math.random() * 0.38)) * devicePixelRatio,
    });
  }

  function explode(rocket) {
    const x = rocket.x / devicePixelRatio;
    const y = rocket.y / devicePixelRatio;
    burst({ x, y, color: rocket.color, count: 48, speed: 5.5, life: 62, size: 3.2, gravity: 0.045 });
    burst({ x, y, color: "#fff", count: 16, speed: 3, life: 40, size: 1.6, gravity: 0.03 });
  }

  function screenShake(amount = 10) {
    if ((document.body.dataset.gfx || "high") === "low") return;
    shake = (document.body.dataset.gfx === "medium" ? amount * 0.45 : amount);
  }

  function tick() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    rockets = rockets.filter((r) => {
      r.y += r.vy;
      r.vy *= 0.985;
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = r.color;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 2.4 * devicePixelRatio, 0, Math.PI * 2);
      ctx.fill();
      if (r.y <= r.boom) {
        explode(r);
        return false;
      }
      return r.y > 0;
    });
    bits = bits.filter((p) => p.life > 0);
    for (const p of bits) {
      p.life -= 1;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity * devicePixelRatio;
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const stage = document.getElementById("open-stage");
    if (stage) {
      if (shake > 0.4) {
        stage.style.transform = `translate(${(Math.random() - 0.5) * shake}px, ${(Math.random() - 0.5) * shake}px)`;
        shake *= 0.88;
      } else if (shake) {
        stage.style.transform = "";
        shake = 0;
      }
    }
    if (bits.length || rockets.length || shake > 0) requestAnimationFrame(tick);
    else running = false;
  }

  function start() {
    if (!running) {
      running = true;
      requestAnimationFrame(tick);
    }
  }

  function fireworks(color, count) {
    for (let i = 0; i < count; i += 1) {
      setTimeout(() => launch(color), i * 140);
    }
    start();
  }

  return {
    init() {
      canvas = document.getElementById("fx");
      ctx = canvas.getContext("2d");
      resize();
      window.addEventListener("resize", resize);
    },
    burst,
    screenShake,
    spark(color, x, y) {
      burst({
        x: x ?? window.innerWidth / 2,
        y: y ?? window.innerHeight * 0.42,
        color,
        count: 18,
        speed: 4,
        life: 28,
      });
      start();
    },
    boom(color) {
      fireworks(color, 4);
      screenShake(12);
    },
    fireworks,
    grailShow() {
      const colors = ["#ff4d6d", "#f5c542", "#3dcf7a", "#3d8bff", "#b56bff", "#fff"];
      colors.forEach((color, i) => setTimeout(() => fireworks(color, 3), i * 180));
      screenShake(26);
    },
    holyShow() {
      const colors = ["#ff4d6d", "#ff9a3d", "#ffe08a", "#3dcf7a", "#3d8bff", "#b56bff", "#fff"];
      colors.forEach((color, i) => setTimeout(() => fireworks(color, 5), i * 160));
      screenShake(34);
    },
  };
})();
