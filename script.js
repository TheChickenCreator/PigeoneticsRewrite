const PATTERN_ORDER = ["L", "B", "C", "T"];
const PATTERN_NAMES = {
  "L": "Barless",
  "B": "Bar",
  "C": "Checker",
  "T": "T-check"
};

function formatPatternDisplay(patternAlleles) {
  if (!Array.isArray(patternAlleles) || patternAlleles.length < 2) {
    console.warn("Invalid pattern alleles:", patternAlleles);
    return "Unknown";
  }
  const dominant = patternAlleles.reduce((a, b) => {
    return PATTERN_ORDER.indexOf(a) > PATTERN_ORDER.indexOf(b) ? a : b;
  });
  return PATTERN_NAMES[dominant] || dominant;
}

function formatTime(ms) {
  if (!ms || ms <= 0) return "Ready";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

let coins = localStorage.getItem("coins") ? parseInt(localStorage.getItem("coins")) : 0;
let energy = localStorage.getItem("energy") ? parseInt(localStorage.getItem("energy")) : 100;
let lastUpdate = localStorage.getItem("lastUpdate") ? parseInt(localStorage.getItem("lastUpdate")) : Date.now();
let loftCapacity = 50;
let pigeons = JSON.parse(localStorage.getItem("pigeons")) || [];
let breedingSelection = { male: null, female: null };
let inventory = JSON.parse(localStorage.getItem("inventory")) || { "Energy Renewal": 0, "Breeding Cooldown": 0, "Baby Auto Grow": 0 };
let infiniteEnergy = localStorage.getItem("infiniteEnergy") === "true";
let adminKeySequence = "";
const GAME_VERSION = 4;

const COLOR_ALLELES = {
  'B+': "Ash red",
  'B': "Blue",
  'b': "Brown"
};
const COLOR_DOMINANCE = ['B+', 'B', 'b'];

const BASE_COLORS = {
  "Ash red": "./red_bar.gif",
  "Blue": "./blue_bar.gif",
  "Brown": "./brown_bar.gif",
  "Recessive red": "./red_recessive.gif"
};
const DILUTE_COLORS = {
  "Ash red": "./yellow_bar.gif",
  "Blue": "./silver_bar.gif",
  "Brown": "./brown_dilute.gif",
  "Recessive red": "./red_recessive.gif"
};
const SPREAD_COLORS = {
  "Ash red": "./red_spread.gif",
  "Blue": "./blue_spread.gif",
  "Brown": "./brown_spread.gif",
  "Recessive red": "./red_recessive.gif"
};
const BABY_IMAGE = "./squab.gif";
const PLACEHOLDER_IMAGE = "./placeholder.gif";

const BABY_GROW_COOLDOWN = 20 * 60 * 1000;
const HEN_BREED_COOLDOWN = 45 * 60 * 1000;

function randChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function clamp01(n) { return Math.max(0, Math.min(100, n)); }

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, initializing game...");
  try {
    const homeScreen = document.getElementById("home-screen");
    if (!homeScreen) throw new Error("Home screen not found");
    const loftScreen = document.getElementById("loft-screen");
    const breedingScreen = document.getElementById("breeding-screen");
    const exploreScreen = document.getElementById("explore-screen");
    const storeScreen = document.getElementById("store-screen");
    const pigeonDetailScreen = document.getElementById("pigeon-detail-screen");
    const adminPanel = document.getElementById("admin-panel");
    const cooldownSelectScreen = document.getElementById("cooldown-select-screen");
    const growSelectScreen = document.getElementById("grow-select-screen");

    initializeGame();
    setupEventListeners();
    switchView("home-screen");
    updateEnergy();
    updateCoins();
    updateInventoryDisplay();
    displayPigeons();
  } catch (err) {
    console.error("Initialization error:", err);
    alert("Failed to initialize game. Check console for details.");
  }
});

function initializeGame() {
  if (!pigeons || pigeons.length === 0) {
    console.log("No pigeons found, creating initial pigeons...");
    pigeons = [];
    pigeons.push(generatePigeon(1, "Male"));
    pigeons.push(generatePigeon(2, "Female"));
    while (pigeons.length < loftCapacity) pigeons.push(null);
    saveGameState();
  } else {
    while (pigeons.length < loftCapacity) pigeons.push(null);
    if (pigeons.length > loftCapacity) pigeons = pigeons.slice(0, loftCapacity);
  }
  const storedVersion = localStorage.getItem("gameVersion") ? parseInt(localStorage.getItem("gameVersion")) : 0;
  if (storedVersion < GAME_VERSION) {
    console.log("Migrating pigeons for game version", GAME_VERSION);
    pigeons.forEach(p => {
      if (p) {
        // Remove deprecated recessiveColor property
        delete p.recessiveColor;
        // Ensure genotype.Z aligns with primaryColor
        if (!p.genotype || !p.genotype.Z) {
          p.genotype = p.genotype || { autosomal: {} };
          p.genotype.Z = p.gender === "Male" ? [Object.keys(COLOR_ALLELES).find(k => COLOR_ALLELES[k] === p.primaryColor) || 'B', randChoice(['B+', 'B', 'b'])] : [Object.keys(COLOR_ALLELES).find(k => COLOR_ALLELES[k] === p.primaryColor) || 'B', 'W'];
          p.genotype.autosomal = p.genotype.autosomal || {};
          p.genotype.autosomal.recessive_red = p.genotype.autosomal.recessive_red || [randChoice(['R', 'r']), randChoice(['R', 'r'])];
        }
        if (p.primaryColor === "Recessive red" && !p.genotype.autosomal.recessive_red.every(a => a === "r")) {
          p.genotype.autosomal.recessive_red = ["r", "r"];
        }
        if (!p.isBaby) {
          applyModifiers(p);
        }
      }
    });
    localStorage.setItem("gameVersion", GAME_VERSION);
    saveGameState();
  }
  processOfflineProgress();
}

function setupEventListeners() {
  const buttons = {
    loftBtn: () => switchView("loft-screen"),
    exploreBtn: () => switchView("explore-screen"),
    storeBtn: () => { switchView("store-screen"); openStore(); },
    backHomeLoft: () => switchView("home-screen"),
    backHomeBreed: () => switchView("home-screen"),
    backHomeExplore: () => switchView("home-screen"),
    backHomeStore: () => switchView("home-screen"),
    backLoftDetail: () => switchView("loft-screen"),
    backHomeAdmin: () => switchView("home-screen"),
    backHomeCooldown: () => { switchView("store-screen"); openStore(); },
    backHomeGrow: () => { switchView("store-screen"); openStore(); },
    breedBtnLoft: () => { switchView("breeding-screen"); openBreeding(); },
    toStoreBtn: () => { switchView("store-screen"); openStore(); },
    toExploreBtn: () => switchView("explore-screen"),
    toLoftBtnExplore: () => switchView("loft-screen"),
    toLoftBtnStore: () => switchView("loft-screen"),
    sellPigeonBtn: () => {
      const id = parseInt(document.getElementById("sellPigeonBtn").dataset.pigeonId, 10);
      sellPigeon(id);
      switchView("loft-screen");
    },
    renamePigeonBtn: () => {
      const id = parseInt(document.getElementById("renamePigeonBtn").dataset.pigeonId, 10);
      renamePigeon(id);
    },
    sellAllPigeonsBtn: () => sellAllPigeons(),
    exploreBtnInner: window.explore
  };

  Object.entries(buttons).forEach(([id, handler]) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener("click", handler);
    } else {
      console.warn(`Button with ID ${id} not found`);
    }
  });

  document.addEventListener("keydown", (e) => {
    adminKeySequence += e.key;
    if (adminKeySequence.includes("admin123")) {
      switchView("admin-panel");
      adminKeySequence = "";
    }
    if (adminKeySequence.length > 12) adminKeySequence = adminKeySequence.slice(-8);
  });

  const adminButtons = {
    createPigeonBtn: () => {
      const result = document.getElementById("admin-result");
      if (result) {
        result.innerHTML = `
          <input type="text" id="adminName" placeholder="Name">
          <select id="adminGender">
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          <select id="adminZ1">
            <option value="B+">Ash red</option>
            <option value="B">Blue</option>
            <option value="b">Brown</option>
          </select>
          <select id="adminZ2">
            <option value="W">W</option>
          </select>
          <select id="adminPattern1">
            ${PATTERN_ORDER.map(p => `<option value="${p}">${PATTERN_NAMES[p]}</option>`).join("")}
          </select>
          <select id="adminPattern2">
            ${PATTERN_ORDER.map(p => `<option value="${p}">${PATTERN_NAMES[p]}</option>`).join("")}
          </select>
          <select id="adminSpread"><option value="S">S</option><option value="s">s</option></select>
          <select id="adminDilute"><option value="D">D</option><option value="d">d</option></select>
          <select id="adminRecessiveRed1"><option value="R">R</option><option value="r">r</option></select>
          <select id="adminRecessiveRed2"><option value="R">R</option><option value="r">r</option></select>
          <button id="adminCreateBtn">Create</button>
        `;
        const genderSelect = document.getElementById("adminGender");
        const z2Select = document.getElementById("adminZ2");
        genderSelect.addEventListener("change", () => {
          if (genderSelect.value === "Female") {
            z2Select.disabled = true;
            z2Select.innerHTML = `<option value="W">W</option>`;
          } else {
            z2Select.disabled = false;
            z2Select.innerHTML = `
              <option value="B+">Ash red</option>
              <option value="B">Blue</option>
              <option value="b">Brown</option>
            `;
          }
        });
        document.getElementById("adminCreateBtn").addEventListener("click", createCustomPigeon);
      }
    },
    addCoinsBtn: () => {
      const amount = parseInt(prompt("Enter amount to add:") || "0", 10);
      if (!isNaN(amount) && amount > 0) {
        coins += amount;
        updateCoins();
        alert(`Added ${amount} coins!`);
      }
    },
    infiniteEnergyBtn: () => {
      infiniteEnergy = !infiniteEnergy;
      alert(`Infinite energy ${infiniteEnergy ? "enabled" : "disabled"}!`);
      updateEnergy();
      saveGameState();
    },
    addItemsBtn: () => {
      const result = document.getElementById("admin-result");
      if (result) {
        result.innerHTML = `
          <select id="itemSelect">
            <option value="Energy Renewal">Energy Renewal</option>
            <option value="Breeding Cooldown">Breeding Cooldown</option>
            <option value="Baby Auto Grow">Baby Auto Grow</option>
          </select>
          <input type="number" id="itemAmount" placeholder="Amount" min="1">
          <button id="adminAddItemsBtn">Add</button>
        `;
        document.getElementById("adminAddItemsBtn").addEventListener("click", addItems);
      }
    },
    editPigeonBtn: () => {
      const result = document.getElementById("admin-result");
      if (result) {
        result.innerHTML = "<select id='editPigeonSelect'></select><button id='editPigeonStartBtn'>Edit</button>";
        const select = document.getElementById("editPigeonSelect");
        pigeons.forEach(p => {
          if (p) {
            const opt = document.createElement("option");
            opt.value = p.id;
            opt.textContent = `${p.name} (${p.displayedColor})`;
            select.appendChild(opt);
          }
        });
        document.getElementById("editPigeonStartBtn").addEventListener("click", showEditForm);
      }
    }
  };

  Object.entries(adminButtons).forEach(([id, handler]) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener("click", handler);
    } else {
      console.warn(`Admin button with ID ${id} not found`);
    }
  });
}

