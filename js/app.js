const minPackPrice = () => Math.min(...PACKS.map((p) => p.price));

function readBinder() {
  try {
    const raw = localStorage.getItem(BINDER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch {
    /* ignore */
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.binder && typeof parsed.binder === "object") return parsed.binder;
    }
  } catch {
    /* ignore */
  }
  return {};
}

function loadState() {
  let saved = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) saved = JSON.parse(raw);
  } catch {
    /* ignore */
  }
  const next = saved || { rips: 0, packIndex: 3 };
  next.binder = readBinder();
  next.packs = next.packs && typeof next.packs === "object" ? next.packs : {};
  next.unlockAll = !!next.unlockAll;
  next.bank = STARTING_BANK;
  next.over = null;
  return next;
}

function saveBinder() {
  const slim = {};
  for (const [key, card] of Object.entries(state.binder || {})) {
    const copy = { ...card };
    if (typeof copy.art === "string" && copy.art.startsWith("data:")) delete copy.art;
    slim[key] = copy;
  }
  localStorage.setItem(BINDER_KEY, JSON.stringify(slim));
}

function save() {
  saveBinder();
  const slim = { ...state, binder: {} };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
}

const state = loadState();

function repairPackValues() {
  const next = {};
  let changed = false;
  for (const card of Object.values(state.binder)) {
    const pack = PACKS.find((item) => item.name === card.packName);
    let updated = card;
    if (pack && (card.value < pack.min || card.value > pack.max)) {
      updated = { ...card, value: valueForPack(pack, card) };
      changed = true;
    }
    const key = binderKey(updated);
    if (!next[key]) next[key] = { ...updated, qty: 0 };
    next[key].qty += card.qty || 0;
  }
  if (changed) state.binder = next;
}

repairPackValues();
save();
let packIndex = Math.min(state.packIndex ?? 3, PACKS.length - 1);
let drag = null;

