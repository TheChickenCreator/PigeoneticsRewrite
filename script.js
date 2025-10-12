// Pattern dominance order and readable names (updated hierarchy: L < B < C < T)
const PATTERN_ORDER = ["L", "B", "C", "T"];
const PATTERN_NAMES = {
  "L": "Barless",
  "B": "Bar",
  "C": "Checker",
  "T": "T-check"
};

// Foot feathering dominance order and readable names
const FEATHERING_ORDER = ["N", "S", "M", "L", "F"];
const FEATHERING_NAMES = {
  "N": "Clean-legged",
  "S": "Stocking",
  "M": "Medium muff",
  "L": "Long muff",
  "F": "Fantail-type"
};

// Function to format pattern display as "Name (A, B)"
function formatPatternDisplay(patternAlleles) {
  if (!Array.isArray(patternAlleles) || patternAlleles.length < 2) return "Unknown";
  const dominant = patternAlleles.reduce((a, b) => PATTERN_ORDER.indexOf(a) > PATTERN_ORDER.indexOf(b) ? a : b);
  const name = PATTERN_NAMES[dominant] || dominant;
  return `${name} (${patternAlleles.join(", ")})`;
}

// Function to resolve foot feathering phenotype
function resolveFootFeathering(genotype) {
  const alleles = genotype.autosomal.foot_feathering;
  if (!Array.isArray(alleles) || alleles.length < 2) return "Unknown";
  const expressed = alleles.reduce((a, b) => FEATHERING_ORDER.indexOf(a) > FEATHERING_ORDER.indexOf(b) ? a : b);
  return FEATHERING_NAMES[expressed] || expressed;
}

// Game State
let coins = localStorage.getItem("coins") ? parseInt(localStorage.getItem("coins")) : 0;
let energy = localStorage.getItem("energy") ? parseInt(localStorage.getItem("energy")) : 100;
let loftCapacity = 50;
let pigeons = JSON.parse(localStorage.getItem("pigeons")) || [];
let breedingSelection = { male: null, female: null };
let inventory = JSON.parse(localStorage.getItem("inventory")) || { "Energy Renewal": 0, "Breeding Cooldown": 0, "Baby Auto Grow": 0, "Feathers": 0, "Nest": 0 };
let infiniteEnergy = localStorage.getItem("infiniteEnergy") === "true";
let adminKeySequence = "";

const pigeonNames = ["Sky", "Ash", "Cloud", "Marble", "Rusty", "Pepper", "Willow", "Scout", "Echo", "Drift", "Sadie", "Nyssa", "Brian", "Blakely", "Chops", "Luna", "Zephyr", "Talon", "Breeze", "Flint", "Raven", "Glimmer", "Dusk", "Flicker", "Haze", "Soot", "Cinder", "Storm", "Misty", "Shadow", "Blaze", "Sparrow", "Dawn", "Pebble", "Gust", "Feather", "Slate", "Drizzle", "Smoky", "Wisp", "Nimbus", "Quill", "Frost", "Ember", "Ripple", "Cobalt", "Sable", "Tide", "Boulder", "Sprout", "Gale", "Twilight", "Coral", "Saffron", "Jasper", "Onyx", "Thistle", "Vapor", "Crimson", "Fern", "Horizon", "Tundra", "Moss", "Ziggy", "Comet", "Dune", "Fog", "Canyon", "Velvet", "Whisper", "Bramble", "Star", "Clove", "Driftwood", "Hawk", "Ivy", "Cedar", "Noodle", "Pippin", "Clover", "Dandelion", "Maple", "Sienna", "Basil", "Thorn", "Glint", "Mica", "Fable", "Wren", "Topaz", "Biscuit", "Hopper", "Sage", "Coco", "Flurry", "Parchment", "Acorn", "Chalk", "Sooty", "Blossom", "Cricket", "Taffy", "Meadow", "Birch", "Sprig"];
const exploreInteractions = [
  "The dry grass sways in waves, golden in the afternoon sun. A distant hawk circles lazily above, tracing patterns against a cloudless sky.",
  "Your boots crunch over gravel as you pass a cluster of wild sage. The air fills with its sharp, dusty scent.",
  "A cool breeze drifts down from the hills, carrying the faint echo of a train whistle far, far away.",
  "You spot a single sunflower growing defiantly from a crack in the rocky soil — bright, perfect, and utterly alone.",
  "A rattlesnake slides off the trail, scales whispering softly against stone. It vanishes as quickly as it appeared.",
  "An old wooden fence runs parallel to the path, half-swallowed by weeds. Someone has looped a red bandana around one of the posts.",
  "A creek cuts across the trail, shallow but clear. Tiny minnows flicker like sparks beneath the surface.",
  "The scent of eucalyptus drifts through the air, rich and cool, masking the sun-baked earth beneath your feet.",
  "An abandoned barn leans at the edge of a meadow, roof collapsed, but the paint still faintly spelling out 'Feed Co. 1948.'",
  "You hear the faint rattle of pebbles as something unseen darts into a patch of manzanita.",
  "An orange butterfly lands on your sleeve, rests for a heartbeat, then flutters away toward the sun.",
  "You come across a weathered trail marker, its lettering nearly gone. Someone has tied a bit of blue ribbon to it to show the way.",
  "The hills roll endlessly, dotted with oaks that twist like old dancers against the pale sky.",
  "A rusted horseshoe lies half-buried in the dust, its surface warm from the sun.",
  "You pass a field of golden poppies, their petals trembling in the afternoon breeze — California’s own wildfire of color.",
  "A line of ants crosses your path, each carrying a speck of something larger than itself. The trail feels ancient, determined.",
  "You find an old soda can from decades ago, its colors faded, half-sunk into the earth — a relic of some forgotten picnic.",
  "A crow caws sharply from a fencepost, as if mocking your pace before taking off with a flash of black feathers.",
  "The smell of sun-warmed pine needles fills the air, soft and resinous, comforting in its simplicity.",
  "You spot a distant farmhouse, white walls glowing faintly in the heat haze, though no movement stirs around it.",
  "The wind shifts suddenly, bringing the tang of ocean salt — a whisper of the coast miles away.",
  "A grasshopper leaps from your boot, vanishing into the brush. Its brief shadow flickers over your leg like smoke.",
  "You hear the metallic clang of a windmill, lazily spinning somewhere beyond the next rise.",
  "The sun dips lower, painting the landscape in honey-colored light. Every shadow stretches long and slow across the path.",
  "As dusk settles, a coyote’s distant howl rolls across the valley, echoing through the stillness until it fades into silence."
];