function switchView(id) {
  const sections = document.querySelectorAll(".section");
  sections.forEach(el => {
    el.style.display = "none";
    el.classList.remove("active");
  });
  const target = document.getElementById(id);
  if (target) {
    target.style.display = "block";
    target.classList.add("active");
    console.log(`Switched to view: ${id}`);
  } else {
    console.error(`Section with ID ${id} not found`);
  }
  updateEnergy();
  updateCoins();
  updateInventoryDisplay();
  if (id === "loft-screen") displayPigeons();
}

function processOfflineProgress() {
  const now = Date.now();
  const delta = now - lastUpdate;
  if (!infiniteEnergy) {
    const refillRate = 5 / 60; // 5% per minute
    const refillAmount = delta / 1000 * refillRate;
    energy = clamp01(energy + refillAmount);
  }
  let updateNeeded = false;
  pigeons.forEach(p => {
    if (p) {
      if (p.isBaby && p.matureTime && now >= p.matureTime) {
        growPigeon(p);
        updateNeeded = true;
      }
      if (p.breedCooldown && p.breedCooldown > 0) {
        p.breedCooldown = Math.max(0, p.breedCooldown - delta);
        updateNeeded = true;
      }
    }
  });
  lastUpdate = now;
  if (updateNeeded) {
    displayPigeons();
    saveGameState();
  }
}

function growPigeon(pigeon) {
  if (!pigeon) return;
  pigeon.isBaby = false;
  pigeon.matureTime = null;
  applyModifiers(pigeon);
  saveGameState();
}

function updateEnergy() {
  if (!infiniteEnergy) energy = clamp01(energy);
  const energyTextElements = document.querySelectorAll(".energy-text");
  const energyBarElements = document.querySelectorAll(".energy-bar");
  if (energyTextElements.length === 0 || energyBarElements.length === 0) {
    console.warn("Energy elements not found");
    return;
  }
  energyTextElements.forEach(el => {
    el.textContent = infiniteEnergy ? "∞%" : `${Math.floor(energy)}%`;
  });
  energyBarElements.forEach(bar => {
    bar.style.width = `${energy}%`;
    bar.classList.remove("energy-low", "energy-medium", "energy-full");
    if (infiniteEnergy) {
      bar.classList.add("energy-full");
    } else if (energy <= 32) {
      bar.classList.add("energy-low");
    } else if (energy <= 65) {
      bar.classList.add("energy-medium");
    } else {
      bar.classList.add("energy-full");
    }
  });
}

function updateCoins() {
  const coinTextElements = document.querySelectorAll(".coin-text");
  if (coinTextElements.length === 0) {
    console.warn("Coin text elements not found");
    return;
  }
  coinTextElements.forEach(el => {
    el.textContent = coins;
  });
}

function updateInventoryDisplay() {
  const inventoryDisplays = document.querySelectorAll("#inventory-display");
  if (inventoryDisplays.length === 0) {
    console.warn("Inventory display elements not found");
    return;
  }
  inventoryDisplays.forEach(el => {
    el.innerHTML = "<h3>Inventory</h3>";
    for (const [item, qty] of Object.entries(inventory)) {
      el.innerHTML += `<p>${item}: ${qty}</p>`;
    }
  });
}

const pigeonNames = ["Sky", "Ash", "Cloud", "Marble", "Rusty", "Pepper", "Willow", "Scout", "Echo", "Drift", "Sadie", "Nyssa", "Brian", "Blakely", "Chops", "Luna", "Zephyr", "Talon", "Breeze", "Flint", "Raven", "Glimmer", "Dusk", "Flicker", "Haze", "Soot", "Cinder", "Storm", "Misty", "Shadow", "Blaze", "Sparrow", "Dawn", "Pebble", "Gust", "Feather", "Slate", "Drizzle", "Smoky", "Wisp", "Nimbus", "Quill", "Frost", "Ember", "Ripple", "Cobalt", "Sable", "Tide", "Boulder", "Sprout", "Gale", "Twilight", "Coral", "Saffron", "Jasper", "Onyx", "Thistle", "Vapor", "Crimson", "Fern", "Horizon", "Tundra", "Moss", "Ziggy", "Comet", "Dune", "Fog", "Canyon", "Velvet", "Whisper", "Bramble", "Star", "Clove", "Driftwood", "Hawk", "Ivy", "Cedar", "Noodle", "Pippin", "Clover", "Dandelion", "Maple", "Sienna", "Basil", "Thorn", "Glint", "Mica", "Fable", "Wren", "Topaz", "Biscuit", "Hopper", "Sage", "Coco", "Flurry", "Parchment", "Acorn", "Chalk", "Sooty", "Blossom", "Cricket", "Taffy", "Meadow", "Birch", "Sprig"];
function getRandomName() { return randChoice(pigeonNames); }

function generatePigeon(id, gender = null, isBaby = false, parents = null) {
  gender = gender || (Math.random() < 0.5 ? "Male" : "Female");
  const patternAlleles = [randChoice(PATTERN_ORDER), randChoice(PATTERN_ORDER)];
  const z1 = randChoice(['B+', 'B', 'b']);
  const z2 = gender === "Male" ? randChoice(['B+', 'B', 'b']) : 'W';
  const recessiveRed1 = Math.random() < 0.5 ? "R" : "r";
  const recessiveRed2 = Math.random() < 0.5 ? "R" : "r";
  const genotype = {
    sex: gender,
    Z: [z1, z2],
    autosomal: {
      pattern: patternAlleles,
      spread: [Math.random() < 0.5 ? "S" : "s", Math.random() < 0.5 ? "S" : "s"],
      dilute: [Math.random() < 0.5 ? "D" : "d", Math.random() < 0.5 ? "D" : "d"],
      recessive_red: [recessiveRed1, recessiveRed2]
    }
  };

  const primaryColor = resolveBaseColor(genotype);
  let sprite = isBaby ? "./squab.gif" : BASE_COLORS[primaryColor] || PLACEHOLDER_IMAGE;

  const pigeon = {
    id,
    name: getRandomName(),
    gender,
    genotype,
    primaryColor,
    displayedColor: primaryColor,
    sprite,
    isBaby: !!isBaby,
    breedCooldown: 0,
    matureTime: isBaby ? Date.now() + BABY_GROW_COOLDOWN : null,
    parents: parents || null,
    traits: {
      pattern: patternAlleles,
      headcrest: Math.random() < 0.08 ? "Crested" : "None"
    }
  };

  if (!isBaby) applyModifiers(pigeon);
  return pigeon;
}

function resolveBaseColor(genotype) {
  if (!genotype || !genotype.Z) {
    console.warn("Invalid genotype for color resolution");
    return "Blue";
  }
  if (genotype.autosomal.recessive_red.every(a => a === "r")) return "Recessive red";
  const zAlleles = genotype.Z.filter(a => a !== "W");
  const sorted = zAlleles.sort((a, b) => COLOR_DOMINANCE.indexOf(a) - COLOR_DOMINANCE.indexOf(b));
  return COLOR_ALLELES[sorted[0]] || "Blue";
}

