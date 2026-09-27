const DEFAULT_SETTINGS = { master: 0.8, music: 0.55, sfx: 0.85, mute: false, quality: "high" };
const GATE = [3, 5, 9, 2];

let prefs = loadPrefs();
let adminQty = 1;
let adminCard = CATALOG[0].id;
let adminRarity = "grail";
let adminPack = "god";

function loadPrefs() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_SETTINGS };
}

function applyPrefs(next) {
  prefs = { ...prefs, ...next };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(prefs));
  document.body.dataset.gfx = prefs.quality;
  document.body.classList.toggle("gfx-low", prefs.quality === "low");
  document.body.classList.toggle("gfx-medium", prefs.quality === "medium");
  Sfx.apply(prefs);
}

function pct(n) {
  return Math.round(Number(n) * 100);
}

function rewardRows() {
  const rows = readRewards();
  if (!rows.length) return `<p class="meta">No rewards yet.</p>`;
  return `<div class="reward-head"><span>Reward</span><span>Status</span><span>Date</span></div>${rows
    .map((row) => {
      const when = new Date(row.date);
      const date = Number.isNaN(when.getTime()) ? "—" : when.toLocaleDateString();
      return `<div class="reward-row"><span><b>${row.title}</b><small>${row.detail}</small></span><span>${row.status}</span><span>${date}</span></div>`;
    })
    .join("")}`;
}

function rewardAdminRows() {
  const rows = readRewards();
  if (!rows.length) return `<p class="meta">No Holy Grail rewards yet.</p>`;
  return rows
    .map((row) => {
      const when = new Date(row.date);
      const date = Number.isNaN(when.getTime()) ? "—" : when.toLocaleString();
      return `<div class="reward-row">
        <span><b>${row.title}</b><small>${row.cardName || ""} · ${row.detail}</small></span>
        <select data-reward="${row.id}">
          ${["PENDING", "APPROVED", "DENIED"].map((status) => `<option value="${status}" ${row.status === status ? "selected" : ""}>${status}</option>`).join("")}
        </select>
        <span>${date}</span>
      </div>`;
    })
    .join("");
}

function askConfirm(message, onYes) {
  const pop = document.getElementById("confirm-pop");
  pop.hidden = false;
  pop.innerHTML = `
    <div class="modal-card">
      <h2>Are you sure?</h2>
      <p>${message}</p>
      <div class="controls">
        <button class="ghost" id="confirmNo" type="button">Cancel</button>
        <button class="primary" id="confirmYes" type="button">Confirm</button>
      </div>
    </div>
  `;
  pop.querySelector("#confirmNo").onclick = () => {
    pop.hidden = true;
  };
  pop.querySelector("#confirmYes").onclick = () => {
    pop.hidden = true;
    onYes();
  };
}

function afterAdminChange(message) {
  save();
  updateChrome();
  refreshLocks();
  toast(message);
}

function giveMoney(amount) {
  const n = Math.round(Number(amount) * 100) / 100;
  if (!Number.isFinite(n) || n === 0) {
    toast("Enter an amount");
    return;
  }
  state.bank = Math.max(0, state.bank + n);
  afterAdminChange(`Bank ${money(state.bank)}`);
}

function setMoney(amount) {
  const n = Math.round(Number(amount) * 100) / 100;
  if (!Number.isFinite(n) || n < 0) {
    toast("Enter an amount");
    return;
  }
  state.bank = n;
  afterAdminChange(`Bank set to ${money(state.bank)}`);
}

function giveCardCopies() {
  const template = CATALOG.find((card) => card.id === adminCard);
  const pack = PACKS.find((item) => item.id === adminPack) || PACKS[PACKS.length - 1];
  const qty = Math.max(1, Math.min(99, adminQty));
  const card = {
    ...template,
    rarity: adminRarity,
    value: rarityValue(pack, adminRarity),
    packName: pack.name,
  };
  for (let i = 0; i < qty; i += 1) addToBinder(card);
  afterAdminChange(`Added ${qty} ${template.name}`);
  renderCollectionList();
}