function money(n) {
  const value = Math.round(n * 100) / 100;
  if (Number.isInteger(value)) return `$${value.toLocaleString()}`;
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function rarityById(id) {
  return RARITIES.find((r) => r.id === id);
}

function rarityRank(id) {
  return RARITIES.findIndex((r) => r.id === id);
}

function rollRarity(odds) {
  const roll = Math.random() * 100;
  let cursor = 0;
  for (const rarity of RARITIES) {
    cursor += odds[rarity.id] || 0;
    if (roll <= cursor) return rarity.id;
  }
  return "common";
}

function hydrateCard(card) {
  if (!card.art || String(card.art).startsWith("data:")) {
    const found = CATALOG.find((item) => item.id === card.id);
    if (found) {
      card.art = found.art;
      card.number = card.number || found.number;
      card.flavor = card.flavor || found.flavor;
      card.motif = card.motif ?? found.motif;
    }
  }
  return card;
}

function limitedLeft() {
  const raw = localStorage.getItem(LIMITED_KEY);
  if (raw == null || raw === "") return LIMITED_TOTAL;
  return Math.max(0, Number(raw) || 0);
}

function setLimitedLeft(n) {
  localStorage.setItem(LIMITED_KEY, String(Math.max(0, n)));
}

function readRewards() {
  try {
    const raw = JSON.parse(localStorage.getItem(REWARD_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function writeRewards(list) {
  localStorage.setItem(REWARD_KEY, JSON.stringify(list.slice(0, 40)));
}

function recordHolyReward(card) {
  const list = readRewards();
  list.unshift({
    id: card.uid,
    title: "Holy Grail",
    detail: "$5 reward",
    status: "PENDING",
    date: new Date().toISOString(),
    cardName: card.name,
  });
  writeRewards(list);
}

function setRewardStatus(id, status) {
  const allowed = ["PENDING", "APPROVED", "DENIED"];
  if (!allowed.includes(status)) return;
  writeRewards(readRewards().map((row) => (row.id === id ? { ...row, status } : row)));
}

function pullCard(pack) {
  const rarity = rollRarity(pack.odds);
  let pool = CATALOG.filter((card) => card.packs?.includes(pack.id) && card.rarity === rarity);
  if (!pool.length) pool = CATALOG.filter((card) => card.packs?.includes(pack.id));
  if (!pool.length) pool = CATALOG.filter((card) => !card.exclusive);
  const template = pool[Math.floor(Math.random() * pool.length)];
  return {
    ...template,
    value: valueForPack(pack, template),
    packName: pack.name,
    uid: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  };
}

function binderKey(card) {
  const finish = card.finish && card.finish !== "base" ? `:${card.finish}` : "";
  return `${card.id}:${card.rarity}:${card.value}${finish}`;
}

function addToBinder(card) {
  const key = binderKey(card);
  if (!state.binder[key]) state.binder[key] = { ...card, qty: 0 };
  state.binder[key].qty += 1;
}

function binderList() {
  return Object.values(state.binder).map(hydrateCard).sort((a, b) => b.value - a.value);
}

function collectionValue() {
  return binderList().reduce((sum, card) => sum + card.value * card.qty, 0);
}

function liquid() {
  return state.bank + collectionValue();
}

function toast(message) {
  const el = document.getElementById("toast");
  el.hidden = false;
  el.textContent = message;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    el.hidden = true;
  }, 1600);
}

function secretUnlocked(pack) {
  if (!pack.secret) return true;
  if (state.unlockAll) return true;
  if ((state.packs?.[pack.id] || 0) > 0) return true;
  try {
    const meta = JSON.parse(localStorage.getItem(META_KEY) || "{}");
    return (meta.secrets || []).includes(pack.id);
  } catch {
    return false;
  }
}

function deck() {
  return PACKS.filter((pack) => secretUnlocked(pack));
}

let simMode = false;

function packOwned(pack) {
  return state.packs?.[pack.id] || 0;
}

function packLocked(pack) {
  if (pack.limited && limitedLeft() <= 0) return true;
  if (state.unlockAll || packOwned(pack) > 0) return false;
  return state.bank < pack.price;
}

function waxHTML(pack, locked) {
  const left = pack.limited ? limitedLeft() : null;
  let skin = "";
  try {
    const meta = JSON.parse(localStorage.getItem(META_KEY) || "{}");
    if (meta.skin && !pack.limited) skin = `skin-${meta.skin}`;
  } catch {
    /* ignore */
  }
  return `
    <div class="wax ${pack.skin} ${skin} ${pack.limited ? "limited-wax" : ""} ${pack.secret ? `secret-wax secret-${pack.id}` : ""}">
      <div class="wax-crest">${pack.limited ? "100K" : pack.secret ? "?" : pack.price < 10 ? pack.price : pack.tag.slice(0, 1)}</div>
      <div class="wax-tag">${pack.tag}</div>
      ${pack.limited ? `<div class="limited-ribbon">${left > 0 ? `${left} / ${LIMITED_TOTAL}` : "SOLD OUT"}</div>` : ""}
      ${locked && !pack.limited ? `<div class="wax-lock">LOCKED</div>` : ""}
      ${pack.limited && left <= 0 ? `<div class="wax-lock">SOLD OUT</div>` : ""}
    </div>
  `;
}

function tcgCard(card, { flipped = true, mini = false } = {}) {
  const rarity = rarityById(card.rarity);
  const type = TYPES[card.type];
  const rank = rarityRank(card.rarity);
  return `
    <div class="tcg rarity-${card.rarity} motif-${card.motif || 0} ${card.finish ? `finish-${card.finish}` : ""} ${rank >= 2 ? "holo" : ""} ${rank >= 4 ? "fullholo" : ""} ${rank >= 6 ? "prism" : ""} ${mini ? "mini" : ""} ${flipped ? "flipped instant" : ""}">
      <div class="tcg-back"><span>V</span><small>VAULT.</small></div>
      <div class="tcg-face">
        <div class="foil"></div>
        <div class="tcg-head">
          <span class="tcg-name">${card.name}</span>
          <span class="tcg-hp">HP ${card.hp}</span>
        </div>
        <div class="badge ${card.rarity === "holy" ? "holy-badge" : ""}">${card.rarity === "holy" ? "Holy Grail" : rarity.label}</div>
        <div class="tcg-art"><img src="${card.art}" alt="" /></div>
        <span class="type-chip" style="--type:${type.color}">${type.label}</span>
        <div class="attacks">
          <div class="atk"><span>${card.attack.name}</span><b>${card.attack.dmg}</b></div>
          <div class="atk"><span>${card.special.name}</span><b>${card.special.dmg}</b></div>
        </div>
        ${mini ? "" : `<p class="flavor">“${card.flavor}”</p>`}
        <div class="tcg-foot">
          <span>#${card.number || "—"} · ${rarity.label}</span>
          <span>${money(card.value)}</span>
        </div>
      </div>
    </div>
  `;
}

function setIndex(next, animate = true) {
  const packs = deck();
  packIndex = Math.max(0, Math.min(packs.length - 1, next));
  state.packIndex = packIndex;
  const track = document.getElementById("track");
  track.classList.toggle("dragging", !animate);
  track.style.transform = `translateX(${-packIndex * 100}%)`;
  document.getElementById("prevBtn").disabled = packIndex === 0;
  document.getElementById("nextBtn").disabled = packIndex === packs.length - 1;
  document.querySelectorAll(".dots i").forEach((dot, i) => dot.classList.toggle("on", i === packIndex));
  document.getElementById("browse").classList.toggle("limited-view", !!packs[packIndex]?.limited);
  document.getElementById("browse").classList.toggle("secret-view", !!packs[packIndex]?.secret);
  renderInfo();
  save();
}

function renderTrack() {
  const packs = deck();
  document.getElementById("track").innerHTML = packs.map(
    (pack) => `<div class="slide">${waxHTML(pack, packLocked(pack))}</div>`
  ).join("");
  document.getElementById("dots").innerHTML = packs.map(() => "<i></i>").join("");
}

function renderInfo() {
  const pack = deck()[packIndex];
  if (!pack) return;
  const locked = packLocked(pack);
  const owned = packOwned(pack);
  const avg = expectedValue(pack);
  const left = pack.limited ? limitedLeft() : null;
  const soldOut = pack.limited && left <= 0;
  document.getElementById("packInfo").innerHTML = `
    <h2>${pack.name}</h2>
    <p class="pack-price">${money(pack.price)}</p>
    ${pack.limited ? `<p class="limited-kicker">LIMITED SUPPLY</p><p class="limited-copy">${soldOut ? "SOLD OUT" : `REMAINING: ${left} / ${LIMITED_TOTAL}`}</p><p class="limited-copy sub">Exclusive cards only · Holy Grail is the rarest pull in the game</p>` : ""}
    ${pack.secret ? `<p class="limited-kicker">SECRET PACK</p><p class="limited-copy sub">Above the $100,000 pack. Higher odds and a higher ceiling.</p>` : ""}
    <p class="range">${money(pack.min)} – ${money(pack.max)}</p>
    <p class="meta">Avg ${money(avg)} · 1 card · ${SET_SIZE} in the collection${owned ? ` · ${owned} owned` : ""}</p>
    <p class="meta">${pack.limited ? "Exclusive cards that do not appear in other packs." : pack.secret ? "Earned packs. Every pull stays inside this range, and Holy Grail is easier than in the $100,000 pack." : "Common through Holy Grail. Higher rarity, higher virtual value."}</p>
    <div class="actions">
      <button class="ghost" id="oddsBtn" type="button">View Odds</button>
      <button class="rip" id="ripBtn" type="button" ${locked && !simMode ? "disabled" : ""}>${soldOut && !simMode ? "SOLD OUT" : simMode ? "SIM RIP" : locked ? "NEED MORE BANK" : owned ? "RIP OWNED" : "RIP"}</button>
    </div>
  `;
  document.getElementById("oddsBtn").onclick = showOdds;
  document.getElementById("ripBtn").onclick = () => openCurrent();
  if (typeof decoratePackInfo === "function") decoratePackInfo();
}

function updateChrome() {
  document.getElementById("balance").textContent = money(state.bank);
  document.getElementById("goalText").textContent = `${money(state.bank)} / ${money(WIN_AMOUNT)}`;
  document.getElementById("goalBar").style.width = `${Math.min(100, (state.bank / WIN_AMOUNT) * 100)}%`;
}

function refreshLocks() {
  renderTrack();
  setIndex(packIndex, false);
}

function showOdds() {
  const pack = deck()[packIndex];
  const el = document.getElementById("odds-overlay");
  el.hidden = false;
  el.innerHTML = `
    <div class="sheet-card">
      <h2 style="margin:0 0 4px">${pack.name} odds</h2>
      <p class="meta">Virtual values only. ${money(pack.min)} – ${money(pack.max)}</p>
      ${RARITIES.map((rarity) => `
        <div class="odds-row" style="--r:${rarity.color}">
          <span><b>${rarity.label}</b> · ${money(rarityValue(pack, rarity.id))}</span>
          <span>${pack.odds[rarity.id] ? `${pack.odds[rarity.id]}%` : "0%"}</span>
        </div>`).join("")}
      <button class="ghost" id="closeOdds" style="width:100%;margin-top:14px">Close</button>
    </div>
  `;
  el.querySelector("#closeOdds").onclick = () => {
    el.hidden = true;
  };
  el.onclick = (e) => {
    if (e.target === el) el.hidden = true;
  };
}

function showBinder() {
  const el = document.getElementById("binder-overlay");
  const cards = binderList();
  el.hidden = false;
  el.innerHTML = `
    <div class="sheet-card">
      <h2 style="margin:0 0 10px">Binder</h2>
      <div class="stat-row">
        <div><b>${cards.reduce((n, c) => n + c.qty, 0)}</b><span>Cards kept</span></div>
        <div><b>${money(collectionValue())}</b><span>Binder value</span></div>
      </div>
      ${state.bank < minPackPrice() && cards.length ? `<button class="primary" id="sellAll" style="width:100%;margin-bottom:12px">Sell all</button>` : ""}
      ${cards.length ? `<div class="binder-grid">${cards.map((card) => `
        <div class="mini-wrap">
          <span class="qty-badge">x${card.qty}</span>
          ${tcgCard(card, { mini: true })}
          <button class="sell" data-sell="${binderKey(card)}">Sell ${money(card.value)}</button>
        </div>`).join("")}</div>` : `<p class="empty">No pulls kept yet.</p>`}
      <button class="ghost" id="closeBinder" style="width:100%;margin-top:14px">Close</button>
    </div>
  `;
  el.querySelector("#closeBinder").onclick = () => {
    el.hidden = true;
  };
  el.querySelector("#sellAll")?.addEventListener("click", () => {
    sellAll();
    showBinder();
  });
  el.querySelectorAll("[data-sell]").forEach((btn) => {
    btn.onclick = () => {
      sellFromBinder(btn.dataset.sell);
      showBinder();
    };
  });
  el.onclick = (e) => {
    if (e.target === el) el.hidden = true;
  };
}

function checkEnd() {
  if (state.over) {
    showEnd(state.over);
    return true;
  }
  if (state.bank >= WIN_AMOUNT) {
    state.over = "win";
    save();
    Sfx.win();
    showEnd("win");
    return true;
  }
  if (!state.unlockAll && !PACKS.some((pack) => packOwned(pack) > 0) && liquid() < minPackPrice()) {
    state.over = "lose";
    save();
    Sfx.lose();
    showEnd("lose");
    return true;
  }
  return false;
}

function showEnd(kind) {
  const modal = document.getElementById("modal");
  modal.hidden = false;
  modal.innerHTML =
    kind === "win"
      ? `<div class="modal-card"><h2>You hit a billion</h2><p>Bank ${money(state.bank)}.</p><div class="controls"><button class="primary" id="again">Play again</button></div></div>`
      : `<div class="modal-card"><h2>Busted</h2><p>Not enough left for a $1 pack, and you can’t add money.</p><div class="controls"><button class="primary" id="again">Start over at $100</button></div></div>`;
  document.getElementById("again").onclick = () => {
    state.bank = STARTING_BANK;
    state.over = null;
    state.rips = 0;
    save();
    location.reload();
  };
}

function openCurrent() {
  const pack = deck()[packIndex];
  if (!pack || state.over) return;
  if (!simMode && pack.limited && limitedLeft() <= 0) {
    toast("Sold out");
    return;
  }
  if (!simMode && packLocked(pack)) {
    toast("Not enough bank");
    return;
  }
  Sfx.unlock();
  if (simMode) Sfx.tap();
  else if (pack.limited) Sfx.limited();
  else Sfx.buy();
  document.getElementById("odds-overlay").hidden = true;
  document.getElementById("binder-overlay").hidden = true;
  document.getElementById("hub-overlay").hidden = true;
  const card = pullCard(pack);
  if (!simMode) {
    if (!state.unlockAll) {
      if (packOwned(pack) > 0) state.packs[pack.id] -= 1;
      else state.bank -= pack.price;
    }
    if (pack.limited) setLimitedLeft(limitedLeft() - 1);
    state.rips += 1;
    save();
    updateChrome();
    if (typeof onRealPull === "function") onRealPull(pack, card);
  }
  startOpening(pack, card);
}

let tearSession = null;

function startOpening(pack, card) {
  const overlay = document.getElementById("open-overlay");
  overlay.hidden = false;
  overlay.classList.remove("zoom-hit", "gone-dark", "jackpot-open");
  overlay.classList.toggle("limited-open", !!pack.limited);
  overlay.classList.toggle("secret-open", !!pack.secret);
  overlay.classList.toggle("sim-open", simMode);
  overlay.classList.add("entering");
  const stage = document.getElementById("open-stage");
  stage.innerHTML = `
    ${simMode ? `<p class="sim-banner">SIMULATION MODE · NO REAL REWARDS</p>` : ""}
    <div class="dust">${Array.from({ length: 14 }, () => "<i></i>").join("")}</div>
    <div class="sealed ${pack.limited ? "limited-seal" : ""} ${pack.secret ? "secret-seal" : ""}" id="sealed" role="button" aria-label="Tear the pack" style="--accent:${pack.accent};--tear:0">
      <div class="inner-light"></div>
      <canvas id="tearCanvas" aria-label="Tear the pack"></canvas>
      <div class="sealed-label">${pack.tag}</div>
    </div>
    <p class="rip-call">RIP OPEN</p>
    <p class="hint">Drag across the pack</p>
    <div class="tear-meter"><i id="tearFill"></i></div>
  `;
  const hit = document.getElementById("sealed");
  const canvas = document.getElementById("tearCanvas");
  const ctx = canvas.getContext("2d");
  const w = (canvas.width = 480);
  const h = (canvas.height = 700);
  const foil = new Image();
  foil.src = "assets/pack-foil.png";
  const paint = () => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#1a120c");
    g.addColorStop(1, pack.accent);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    if (foil.complete && foil.naturalWidth) {
      ctx.globalAlpha = 0.85;
      ctx.drawImage(foil, 0, 0, w, h);
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = "rgba(255,255,255,.35)";
    ctx.lineWidth = 8;
    ctx.strokeRect(36, 36, w - 72, h - 72);
  };
  foil.onload = () => {
    if (!tearSession?.torn) paint();
  };
  paint();

  tearSession = { done: false, torn: 0, need: 640, last: null, down: false, tick: 0 };
  const sealed = document.getElementById("sealed");

  const point = (e) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * w,
      y: ((e.clientY - rect.top) / rect.height) * h,
    };
  };

  const scratch = (x, y) => {
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  };

  const scrap = (clientX, clientY) => {
    const bit = document.createElement("span");
    bit.className = "scrap";
    bit.style.left = `${clientX}px`;
    bit.style.top = `${clientY}px`;
    bit.style.background = pack.accent;
    document.body.appendChild(bit);
    setTimeout(() => bit.remove(), 700);
  };

  const move = (e) => {
    if (!tearSession?.down || tearSession.done) return;
    const p = point(e);
    const last = tearSession.last || p;
    const dist = Math.hypot(p.x - last.x, p.y - last.y);
    const steps = Math.max(1, Math.ceil(dist / 10));
    for (let i = 0; i <= steps; i += 1) {
      scratch(last.x + ((p.x - last.x) * i) / steps, last.y + ((p.y - last.y) * i) / steps);
    }
    tearSession.torn += dist;
    tearSession.last = p;
    tearSession.tick += 1;
    if (tearSession.tick % 4 === 0) {
      Sfx.crinkle();
      scrap(e.clientX, e.clientY);
      Fx.spark("#fff6d0", e.clientX, e.clientY);
    }
    const pct = Math.min(1, tearSession.torn / tearSession.need);
    sealed.style.setProperty("--tear", pct);
    document.getElementById("tearFill").style.width = `${pct * 100}%`;
    sealed.classList.toggle("hot", pct > 0.25);
    if (pct >= 1) finishTear(pack, card);
  };

  hit.addEventListener("pointerdown", (e) => {
    if (tearSession.done) return;
    tearSession.down = true;
    hit.setPointerCapture(e.pointerId);
    tearSession.last = point(e);
    scratch(tearSession.last.x, tearSession.last.y);
    Sfx.unlock();
  });
  hit.addEventListener("pointermove", move);
  hit.addEventListener("pointerup", () => {
    if (tearSession) tearSession.down = false;
  });
  hit.addEventListener("pointercancel", () => {
    if (tearSession) tearSession.down = false;
  });
}

function finishTear(pack, card) {
  if (!tearSession || tearSession.done) return;
  tearSession.done = true;
  const sealed = document.getElementById("sealed");
  sealed.classList.add("split");
  const huge = card.rarity === "holy" || card.rarity === "grail" || card.value >= 10000;
  if (huge) {
    /* Huge pulls start quiet, then the reveal hits. */
  } else {
    Sfx.rip();
    Fx.spark(pack.accent);
    Fx.screenShake(14);
    flash("burst");
  }
  if (navigator.vibrate && !huge) navigator.vibrate([20, 40, 30]);
  setTimeout(() => beginReveal(card), 620);
}

function beginReveal(card) {
  const rank = rarityRank(card.rarity);
  const huge = card.rarity === "holy" || card.rarity === "grail" || card.value >= 10000;
  let rise = [900, 1000, 1200, 1400, 1700, 1900, 2200, 2600, 3400][rank] || 1200;
  if (huge) rise = Math.max(rise, 3200);
  const overlay = document.getElementById("open-overlay");
  overlay.classList.toggle("zoom-hit", rank >= 5 || huge);
  overlay.classList.toggle("jackpot-open", huge);
  document.getElementById("open-stage").innerHTML = `
    ${simMode ? `<p class="sim-banner">SIMULATION MODE · NO REAL REWARDS</p>` : ""}
    ${rank >= 8 ? `<div class="holy-beams"></div>` : ""}
    ${huge ? `<div class="jackpot-light"></div>` : ""}
    <div class="bloom"></div>
    <div class="card-stage">
      <div class="riser ${rank >= 8 || huge ? "slow-reveal" : ""}" id="riser" style="animation-duration:${rise}ms">${tcgCard(card, { flipped: false })}</div>
    </div>
  `;
  const wrap = document.querySelector("#riser .tcg");
  if (rank >= 8 || huge) wrap.classList.add("holy-slow");
  wrap.classList.remove("instant");
  const track = (e) => {
    const rect = wrap.getBoundingClientRect();
    wrap.style.setProperty("--mx", `${((e.clientX - rect.left) / rect.width) * 100}%`);
    wrap.style.setProperty("--my", `${((e.clientY - rect.top) / rect.height) * 100}%`);
  };
  document.getElementById("open-overlay").addEventListener("pointermove", track);

  setTimeout(() => {
    document.getElementById("open-overlay").classList.add("gone-dark");
  }, rise + 280);
  setTimeout(() => {
    document.getElementById("open-overlay").classList.remove("gone-dark");
    unveil(wrap, card, rank);
  }, rise + 720);
}

function flash(kind) {
  const el = document.getElementById("flash");
  el.className = "";
  void el.offsetWidth;
  el.className = kind;
}

function unveil(wrap, card, rank) {
  if (wrap.classList.contains("flipped")) return;
  wrap.classList.add("flipped");
  Sfx.flip();
  const color = rarityById(card.rarity).color;
  const colors = ["#f4f4f4", "#3dcf7a", "#3d8bff", "#b56bff", "#f5c542", "#ff3344", "#9fffea", "#ffe08a", "#fff"];
  const paint = colors[rank] || color;
  if (rank === 0) {
    Sfx.common();
    Fx.fireworks(paint, 2);
  }
  if (rank === 1) {
    Sfx.uncommon();
    Fx.fireworks(paint, 3);
    Fx.screenShake(4);
  }
  if (rank === 2) {
    Sfx.rare();
    Fx.fireworks(paint, 5);
    flash("burst");
    Fx.screenShake(8);
  }
  if (rank === 3) {
    Sfx.epic();
    Fx.fireworks(paint, 7);
    flash("burst");
    Fx.screenShake(12);
  }
  if (rank === 4) {
    Sfx.legendary();
    Fx.fireworks(paint, 10);
    flash("gold");
    Fx.screenShake(16);
  }
  if (rank === 5) {
    Sfx.ultra();
    Fx.fireworks(paint, 12);
    flash("mythic");
    Fx.screenShake(22);
  }
  if (rank === 6) {
    Sfx.secret();
    Fx.fireworks(paint, 14);
    flash("burst");
    Fx.screenShake(24);
  }
  if (rank === 7) {
    Sfx.grail();
    Fx.grailShow();
    flash("gold");
    Fx.screenShake(28);
  }
  if (rank >= 8) {
    Sfx.holy();
    Fx.holyShow();
    flash("mythic");
    Fx.screenShake(34);
    if (!simMode) recordHolyReward(card);
    if (navigator.vibrate) navigator.vibrate([40, 50, 40, 80, 80]);
  } else if (!simMode && (card.value >= 10000 || card.rarity === "grail")) {
    Sfx.jackpot();
  }
  const rarity = rarityById(card.rarity);
  const stage = document.getElementById("open-stage");
  const banner = document.createElement("p");
  banner.className = `rarity-banner rarity-${card.rarity}`;
  banner.textContent = rarity.label;
  const stamp = document.createElement("p");
  stamp.className = "value-stamp";
  stamp.textContent = money(card.value);
  if (card.rarity === "holy") {
    const cheer = document.createElement("div");
    cheer.className = "holy-celebrate";
    cheer.innerHTML = `<p>🎉 HOLY GRAIL PULLED! 🎉</p><b>Congratulations!</b><span>Reward: $5</span><small>DEMO REWARD · PENDING REWARD</small>`;
    stage.prepend(cheer);
  }
  const actions = document.createElement("div");
  actions.className = "controls";
  if (simMode) {
    actions.innerHTML = `<button class="primary" id="closeSim">Close simulation</button>`;
  } else {
    actions.innerHTML = `<button class="ghost" id="favOne">⭐</button><button class="ghost" id="sellOne">Sell ${money(card.value)}</button><button class="primary" id="keepOne">Keep</button>`;
  }
  stage.prepend(banner);
  stage.append(stamp, actions);
  if (simMode) {
    document.getElementById("closeSim").onclick = () => finishOpening();
  } else {
    document.getElementById("favOne").onclick = () => {
      if (typeof toggleFavorite === "function") toggleFavorite(card.id);
      document.getElementById("favOne").classList.toggle("on");
    };
    document.getElementById("keepOne").onclick = () => {
      addToBinder(card);
      save();
      finishOpening();
    };
    document.getElementById("sellOne").onclick = () => {
      state.bank += card.value;
      save();
      finishOpening();
    };
  }
  if (typeof afterUnveil === "function") afterUnveil(card, rank);
}

function finishOpening() {
  const overlay = document.getElementById("open-overlay");
  overlay.hidden = true;
  overlay.classList.remove("entering", "zoom-hit", "gone-dark", "limited-open", "secret-open", "jackpot-open", "sim-open");
  document.querySelectorAll(".scrap").forEach((el) => el.remove());
  tearSession = null;
  Sfx.tap();
  updateChrome();
  refreshLocks();
  if (!checkEnd()) toast(simMode ? "Simulation complete" : "Rip complete");
}

function sellAll() {
  for (const card of binderList()) {
    const key = binderKey(card);
    if (typeof cardLocked === "function" && cardLocked(key)) continue;
    state.bank += card.value * card.qty;
    delete state.binder[key];
  }
  save();
  updateChrome();
  refreshLocks();
  checkEnd();
}

function sellFromBinder(key) {
  const card = state.binder[key];
  if (!card) return;
  if (typeof cardLocked === "function" && cardLocked(key)) {
    toast("That card is in a pending trade");
    return;
  }
  state.bank += card.value;
  card.qty -= 1;
  if (card.qty <= 0) delete state.binder[key];
  save();
  updateChrome();
  refreshLocks();
  checkEnd();
}

function bindSwipe() {
  const viewport = document.getElementById("viewport");
  viewport.addEventListener("pointerdown", (e) => {
    drag = { x: e.clientX, start: packIndex, id: e.pointerId };
    viewport.setPointerCapture(e.pointerId);
  });
  viewport.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const pct = (dx / viewport.clientWidth) * 100;
    document.getElementById("track").classList.add("dragging");
    document.getElementById("track").style.transform = `translateX(${-packIndex * 100 + pct}%)`;
  });
  const end = (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    drag = null;
    if (dx < -50) setIndex(packIndex + 1);
    else if (dx > 50) setIndex(packIndex - 1);
    else setIndex(packIndex);
  };
  viewport.addEventListener("pointerup", end);
  viewport.addEventListener("pointercancel", end);
}

document.getElementById("prevBtn").onclick = () => {
  Sfx.tap();
  setIndex(packIndex - 1);
};
document.getElementById("nextBtn").onclick = () => {
  Sfx.tap();
  setIndex(packIndex + 1);
};
document.getElementById("settingsBtn").onclick = () => {
  Sfx.unlock();
  Sfx.tap();
  openSettings();
};
document.getElementById("binderBtn").onclick = () => {
  Sfx.tap();
  showBinder();
};
window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") setIndex(packIndex - 1);
  if (e.key === "ArrowRight") setIndex(packIndex + 1);
});

Fx.init();
updateChrome();
renderTrack();
bindSwipe();
setIndex(packIndex, false);
checkEnd();