function applyModifiers(p) {
  if (!p || !p.genotype || p.isBaby) {
    if (p.isBaby) {
      p.sprite = "./squab.gif";
      console.log(`Preserving baby sprite: ${p.sprite} for pigeon ${p.name}`);
    } else {
      console.warn("Invalid pigeon or genotype for applying modifiers:", p);
    }
    return;
  }
  p.spread = p.genotype.autosomal.spread.includes("S");
  p.dilute = p.genotype.autosomal.dilute.every(a => a === "d");
  p.recessiveRed = p.genotype.autosomal.recessive_red.every(a => a === "r");

  let modifiers = [];
  if (p.spread) modifiers.push("Spread");
  if (p.dilute) modifiers.push("Dilute");
  const patternName = formatPatternDisplay(p.traits.pattern);

  if (p.recessiveRed) {
    p.displayedColor = `Recessive Red (${p.primaryColor}, ${patternName}${modifiers.length ? ", " + modifiers.join(", ") : ""})`;
    p.sprite = SPREAD_COLORS["Recessive red"] || PLACEHOLDER_IMAGE;
    if (!SPREAD_COLORS["Recessive red"]) console.warn(`Recessive red sprite missing for pigeon ${p.name}`);
    console.log(`Applied Recessive Red sprite: ${p.sprite} for pigeon ${p.name}`);
  } else if (p.spread) {
    p.displayedColor = `${p.primaryColor} (${patternName}, Spread${p.dilute ? ", Dilute" : ""})`;
    p.sprite = SPREAD_COLORS[p.primaryColor] || BASE_COLORS[p.primaryColor] || PLACEHOLDER_IMAGE;
    console.log(`Applied Spread sprite: ${p.sprite} for ${p.primaryColor} pigeon ${p.name}`);
  } else if (p.dilute) {
    p.displayedColor = `${p.primaryColor} (${patternName}, Dilute)`;
    p.sprite = DILUTE_COLORS[p.primaryColor] || BASE_COLORS[p.primaryColor] || PLACEHOLDER_IMAGE;
    console.log(`Applied Dilute sprite: ${p.sprite} for ${p.primaryColor} pigeon ${p.name}`);
  } else {
    p.displayedColor = `${p.primaryColor} (${patternName})`;
    p.sprite = BASE_COLORS[p.primaryColor] || PLACEHOLDER_IMAGE;
    console.log(`Applied Base sprite: ${p.sprite} for ${p.primaryColor} pigeon ${p.name}`);
  }
}

function findPigeonById(id) {
  const pigeon = pigeons.find(p => p && p.id === id);
  if (!pigeon) console.warn(`Pigeon with ID ${id} not found`);
  return pigeon;
}

function getCarriedRecessives(pigeon) {
  const carried = [];
  if (pigeon.gender === "Male") {
    const z1 = pigeon.genotype.Z[0];
    const z2 = pigeon.genotype.Z[1];
    if (z1 !== z2) {
      const recessiveAllele = COLOR_DOMINANCE.indexOf(z1) < COLOR_DOMINANCE.indexOf(z2) ? z2 : z1;
      carried.push(COLOR_ALLELES[recessiveAllele]);
    }
  }
  if (pigeon.genotype.autosomal.recessive_red.includes("r") && !pigeon.genotype.autosomal.recessive_red.every(a => a === "r")) {
    carried.push("Recessive red");
  }
  return carried.length > 0 ? carried.join(", ") : "None";
}

function showPigeonDetail(id) {
  const pigeon = findPigeonById(id);
  if (!pigeon) return;
  switchView("pigeon-detail-screen");
  const content = document.getElementById("pigeon-detail-content");
  if (!content) {
    console.warn("Pigeon detail content not found");
    return;
  }
  const cooldown = pigeon.isBaby ? (pigeon.matureTime ? formatTime(Math.max(0, pigeon.matureTime - Date.now())) : "Ready") : (pigeon.breedCooldown ? formatTime(pigeon.breedCooldown) : "Ready");
  let lineage = "";
  if (pigeon.parents) {
    const sire = pigeon.parents.male ? `${pigeon.parents.male.name} (${pigeon.parents.male.displayedColor})` : "Unknown";
    const dam = pigeon.parents.female ? `${pigeon.parents.female.name} (${pigeon.parents.female.displayedColor})` : "Unknown";
    const grandsire = pigeon.parents.male && pigeon.parents.male.parents ? `${pigeon.parents.male.parents.male?.name || "Unknown"}` : "Unknown";
    const granddam = pigeon.parents.male && pigeon.parents.male.parents ? `${pigeon.parents.male.parents.female?.name || "Unknown"}` : "Unknown";
    lineage = `
      <p>Sire: ${sire}</p>
      <p>Dam: ${dam}</p>
      <p>Grandsire: ${grandsire}</p>
      <p>Granddam: ${granddam}</p>
    `;
  } else {
    lineage = `
      <p>Sire: Unknown</p>
      <p>Dam: Unknown</p>
      <p>Grandsire: Unknown</p>
      <p>Granddam: Unknown</p>
    `;
  }
  content.innerHTML = `
    <img src="${pigeon.sprite || PLACEHOLDER_IMAGE}" alt="${pigeon.name || 'Unnamed'}" data-last-src="${pigeon.sprite || PLACEHOLDER_IMAGE}" onerror="if (this.src !== '${PLACEHOLDER_IMAGE}') { this.src = '${PLACEHOLDER_IMAGE}'; }">
    <h4>${pigeon.name || "Unnamed"}</h4>
    <p>Gender: ${pigeon.gender || "Unknown"}</p>
    <p>Color: ${pigeon.isBaby ? "Baby" : (pigeon.displayedColor || "Unknown Color")}</p>
    <p>Pattern: ${formatPatternDisplay(pigeon.traits.pattern) || "Unknown"} (${pigeon.traits.pattern.join(", ") || "None"})</p>
    <p>Headcrest: ${pigeon.traits.headcrest || "None"}</p>
    <p>Recessives: ${getCarriedRecessives(pigeon)}</p>
    <p>Cooldown: ${cooldown}</p>
    ${lineage}
  `;
  document.getElementById("sellPigeonBtn").dataset.pigeonId = id;
  document.getElementById("renamePigeonBtn").dataset.pigeonId = id;
}

function renamePigeon(id) {
  const pigeon = findPigeonById(id);
  if (!pigeon) return;
  const newName = prompt("Enter new name for the pigeon:", pigeon.name);
  if (newName && newName.trim()) {
    pigeon.name = newName.trim();
    saveGameState();
    showPigeonDetail(id);
    displayPigeons();
    alert("Pigeon renamed!");
  }
}

function openBreeding() {
  const malePanel = document.getElementById("male-panel");
  const femalePanel = document.getElementById("female-panel");
  const selectedMale = document.getElementById("selected-male");
  const selectedFemale = document.getElementById("selected-female");
  const breedBtn = document.getElementById("breedPairBtn");
  const deselectMaleBtn = document.getElementById("deselectMaleBtn");
  const deselectFemaleBtn = document.getElementById("deselectFemaleBtn");

  if (!malePanel || !femalePanel || !selectedMale || !selectedFemale || !breedBtn || !deselectMaleBtn || !deselectFemaleBtn) {
    console.warn("Breeding screen elements missing");
    return;
  }

  malePanel.innerHTML = "<h3>Males</h3>";
  femalePanel.innerHTML = "<h3>Females</h3>";
  selectedMale.innerHTML = "";
  selectedFemale.innerHTML = "";
  breedingSelection = { male: null, female: null };
  breedBtn.disabled = true;
  deselectMaleBtn.style.display = "none";
  deselectFemaleBtn.style.display = "none";

  pigeons.forEach(p => {
    if (p && !p.isBaby) {
      const panel = p.gender === "Male" ? malePanel : femalePanel;
      const div = document.createElement("div");
      div.className = "pigeon";
      const cooldown = p.breedCooldown ? formatTime(p.breedCooldown) : "Ready";
      div.innerHTML = `
        <img src="${p.sprite || PLACEHOLDER_IMAGE}" alt="${p.name || 'Unnamed'}">
        <p>${p.name || "Unnamed"}</p>
        <p>${p.displayedColor || "Unknown Color"}</p>
        <p>Cooldown: ${cooldown}</p>
      `;
      if (p.gender === "Female" && p.breedCooldown > 0) {
        div.style.opacity = "0.5";
        div.title = "On breeding cooldown";
      } else {
        div.addEventListener("click", () => selectBreedingPair(p));
      }
      panel.appendChild(div);
    }
  });

  function selectBreedingPair(pigeon) {
    if (pigeon.gender === "Male") {
      breedingSelection.male = pigeon;
      selectedMale.innerHTML = `
        <img src="${pigeon.sprite || PLACEHOLDER_IMAGE}" alt="${pigeon.name || 'Unnamed'}">
        <p>${pigeon.name || "Unnamed"}</p>
        <p>${pigeon.displayedColor || "Unknown Color"}</p>
      `;
      deselectMaleBtn.style.display = "inline-block";
    } else {
      breedingSelection.female = pigeon;
      selectedFemale.innerHTML = `
        <img src="${pigeon.sprite || PLACEHOLDER_IMAGE}" alt="${pigeon.name || 'Unnamed'}">
        <p>${pigeon.name || "Unnamed"}</p>
        <p>${pigeon.displayedColor || "Unknown Color"}</p>
      `;
      deselectFemaleBtn.style.display = "inline-block";
    }
    breedBtn.disabled = !(breedingSelection.male && breedingSelection.female && (breedingSelection.female.breedCooldown === 0 || !breedingSelection.female.breedCooldown));
    if (!breedBtn.disabled) {
      breedBtn.onclick = () => breedPair();
    }
  }

  deselectMaleBtn.onclick = () => {
    breedingSelection.male = null;
    selectedMale.innerHTML = "";
    deselectMaleBtn.style.display = "none";
    breedBtn.disabled = true;
  };

  deselectFemaleBtn.onclick = () => {
    breedingSelection.female = null;
    selectedFemale.innerHTML = "";
    deselectFemaleBtn.style.display = "none";
    breedBtn.disabled = true;
  };
}