function removeBinderKey(key, all) {
  const card = state.binder[key];
  if (!card) return;
  if (all) delete state.binder[key];
  else {
    card.qty -= 1;
    if (card.qty <= 0) delete state.binder[key];
  }
  afterAdminChange("Card removed");
  renderCollectionList();
}

function unlockAllCards() {
  const pack = PACKS[PACKS.length - 1];
  for (const template of CATALOG) {
    for (const rarity of RARITIES) {
      const card = {
        ...template,
        rarity: rarity.id,
        value: rarityValue(pack, rarity.id),
        packName: pack.name,
      };
      const key = binderKey(card);
      if (!state.binder[key]) state.binder[key] = { ...card, qty: 1 };
    }
  }
  afterAdminChange("Every card unlocked");
  renderCollectionList();
}

function maxCollection() {
  const pack = PACKS[PACKS.length - 1];
  for (const template of CATALOG) {
    for (const rarity of RARITIES) {
      const card = {
        ...template,
        rarity: rarity.id,
        value: rarityValue(pack, rarity.id),
        packName: pack.name,
      };
      const key = binderKey(card);
      state.binder[key] = { ...card, qty: 10 };
    }
  }
  afterAdminChange("Collection maxed");
  renderCollectionList();
}

function clearCollection() {
  state.binder = {};
  afterAdminChange("Collection cleared");
  renderCollectionList();
}

function resetProgress() {
  state.binder = {};
  state.packs = {};
  state.unlockAll = false;
  state.rips = 0;
  state.bank = STARTING_BANK;
  state.over = null;
  if (typeof resetFeatureProgress === "function") resetFeatureProgress();
  save();
  updateChrome();
  refreshLocks();
  toast("Progress reset");
  renderCollectionList();
}

function renderCardPicker() {
  const box = document.getElementById("cardResults");
  if (!box) return;
  const rarity = document.getElementById("cardRarity")?.value || adminRarity;
  adminRarity = rarity === "all" ? adminRarity : rarity;
  const pack = PACKS.find((item) => item.id === (document.getElementById("cardPack")?.value || adminPack));
  adminPack = pack.id;
  const q = (document.getElementById("cardSearch")?.value || "").trim().toLowerCase();
  const matches = CATALOG.filter((card) => !q || card.name.toLowerCase().includes(q) || String(card.number).includes(q));
  const list = matches.slice(0, 40);
  box.innerHTML = (matches.length > list.length ? `<p class="meta">Showing ${list.length} of ${matches.length}</p>` : "") + list
    .map((card) => {
      const value = rarityValue(pack, adminRarity);
      const on = card.id === adminCard ? "on" : "";
      return `<button class="pick ${on}" type="button" data-card="${card.id}">
        <b>${card.name}</b>
        <span>${rarityById(adminRarity).label} · ${money(value)}</span>
      </button>`;
    })
    .join("") || `<p class="meta">No cards match.</p>`;
  box.querySelectorAll("[data-card]").forEach((btn) => {
    btn.onclick = () => {
      adminCard = btn.dataset.card;
      renderCardPicker();
    };
  });
}

function renderCollectionList() {
  const box = document.getElementById("collectionList");
  if (!box) return;
  const q = (document.getElementById("collectionSearch")?.value || "").trim().toLowerCase();
  const cards = binderList().filter((card) => !q || card.name.toLowerCase().includes(q) || card.rarity.includes(q));
  box.innerHTML = cards.length
    ? cards
        .map((card) => {
          const key = binderKey(card);
          return `<div class="collect-row">
            <div><b>${card.name}</b><span>${rarityById(card.rarity).label} · ${money(card.value)} · x${card.qty}</span></div>
            <button type="button" data-drop="${key}">Remove</button>
          </div>`;
        })
        .join("")
    : `<p class="meta">Collection is empty.</p>`;
  box.querySelectorAll("[data-drop]").forEach((btn) => {
    btn.onclick = () => removeBinderKey(btn.dataset.drop, false);
  });
}

