const WIN_AMOUNT = 1_000_000_000;
const STARTING_BANK = 100;
const STORAGE_KEY = "mr-gamble-v5";
const BINDER_KEY = "mr-gamble-binder";
const SETTINGS_KEY = "mr-gamble-settings";
const REWARD_KEY = "mr-gamble-rewards";
const LIMITED_KEY = "mr-gamble-limited-left";
const LIMITED_TOTAL = 10;
const META_KEY = "mr-gamble-meta";
let SET_SIZE = 12;

const TYPES = {
  fire: { label: "Fire", color: "#ff6b3d" },
  water: { label: "Water", color: "#3da9ff" },
  volt: { label: "Volt", color: "#f5d142" },
  earth: { label: "Earth", color: "#7ac96a" },
  dusk: { label: "Dusk", color: "#a77bff" },
  steel: { label: "Steel", color: "#b8c2d6" },
  light: { label: "Light", color: "#ffe08a" },
  frost: { label: "Frost", color: "#9fe8ff" },
  aether: { label: "Aether", color: "#d4b8ff" },
};

const RARITIES = [
  { id: "common", label: "Common", t: 0, color: "#f4f4f4" },
  { id: "uncommon", label: "Uncommon", t: 0.04, color: "#3dcf7a" },
  { id: "rare", label: "Rare", t: 0.1, color: "#3d8bff" },
  { id: "epic", label: "Epic", t: 0.2, color: "#b56bff" },
  { id: "legendary", label: "Legendary", t: 0.38, color: "#f5c542" },
  { id: "ultra", label: "Ultra Rare", t: 0.58, color: "#ff3344" },
  { id: "secret", label: "Secret Rare", t: 0.78, color: "#d8fff8" },
  { id: "grail", label: "Grail", t: 0.92, color: "#ffe08a" },
  { id: "holy", label: "Holy Grail", t: 1, color: "#ffffff" },
];

const CATALOG = [
  { id: "emberfox", name: "Emberfox", type: "fire", hp: 70, art: "assets/emberfox.png", attack: { name: "Coal Dash", dmg: 30 }, special: { name: "Wildfire", dmg: 60 }, flavor: "Its tail never cools." },
  { id: "tidalfin", name: "Tidalfin", type: "water", hp: 80, art: "assets/tidalfin.png", attack: { name: "Pearl Lash", dmg: 20 }, special: { name: "Moon Tide", dmg: 70 }, flavor: "Rides the midnight current." },
  { id: "voltspire", name: "Voltspire", type: "volt", hp: 60, art: "assets/voltspire.png", attack: { name: "Glass Spark", dmg: 20 }, special: { name: "Storm Crown", dmg: 80 }, flavor: "Nests on lightning rods." },
  { id: "mossback", name: "Mossback", type: "earth", hp: 120, art: "assets/mossback.png", attack: { name: "Root Guard", dmg: 10 }, special: { name: "Grove Smash", dmg: 50 }, flavor: "A forest that learned to walk." },
  { id: "nightwisp", name: "Nightwisp", type: "dusk", hp: 50, art: "assets/nightwisp.png", attack: { name: "Lantern Dust", dmg: 20 }, special: { name: "Grave Flicker", dmg: 70 }, flavor: "Follow the light, if you dare." },
  { id: "ironmaw", name: "Ironmaw", type: "steel", hp: 90, art: "assets/ironmaw.png", attack: { name: "Mercury Bite", dmg: 40 }, special: { name: "Foundry Howl", dmg: 80 }, flavor: "Forged, not born." },
  { id: "solaryx", name: "Solaryx", type: "light", hp: 100, art: "assets/solaryx.png", attack: { name: "Dawn Claw", dmg: 40 }, special: { name: "Solar Roar", dmg: 90 }, flavor: "The mesa kneels at sunrise." },
  { id: "frostling", name: "Frostling", type: "frost", hp: 70, art: "assets/frostling.png", attack: { name: "Rime Gaze", dmg: 20 }, special: { name: "Aurora Veil", dmg: 60 }, flavor: "Silent as falling snow." },
  { id: "pyrelash", name: "Pyrelash", type: "fire", hp: 80, art: "assets/pyrelash.png", attack: { name: "Magma Coil", dmg: 40 }, special: { name: "Furnace Fang", dmg: 90 }, flavor: "It drinks from lava rivers." },
  { id: "aetherwing", name: "Aetherwing", type: "aether", hp: 110, art: "assets/aetherwing.png", attack: { name: "Comet Drift", dmg: 50 }, special: { name: "Galaxy Fold", dmg: 100 }, flavor: "A constellation with teeth." },
  { id: "glimmoth", name: "Glimmoth", type: "light", hp: 40, art: "assets/glimmoth.png", attack: { name: "Prism Dust", dmg: 10 }, special: { name: "Stained Glass", dmg: 50 }, flavor: "Wings cut from jewelry." },
  { id: "terraklaw", name: "Terraklaw", type: "earth", hp: 95, art: "assets/terraklaw.png", attack: { name: "Faultline", dmg: 40 }, special: { name: "Canyon Break", dmg: 80 }, flavor: "The cliff that hunts." },
];