function breedPair() {
  if (!breedingSelection.male || !breedingSelection.female) return;
  if (pigeons.filter(p => p).length >= loftCapacity) {
    alert("Loft is full!");
    return;
  }
  const child = generateOffspring(breedingSelection.male, breedingSelection.female);
  const slot = pigeons.indexOf(null);
  if (slot !== -1) pigeons[slot] = child;
  breedingSelection.female.breedCooldown = HEN_BREED_COOLDOWN;
  saveGameState();
  updateInventoryDisplay();
  switchView("loft-screen");
  displayPigeons();
  alert(`A new squab named ${child.name} was born!`);
}

const exploreInteractions = [
  "The dry grass sways in waves, golden in the afternoon sun.",
  "Your boots crunch over gravel as you pass a cluster of wild sage.",
  "A cool breeze drifts down from the hills, carrying a train whistle.",
  "A single sunflower grows defiantly from a crack in the rocky soil.",
  "A rattlesnake slides off the trail, scales whispering against stone."
];

function explore() {
  if (!infiniteEnergy && energy <= 0) {
    alert("Not enough energy!");
    return;
  }
  if (!infiniteEnergy) {
    energy = clamp01(energy - 2);
    updateEnergy();
  }
  const resultEl = document.getElementById("explore-result");
  if (!resultEl) {
    console.warn("Explore result element not found");
    return;
  }
  const message = randChoice(exploreInteractions);
  resultEl.innerHTML = `<p>${message}</p>`;
  const outcome = Math.random();
  if (outcome < 0.20) {
    resultEl.innerHTML += `<p>A pigeon bursts from the brush...</p>
      <button id="catchYes">Catch it? Yes</button> <button id="catchNo">No</button>`;
    const yes = document.getElementById("catchYes");
    const no = document.getElementById("catchNo");
    if (yes) yes.addEventListener("click", () => {
      if (!infiniteEnergy) {
        energy = clamp01(energy - 3);
        updateEnergy();
      }
      if (Math.random() < 0.5) {
        if (pigeons.filter(p => p).length >= loftCapacity) {
          resultEl.innerHTML += "<p>Loft full! The pigeon escapes.</p>";
        } else {
          const newPigeon = generatePigeon(Date.now());
          const idx = pigeons.indexOf(null);
          if (idx !== -1) pigeons[idx] = newPigeon;
          resultEl.innerHTML += `<p>You caught ${newPigeon.name}!</p>`;
          displayPigeons();
          saveGameState();
        }
      } else {
        resultEl.innerHTML += "<p>The pigeon slips away!</p>";
      }
      yes.remove();
      no.remove();
    });
    if (no) no.addEventListener("click", () => {
      resultEl.innerHTML += "<p>You left the pigeon.</p>";
      if (!infiniteEnergy) {
        energy = clamp01(energy - 2);
        updateEnergy();
      }
      yes.remove();
      no.remove();
    });
  } else if (outcome < 0.40) {
    const coinGain = Math.floor(Math.random() * 5) + 1;
    coins += coinGain;
    updateCoins();
    resultEl.innerHTML += `<p>You found ${coinGain} coins!</p>`;
    saveGameState();
  } else {
    resultEl.innerHTML += `<p>Nothing else of interest here.</p>`;
  }
}

function openStore() {
  const storeItems = document.getElementById("store-items");
  if (!storeItems) {
    console.warn("Store items element not found");
    return;
  }
  storeItems.innerHTML = "";
  const items = [
    { name: "Energy Renewal", price: 10, action: () => { if (inventory["Energy Renewal"] > 0) { inventory["Energy Renewal"]--; energy = 100; updateEnergy(); updateInventoryDisplay(); alert("Energy restored!"); } } },
    { name: "Breeding Cooldown", price: 15, action: openCooldownSelect },
    { name: "Baby Auto Grow", price: 20, action: openGrowSelect }
  ];
  items.forEach(item => {
    const div = document.createElement("div");
    div.className = "store-item";
    div.innerHTML = `
      <p>${item.name}</p>
      <p>Cost: ${item.price} coins each</p>
      <input type="number" id="qty-${item.name}" min="1" value="1" style="width: 50px;">
      <button onclick="buyItem('${item.name}', ${item.price})">Buy</button>
      ${inventory[item.name] > 0 && item.action ? `<button onclick="useItem('${item.name}')">Use</button>` : ""}
    `;
    storeItems.appendChild(div);
  });
  updateInventoryDisplay();
}

function openCooldownSelect() {
  if (inventory["Breeding Cooldown"] <= 0) {
    alert("No Breeding Cooldown items available!");
    return;
  }
  switchView("cooldown-select-screen");
  const cooldownSelect = document.getElementById("cooldown-select");
  if (!cooldownSelect) {
    console.warn("Cooldown select element not found");
    return;
  }
  cooldownSelect.innerHTML = "";
  pigeons.forEach(p => {
    if (p && p.gender === "Female" && p.breedCooldown > 0) {
      const div = document.createElement("div");
      div.className = "pigeon";
      div.innerHTML = `
        <img src="${p.sprite || PLACEHOLDER_IMAGE}" alt="${p.name || 'Unnamed'}">
        <p>${p.name || "Unnamed"}</p>
        <p>Cooldown: ${formatTime(p.breedCooldown)}</p>
      `;
      div.addEventListener("click", () => {
        inventory["Breeding Cooldown"]--;
        p.breedCooldown = 0;
        saveGameState();
        updateInventoryDisplay();
        switchView("store-screen");
        openStore();
        alert(`Cooldown removed for ${p.name}!`);
      });
      cooldownSelect.appendChild(div);
    }
  });
}

function openGrowSelect() {
  if (inventory["Baby Auto Grow"] <= 0) {
    alert("No Baby Auto Grow items available!");
    return;
  }
  switchView("grow-select-screen");
  const growSelect = document.getElementById("grow-select");
  if (!growSelect) {
    console.warn("Grow select element not found");
    return;
  }
  growSelect.innerHTML = "";
  pigeons.forEach(p => {
    if (p && p.isBaby) {
      const div = document.createElement("div");
      div.className = "pigeon";
      div.innerHTML = `
        <img src="${p.sprite || PLACEHOLDER_IMAGE}" alt="${p.name || 'Unnamed'}">
        <p>${p.name || "Unnamed"}</p>
        <p>Time to mature: ${formatTime(p.matureTime ? Math.max(0, p.matureTime - Date.now()) : 0)}</p>
      `;
      div.addEventListener("click", () => {
        inventory["Baby Auto Grow"]--;
        growPigeon(p);
        saveGameState();
        updateInventoryDisplay();
        switchView("store-screen");
        openStore();
        alert(`${p.name} has grown up!`);
      });
      growSelect.appendChild(div);
    }
  });
}

window.buyItem = function(name, price) {
  const qtyInput = document.getElementById(`qty-${name}`);
  const qty = parseInt(qtyInput ? qtyInput.value : 1, 10);
  if (isNaN(qty) || qty < 1) {
    alert("Invalid quantity!");
    return;
  }
  const totalCost = price * qty;
  if (coins < totalCost) {
    alert("Not enough coins!");
    return;
  }
  coins -= totalCost;
  inventory[name] = (inventory[name] || 0) + qty;
  updateCoins();
  saveGameState();
  alert(`Purchased ${qty} ${name}!`);
  openStore();
};

window.useItem = function(name) {
  if (name === "Energy Renewal") {
    if (inventory["Energy Renewal"] > 0) {
      inventory["Energy Renewal"]--;
      energy = 100;
      updateEnergy();
      updateInventoryDisplay();
      alert("Energy restored!");
    }
  } else if (name === "Breeding Cooldown") {
    openCooldownSelect();
  } else if (name === "Baby Auto Grow") {
    openGrowSelect();
  }
};