function openSettings() {
  const el = document.getElementById("settings-overlay");
  el.hidden = false;
  el.innerHTML = `
    <div class="sheet-card menu-card">
      <div class="menu-head"><h2>Settings</h2><button class="ghost" id="closeSettings" type="button">Close</button></div>
      <label class="slider">Master volume <b id="masterVal">${pct(prefs.master)}</b>
        <input id="masterVol" type="range" min="0" max="100" value="${pct(prefs.master)}" />
      </label>
      <label class="slider">Music volume <b id="musicVal">${pct(prefs.music)}</b>
        <input id="musicVol" type="range" min="0" max="100" value="${pct(prefs.music)}" />
      </label>
      <label class="slider">Sound effects <b id="sfxVal">${pct(prefs.sfx)}</b>
        <input id="sfxVol" type="range" min="0" max="100" value="${pct(prefs.sfx)}" />
      </label>
      <label class="toggle"><span>Mute all sounds</span>
        <input id="muteAll" type="checkbox" ${prefs.mute ? "checked" : ""} />
      </label>
      <label class="slider">Graphics quality
        <select id="gfxQuality">
          <option value="low" ${prefs.quality === "low" ? "selected" : ""}>Low</option>
          <option value="medium" ${prefs.quality === "medium" ? "selected" : ""}>Medium</option>
          <option value="high" ${prefs.quality === "high" ? "selected" : ""}>High</option>
        </select>
      </label>
      <button class="ghost danger" id="resetData" type="button">Reset game data</button>
      <h3>Reward history</h3>
      <div class="reward-table" id="rewardHistory">${rewardRows()}</div>
      <button class="primary" id="adminLogin" type="button">Admin login</button>
    </div>
  `;
  const live = () => {
    applyPrefs({
      master: Number(el.querySelector("#masterVol").value) / 100,
      music: Number(el.querySelector("#musicVol").value) / 100,
      sfx: Number(el.querySelector("#sfxVol").value) / 100,
      mute: el.querySelector("#muteAll").checked,
      quality: el.querySelector("#gfxQuality").value,
    });
    el.querySelector("#masterVal").textContent = pct(prefs.master);
    el.querySelector("#musicVal").textContent = pct(prefs.music);
    el.querySelector("#sfxVal").textContent = pct(prefs.sfx);
  };
  el.querySelectorAll("input, select").forEach((input) => {
    input.addEventListener("input", () => {
      Sfx.unlock();
      live();
      if (input.id === "sfxVol" || input.id === "muteAll") Sfx.tap();
    });
  });
  el.querySelector("#closeSettings").onclick = () => {
    el.hidden = true;
  };
  el.querySelector("#resetData").onclick = () => {
    askConfirm("This clears your bank, binder, and packs on this device. Volume settings stay.", () => {
      resetProgress();
      el.hidden = true;
    });
  };
  el.querySelector("#adminLogin").onclick = () => {
    el.hidden = true;
    openKeypad();
  };
}

function openKeypad() {
  const el = document.getElementById("settings-overlay");
  el.hidden = false;
  let digits = [];
  const paint = (note = "Enter code") => {
    el.innerHTML = `
      <div class="sheet-card menu-card">
        <div class="menu-head"><h2>Admin login</h2><button class="ghost" id="closePad" type="button">Close</button></div>
        <div class="code-box ${note === "Incorrect code" ? "shake" : ""}" id="codeBox">${digits.join("") || "—"}</div>
        <p class="code-note" id="codeNote">${note}</p>
        <div class="keypad">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9, "C", 0, "OK"].map((key) => `<button type="button" data-key="${key}">${key === "OK" ? "Enter" : key}</button>`).join("")}
        </div>
      </div>
    `;
    el.querySelector("#closePad").onclick = () => {
      el.hidden = true;
    };
    el.querySelectorAll("[data-key]").forEach((btn) => {
      btn.onclick = () => {
        const key = btn.dataset.key;
        if (key === "C") digits = [];
        else if (key === "OK") {
          if (digits.length === GATE.length && digits.every((n, i) => n === GATE[i])) {
            Sfx.granted();
            showGranted();
          } else {
            digits = [];
            paint("Incorrect code");
            Sfx.lose();
          }
          return;
        } else if (digits.length < 8) digits.push(Number(key));
        paint(digits.length ? "Enter code" : "Enter code");
      };
    });
  };
  paint();
}

