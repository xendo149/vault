const SKINS = [
  { id: "gold", name: "Gold" },
  { id: "galaxy", name: "Galaxy" },
  { id: "fire", name: "Fire" },
  { id: "ice", name: "Ice" },
  { id: "dark", name: "Dark" },
  { id: "rainbow", name: "Rainbow" },
  { id: "holographic", name: "Holographic" },
  { id: "mystery", name: "Mystery" },
  { id: "cosmic", name: "Cosmic" },
  { id: "diamond", name: "Diamond" },
];

const FINISHES = [
  { id: "foil", label: "Foil", need: 5 },
  { id: "holo", label: "Holographic", need: 8 },
  { id: "shiny", label: "Shiny", need: 10 },
  { id: "prism", label: "Prismatic", need: 12 },
  { id: "gold", label: "Gold", need: 15 },
];

const MILESTONES = [
  { at: 10, reward: "skin:fire", label: "Fire pack skin" },
  { at: 25, reward: "skin:ice", label: "Ice pack skin" },
  { at: 50, reward: "title:Pack Regular", label: "Title: Pack Regular" },
  { at: 100, reward: "skin:galaxy", label: "Galaxy pack skin" },
  { at: 500, reward: "skin:holographic", label: "Holographic pack skin" },
  { at: 1000, reward: "skin:diamond", label: "Diamond pack skin" },
];

const ACHIEVEMENTS = [
  { id: "first", name: "FIRST PULL", text: "Open your first pack.", reward: "title:First Rip", goal: 1, progress: () => meta.opened },
  { id: "legend", name: "FIRST LEGENDARY", text: "Pull your first Legendary.", reward: "skin:fire", goal: 1, progress: () => (seenRank(4) ? 1 : 0) },
  { id: "big", name: "BIG PULL", text: "Pull a card worth $1,000 or more.", reward: "title:High Roller", goal: 1, progress: () => (bestPull() >= 1000 ? 1 : 0) },
  { id: "massive", name: "MASSIVE PULL", text: "Pull a card worth $10,000 or more.", reward: "skin:galaxy", goal: 1, progress: () => (bestPull() >= 10000 ? 1 : 0) },
  { id: "collector", name: "COLLECTOR", text: "Collect 100 unique cards.", reward: "skin:ice", goal: 100, progress: () => uniqueCount() },
  { id: "master", name: "MASTER COLLECTOR", text: "Collect 500 unique cards.", reward: "skin:diamond", goal: 500, progress: () => uniqueCount() },
  { id: "addict", name: "PACK ADDICT", text: "Open 100 packs.", reward: "skin:dark", goal: 100, progress: () => meta.opened },
  { id: "machine", name: "PACK MACHINE", text: "Open 1,000 packs.", reward: "skin:rainbow", goal: 1000, progress: () => meta.opened },
  { id: "lucky", name: "LUCKY", text: "Pull an extremely rare card.", reward: "skin:cosmic", goal: 1, progress: () => (seenRank(6) ? 1 : 0) },
  { id: "holy", name: "HOLY GRAIL", text: "Pull the Holy Grail.", reward: "title:Holy Witness", goal: 1, progress: () => (seenRank(8) ? 1 : 0) },
];

function blankMeta() {
  return {
    name: "Gavin",
    favorites: [],
    history: [],
    seen: {},
    opened: 0,
    dayStreak: 0,
    lastOpenDay: "",
    bestDayStreak: 0,
    dailyClaim: 0,
    dailyStreak: 0,
    secrets: [],
    achievements: [],
    skins: [],
    skin: "",
    titles: [],
    title: "",
    milestones: [],
    profiles: [],
    trade: null,
  };
}

let meta = loadMeta();
let bookFilter = "all";
let bookRarity = "all";
let bookSort = "rarest";
let bookShown = 48;
let historyQuery = "";
let historySort = "newest";
let boardKey = "value";
let tradeSeat = "you";
let tradeTimer = null;
const pendingSecrets = [];

function loadMeta() {
  try {
    const raw = JSON.parse(localStorage.getItem(META_KEY) || "{}");
    return { ...blankMeta(), ...raw, favorites: raw.favorites || [], history: raw.history || [], profiles: raw.profiles || [], secrets: raw.secrets || [], achievements: raw.achievements || [], skins: raw.skins || [], titles: raw.titles || [], milestones: raw.milestones || [], seen: raw.seen || {} };
  } catch {
    return blankMeta();
  }
}