function createCustomPigeon() {
  const name = document.getElementById("adminName").value || getRandomName();
  const gender = document.getElementById("adminGender").value;
  const z1 = document.getElementById("adminZ1").value;
  const z2 = document.getElementById("adminZ2").value;
  const pattern1 = document.getElementById("adminPattern1").value;
  const pattern2 = document.getElementById("adminPattern2").value;
  const spread = document.getElementById("adminSpread").value;
  const dilute = document.getElementById("adminDilute").value;
  const recessiveRed1 = document.getElementById("adminRecessiveRed1").value;
  const recessiveRed2 = document.getElementById("adminRecessiveRed2").value;

  const genotype = {
    sex: gender,
    Z: [z1, z2],
    autosomal: {
      pattern: [pattern1, pattern2],
      spread: [spread, spread],
      dilute: [dilute, dilute],
      recessive_red: [recessiveRed1, recessiveRed2]
    }
  };
  const primaryColor = resolveBaseColor(genotype);
  const newPigeon = {
    id: Date.now(),
    name,
    gender,
    genotype,
    primaryColor,
    displayedColor: primaryColor,
    sprite: BASE_COLORS[primaryColor],
    isBaby: false,
    breedCooldown: 0,
    matureTime: null,
    parents: null,
    traits: {
      pattern: [pattern1, pattern2],
      headcrest: Math.random() < 0.08 ? "Crested" : "None"
    }
  };
  applyModifiers(newPigeon);
  const slot = pigeons.indexOf(null);
  if (slot !== -1) pigeons[slot] = newPigeon;
  else pigeons.push(newPigeon);
  saveGameState();
  displayPigeons();
  alert("Custom pigeon created!");
}

function addItems() {
  const item = document.getElementById("itemSelect").value;
  const amount = parseInt(document.getElementById("itemAmount").value || "0", 10);
  if (amount > 0) {
    inventory[item] = (inventory[item] || 0) + amount;
    saveGameState();
    alert(`Added ${amount} ${item}!`);
    updateInventoryDisplay();
  }
}

function showEditForm() {
  const id = document.getElementById("editPigeonSelect").value;
  const pigeon = findPigeonById(parseInt(id, 10));
  if (!pigeon) return;
  const result = document.getElementById("admin-result");
  if (!result) return;
  result.innerHTML = `
    <input type="text" id="editName" value="${pigeon.name || 'Unnamed'}" placeholder="Name">
    <select id="editGender"><option value="Male"${pigeon.gender==="Male"?" selected":""}>Male</option><option value="Female"${pigeon.gender==="Female"?" selected":""}>Female</option></select>
    <select id="editZ1">
      <option value="B+" ${pigeon.genotype.Z[0] === 'B+' ? "selected" : ""}>Ash red</option>
      <option value="B" ${pigeon.genotype.Z[0] === 'B' ? "selected" : ""}>Blue</option>
      <option value="b" ${pigeon.genotype.Z[0] === 'b' ? "selected" : ""}>Brown</option>
    </select>
    <select id="editZ2" ${pigeon.gender === "Female" ? "disabled" : ""}>
      ${pigeon.gender === "Female" ? `<option value="W" selected>W</option>` : `
        <option value="B+" ${pigeon.genotype.Z[1] === 'B+' ? "selected" : ""}>Ash red</option>
        <option value="B" ${pigeon.genotype.Z[1] === 'B' ? "selected" : ""}>Blue</option>
        <option value="b" ${pigeon.genotype.Z[1] === 'b' ? "selected" : ""}>Brown</option>
      `}
    </select>
    <select id="editPattern1">${PATTERN_ORDER.map(p=>`<option value="${p}" ${p===pigeon.traits.pattern[0]?"selected":""}>${PATTERN_NAMES[p]}</option>`).join("")}</select>
    <select id="editPattern2">${PATTERN_ORDER.map(p=>`<option value="${p}" ${p===pigeon.traits.pattern[1]?"selected":""}>${PATTERN_NAMES[p]}</option>`).join("")}</select>
    <select id="editSpread"><option value="S"${pigeon.genotype.autosomal.spread[0]==="S"?" selected":""}>S</option><option value="s"${pigeon.genotype.autosomal.spread[0]==="s"?" selected":""}>s</option></select>
    <select id="editDilute"><option value="D"${pigeon.genotype.autosomal.dilute[0]==="D"?" selected":""}>D</option><option value="d"${pigeon.genotype.autosomal.dilute[0]==="d"?" selected":""}>d</option></select>
    <select id="editRecessiveRed1"><option value="R"${pigeon.genotype.autosomal.recessive_red[0]==="R"?" selected":""}>R</option><option value="r"${pigeon.genotype.autosomal.recessive_red[0]==="r"?" selected":""}>r</option></select>
    <select id="editRecessiveRed2"><option value="R"${pigeon.genotype.autosomal.recessive_red[1]==="R"?" selected":""}>R</option><option value="r"${pigeon.genotype.autosomal.recessive_red[1]==="r"?" selected":""}>r</option></select>
    <button id="saveEditBtn">Save</button>
  `;
  const genderSelect = document.getElementById("editGender");
  const z2Select = document.getElementById("editZ2");
  genderSelect.addEventListener("change", () => {
    if (genderSelect.value === "Female") {
      z2Select.disabled = true;
      z2Select.innerHTML = `<option value="W">W</option>`;
    } else {
      z2Select.disabled = false;
      z2Select.innerHTML = `
        <option value="B+">Ash red</option>
        <option value="B">Blue</option>
        <option value="b">Brown</option>
      `;
    }
  });
  document.getElementById("saveEditBtn").addEventListener("click", () => saveEdit(pigeon.id));
}

function saveEdit(id) {
  const pigeon = findPigeonById(id);
  if (!pigeon) return;
  const name = document.getElementById("editName").value || pigeon.name;
  const gender = document.getElementById("editGender").value;
  const z1 = document.getElementById("editZ1").value;
  const z2 = document.getElementById("editZ2").value;
  const pattern1 = document.getElementById("editPattern1").value;
  const pattern2 = document.getElementById("editPattern2").value;
  const spread = document.getElementById("editSpread").value;
  const dilute = document.getElementById("editDilute").value;
  const recessiveRed1 = document.getElementById("editRecessiveRed1").value;
  const recessiveRed2 = document.getElementById("editRecessiveRed2").value;

  pigeon.name = name;
  pigeon.gender = gender;
  pigeon.genotype = {
    sex: gender,
    Z: [z1, z2],
    autosomal: {
      pattern: [pattern1, pattern2],
      spread: [spread, spread],
      dilute: [dilute, dilute],
      recessive_red: [recessiveRed1, recessiveRed2]
    }
  };
  pigeon.primaryColor = resolveBaseColor(pigeon.genotype);
  applyModifiers(pigeon);
  displayPigeons();
  saveGameState();
  alert("Pigeon edited!");
}

window.sellPigeon = function(id) {
  const idx = pigeons.findIndex(p => p && p.id === id);
  if (idx !== -1) {
    coins += 5;
    pigeons[idx] = null;
    const filled = pigeons.filter(p => p);
    while (filled.length < loftCapacity) filled.push(null);
    pigeons = filled;
    saveGameState();
    displayPigeons();
    alert("Sold pigeon for 5 coins.");
  }
};

function sellAllPigeons() {
  const pigeonCount = pigeons.filter(p => p).length;
  if (pigeonCount === 0) {
    alert("No pigeons to sell!");
    return;
  }
  const totalCoins = pigeonCount * 5;
  const confirmDiv = document.createElement("div");
  confirmDiv.id = "sell-all-confirm";
  confirmDiv.style.position = "fixed";
  confirmDiv.style.top = "50%";
  confirmDiv.style.left = "50%";
  confirmDiv.style.transform = "translate(-50%, -50%)";
  confirmDiv.style.background = "#fff";
  confirmDiv.style.padding = "20px";
  confirmDiv.style.border = "2px solid #000";
  confirmDiv.style.zIndex = "1000";
  confirmDiv.innerHTML = `
    <p>Are you sure you want to sell all your ${pigeonCount} pigeons for ${totalCoins} coins?</p>
    <button id="sellAllYes">Yes</button>
    <button id="sellAllNo">No</button>
  `;
  document.body.appendChild(confirmDiv);

  document.getElementById("sellAllYes").addEventListener("click", () => {
    coins += totalCoins;
    pigeons = Array(loftCapacity).fill(null);
    saveGameState();
    updateCoins();
    displayPigeons();
    alert(`Sold ${pigeonCount} pigeons for ${totalCoins} coins.`);
    confirmDiv.remove();
  });

  document.getElementById("sellAllNo").addEventListener("click", () => {
    confirmDiv.remove();
  });
}

function inheritAllele(a1, a2) { return Math.random() < 0.5 ? a1 : a2; }