function showGranted() {
  const el = document.getElementById("settings-overlay");
  el.innerHTML = `<div class="granted"><b>Admin access granted</b></div>`;
  setTimeout(openAdmin, 900);
}

function openAdmin() {
  const el = document.getElementById("settings-overlay");
  el.hidden = false;
  el.innerHTML = `
    <div class="sheet-card admin-card">
      <div class="menu-head"><h2>Admin panel</h2><button class="ghost" id="closeAdmin" type="button">Close</button></div>
      <p class="admin-tag">Local game data only</p>
      <section>
        <h3>Money</h3>
        <div class="row">
          <input id="moneyAmount" type="number" min="0" step="0.01" placeholder="Amount" />
          <button class="primary" id="giveMoney" type="button">Give money</button>
          <button class="ghost" id="setMoney" type="button">Set exact</button>
        </div>
        <div class="quick">
          ${[100, 1000, 10000, 100000, 1000000].map((n) => `<button type="button" data-add="${n}">+${money(n)}</button>`).join("")}
        </div>
      </section>
      <section>
        <h3>Cards</h3>
        <input id="cardSearch" type="search" placeholder="Search cards" />
        <div class="row">
          <select id="cardRarity">${RARITIES.map((r) => `<option value="${r.id}" ${r.id === adminRarity ? "selected" : ""}>${r.label}</option>`).join("")}</select>
          <select id="cardPack">${PACKS.map((p) => `<option value="${p.id}" ${p.id === adminPack ? "selected" : ""}>${money(p.price)} ${p.name}</option>`).join("")}</select>
        </div>
        <div id="cardResults" class="pick-list"></div>
        <div class="stepper">
          <button type="button" id="qtyDown">−</button>
          <b id="qtyLabel">${adminQty}</b>
          <button type="button" id="qtyUp">+</button>
          <button class="primary" id="giveCard" type="button">Give card</button>
        </div>
      </section>
      <section>
        <h3>Packs</h3>
        <p class="meta">$100,000 LIMITED remaining: ${limitedLeft()} / ${LIMITED_TOTAL}</p>
        <div class="quick" id="packGifts">
          ${PACKS.map((p) => `<button type="button" data-pack="${p.id}">${money(p.price)}</button>`).join("")}
        </div>
        <button class="ghost" id="restockLimited" type="button">Reset limited pack supply</button>
        <div class="row">
          <input id="supplyAmount" type="number" min="0" step="1" placeholder="Limited supply" />
          <button class="ghost" id="setSupply" type="button">Set pack supply</button>
        </div>
      </section>
      <section>
        <h3>Achievements</h3>
        <div class="quick">
          <button type="button" id="unlockAchievements">Unlock achievements</button>
          <select id="grantAchievement">${typeof ACHIEVEMENTS === "undefined" ? "" : ACHIEVEMENTS.map((item) => `<option value="${item.id}">${item.name}</option>`).join("")}</select>
          <button type="button" id="giveAchievement">Give achievement</button>
        </div>
      </section>
      <section>
        <h3>Rewards</h3>
        <p class="meta">Placeholder rewards only. Nothing here pays real money.</p>
        <div class="reward-table" id="adminRewards">${rewardAdminRows()}</div>
      </section>
      <section>
        <h3>Collection</h3>
        <input id="collectionSearch" type="search" placeholder="Search collection" />
        <div id="collectionList" class="pick-list"></div>
        <button class="ghost danger" id="clearCollection" type="button">Clear collection</button>
      </section>
      <section>
        <h3>Game controls</h3>
        <div class="quick">
          <button type="button" id="resetMoney">Reset money</button>
          <button type="button" id="unlockPacks">Unlock all packs</button>
          <button type="button" id="unlockCards">Unlock all cards</button>
          <button type="button" id="maxCards">Max out collection</button>
          <button class="danger" type="button" id="resetProgress">Reset progress</button>
        </div>
      </section>
    </div>
  `;
  el.querySelector("#closeAdmin").onclick = () => {
    el.hidden = true;
  };
  el.querySelector("#giveMoney").onclick = () => giveMoney(el.querySelector("#moneyAmount").value);
  el.querySelector("#setMoney").onclick = () => setMoney(el.querySelector("#moneyAmount").value);
  el.querySelectorAll("[data-add]").forEach((btn) => {
    btn.onclick = () => giveMoney(btn.dataset.add);
  });
  const rerenderCards = () => {
    adminRarity = el.querySelector("#cardRarity").value;
    adminPack = el.querySelector("#cardPack").value;
    renderCardPicker();
  };
  el.querySelector("#cardSearch").addEventListener("input", renderCardPicker);
  el.querySelector("#cardRarity").addEventListener("change", rerenderCards);
  el.querySelector("#cardPack").addEventListener("change", rerenderCards);
  el.querySelector("#qtyDown").onclick = () => {
    adminQty = Math.max(1, adminQty - 1);
    el.querySelector("#qtyLabel").textContent = adminQty;
  };
  el.querySelector("#qtyUp").onclick = () => {
    adminQty = Math.min(99, adminQty + 1);
    el.querySelector("#qtyLabel").textContent = adminQty;
  };
  el.querySelector("#giveCard").onclick = giveCardCopies;
  el.querySelectorAll("[data-pack]").forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.pack;
      const pack = PACKS.find((p) => p.id === id);
      if (pack.limited && limitedLeft() <= 0) {
        toast("Sold out");
        return;
      }
      state.packs[id] = (state.packs[id] || 0) + 1;
      afterAdminChange(`${pack.name} added`);
    };
  });
  el.querySelector("#restockLimited").onclick = () => {
    setLimitedLeft(LIMITED_TOTAL);
    afterAdminChange("Limited packs restocked");
    openAdmin();
  };
  el.querySelector("#setSupply").onclick = () => {
    const n = Math.floor(Number(el.querySelector("#supplyAmount").value));
    if (!Number.isFinite(n) || n < 0) {
      toast("Enter a supply");
      return;
    }
    setLimitedLeft(n);
    afterAdminChange(`Limited supply ${n}`);
    openAdmin();
  };
  el.querySelector("#unlockAchievements").onclick = () => {
    if (typeof unlockAllAchievements === "function") unlockAllAchievements();
  };
  el.querySelector("#giveAchievement").onclick = () => {
    if (typeof grantAchievement === "function") grantAchievement(el.querySelector("#grantAchievement").value);
  };
  el.querySelectorAll("[data-reward]").forEach((sel) => {
    sel.onchange = () => {
      setRewardStatus(sel.dataset.reward, sel.value);
      toast("Reward status updated");
    };
  });
  el.querySelector("#collectionSearch").addEventListener("input", renderCollectionList);
  el.querySelector("#clearCollection").onclick = () => askConfirm("Remove every card from the binder?", clearCollection);
  el.querySelector("#resetMoney").onclick = () => setMoney(STARTING_BANK);
  el.querySelector("#unlockPacks").onclick = () => {
    state.unlockAll = true;
    afterAdminChange("All packs unlocked");
  };
  el.querySelector("#unlockCards").onclick = unlockAllCards;
  el.querySelector("#maxCards").onclick = () => askConfirm("Fill the binder with 10 copies of every card and rarity?", maxCollection);
  el.querySelector("#resetProgress").onclick = () => askConfirm("Reset money, packs, and the binder on this device?", resetProgress);
  renderCardPicker();
  renderCollectionList();
}

applyPrefs(prefs);
