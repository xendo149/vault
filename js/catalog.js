function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function mulberry(seed) {
  let s = seed || 1;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function hsl(h, s, l) {
  return `hsl(${Math.round(h % 360)} ${Math.round(s)}% ${Math.round(l)}%)`;
}

function polygon(cx, cy, radius, sides, rand) {
  const spin = rand() * Math.PI * 2;
  const pts = [];
  for (let i = 0; i < sides; i += 1) {
    const a = spin + (i / sides) * Math.PI * 2;
    pts.push(`${(cx + Math.cos(a) * radius).toFixed(1)},${(cy + Math.sin(a) * radius).toFixed(1)}`);
  }
  return pts.join(" ");
}

function makeArt(id, rarity) {
  const rand = mulberry(hashString(`${id}:${rarity}`));
  const hue = Math.floor(rand() * 360);
  const shapes = [];
  const count = rarity === "holy" ? 8 : 4 + Math.floor(rand() * 5);
  for (let i = 0; i < count; i += 1) {
    const cx = 16 + rand() * 168;
    const cy = 14 + rand() * 112;
    const radius = 8 + rand() * (rarity === "common" ? 22 : 40);
    const fill = hsl(hue + i * (18 + rand() * 24), 62 + rand() * 30, 38 + rand() * 28);
    const kind = Math.floor(rand() * 5);
    if (kind === 0) shapes.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${radius.toFixed(1)}" fill="${fill}" opacity="0.9"/>`);
    else if (kind === 1) shapes.push(`<polygon points="${polygon(cx, cy, radius, 3 + Math.floor(rand() * 5), rand)}" fill="${fill}" opacity="0.88"/>`);
    else if (kind === 2) shapes.push(`<rect x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" width="${radius.toFixed(1)}" height="${(radius * 0.62).toFixed(1)}" rx="8" fill="${fill}" transform="rotate(${Math.floor(rand() * 70)} ${cx.toFixed(1)} ${cy.toFixed(1)})"/>`);
    else if (kind === 3) shapes.push(`<path d="M${cx.toFixed(1)} ${cy.toFixed(1)} q ${radius.toFixed(1)} ${(-radius).toFixed(1)} ${(radius * 1.3).toFixed(1)} 4" stroke="${fill}" fill="none" stroke-width="3"/>`);
    else shapes.push(`<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${radius.toFixed(1)}" ry="${(radius * 0.45).toFixed(1)}" fill="${fill}" opacity="0.8"/>`);
  }
  const pulse = rarity === "holy" || rarity === "grail" || rarity === "secret"
    ? `<circle cx="100" cy="70" r="18" fill="none" stroke="#fff" stroke-width="2" opacity="0.8"><animate attributeName="r" values="10;46;10" dur="${rarity === "holy" ? "1.8s" : "3s"}" repeatCount="indefinite"/></circle>`
    : "";
  const marks = [];
  const markCount = rarity === "holy" ? 14 : rarity === "common" ? 4 : 7;
  for (let i = 0; i < markCount; i += 1) {
    const x = (rand() * 200).toFixed(1);
    const y = (rand() * 140).toFixed(1);
    if (rarity === "holy" || rarity === "grail") marks.push(`<path d="M${x} ${y} l2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1z" fill="#fff" opacity="0.75"/>`);
    else if (rarity === "common") marks.push(`<line x1="0" y1="${y}" x2="200" y2="${(Number(y) + 18).toFixed(1)}" stroke="#fff" opacity="0.12"/>`);
    else marks.push(`<circle cx="${x}" cy="${y}" r="1.4" fill="#fff" opacity="0.45"/>`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 140"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hsl(hue, 78, rarity === "holy" ? 62 : 30)}"/><stop offset="1" stop-color="${hsl(hue + 70, 70, 14)}"/></linearGradient></defs><rect width="200" height="140" fill="url(#g)"/>${marks.join("")}${shapes.join("")}${pulse}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const FIRST = ["Ash","Cinder","Vesper","Nimbus","Quill","Sable","Brine","Ivory","Hollow","Rune","Marrow","Velvet","Copper","Gale","Thorn","Onyx","Lumen","Drift","Amber","Pyre","Moss","Quartz","Dusk","Fen","Wisp"];
const SECOND = ["Moth","Drake","Oracle","Stag","Kraken","Viper","Heron","Golem","Sphinx","Lynx","Rook","Newt","Basilisk","Hart","Owl","Koi","Wolf","Ibex","Mantis","Seraph","Toad","Crane"];
const FLAVOR = [
  "Seen once, then never again.",
  "The wax remembers this one.",
  "Collectors argue over the name.",
  "It hums when the pack is warm.",
  "A margin note calls it cursed.",
  "Printed on a night with no moon.",
  "The border was cut by hand.",
  "Nobody agrees what it hunts.",
];
const MOVES = ["Gleam","Rift","Prowl","Hush","Brand","Surge","Veil","Clash","Drift","Knell"];
const TYPE_IDS = Object.keys(TYPES);
const RARITY_PLAN = [
  ["common", 180],
  ["uncommon", 120],
  ["rare", 80],
  ["epic", 50],
  ["legendary", 30],
  ["ultra", 20],
  ["secret", 12],
  ["grail", 5],
  ["holy", 3],
];

const LOW = ["penny", "warmup", "street"];
const MID = ["prime", "heat", "vault", "roller"];
const HIGH = ["case", "gold", "hunt", "break", "god"];

function packsFor(rarity, index) {
  if (rarity === "holy") return ["limited", "seraph", "eclipse", "shadow"];
  if (rarity === "grail") return index % 2 === 0 ? ["limited", "seraph", "eclipse"] : ["god", "break", "seraph"];
  if (rarity === "secret") return index % 3 === 0 ? ["limited", "eclipse", "shadow"] : ["god", "hunt", "break", "seraph"];
  if (rarity === "ultra" || rarity === "legendary") return [HIGH[index % HIGH.length], "limited", "shadow", "eclipse"];
  if (rarity === "epic" || rarity === "rare") return [MID[index % MID.length], HIGH[index % HIGH.length], "shadow"];
  return [LOW[index % LOW.length], MID[index % MID.length]];
}

function homePack(ids) {
  return PACKS.find((pack) => pack.id === ids[0]) || PACKS[0];
}

function cardValue(pack, rarity, seed) {
  const base = rarityValue(pack, rarity);
  const span = Math.max(0.05, (pack.max - pack.min) * 0.06);
  const nudge = ((seed % 997) / 997) * span;
  const wobble = 0.9 + ((seed >>> 8) % 180) / 1000;
  let value = base * wobble + nudge;
  if (rarity === "holy") value = pack.max * (0.9 + ((seed % 80) + 1) / 1000);
  value = Math.min(pack.max, Math.max(pack.min, value));
  return Math.round(value * 100) / 100;
}

function valueForPack(pack, card) {
  const seed = hashString(`${card.id}:${pack.id}:${card.rarity}`);
  const base = rarityValue(pack, card.rarity);
  const span = Math.max(0.05, (pack.max - pack.min) * 0.04);
  const wobble = 0.96 + (seed % 80) / 1000;
  let value = base * wobble + ((seed % 997) / 997) * span;
  if (card.rarity === "holy") value = pack.max * (0.9 + ((seed % 80) + 1) / 1000);
  if (card.finish && card.finish !== "base") value *= 1.1;
  value = Math.min(pack.max, Math.max(pack.min, value));
  return Math.round(value * 100) / 100;
}

CATALOG.forEach((card, index) => {
  const rarity = ["rare", "epic", "legendary", "ultra", "grail", "secret"][index % 6];
  const packs = packsFor(rarity, index);
  card.rarity = rarity;
  card.packs = packs;
  card.number = String(index + 1).padStart(3, "0");
  card.value = cardValue(homePack(packs), rarity, hashString(card.id));
  card.exclusive = packs.length === 1 && packs[0] === "limited";
  card.motif = index % 8;
});

const queue = [];
RARITY_PLAN.forEach(([rarity, count]) => {
  for (let i = 0; i < count; i += 1) queue.push(rarity);
});

for (let i = 0; i < queue.length; i += 1) {
  const rarity = queue[i];
  const name = `${FIRST[i % FIRST.length]} ${SECOND[Math.floor(i / FIRST.length) % SECOND.length]}`;
  const id = `set-${String(i + 1).padStart(3, "0")}`;
  const packs = packsFor(rarity, i);
  const type = TYPE_IDS[i % TYPE_IDS.length];
  const seed = hashString(id);
  const hp = 36 + (seed % 90);
  CATALOG.push({
    id,
    name,
    type,
    hp,
    art: makeArt(id, rarity),
    attack: { name: `${MOVES[i % MOVES.length]} Mark`, dmg: 10 + (seed % 40) },
    special: { name: `${MOVES[(i + 3) % MOVES.length]} Crown`, dmg: 40 + (seed % 70) },
    flavor: `${name} — ${FLAVOR[i % FLAVOR.length]}`,
    rarity,
    packs,
    number: String(CATALOG.length + 1).padStart(3, "0"),
    value: cardValue(homePack(packs), rarity, seed),
    exclusive: packs.length === 1 && packs[0] === "limited",
    motif: seed % 8,
  });
}

for (const pack of PACKS) {
  for (const rarity of RARITIES) {
    if (!(pack.odds[rarity.id] > 0)) continue;
    if (CATALOG.some((card) => card.rarity === rarity.id && card.packs.includes(pack.id))) continue;
    const donor = CATALOG.find((card) => card.rarity === rarity.id && !card.exclusive);
    if (donor && !donor.packs.includes(pack.id)) donor.packs.push(pack.id);
  }
}

SET_SIZE = CATALOG.length;