// Genetics Configuration (updated image filenames)
const BASE_COLORS = {
  "Ash red": "red_bar.gif",
  "Blue": "blue_bar.gif",
  "brown": "blue_bar.gif", // Placeholder
  "recessive red": "blue_bar.gif" // Placeholder
};
const DILUTE_COLORS = {
  "Ash red": "yellow_bar.gif",
  "Blue": "silver_bar.gif",
  "brown": "blue_bar.gif", // Placeholder
  "recessive red": "blue_bar.gif" // Placeholder
};
const BABY_IMAGE = "squab.gif";

document.addEventListener("DOMContentLoaded", () => {
  const homeScreen = document.getElementById("home-screen");
  const loftScreen = document.getElementById("loft-screen");
  const breedingScreen = document.getElementById("breeding-screen");
  const exploreScreen = document.getElementById("explore-screen");
  const storeScreen = document.getElementById("store-screen");
  const pigeonDetailScreen = document.getElementById("pigeon-detail-screen");
  const adminPanel = document.getElementById("admin-panel");
  const cooldownSelectScreen = document.getElementById("cooldown-select-screen");
  const growSelectScreen = document.getElementById("grow-select-screen");
  const energyText = document.getElementById("energy-text");
  const energyBar = document.getElementById("energy-bar");
  const coinText = document.getElementById("coin-text");
  const featherText = document.getElementById("feather-text");
  const useNestBtn = document.getElementById("useNestBtn");
  const pigeonGrid = document.getElementById("pigeon-grid");

  // Initialize pigeons if none exist
  if (pigeons.length === 0) {
    pigeons.push(generatePigeon(1, "Male"));
    pigeons.push(generatePigeon(2, "Female"));
    while (pigeons.length < loftCapacity) pigeons.push(null);
    saveGameState();
  }

  document.getElementById("loftBtn").addEventListener("click", () => switchView("loft-screen"));
  document.getElementById("exploreBtn").addEventListener("click", () => switchView("explore-screen"));
  document.getElementById("storeBtn").addEventListener("click", () => { switchView("store-screen"); openStore(); });
  document.getElementById("backHomeLoft").addEventListener("click", () => switchView("home-screen"));
  document.getElementById("backHomeBreed").addEventListener("click", () => switchView("home-screen"));
  document.getElementById("backHomeExplore").addEventListener("click", () => switchView("home-screen"));
  document.getElementById("backHomeStore").addEventListener("click", () => switchView("home-screen"));
  document.getElementById("backLoftDetail").addEventListener("click", () => switchView("loft-screen"));
  document.getElementById("backHomeAdmin").addEventListener("click", () => switchView("home-screen"));
  document.getElementById("backHomeCooldown").addEventListener("click", () => switchView("store-screen"));
  document.getElementById("backHomeGrow").addEventListener("click", () => switchView("store-screen"));
  document.getElementById("breedBtnLoft").addEventListener("click", () => { switchView("breeding-screen"); openBreeding(); });
  document.getElementById("toStoreBtn").addEventListener("click", () => { switchView("store-screen"); openStore(); });
  document.getElementById("toExploreBtn").addEventListener("click", () => switchView("explore-screen"));
  document.getElementById("toLoftBtnExplore").addEventListener("click", () => switchView("loft-screen"));
  document.getElementById("toLoftBtnStore").addEventListener("click", () => switchView("loft-screen"));

  document.addEventListener("keydown", (e) => {
    adminKeySequence += e.key;
    if (adminKeySequence.includes("admin123")) {
      switchView("admin-panel");
      adminKeySequence = ""; // Reset sequence after opening
    }
    // Optional: Reset sequence if too many wrong keys are pressed
    if (adminKeySequence.length > 10) adminKeySequence = adminKeySequence.slice(-7);
  });

  function switchView(id) {
    [homeScreen, loftScreen, breedingScreen, exploreScreen, storeScreen, pigeonDetailScreen, adminPanel, cooldownSelectScreen, growSelectScreen].forEach(el => {
      el.style.display = "none";
      el.classList.remove("active");
    });
    const screen = document.getElementById(id);
    screen.style.display = "block";
    screen.classList.add("active");
  }

  function updateEnergy() {
    if (!infiniteEnergy) energy = Math.max(0, energy);
    energyText.textContent = `${energy}%`;
    energyBar.style.width = `${energy}%`;
    saveGameState();
  }

  function updateCoins() {
    coinText.textContent = coins;
    saveGameState();
  }

  function updateFeathers() {
    featherText.textContent = `${inventory["Feathers"]}/5`;
    useNestBtn.style.display = inventory["Feathers"] >= 5 ? "inline-block" : "none";
    saveGameState();
  }

  function getRandomName() {
    return pigeonNames[Math.floor(Math.random() * pigeonNames.length)];
  }

  function generatePigeon(id, gender = null, isBaby = false, parents = null) {
    gender = gender || (Math.random() < 0.5 ? "Male" : "Female");
    const patternAlleles = [PATTERN_ORDER[Math.floor(Math.random() * PATTERN_ORDER.length)], PATTERN_ORDER[Math.floor(Math.random() * PATTERN_ORDER.length)]];
    const featheringAlleles = [FEATHERING_ORDER[Math.floor(Math.random() * FEATHERING_ORDER.length)], FEATHERING_ORDER[Math.floor(Math.random() * FEATHERING_ORDER.length)]];
    const genotype = {
      sex: gender,
      Z: gender === "Male" ? [Object.keys(BASE_COLORS)[Math.floor(Math.random() * Object.keys(BASE_COLORS).length)], Object.keys(BASE_COLORS)[Math.floor(Math.random() * Object.keys(BASE_COLORS).length)]] : [Object.keys(BASE_COLORS)[Math.floor(Math.random() * Object.keys(BASE_COLORS).length)], "W"],
      autosomal: {
        pattern: patternAlleles,
        foot_feathering: featheringAlleles,
        spread: [Math.random() < 0.5 ? "S" : "s", Math.random() < 0.5 ? "S" : "s"],
        dilute: [Math.random() < 0.5 ? "D" : "d", Math.random() < 0.5 ? "D" : "d"],
        recessive_red: [Math.random() < 0.5 ? "E" : "e", Math.random() < 0.5 ? "E" : "e"]
      }
    };

    const primaryColor = resolveBaseColor(genotype);
    let displayedColor = primaryColor;
    let sprite = BASE_COLORS[primaryColor] || "blue_bar.gif";
    let spread = false, dilute = false, recessiveRed = false;
    applyModifiers({ id, genotype, primaryColor, displayedColor, sprite, spread, dilute, recessiveRed, name: getRandomName(), isBaby, pattern: patternAlleles });

    return {
      id,
      gender,
      genotype,
      primaryColor,
      displayedColor,
      sprite,
      name: getRandomName(),
      isBaby,
      breedCooldown: 0,
      parents: parents || null,
      traits: {
        pattern: patternAlleles,
        footFeathering: resolveFootFeathering(genotype),
        headcrest: Math.random() < 0.1 ? "Crested" : "None"
      }
    };
  }

  function resolveBaseColor(genotype) {
    if (genotype.sex === "Female") return genotype.Z[0];
    const alleles = genotype.Z;
    return Object.keys(BASE_COLORS).reduce((prev, curr) => (Object.keys(BASE_COLORS).indexOf(prev) < Object.keys(BASE_COLORS).indexOf(curr) ? prev : curr), alleles[0]);
  }

  function applyModifiers(pigeon) {
    pigeon.spread = pigeon.genotype.autosomal.spread.includes("S");
    pigeon.dilute = pigeon.genotype.autosomal.dilute.every(a => a === "d");
    pigeon.recessiveRed = pigeon.genotype.autosomal.recessive_red.every(a => a === "e");
    if (pigeon.recessiveRed) {
      pigeon.displayedColor = "recessive red";
      pigeon.sprite = BASE_COLORS["recessive red"];
    } else if (pigeon.spread) {
      pigeon.displayedColor = pigeon.primaryColor + " (Spread)";
      pigeon.sprite = BASE_COLORS[pigeon.primaryColor];
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