const HOUSE = {
  cheap: { common: 63.5, uncommon: 21, rare: 8.5, epic: 4, legendary: 1.8, ultra: 0.8, secret: 0.25, grail: 0.15, holy: 0 },
  mid: { common: 50, uncommon: 22, rare: 13, epic: 7, legendary: 4, ultra: 2, secret: 1.2, grail: 0.8, holy: 0 },
  high: { common: 46, uncommon: 22, rare: 14, epic: 8, legendary: 5, ultra: 2.5, secret: 1.5, grail: 1, holy: 0 },
  limited: { common: 18.75, uncommon: 20, rare: 18, epic: 15, legendary: 12, ultra: 8, secret: 5, grail: 3, holy: 0.25 },
  shadow: { common: 8, uncommon: 12, rare: 16, epic: 18, legendary: 18, ultra: 14, secret: 8, grail: 5, holy: 1 },
  eclipse: { common: 4, uncommon: 8, rare: 12, epic: 16, legendary: 18, ultra: 18, secret: 12, grail: 8, holy: 4 },
  seraph: { common: 0, uncommon: 4, rare: 8, epic: 12, legendary: 16, ultra: 20, secret: 18, grail: 14, holy: 8 },
};

const PACKS = [
  { id: "penny", name: "Penny Wax", tag: "PENNY", price: 1, min: 0.1, max: 20, odds: HOUSE.cheap, skin: "t1", accent: "#8ea0c8" },
  { id: "warmup", name: "Warm-Up Rip", tag: "WARM", price: 2.5, min: 0.25, max: 50, odds: HOUSE.cheap, skin: "t2", accent: "#7ad0a0" },
  { id: "street", name: "Street Heat", tag: "STREET", price: 5, min: 0.5, max: 100, odds: HOUSE.cheap, skin: "t3", accent: "#f0772a" },
  { id: "prime", name: "Prime Rip", tag: "PRIME", price: 10, min: 1, max: 200, odds: HOUSE.cheap, skin: "t4", accent: "#4aa3ff" },
  { id: "heat", name: "Heat Check", tag: "HEAT", price: 25, min: 2.5, max: 500, odds: HOUSE.mid, skin: "t5", accent: "#ff5c5c" },
  { id: "vault", name: "Night Vault", tag: "VAULT", price: 50, min: 5, max: 1000, odds: HOUSE.mid, skin: "t6", accent: "#9b6bff" },
  { id: "roller", name: "High Roller", tag: "ROLL", price: 100, min: 10, max: 2000, odds: HOUSE.mid, skin: "t7", accent: "#f3c14a" },
  { id: "case", name: "Breaker's Case", tag: "CASE", price: 250, min: 25, max: 5000, odds: HOUSE.high, skin: "t8", accent: "#3dd6d0" },
  { id: "gold", name: "Gold Wax", tag: "GOLD", price: 500, min: 50, max: 10000, odds: HOUSE.high, skin: "t9", accent: "#e2b84f" },
  { id: "hunt", name: "Grail Hunt", tag: "HUNT", price: 1000, min: 100, max: 20000, odds: HOUSE.high, skin: "t10", accent: "#ff7ad9" },
  { id: "break", name: "Vault Break", tag: "BREAK", price: 2500, min: 250, max: 50000, odds: HOUSE.high, skin: "t11", accent: "#ff8a3d" },
  { id: "god", name: "God Pack", tag: "GOD", price: 5000, min: 500, max: 100000, odds: HOUSE.high, skin: "t12", accent: "#ff4d6d" },
  {
    id: "limited",
    name: "$100,000 LIMITED",
    tag: "LIMITED",
    price: 100000,
    min: 1000,
    max: 1000000,
    odds: HOUSE.limited,
    skin: "t13",
    accent: "#ffe08a",
    limited: true,
    exclusive: true,
  },
  { id: "shadow", name: "Shadow Vault", tag: "SECRET", price: 150000, min: 5000, max: 2500000, odds: HOUSE.shadow, skin: "t6", accent: "#b9a6ff", secret: true, need: "Collect 50 unique cards." },
  { id: "eclipse", name: "Eclipse Tin", tag: "SECRET", price: 400000, min: 25000, max: 8000000, odds: HOUSE.eclipse, skin: "t8", accent: "#9fd6ff", secret: true, need: "Open 100 packs." },
  { id: "seraph", name: "Seraph Case", tag: "SECRET", price: 1000000, min: 100000, max: 25000000, odds: HOUSE.seraph, skin: "t10", accent: "#ffe7a3", secret: true, need: "Pull a Grail or Holy Grail." },
];

function rarityValue(pack, rarityId) {
  const rarity = RARITIES.find((r) => r.id === rarityId);
  return Math.round((pack.min + (pack.max - pack.min) * rarity.t) * 100) / 100;
}

function expectedValue(pack) {
  return RARITIES.reduce((sum, rarity) => sum + ((pack.odds[rarity.id] || 0) / 100) * rarityValue(pack, rarity.id), 0);
}