function generateOffspring(male, female) {
  const id = Date.now();
  const gender = Math.random() < 0.5 ? "Male" : "Female";
  
  // Determine Z alleles
  let zAlleles;
  const maleCarried = getCarriedRecessives(male).split(", ").filter(c => c !== "Recessive red" && c !== "None");
  const femalePrimaryAllele = female.genotype.Z[0];
  if (maleCarried.length > 0 && maleCarried.includes(COLOR_ALLELES[femalePrimaryAllele])) {
    // Male carries the female's primary color as recessive
    const maleAlleles = male.genotype.Z;
    const recessiveAllele = maleAlleles.find(a => COLOR_ALLELES[a] === COLOR_ALLELES[femalePrimaryAllele]);
    const primaryAllele = maleAlleles.find(a => a !== recessiveAllele);
    zAlleles = gender === "Male" ? 
      [Math.random() < 0.5 ? primaryAllele : recessiveAllele, inheritAllele(male.genotype.Z[0], male.genotype.Z[1])] :
      [Math.random() < 0.5 ? primaryAllele : recessiveAllele, "W"];
  } else {
    zAlleles = gender === "Male" ? 
      [inheritAllele(male.genotype.Z[0], male.genotype.Z[1]), inheritAllele(male.genotype.Z[0], male.genotype.Z[1])] :
      [inheritAllele(male.genotype.Z[0], male.genotype.Z[1]), "W"];
  }

  // Determine recessive_red alleles
  let recessiveRedAlleles = [
    inheritAllele(male.genotype.autosomal.recessive_red[0], male.genotype.autosomal.recessive_red[1]),
    inheritAllele(female.genotype.autosomal.recessive_red[0], female.genotype.autosomal.recessive_red[1])
  ];
  
  // If one parent is Recessive red, ensure 50% chance of Recessive red offspring
  if (male.genotype.autosomal.recessive_red.every(a => a === "r") || female.genotype.autosomal.recessive_red.every(a => a === "r")) {
    const recessiveParent = male.genotype.autosomal.recessive_red.every(a => a === "r") ? male : female;
    const otherParent = recessiveParent === male ? female : male;
    recessiveRedAlleles = [ "r", inheritAllele(otherParent.genotype.autosomal.recessive_red[0], otherParent.genotype.autosomal.recessive_red[1]) ];
  }

  const genotype = {
    sex: gender,
    Z: zAlleles,
    autosomal: {
      pattern: [inheritAllele(male.genotype.autosomal.pattern[0], male.genotype.autosomal.pattern[1]), inheritAllele(female.genotype.autosomal.pattern[0], female.genotype.autosomal.pattern[1])],
      spread: [inheritAllele(male.genotype.autosomal.spread[0], male.genotype.autosomal.spread[1]), inheritAllele(female.genotype.autosomal.spread[0], female.genotype.autosomal.spread[1])],
      dilute: [inheritAllele(male.genotype.autosomal.dilute[0], male.genotype.autosomal.dilute[1]), inheritAllele(female.genotype.autosomal.dilute[0], female.genotype.autosomal.dilute[1])],
      recessive_red: recessiveRedAlleles
    }
  };
  
  const primaryColor = resolveBaseColor(genotype);
  const child = {
    id,
    name: getRandomName(),
    gender,
    genotype,
    primaryColor,
    displayedColor: primaryColor,
    sprite: "./squab.gif",
    isBaby: true,
    breedCooldown: 0,
    matureTime: Date.now() + BABY_GROW_COOLDOWN,
    parents: { male, female },
    traits: {
      pattern: genotype.autosomal.pattern,
      headcrest: Math.random() < 0.08 ? "Crested" : "None"
    }
  };
  console.log(`Generated baby pigeon ${child.name} with sprite: ${child.sprite}`);
  return child;
}

function saveGameState() {
  try {
    localStorage.setItem("coins", coins);
    localStorage.setItem("energy", energy);
    localStorage.setItem("lastUpdate", Date.now());
    localStorage.setItem("pigeons", JSON.stringify(pigeons));
    localStorage.setItem("inventory", JSON.stringify(inventory));
    localStorage.setItem("infiniteEnergy", infiniteEnergy);
    localStorage.setItem("gameVersion", GAME_VERSION);
    console.log("Game state saved");
  } catch (e) {
    console.error("Failed to save game state:", e);
  }
}

setInterval(() => {
  let updateNeeded = false;
  pigeons.forEach(p => {
    if (p && p.breedCooldown > 0) {
      p.breedCooldown = Math.max(0, p.breedCooldown - 1000);
      updateNeeded = true;
    }
    if (p && p.isBaby && p.matureTime && Date.now() >= p.matureTime) {
      growPigeon(p);
      updateNeeded = true;
    }
  });
  if (updateNeeded) {
    displayPigeons();
    saveGameState();
  }
  if (!infiniteEnergy) {
    const prevEnergy = energy;
    energy = clamp01(energy + 5 / 60); // 5% per minute
    if (Math.floor(prevEnergy) !== Math.floor(energy)) {
      updateEnergy();
      saveGameState();
    }
  }
}, 1000);