function saveMeta() {
  localStorage.setItem(META_KEY, JSON.stringify(meta));
  document.body.dataset.packSkin = meta.skin || "";
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function resetFeatureProgress() {
  const name = meta.name;
  meta = blankMeta();
  meta.name = name || "Gavin";
  simMode = false;
  saveMeta();
}

function uniqueCount() {
  return new Set(Object.values(state.binder).map((card) => card.id)).size;
}

function bestPull() {
  return meta.history.reduce((max, row) => Math.max(max, row.value || 0), 0);
}

function seenRank(min) {
  if (meta.history.some((row) => rarityRank(row.rarity) >= min)) return true;
  return Object.values(state.binder).some((card) => rarityRank(card.rarity) >= min);
}

function collectionStats() {
  const cards = binderList();
  const qty = cards.reduce((sum, card) => sum + card.qty, 0);
  const unique = new Set(cards.map((card) => card.id)).size;
  return { qty, unique, value: collectionValue(), pct: Math.round((unique / Math.max(1, CATALOG.length)) * 1000) / 10 };
}

function grantReward(reward) {
  if (!reward) return;
  const [kind, name] = reward.split(":");
  if (kind === "skin" && !meta.skins.includes(name)) meta.skins.push(name);
  if (kind === "title" && !meta.titles.includes(name)) {
    meta.titles.push(name);
    if (!meta.title) meta.title = name;
  }
}

function checkAchievements() {
  const fresh = [];
  for (const item of ACHIEVEMENTS) {
    if (meta.achievements.includes(item.id)) continue;
    if (item.progress() < item.goal) continue;
    meta.achievements.push(item.id);
    grantReward(item.reward);
    fresh.push(item);
  }
  if (fresh.length) {
    saveMeta();
    toast(`Achievement: ${fresh[0].name}`);
  }
}

function grantMilestones() {
  for (const mark of MILESTONES) {
    if (meta.opened < mark.at || meta.milestones.includes(mark.at)) continue;
    meta.milestones.push(mark.at);
    grantReward(mark.reward);
    toast(`${mark.at} packs · ${mark.label}`);
  }
}

function checkSecrets() {
  const unique = uniqueCount();
  const rules = {
    shadow: unique >= 50,
    eclipse: meta.opened >= 100,
    seraph: seenRank(7),
  };
  for (const pack of PACKS) {
    if (!pack.secret || meta.secrets.includes(pack.id) || !rules[pack.id]) continue;
    meta.secrets.push(pack.id);
    pendingSecrets.push(pack);
  }
}

function flushSecrets() {
  if (!pendingSecrets.length || !document.getElementById("open-overlay").hidden) return;
  const pack = pendingSecrets.shift();
  const el = document.getElementById("hub-overlay");
  el.hidden = false;
  el.innerHTML = `
    <div class="sheet-card secret-reveal">
      <p>??? SECRET PACK ???</p>
      <h2>${esc(pack.name)}</h2>
      <p>${esc(pack.need)}</p>
      <button class="primary" id="closeSecret" type="button">Add it to the shelf</button>
    </div>`;
  el.querySelector("#closeSecret").onclick = () => {
    el.hidden = true;
    refreshLocks();
    flushSecrets();
  };
  Sfx.legendary();
  refreshLocks();
}

function onRealPull(pack, card) {
  const now = new Date();
  meta.history.unshift({
    id: card.id,
    name: card.name,
    rarity: card.rarity,
    value: card.value,
    packName: pack.name,
    number: card.number,
    date: now.toISOString(),
  });
  meta.history = meta.history.slice(0, 100);
  if (!meta.seen[card.id]) meta.seen[card.id] = now.toISOString();
  meta.opened += 1;
  const day = now.toISOString().slice(0, 10);
  if (meta.lastOpenDay !== day) {
    const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
    meta.dayStreak = meta.lastOpenDay === yesterday ? (meta.dayStreak || 0) + 1 : 1;
    meta.lastOpenDay = day;
    meta.bestDayStreak = Math.max(meta.bestDayStreak || 0, meta.dayStreak);
  }
  grantMilestones();
  checkSecrets();
  checkAchievements();
  saveMeta();
}

function pullTier(card) {
  if (simMode) return null;
  if (card.rarity === "holy") return "holy";
  if (card.rarity === "grail" || card.value >= 100000) return "jackpot";
  if (card.rarity === "secret" || card.rarity === "ultra" || card.value >= 10000) return "massive";
  if (card.rarity === "legendary" || card.value >= 1000) return "big";
  return null;
}

function countUp(el, target) {
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / 1400);
    const eased = 1 - (1 - t) ** 3;
    el.textContent = money(target * eased);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function afterUnveil(card) {
  const fav = document.getElementById("favOne");
  if (fav && meta.favorites.includes(card.id)) fav.classList.add("on");
  if (simMode) return;
  const tier = pullTier(card);
  const stamp = document.querySelector(".value-stamp");
  if (stamp && tier) countUp(stamp, card.value);
  if (!tier || tier === "holy") return;
  const stage = document.getElementById("open-stage");
  const banner = document.createElement("div");
  banner.className = `pull-announce tier-${tier}`;
  const label = tier === "big" ? "BIG PULL" : "🚨 MASSIVE PULL! 🚨";
  banner.innerHTML = `<p>${label}</p><b>${esc(meta.name)} pulled</b><span>${esc(rarityById(card.rarity).label)} · ${esc(card.name)}</span>`;
  stage.prepend(banner);
  Fx.fireworks(rarityById(card.rarity).color, tier === "big" ? 4 : 9);
  Fx.screenShake(tier === "big" ? 8 : 16);
}

function toggleFavorite(id) {
  if (meta.favorites.includes(id)) meta.favorites = meta.favorites.filter((item) => item !== id);
  else meta.favorites.push(id);
  saveMeta();
  toast(meta.favorites.includes(id) ? "Favorited" : "Removed from favorites");
}

function cardLocked(key) {
  const trade = meta.trade;
  if (!trade) return false;
  return (trade.offer || []).some((item) => item.key === key) || (trade.theirOffer || []).some((item) => item.key === key);
}

function dailyReady() {
  return Date.now() - (meta.dailyClaim || 0) >= 86400000;
}

function dailyLeft() {
  const remain = 86400000 - (Date.now() - (meta.dailyClaim || 0));
  if (remain <= 0) return "00:00:00";
  const hours = Math.floor(remain / 3600000);
  const mins = Math.floor((remain % 3600000) / 60000);
  const secs = Math.floor((remain % 60000) / 1000);
  return [hours, mins, secs].map((n) => String(n).padStart(2, "0")).join(":");
}

function claimDaily() {
  if (!dailyReady()) return;
  const gap = Date.now() - (meta.dailyClaim || 0);
  const keep = meta.dailyClaim && gap < 86400000 * 2;
  meta.dailyStreak = keep ? ((meta.dailyStreak || 0) % 7) + 1 : 1;
  meta.dailyClaim = Date.now();
  const packId = meta.dailyStreak === 7 ? "vault" : "prime";
  state.packs[packId] = (state.packs[packId] || 0) + 1;
  if (meta.dailyStreak === 7) grantReward("title:Week One");
  save();
  saveMeta();
  toast(meta.dailyStreak === 7 ? "Day 7 bonus: Night Vault added" : "Free pack added to your inventory");
  refreshLocks();
  openHub("daily");
}

function decoratePackInfo() {
  const info = document.getElementById("packInfo");
  if (!info) return;
  const box = document.createElement("div");
  box.className = "live-stats";
  box.innerHTML = `
    ${simMode ? `<p class="sim-flag">SIMULATION MODE · NO REAL REWARDS</p>` : ""}
    <p class="meta">PACK STREAK 🔥 ${meta.opened} PACKS</p>
    <p class="meta daily-line">${dailyReady() ? "DAILY FREE PACK · ready to claim" : `Next free pack: ${dailyLeft()}`}</p>
  `;
  info.append(box);
}

function openHub(page) {
  const el = document.getElementById("hub-overlay");
  el.hidden = false;
  const pages = {
    menu: renderMenu,
    collection: renderCollection,
    history: renderHistory,
    profile: renderProfile,
    board: renderBoard,
    achievements: renderAchievements,
    trade: renderTrade,
    daily: renderDaily,
    skins: renderSkins,
    upgrade: renderUpgrade,
  };
  (pages[page] || renderMenu)(el);
  el.onclick = (event) => {
    if (event.target === el) el.hidden = true;
  };
}

function hubCard(title, body) {
  return `<div class="sheet-card menu-card"><div class="menu-head"><h2>${title}</h2><button class="ghost" id="closeHub" type="button">Close</button></div>${body}</div>`;
}

function bindClose() {
  document.getElementById("closeHub").onclick = () => {
    document.getElementById("hub-overlay").hidden = true;
  };
}

function renderMenu(el) {
  el.innerHTML = hubCard("Menu", `
    <div class="hub-grid">
      ${[["collection", "Collection"], ["history", "Pull history"], ["profile", "Profile"], ["board", "Leaderboards"], ["achievements", "Achievements"], ["trade", "Trade"], ["daily", "Daily pack"], ["skins", "Pack skins"], ["upgrade", "Upgrade"], ["sim", simMode ? "Exit simulation" : "Simulation mode"]].map(([id, label]) => `<button type="button" data-go="${id}">${label}</button>`).join("")}
    </div>
    <p class="meta">Pack odds never change because of a skin, streak, or simulation.</p>
  `);
  bindClose();
  el.querySelectorAll("[data-go]").forEach((btn) => {
    btn.onclick = () => {
      if (btn.dataset.go === "sim") {
        simMode = !simMode;
        toast(simMode ? "Simulation mode on" : "Simulation mode off");
        refreshLocks();
        openHub("menu");
        return;
      }
      openHub(btn.dataset.go);
    };
  });
}

function renderCollection(el) {
  const stats = collectionStats();
  const owned = {};
  for (const card of Object.values(state.binder)) {
    if (!owned[card.id] || card.value > owned[card.id].value) owned[card.id] = { ...hydrateCard({ ...card }), qty: 0 };
    owned[card.id].qty += card.qty;
  }
  let list = CATALOG.filter((card) => {
    if (bookFilter === "owned" && !owned[card.id]) return false;
    if (bookFilter === "favorites" && !meta.favorites.includes(card.id)) return false;
    if (bookRarity !== "all" && card.rarity !== bookRarity) return false;
    return true;
  });
  list.sort((a, b) => {
    if (bookSort === "alpha") return a.name.localeCompare(b.name);
    if (bookSort === "low") return a.value - b.value;
    if (bookSort === "high") return b.value - a.value;
    if (bookSort === "new") return String(meta.seen[b.id] || "").localeCompare(String(meta.seen[a.id] || ""));
    return rarityRank(b.rarity) - rarityRank(a.rarity) || b.value - a.value;
  });
  const shown = list.slice(0, bookShown);
  el.innerHTML = hubCard("Collection", `
    <div class="stat-row">
      <div><b>${stats.pct}%</b><span>Complete</span></div>
      <div><b>${stats.qty}</b><span>Owned</span></div>
      <div><b>${stats.unique}</b><span>Unique</span></div>
      <div><b>${money(stats.value)}</b><span>Value</span></div>
    </div>
    <div class="row">
      <select id="bookFilter">
        ${[["all", "All cards"], ["owned", "Owned"], ["favorites", "Favorites"]].map(([id, label]) => `<option value="${id}" ${bookFilter === id ? "selected" : ""}>${label}</option>`).join("")}
      </select>
      <select id="bookRarity"><option value="all">Every rarity</option>${RARITIES.map((r) => `<option value="${r.id}" ${bookRarity === r.id ? "selected" : ""}>${r.label}</option>`).join("")}</select>
      <select id="bookSort">
        ${[["new", "Newest"], ["rarest", "Rarest"], ["high", "Highest value"], ["low", "Lowest value"], ["alpha", "Alphabetical"]].map(([id, label]) => `<option value="${id}" ${bookSort === id ? "selected" : ""}>${label}</option>`).join("")}
      </select>
    </div>
    <div class="book-grid">
      ${shown.map((card) => {
        const have = owned[card.id];
        if (!have) {
          return `<article class="book-card is-hidden"><div class="book-art silhouette"></div><b>???</b><span>#${esc(card.number)}</span><small>Not pulled</small></article>`;
        }
        const star = meta.favorites.includes(card.id) ? "on" : "";
        return `<article class="book-card finish-${have.finish || "base"}">
          <button class="star ${star}" type="button" data-fav="${esc(card.id)}">⭐</button>
          <div class="book-art"><img src="${have.art}" alt="" /></div>
          <b>${esc(have.name)}</b>
          <span>${esc(rarityById(have.rarity).label)} · ${money(have.value)}</span>
          <small>#${esc(have.number || card.number)} · x${have.qty}${have.finish ? ` · ${esc(have.finish)}` : ""}</small>
          <button class="sell" type="button" data-sell="${esc(binderKey(have))}">Sell one</button>
        </article>`;
      }).join("")}
    </div>
    ${shown.length < list.length ? `<button class="ghost" id="moreCards" type="button">Show more</button>` : ""}
    <p class="meta">${list.length} cards in this view.</p>
  `);
  bindClose();
  el.querySelector("#bookFilter").onchange = (event) => { bookFilter = event.target.value; bookShown = 48; renderCollection(el); };
  el.querySelector("#bookRarity").onchange = (event) => { bookRarity = event.target.value; bookShown = 48; renderCollection(el); };
  el.querySelector("#bookSort").onchange = (event) => { bookSort = event.target.value; renderCollection(el); };
  el.querySelector("#moreCards")?.addEventListener("click", () => { bookShown += 48; renderCollection(el); });
  el.querySelectorAll("[data-fav]").forEach((btn) => { btn.onclick = () => { toggleFavorite(btn.dataset.fav); renderCollection(el); }; });
  el.querySelectorAll("[data-sell]").forEach((btn) => {
    btn.onclick = () => { sellFromBinder(btn.dataset.sell); renderCollection(el); };
  });
}

function renderHistory(el) {
  const q = historyQuery.trim().toLowerCase();
  let rows = meta.history.filter((row) => !q || row.name.toLowerCase().includes(q) || row.rarity.includes(q) || row.packName.toLowerCase().includes(q));
  rows = rows.slice().sort((a, b) => {
    if (historySort === "value") return b.value - a.value;
    if (historySort === "rarity") return rarityRank(b.rarity) - rarityRank(a.rarity);
    if (historySort === "oldest") return String(a.date).localeCompare(String(b.date));
    return String(b.date).localeCompare(String(a.date));
  });
  const biggest = meta.history.slice().sort((a, b) => b.value - a.value).slice(0, 5);
  const artFor = (id) => CATALOG.find((card) => card.id === id)?.art || "";
  const line = (row) => {
    const when = new Date(row.date);
    const stamp = Number.isNaN(when.getTime()) ? "" : when.toLocaleString();
    return `<article class="history-row">
      <img src="${artFor(row.id)}" alt="" />
      <div><b>${esc(row.name)}</b><span>${esc(rarityById(row.rarity)?.label || row.rarity)} · ${money(row.value)}</span><small>${esc(row.packName)} · ${esc(stamp)}</small></div>
    </article>`;
  };
  el.innerHTML = hubCard("Pull history", `
    <h3>Biggest pulls</h3>
    ${biggest.length ? biggest.map(line).join("") : `<p class="meta">No pulls yet.</p>`}
    <div class="row">
      <input id="historySearch" type="search" placeholder="Search pulls" value="${esc(historyQuery)}" />
      <select id="historySort">
        ${[["newest", "Newest"], ["oldest", "Oldest"], ["value", "Highest value"], ["rarity", "Rarest"]].map(([id, label]) => `<option value="${id}" ${historySort === id ? "selected" : ""}>${label}</option>`).join("")}
      </select>
    </div>
    ${rows.length ? rows.map(line).join("") : `<p class="meta">No matching pulls.</p>`}
    <p class="meta">Last ${meta.history.length} of 100 saved pulls.</p>
  `);
  bindClose();
  el.querySelector("#historySearch").oninput = (event) => {
    historyQuery = event.target.value;
    renderHistory(el);
    const box = el.querySelector("#historySearch");
    box.focus();
    const end = box.value.length;
    box.setSelectionRange(end, end);
  };
  el.querySelector("#historySort").onchange = (event) => { historySort = event.target.value; renderHistory(el); };
}

function slotCard(label, card, extra = "") {
  if (!card) return `<article class="show-slot ${extra}"><b>${label}</b><span>Empty</span></article>`;
  const art = card.art || CATALOG.find((item) => item.id === card.id)?.art || "";
  return `<article class="show-slot ${extra}"><b>${label}</b><img src="${art}" alt="" /><span>${esc(card.name)}</span><small>${money(card.value)} · ${esc(rarityById(card.rarity)?.label || "")}</small></article>`;
}

function renderProfile(el) {
  const cards = binderList();
  const fav = cards.find((card) => meta.favorites.includes(card.id));
  const rarest = cards.slice().sort((a, b) => rarityRank(b.rarity) - rarityRank(a.rarity) || b.value - a.value)[0];
  const holy = cards.find((card) => card.rarity === "holy");
  const biggest = meta.history.slice().sort((a, b) => b.value - a.value)[0];
  el.innerHTML = hubCard("Profile", `
    <label class="slider">Username<input id="playerName" maxlength="18" value="${esc(meta.name)}" /></label>
    <p class="meta">${esc(meta.title || "No title yet")}</p>
    <div class="show-grid">
      ${slotCard("⭐ Favorite Card", fav)}
      ${slotCard("💎 Rarest Card", rarest)}
      ${slotCard("💰 Highest Value", cards[0])}
      ${slotCard("🔥 Biggest Pull", biggest)}
      ${slotCard("🏆 Holy Grail", holy, "holy-slot")}
    </div>
    <button class="primary" id="saveName" type="button">Save name</button>
  `);
  bindClose();
  el.querySelector("#saveName").onclick = () => {
    meta.name = el.querySelector("#playerName").value.trim().slice(0, 18) || "Gavin";
    saveMeta();
    toast("Name saved");
  };
}

function boardRows() {
  const mine = collectionStats();
  const rare = binderList().sort((a, b) => rarityRank(b.rarity) - rarityRank(a.rarity))[0];
  const rows = [{
    name: meta.name || "Gavin",
    value: mine.value,
    cards: mine.qty,
    unique: mine.unique,
    rareRank: rare ? rarityRank(rare.rarity) : -1,
    rarest: rare ? rarityById(rare.rarity).label : "—",
    big: bestPull(),
    opened: meta.opened,
    streak: meta.bestDayStreak || 0,
  }];
  for (const profile of meta.profiles) {
    const cards = Object.values(profile.binder || {});
    const top = cards.slice().sort((a, b) => rarityRank(b.rarity) - rarityRank(a.rarity))[0];
    rows.push({
      name: profile.name,
      value: cards.reduce((sum, card) => sum + card.value * card.qty, 0),
      cards: cards.reduce((sum, card) => sum + card.qty, 0),
      unique: new Set(cards.map((card) => card.id)).size,
      rareRank: top ? rarityRank(top.rarity) : -1,
      rarest: top ? rarityById(top.rarity).label : "—",
      big: profile.best || 0,
      opened: profile.opened || 0,
      streak: profile.streak || 0,
    });
  }
  const keys = { value: "value", cards: "cards", unique: "unique", rarest: "rareRank", big: "big", opened: "opened", streak: "streak" };
  return rows.sort((a, b) => b[keys[boardKey]] - a[keys[boardKey]]);
}

function renderBoard(el) {
  const labels = { value: "Highest collection value", cards: "Most cards", unique: "Most unique", rarest: "Rarest card pulled", big: "Biggest single pull", opened: "Most packs opened", streak: "Longest opening streak" };
  el.innerHTML = hubCard("Leaderboard", `
    <div class="quick">${Object.entries(labels).map(([id, label]) => `<button type="button" data-board="${id}" class="${boardKey === id ? "primary" : ""}">${label}</button>`).join("")}</div>
    ${boardRows().map((row, index) => `<div class="history-row"><b>#${index + 1} ${esc(row.name)}</b><span>${boardKey === "rarest" ? esc(row.rarest) : boardKey === "value" || boardKey === "big" ? money(row[boardKey]) : row[boardKey]}</span></div>`).join("")}
    <p class="meta">Usernames on this device only. No personal details.</p>
  `);
  bindClose();
  el.querySelectorAll("[data-board]").forEach((btn) => { btn.onclick = () => { boardKey = btn.dataset.board; renderBoard(el); }; });
}

function renderAchievements(el) {
  el.innerHTML = hubCard("Achievements", ACHIEVEMENTS.map((item) => {
    const have = meta.achievements.includes(item.id);
    const now = Math.min(item.goal, item.progress());
    const pct = Math.round((now / item.goal) * 100);
    return `<article class="ach-row ${have ? "got" : ""}"><b>${item.name}</b><span>${item.text}</span><i style="width:${pct}%"></i><small>${have ? "Unlocked" : `${now} / ${item.goal}`}</small></article>`;
  }).join(""));
  bindClose();
}

function renderDaily(el) {
  const days = [1, 2, 3, 4, 5, 6, 7].map((day) => `<span class="${day <= meta.dailyStreak ? "on" : ""} ${day === 7 ? "bonus" : ""}">Day ${day}${day === 7 ? " · bonus" : ""}</span>`).join("");
  el.innerHTML = hubCard("Daily free pack", `
    <p class="limited-kicker">DAILY FREE PACK</p>
    <p class="pack-price" id="dailyClock">${dailyReady() ? "READY" : dailyLeft()}</p>
    <p class="meta">Next free pack: <span id="dailyLeft">${dailyReady() ? "now" : dailyLeft()}</span></p>
    <div class="day-row">${days}</div>
    <p class="meta">Day 7 adds a Night Vault pack and the Week One title. The $100,000 pack is never free.</p>
    <button class="primary" id="claimDaily" type="button" ${dailyReady() ? "" : "disabled"}>${dailyReady() ? "CLAIM FREE PACK" : "Come back later"}</button>
  `);
  bindClose();
  el.querySelector("#claimDaily").onclick = claimDaily;
}

function renderSkins(el) {
  el.innerHTML = hubCard("Pack skins", `
    <p class="meta">Cosmetic only. Odds stay the same. The $100,000 pack keeps its own packaging.</p>
    <div class="hub-grid">
      <button type="button" data-skin="" class="${meta.skin ? "" : "primary"}">Classic</button>
      ${SKINS.map((skin) => {
        const own = meta.skins.includes(skin.id);
        return `<button type="button" data-skin="${skin.id}" ${own ? "" : "disabled"} class="${meta.skin === skin.id ? "primary" : ""}">${skin.name}${own ? "" : " · locked"}</button>`;
      }).join("")}
    </div>
  `);
  bindClose();
  el.querySelectorAll("[data-skin]").forEach((btn) => {
    btn.onclick = () => {
      meta.skin = btn.dataset.skin;
      saveMeta();
      refreshLocks();
      renderSkins(el);
    };
  });
}

function renderUpgrade(el) {
  const stacks = binderList().filter((card) => card.qty >= 5 && !card.finish);
  el.innerHTML = hubCard("Upgrade", `
    <p class="meta">Duplicates are consumed. You get one visual upgrade: Foil, Holographic, Shiny, Prismatic, or Gold.</p>
    ${stacks.length ? stacks.slice(0, 30).map((card) => {
      const key = binderKey(card);
      return `<article class="history-row"><div><b>${esc(card.name)}</b><span>x${card.qty} · ${esc(rarityById(card.rarity).label)}</span></div>
        <select data-finish="${esc(key)}">${FINISHES.filter((item) => card.qty >= item.need).map((item) => `<option value="${item.id}">${item.need} → ${item.label}</option>`).join("")}</select>
        <button type="button" data-upgrade="${esc(key)}">Upgrade</button></article>`;
    }).join("") : `<p class="meta">Keep at least 5 copies of a card to upgrade it.</p>`}
  `);
  bindClose();
  el.querySelectorAll("[data-upgrade]").forEach((btn) => {
    btn.onclick = () => {
      const key = btn.dataset.upgrade;
      const finish = FINISHES.find((item) => item.id === btn.parentElement.querySelector("select").value);
      const card = state.binder[key];
      if (!card || !finish) return;
      askConfirm(`Use ${finish.need} copies of ${card.name}? They leave the binder. You receive 1 ${finish.label} version.`, () => {
        if (cardLocked(key)) { toast("That card is in a pending trade"); return; }
        const base = { ...card };
        card.qty -= finish.need;
        if (card.qty <= 0) delete state.binder[key];
        addToBinder({ ...base, finish: finish.id, value: Math.round(base.value * 1.1 * 100) / 100 });
        save();
        toast(`${finish.label} ready`);
        renderUpgrade(el);
      });
    };
  });
}

function tradePartner() {
  return meta.profiles.find((profile) => profile.id === meta.trade?.partnerId) || null;
}

function renderTrade(el) {
  if (!meta.trade) meta.trade = { partnerId: meta.profiles[0]?.id || "", offer: [], theirOffer: [], youOk: false, themOk: false, left: 0 };
  const trade = meta.trade;
  const partner = tradePartner();
  const yourCards = binderList();
  const theirCards = Object.values(partner?.binder || {}).map(hydrateCard);
  const listing = (cards, side) => cards.map((card) => {
    const key = binderKey(card);
    return `<button type="button" data-add="${side}:${esc(key)}">${esc(card.name)} · x${card.qty}</button>`;
  }).join("") || `<p class="meta">No cards.</p>`;
  const picked = (items, binder) => items.map((item) => {
    const card = binder[item.key];
    return card ? `<span>${esc(card.name)} x${item.qty}</span>` : "";
  }).join("") || `<span>Nothing offered</span>`;
  const counting = trade.youOk && trade.themOk && trade.left > 0;
  el.innerHTML = hubCard("Trade", `
    <p class="meta">Same phone, two local profiles. Both people have to confirm. A card in this trade cannot be sold or used in another trade.</p>
    <div class="row">
      <input id="friendName" maxlength="18" placeholder="Add a username" />
      <button type="button" id="addFriend">Add</button>
    </div>
    <select id="partnerPick">${meta.profiles.map((profile) => `<option value="${esc(profile.id)}" ${profile.id === trade.partnerId ? "selected" : ""}>${esc(profile.name)}</option>`).join("") || `<option value="">Add someone first</option>`}</select>
    <div class="trade-cols">
      <section><h3>YOUR OFFER</h3>${picked(trade.offer, state.binder)}</section>
      <section><h3>THEIR OFFER</h3>${picked(trade.theirOffer, partner?.binder || {})}</section>
    </div>
    ${counting ? `<p class="pack-price">${trade.left}</p><p>Are you sure you want to complete this trade?</p><button class="ghost" id="cancelTrade" type="button">Cancel</button>` : `
      <div class="quick">
        <button type="button" id="seatYou" class="${tradeSeat === "you" ? "primary" : ""}">Your cards</button>
        <button type="button" id="seatThem" class="${tradeSeat === "them" ? "primary" : ""}">Their cards</button>
      </div>
      <div class="hub-grid">${tradeSeat === "you" ? listing(yourCards, "you") : listing(theirCards, "them")}</div>
      <label class="toggle"><span>${esc(meta.name)} confirms</span><input id="youOk" type="checkbox" ${trade.youOk ? "checked" : ""} /></label>
      <label class="toggle"><span>${esc(partner?.name || "They")} confirm</span><input id="themOk" type="checkbox" ${trade.themOk ? "checked" : ""} /></label>
      <button class="primary" id="startTrade" type="button">ACCEPT TRADE</button>
      <button class="ghost" id="clearTrade" type="button">Clear offers</button>
    `}
  `);
  bindClose();
  el.querySelector("#addFriend").onclick = () => {
    const name = el.querySelector("#friendName").value.trim().slice(0, 18);
    if (!name) return;
    const profile = { id: `p-${Date.now()}`, name, binder: {}, opened: 0, best: 0, streak: 0 };
    meta.profiles.push(profile);
    trade.partnerId = profile.id;
    saveMeta();
    renderTrade(el);
  };
  el.querySelector("#partnerPick").onchange = (event) => {
    trade.partnerId = event.target.value;
    trade.offer = [];
    trade.theirOffer = [];
    trade.youOk = false;
    trade.themOk = false;
    saveMeta();
    renderTrade(el);
  };
  el.querySelector("#seatYou")?.addEventListener("click", () => { tradeSeat = "you"; renderTrade(el); });
  el.querySelector("#seatThem")?.addEventListener("click", () => { tradeSeat = "them"; renderTrade(el); });
  el.querySelectorAll("[data-add]").forEach((btn) => {
    btn.onclick = () => {
      const raw = btn.dataset.add || "";
      const side = raw.startsWith("them:") ? "them" : "you";
      const key = raw.slice(side.length + 1);
      const pile = side === "you" ? trade.offer : trade.theirOffer;
      const source = side === "you" ? state.binder : partner?.binder;
      const card = source?.[key];
      if (!card) return;
      const found = pile.find((item) => item.key === key);
      const used = found ? found.qty : 0;
      if (used >= card.qty) return;
      if (found) found.qty += 1;
      else pile.push({ key, qty: 1 });
      trade.youOk = false;
      trade.themOk = false;
      saveMeta();
      renderTrade(el);
    };
  });
  el.querySelector("#youOk")?.addEventListener("change", (event) => { trade.youOk = event.target.checked; saveMeta(); });
  el.querySelector("#themOk")?.addEventListener("change", (event) => { trade.themOk = event.target.checked; saveMeta(); });
  el.querySelector("#clearTrade")?.addEventListener("click", () => {
    meta.trade = { partnerId: trade.partnerId, offer: [], theirOffer: [], youOk: false, themOk: false, left: 0 };
    saveMeta();
    renderTrade(el);
  });
  el.querySelector("#startTrade")?.addEventListener("click", () => {
    if (!partner) return toast("Add the other player first");
    if (!trade.youOk || !trade.themOk) return toast("Both players need to confirm");
    if (!trade.offer.length && !trade.theirOffer.length) return toast("Add at least one card");
    trade.left = 5;
    saveMeta();
    renderTrade(el);
    clearInterval(tradeTimer);
    tradeTimer = setInterval(() => {
      if (!meta.trade?.left) return clearInterval(tradeTimer);
      meta.trade.left -= 1;
      if (document.getElementById("hub-overlay").hidden) {
        clearInterval(tradeTimer);
        meta.trade.left = 0;
        meta.trade.youOk = false;
        meta.trade.themOk = false;
        saveMeta();
        return;
      }
      if (meta.trade.left <= 0) {
        clearInterval(tradeTimer);
        finishTrade();
      } else if (!document.getElementById("hub-overlay").hidden) renderTrade(document.getElementById("hub-overlay"));
    }, 1000);
  });
  el.querySelector("#cancelTrade")?.addEventListener("click", () => {
    clearInterval(tradeTimer);
    trade.left = 0;
    trade.youOk = false;
    trade.themOk = false;
    saveMeta();
    renderTrade(el);
  });
}

function shiftCards(from, to, items) {
  for (const item of items) {
    const card = from[item.key];
    if (!card || card.qty < item.qty) return false;
  }
  for (const item of items) {
    const card = from[item.key];
    const copy = { ...card, qty: item.qty };
    if (typeof copy.art === "string" && copy.art.startsWith("data:")) delete copy.art;
    card.qty -= item.qty;
    if (card.qty <= 0) delete from[item.key];
    if (!to[item.key]) to[item.key] = { ...copy, qty: 0 };
    to[item.key].qty += item.qty;
  }
  return true;
}

function finishTrade() {
  const trade = meta.trade;
  const partner = tradePartner();
  if (!trade || !partner || !trade.youOk || !trade.themOk) return;
  const yourCopy = JSON.parse(JSON.stringify(state.binder));
  const theirCopy = JSON.parse(JSON.stringify(partner.binder || {}));
  const ok = shiftCards(yourCopy, theirCopy, trade.offer) && shiftCards(theirCopy, yourCopy, trade.theirOffer);
  if (!ok) {
    toast("Trade failed. Check the card counts.");
    trade.left = 0;
    trade.youOk = false;
    trade.themOk = false;
    saveMeta();
    return;
  }
  state.binder = yourCopy;
  partner.binder = theirCopy;
  meta.trade = { partnerId: partner.id, offer: [], theirOffer: [], youOk: false, themOk: false, left: 0 };
  save();
  saveMeta();
  toast("Trade complete");
  if (!document.getElementById("hub-overlay").hidden) renderTrade(document.getElementById("hub-overlay"));
}

function unlockAllAchievements() {
  for (const item of ACHIEVEMENTS) {
    if (!meta.achievements.includes(item.id)) meta.achievements.push(item.id);
    grantReward(item.reward);
  }
  saveMeta();
  toast("Achievements unlocked");
}

function grantAchievement(id) {
  const item = ACHIEVEMENTS.find((row) => row.id === id);
  if (!item) return;
  if (!meta.achievements.includes(item.id)) meta.achievements.push(item.id);
  grantReward(item.reward);
  saveMeta();
  toast(item.name);
}

const _finishOpening = finishOpening;
finishOpening = function patchedFinish() {
  _finishOpening();
  flushSecrets();
};

showBinder = () => openHub("collection");

document.getElementById("menuBtn").onclick = () => {
  Sfx.tap();
  openHub("menu");
};

saveMeta();
setInterval(() => {
  const line = document.querySelector(".daily-line");
  if (line) line.textContent = dailyReady() ? "DAILY FREE PACK · ready to claim" : `Next free pack: ${dailyLeft()}`;
  const clock = document.getElementById("dailyClock");
  const left = document.getElementById("dailyLeft");
  if (clock) clock.textContent = dailyReady() ? "READY" : dailyLeft();
  if (left) left.textContent = dailyReady() ? "now" : dailyLeft();
}, 1000);
refreshLocks();