window.explore = explore;      pigeon.sprite = BASE_COLORS[pigeon.primaryColor];
    } else {
      pigeon.displayedColor = pigeon.dilute ? Object.keys(DILUTE_COLORS)[Object.values(DILUTE_COLORS).indexOf(DILUTE_COLORS[pigeon.primaryColor])] : pigeon.primaryColor;
      pigeon.sprite = pigeon.dilute ? DILUTE_COLORS[pigeon.primaryColor] : BASE_COLORS[pigeon.primaryColor];
    }
    if (pigeon.isBaby) pigeon.sprite = BABY_IMAGE;
  }

  function displayPigeons() {
    const pigeonGrid = document.getElementById("pigeon-grid");
    pigeonGrid.innerHTML = "";
    for (let i = 0; i < loftCapacity; i++) {
      const pigeonDiv = document.createElement("div");
      pigeonDiv.className = "pigeon";
      if (pigeons[i]) {
        pigeonDiv.innerHTML = `
          <img src="${pigeons[i].sprite}" alt="${pigeons[i].displayedColor} Pigeon" class="pigeon-image" data-id="${pigeons[i].id}">
          <p>${pigeons[i].name} (${pigeons[i].gender}) - ${pigeons[i].displayedColor}</p>
        `;
      } else {
        pigeonDiv.innerHTML = "<p>Empty Slot</p>";
      }
      pigeonGrid.appendChild(pigeonDiv);
    }
    // Add delegated event listener for pigeon images
    pigeonGrid.addEventListener("click", (e) => {
      if (e.target.classList.contains("pigeon-image")) {
        const pigeonId = parseInt(e.target.getAttribute("data-id"));
        const pigeon = pigeons.find(p => p && p.id === pigeonId);
        if (pigeon) {
          showPigeonDetail(pigeon);
        }
      }
    });
    updateEnergy();
    updateCoins();
    updateFeathers();
  }

  function showPigeonDetail(p) {
    // Simulate genealogy (limited by current parent data; full 5x requires historical tracking)
    let genealogy = "<h4>Genealogy</h4><ul>";
    let currentPigeon = p;
    for (let generation = 1; generation <= 5; generation++) {
      if (currentPigeon.parents) {
        const grandSire = currentPigeon.parents.male ? currentPigeon.parents.male.name : "Unknown";
        const grandDam = currentPigeon.parents.female ? currentPigeon.parents.female.name : "Unknown";
        genealogy += `<li>${generation}x Grand Sire: ${grandSire}</li>`;
        genealogy += `<li>${generation}x Grand Dam: ${grandDam}</li>`;
        currentPigeon = currentPigeon.parents.male || currentPigeon.parents.female; // Move to next generation (simplified)
      } else {
        genealogy += `<li>${generation}x Grand Sire: Unknown</li>`;
        genealogy += `<li>${generation}x Grand Dam: Unknown</li>`;
      }
    }
    genealogy += "</ul>";

    const detailDiv = document.getElementById("pigeon-detail-content");
    detailDiv.innerHTML = `
      <img src="${p.sprite}" alt="${p.name} Pigeon" style="width: 150px; margin-bottom: 15px;">
      <h3>${p.name}</h3>
      <p>Gender: ${p.gender}</p>
      <p>Color: ${p.displayedColor}</p>
      <p>Pattern: ${formatPatternDisplay(p.traits.pattern)}</p>
      <p>Spread: ${p.spread ? "Yes" : "No"}</p>
      <p>Dilute: ${p.dilute ? "Yes" : "No"}</p>
      <p>Recessive Red: ${p.recessiveRed ? "Yes" : "No"}</p>
      <p>Foot Feathering: ${p.traits.footFeathering}</p>
      <button onclick="sellPigeon(${p.id})">Sell (5 coins)</button>
      ${genealogy}
    `;
    switchView("pigeon-detail-screen");
  }

  function sellPigeon(id) {
    const index = pigeons.findIndex(p => p && p.id === id);
    if (index !== -1) {
      coins += 5;
      pigeons[index] = null;
      // Reorganize pigeons
      pigeons = pigeons.filter(p => p).concat(Array(loftCapacity - pigeons.filter(p => p).length).fill(null));
      alert(`Sold pigeon for 5 coins!`);
      displayPigeons();
      saveGameState();
    }
  }

  function openBreeding() {
    const malePanel = document.getElementById("male-panel");
    const femalePanel = document.getElementById("female-panel");
    malePanel.innerHTML = "<h3>Males</h3>";
    femalePanel.innerHTML = "<h3>Females</h3>";

    pigeons.forEach(p => {
      if (p && !p.isBaby && p.breedCooldown === 0) {
        const panel = p.gender === "Male" ? malePanel : femalePanel;
        const pigeonDiv = document.createElement("div");
        pigeonDiv.className = "pigeon";
        pigeonDiv.innerHTML = `
          <img src="${p.sprite}" alt="${p.displayedColor} Pigeon">
          <p>${p.name} (${p.gender}) - ${p.displayedColor}</p>
        `;
        pigeonDiv.addEventListener("click", () => selectPigeon(p, p.gender));
        panel.appendChild(pigeonDiv);
      }
    });
  }

  function selectPigeon(p, gender) {
    breedingSelection[gender.toLowerCase()] = p;
    updateSelectedPair();
  }

  function updateSelectedPair() {
    const selectedMale = document.getElementById("selected-male");
    const selectedFemale = document.getElementById("selected-female");
    const breedBtn = document.getElementById("breedPairBtn");
    const useNestBtn = document.getElementById("useNestBtn");

    selectedMale.innerHTML = breedingSelection.male ? `<p>${breedingSelection.male.name} (${breedingSelection.male.displayedColor})</p><button>Deselect</button>` : "";
    selectedFemale.innerHTML = breedingSelection.female ? `<p>${breedingSelection.female.name} (${breedingSelection.female.displayedColor})</p><button>Deselect</button>` : "";

    if (breedingSelection.male) selectedMale.querySelector("button").addEventListener("click", () => { breedingSelection.male = null; updateSelectedPair(); });
    if (breedingSelection.female) selectedFemale.querySelector("button").addEventListener("click", () => { breedingSelection.female = null; updateSelectedPair(); });

    breedBtn.disabled = !(breedingSelection.male && breedingSelection.female);
    useNestBtn.disabled = !(breedingSelection.male && breedingSelection.female && inventory["Nest"] > 0);
  }

  document.getElementById("breedPairBtn").addEventListener("click", () => {
    const male = breedingSelection.male;
    const female = breedingSelection.female;
    if (male && female) {
      const successChance = 0.7;
      let success = Math.random() < successChance;
      if (inventory["Nest"] > 0 && useNestBtn.disabled === false) {
        inventory["Nest"]--;
        success = true;
      }
      if (!success) {
        alert("Breeding failed! No eggs.");
      } else {
        const numEggs = Math.random() < 0.5 ? 1 : 2;
        female.breedCooldown = Date.now() + 3600000; // 1-hour cooldown
        for (let i = 0; i < numEggs; i++) {
          if (pigeons.filter(p => p).length >= loftCapacity) {
            alert("Loft full! Can't add more pigeons.");
            break;
          }
          const child = generatePigeon(Date.now() + i, null, true, { male, female });
          pigeons[pigeons.indexOf(null)] = child;
        }
        alert(`Breeding successful! ${numEggs} egg(s) added.`);
      }
      breedingSelection = { male: null, female: null };
      updateSelectedPair();
      displayPigeons();
      saveGameState();
    }
  });

  document.getElementById("useNestBtn").addEventListener("click", () => {
    if (inventory["Nest"] > 0 && breedingSelection.male && breedingSelection.female) {
      inventory["Nest"]--;
      document.getElementById("breedPairBtn").click();
    }
  });

  function explore() {
    if (energy <= 0) {
      alert("Not enough energy!");
      return;
    }
    energy = Math.max(0, energy - 2);
    updateEnergy();

    const result = document.getElementById("explore-result");
    result.innerHTML = exploreInteractions[Math.floor(Math.random() * exploreInteractions.length)];
    const pigeonChance = Math.random();
    if (pigeonChance < 0.2) {
      result.innerHTML += "<p>A soft flutter startles you as a pigeon bursts from the brush, coasting low before settling a few feet ahead on the path. Its feathers shimmer faintly in the light — grey and violet, dusted with trail grit. It tilts its head, watching you with one bright, cautious eye. For a moment, it doesn’t fly away.</p><button id='catchYes'>Catch it? Yes</button><button id='catchNo'>No</button>";
      document.getElementById("catchYes").addEventListener("click", () => {
        energy = Math.max(0, energy - 3);
        if (Math.random() < 0.5) {
          if (pigeons.filter(p => p).length >= loftCapacity) {
            result.innerHTML += "<p>Loft full! The pigeon escapes.</p>";
          } else {
            const newPigeon = generatePigeon(Date.now());
            pigeons[pigeons.indexOf(null)] = newPigeon;
            result.innerHTML += `<p>You caught ${newPigeon.name}!`;
            displayPigeons();
          }
        } else {
          result.innerHTML += "<p>The pigeon slips from your fingers and flies away!</p>";
          if (inventory["Feathers"] < 5) {
            inventory["Feathers"]++;
            updateFeathers();
          }
        }
        document.getElementById("catchYes").remove();
        document.getElementById("catchNo").remove();
      });
      document.getElementById("catchNo").addEventListener("click", () => {
        result.innerHTML += "<p>You left the pigeon. You found a feather!</p>";
        if (inventory["Feathers"] < 5) {
          inventory["Feathers"]++;
          updateFeathers();
        }
        energy = Math.max(0, energy - 2);
        document.getElementById("catchYes").remove();
        document.getElementById("catchNo").remove();
      });
    }
  }

  function openStore() {
    const storeItems = document.getElementById("store-items");
    storeItems.innerHTML = `
      <div class="store-item">
        <h3>Energy Renewal</h3>
        <p>Refills energy to 100%</p>
        <p>Price: 20 coins</p>
        <p>Owned: ${inventory["Energy Renewal"]}</p>
        <button onclick="buyItem('Energy Renewal', 20)">Buy</button>
        <button onclick="useItem('Energy Renewal')">Use</button>
      </div>
      <div class="store-item">
        <h3>Breeding Cooldown</h3>
        <p>Removes cooldown from a hen</p>
        <p>Price: 30 coins</p>
        <p>Owned: ${inventory["Breeding Cooldown"]}</p>
        <button onclick="buyItem('Breeding Cooldown', 30)">Buy</button>
        <button onclick="useItem('Breeding Cooldown')">Use</button>
      </div>
      <div class="store-item">
        <h3>Baby Auto Grow</h3>
        <p>Grows a baby to adult immediately</p>
        <p>Price: 40 coins</p>
        <p>Owned: ${inventory["Baby Auto Grow"]}</p>
        <button onclick="buyItem('Baby Auto Grow', 40)">Buy</button>
        <button onclick="useItem('Baby Auto Grow')">Use</button>
      </div>
    `;
  }

  function buyItem(item, price) {
    if (coins >= price) {
      coins -= price;
      inventory[item]++;
      updateCoins();
      alert(item + " purchased!");
      openStore();
    } else {
      alert("Not enough coins!");
    }
  }

  function useItem(item) {
    if (inventory[item] > 0) {
      inventory[item]--;
      if (item === "Energy Renewal") {
        energy = 100;
        updateEnergy();
        alert("Energy restored to 100%!");
      } else if (item === "Breeding Cooldown") {
        const hens = pigeons.filter(p => p && p.gender === "Female" && p.breedCooldown > 0);
        if (hens.length > 0) {
          const selectDiv = document.getElementById("cooldown-select");
          selectDiv.innerHTML = "";
          hens.forEach(hen => {
            const henDiv = document.createElement("div");
            henDiv.className = "pigeon";
            henDiv.innerHTML = `<p>${hen.name} (${hen.displayedColor})</p><button onclick="removeCooldown(${hen.id})">Select</button>`;
            selectDiv.appendChild(henDiv);
          });
          switchView("cooldown-select-screen");
        } else {
          alert("No hens on cooldown!");
        }
      } else if (item === "Baby Auto Grow") {
        const babies = pigeons.filter(p => p && p.isBaby);
        if (babies.length > 0) {
          const selectDiv = document.getElementById("grow-select");
          selectDiv.innerHTML = "";
          babies.forEach(baby => {
            const babyDiv = document.createElement("div");
            babyDiv.className = "pigeon";
            babyDiv.innerHTML = `<p>${baby.name} (${baby.displayedColor})</p><button onclick="growBaby(${baby.id})">Select</button>`;
            selectDiv.appendChild(babyDiv);
          });
          switchView("grow-select-screen");
        } else {
          alert("No baby pigeons to grow!");
        }
      }
      displayPigeons();
    } else {
      alert("You don't have this item!");
    }
  }

  function removeCooldown(id) {
    const hen = pigeons.find(p => p && p.id === id);
    if (hen) {
      hen.breedCooldown = 0;
      alert(`${hen.name}'s breeding cooldown removed!`);
    }
    switchView("store-screen");
    displayPigeons();
    saveGameState();
  }

  function growBaby(id) {
    const baby = pigeons.find(p => p && p.id === id);
    if (baby) {
      baby.isBaby = false;
      baby.breedCooldown = Date.now() + 3600000;
      alert(`${baby.name} has grown to an adult!`);
    }
    switchView("store-screen");
    displayPigeons();
    saveGameState();
  }

  document.getElementById("createPigeonBtn").addEventListener("click", () => {
    const result = document.getElementById("admin-result");
    result.innerHTML = `
      <input type="text" id="adminName" placeholder="Name">
      <select id="adminGender">
        <option value="Male">Male</option>
        <option value="Female">Female</option>
      </select>
      <select id="adminColor1">
        ${Object.keys(BASE_COLORS).map(c => `<option value="${c}">${c}</option>`).join("")}
      </select>
      ${document.getElementById("adminGender").value === "Male" ? `<select id="adminColor2">${Object.keys(BASE_COLORS).map(c => `<option value="${c}">${c}</option>`).join("")}</select>` : ""}
      <select id="adminPattern1">
        ${PATTERN_ORDER.map(p => `<option value="${p}">${PATTERN_NAMES[p]}</option>`).join("")}
      </select>
      <select id="adminPattern2">
        ${PATTERN_ORDER.map(p => `<option value="${p}">${PATTERN_NAMES[p]}</option>`).join("")}
      </select>
      <select id="adminFeathering1">
        ${FEATHERING_ORDER.map(f => `<option value="${f}">${FEATHERING_NAMES[f]}</option>`).join("")}
      </select>
      <select id="adminFeathering2">
        ${FEATHERING_ORDER.map(f => `<option value="${f}">${FEATHERING_NAMES[f]}</option>`).join("")}
      </select>
      <select id="adminSpread">
        <option value="S">S</option>
        <option value="s">s</option>
      </select>
      <select id="adminDilute">
        <option value="D">D</option>
        <option value="d">d</option>
      </select>
      <select id="adminRecessive">
        <option value="E">E</option>
        <option value="e">e</option>
      </select>
      <button onclick="createCustomPigeon()">Create</button>
    `;
  });

  function createCustomPigeon() {
    const name = document.getElementById("adminName").value || getRandomName();
    const gender = document.getElementById("adminGender").value;
    const color1 = document.getElementById("adminColor1").value;
    const color2 = gender === "Male" ? document.getElementById("adminColor2").value : "W";
    const pattern1 = document.getElementById("adminPattern1").value;
    const pattern2 = document.getElementById("adminPattern2").value;
    const feathering1 = document.getElementById("adminFeathering1").value;
    const feathering2 = document.getElementById("adminFeathering2").value;
    const spread = document.getElementById("adminSpread").value;
    const dilute = document.getElementById("adminDilute").value;
    const recessive = document.getElementById("adminRecessive").value;

    const newPigeon = {
      id: Date.now(),
      gender,
      genotype: {
        sex: gender,
        Z: [color1, color2],
        autosomal: {
          pattern: [pattern1, pattern2],
          foot_feathering: [feathering1, feathering2],
          spread: [spread, spread],
          dilute: [dilute, dilute],
          recessive_red: [recessive, recessive]
        }
      },
      primaryColor: color1,
      displayedColor: color1,
      sprite: BASE_COLORS[color1],
      name,
      isBaby: false,
      breedCooldown: 0,
      parents: null,
      traits: {
        pattern: [pattern1, pattern2],
        footFeathering: resolveFootFeathering({ autosomal: { foot_feathering: [feathering1, feathering2] } }),
        headcrest: Math.random() < 0.1 ? "Crested" : "None"
      }
    };
    applyModifiers(newPigeon);
    if (pigeons.filter(p => p).length < loftCapacity) {
      pigeons[pigeons.indexOf(null)] = newPigeon;
      displayPigeons();
      alert("Custom pigeon created!");
      saveGameState();
    } else {
      alert("Loft is full!");
    }
  }

  document.getElementById("addCoinsBtn").addEventListener("click", () => {
    const amount = prompt("Enter amount to add:");
    if (amount) {
      coins += parseInt(amount);
      updateCoins();
      alert(`Added ${amount} coins!`);
    }
  });

  document.getElementById("infiniteEnergyBtn").addEventListener("click", () => {
    infiniteEnergy = !infiniteEnergy;
    alert(`Infinite energy ${infiniteEnergy ? "enabled" : "disabled"}!`);
    updateEnergy();
    saveGameState();
  });

  document.getElementById("addItemsBtn").addEventListener("click", () => {
    const result = document.getElementById("admin-result");
    result.innerHTML = `
      <select id="itemSelect">
        <option value="Energy Renewal">Energy Renewal</option>
        <option value="Breeding Cooldown">Breeding Cooldown</option>
        <option value="Baby Auto Grow">Baby Auto Grow</option>
        <option value="Feathers">Feathers</option>
        <option value="Nest">Nest</option>
      </select>
      <input type="number" id="itemAmount" placeholder="Amount" min="1">
      <button onclick="addItems()">Add</button>
    `;
  });

  function addItems() {
    const item = document.getElementById("itemSelect").value;
    const amount = parseInt(document.getElementById("itemAmount").value);
    if (amount > 0) {
      if (item === "Feathers" && inventory["Feathers"] + amount > 5) {
        inventory["Feathers"] = 5;
      } else {
        inventory[item] = (inventory[item] || 0) + amount;
      }
      updateFeathers();
      alert(`Added ${amount} ${item}!`);
      saveGameState();
    }
  }

  document.getElementById("editPigeonBtn").addEventListener("click", () => {
    const result = document.getElementById("admin-result");
    result.innerHTML = "<select id='editPigeonSelect'></select><button onclick='showEditForm()'>Edit</button>";
    const select = document.getElementById("editPigeonSelect");
    pigeons.forEach(p => {
      if (p) {
        const option = document.createElement("option");
        option.value = p.id;
        option.textContent = `${p.name} (${p.displayedColor})`;
        select.appendChild(option);
      }
    });
  });

  function showEditForm() {
    const id = document.getElementById("editPigeonSelect").value;
    const pigeon = pigeons.find(p => p && p.id === parseInt(id));
    if (pigeon) {
      const result = document.getElementById("admin-result");
      result.innerHTML = `
        <input type="text" id="editName" value="${pigeon.name}" placeholder="Name">
        <select id="editGender">
          <option value="Male" ${pigeon.gender === "Male" ? "selected" : ""}>Male</option>
          <option value="Female" ${pigeon.gender === "Female" ? "selected" : ""}>Female</option>
        </select>
        <select id="editColor1">
          ${Object.keys(BASE_COLORS).map(c => `<option value="${c}" ${c === pigeon.genotype.Z[0] ? "selected" : ""}>${c}</option>`).join("")}
        </select>
        ${pigeon.gender === "Male" ? `<select id="editColor2">${Object.keys(BASE_COLORS).map(c => `<option value="${c}" ${c === pigeon.genotype.Z[1] ? "selected" : ""}>${c}</option>`).join("")}</select>` : ""}
        <select id="editPattern1">
          ${PATTERN_ORDER.map(p => `<option value="${p}" ${p === pigeon.traits.pattern[0] ? "selected" : ""}>${PATTERN_NAMES[p]}</option>`).join("")}
        </select>
        <select id="editPattern2">
          ${PATTERN_ORDER.map(p => `<option value="${p}" ${p === pigeon.traits.pattern[1] ? "selected" : ""}>${PATTERN_NAMES[p]}</option>`).join("")}
        </select>
        <select id="editFeathering1">
          ${FEATHERING_ORDER.map(f => `<option value="${f}" ${f === pigeon.genotype.autosomal.foot_feathering[0] ? "selected" : ""}>${FEATHERING_NAMES[f]}</option>`).join("")}
        </select>
        <select id="editFeathering2">
          ${FEATHERING_ORDER.map(f => `<option value="${f}" ${f === pigeon.genotype.autosomal.foot_feathering[1] ? "selected" : ""}>${FEATHERING_NAMES[f]}</option>`).join("")}
        </select>
        <select id="editSpread">
          <option value="S" ${pigeon.genotype.autosomal.spread[0] === "S" ? "selected" : ""}>S</option>
          <option value="s" ${pigeon.genotype.autosomal.spread[0] === "s" ? "selected" : ""}>s</option>
        </select>
        <select id="editDilute">
          <option value="D" ${pigeon.genotype.autosomal.dilute[0] === "D" ? "selected" : ""}>D</option>
          <option value="d" ${pigeon.genotype.autosomal.dilute[0] === "d" ? "selected" : ""}>d</option>
        </select>
        <select id="editRecessive">
          <option value="E" ${pigeon.genotype.autosomal.recessive_red[0] === "E" ? "selected" : ""}>E</option>
          <option value="e" ${pigeon.genotype.autosomal.recessive_red[0] === "e" ? "selected" : ""}>e</option>
        </select>
        <button onclick="saveEdit(${id})">Save</button>
      `;
    }
  }

  function saveEdit(id) {
    const pigeon = pigeons.find(p => p && p.id === id);
    if (pigeon) {
      pigeon.name = document.getElementById("editName").value || pigeon.name;
      pigeon.gender = document.getElementById("editGender").value;
      pigeon.genotype.Z = [document.getElementById("editColor1").value, pigeon.gender === "Male" ? document.getElementById("editColor2").value : "W"];
      pigeon.genotype.autosomal.pattern = [document.getElementById("editPattern1").value, document.getElementById("editPattern2").value];
      pigeon.genotype.autosomal.foot_feathering = [document.getElementById("editFeathering1").value, document.getElementById("editFeathering2").value];
      pigeon.genotype.autosomal.spread = [document.getElementById("editSpread").value, document.getElementById("editSpread").value];
      pigeon.genotype.autosomal.dilute = [document.getElementById("editDilute").value, document.getElementById("editDilute").value];
      pigeon.genotype.autosomal.recessive_red = [document.getElementById("editRecessive").value, document.getElementById("editRecessive").value];
      pigeon.primaryColor = resolveBaseColor(pigeon.genotype);
      applyModifiers(pigeon);
      pigeon.traits.footFeathering = resolveFootFeathering(pigeon.genotype);
      displayPigeons();
      alert("Pigeon edited!");
      saveGameState();
    }
  }

  function saveGameState() {
    localStorage.setItem("coins", coins);
    localStorage.setItem("energy", energy);
    localStorage.setItem("pigeons", JSON.stringify(pigeons));
    localStorage.setItem("inventory", JSON.stringify(inventory));
    localStorage.setItem("infiniteEnergy", infiniteEnergy);
  }

  // Initial setup
  switchView("home-screen");
  updateEnergy();
  updateCoins();
  updateFeathers();
  displayPigeons();
  document.getElementById("exploreBtnInner").addEventListener("click", explore);

});
