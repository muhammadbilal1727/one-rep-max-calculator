// Each formula takes weight (w) and reps (r) and returns the estimated 1RM.
const FORMULAS = [
  { name: "Epley", calc: (w, r) => w * (1 + r / 30) },
  { name: "Brzycki", calc: (w, r) => w * (36 / (37 - r)) },
  { name: "Lombardi", calc: (w, r) => w * Math.pow(r, 0.1) },
  { name: "Lander", calc: (w, r) => (100 * w) / (101.3 - 2.67123 * r) },
  { name: "O'Conner", calc: (w, r) => w * (1 + 0.025 * r) },
  { name: "Mayhew", calc: (w, r) => (100 * w) / (52.2 + 41.9 * Math.exp(-0.055 * r)) },
  { name: "Wathan", calc: (w, r) => (100 * w) / (48.8 + 53.8 * Math.exp(-0.075 * r)) },
];

// Percentage of 1RM and the approximate reps you could do at that weight.
const PERCENTAGES = [
  { pct: 100, reps: "1" },
  { pct: 95, reps: "2" },
  { pct: 90, reps: "4" },
  { pct: 85, reps: "6" },
  { pct: 80, reps: "8" },
  { pct: 75, reps: "10" },
  { pct: 70, reps: "12" },
  { pct: 65, reps: "15" },
  { pct: 60, reps: "20" },
  { pct: 55, reps: "24" },
  { pct: 50, reps: "30" },
];

const LIFT_NAMES = {
  bench: "Bench Press",
  squat: "Squat",
  deadlift: "Deadlift",
  ohp: "Overhead Press",
  other: "Lift",
};

// Approximate strength standards: 1RM as a multiple of bodyweight needed to reach
// Novice, Intermediate, Advanced and Elite. Anything below Novice is Beginner.
const LEVELS = ["Beginner", "Novice", "Intermediate", "Advanced", "Elite"];
const STANDARDS = {
  male: {
    bench: [0.75, 1.0, 1.5, 2.0],
    squat: [1.0, 1.5, 2.0, 2.5],
    deadlift: [1.25, 1.75, 2.5, 3.0],
    ohp: [0.5, 0.65, 0.9, 1.2],
  },
  female: {
    bench: [0.5, 0.75, 1.0, 1.3],
    squat: [0.75, 1.0, 1.5, 2.0],
    deadlift: [1.0, 1.25, 1.75, 2.25],
    ohp: [0.35, 0.5, 0.65, 0.85],
  },
};

const $ = (id) => document.getElementById(id);

const liftSelect = $("lift");
const weightInput = $("weight");
const repsInput = $("reps");
const bodyweightInput = $("bodyweight");
const weightError = $("weight-error");
const repsError = $("reps-error");
const bodyweightError = $("bodyweight-error");
const avgEl = $("avg");
const avgValueEl = avgEl.parentElement;
const noteEl = $("result-note");
const rangeEl = $("result-range");
const formulasEl = $("formulas");
const tableEl = $("percent-table");
const unitToggle = $("unit-toggle");
const genderToggle = $("gender-toggle");
const copyBtn = $("copy-btn");
const copyLabel = $("copy-label");
const strengthMessage = $("strength-message");
const strengthResult = $("strength-result");
const levelBadge = $("level-badge");

let unit = "kg";
let gender = "male";
let currentAverage = null; // latest valid 1RM, or null
let currentLevel = null; // latest strength level name, or null
let shownAverage = null; // the number currently on screen, used for the count animation
let countFrame = null;
let countTimer = null;
let lastKey = "";
let lastLift = null; // the valid weight and reps behind the current result

// Browser storage can be blocked (e.g. private windows), so never let it break the page.
function loadSetting(name) {
  try {
    return localStorage.getItem(name);
  } catch (e) {
    return null;
  }
}

function saveSetting(name, value) {
  try {
    localStorage.setItem(name, value);
  } catch (e) {}
}

function format(n) {
  return n.toFixed(1).replace(/\.0$/, "");
}

// Returns { value } when valid, or { error } with a friendly message.
function checkWeight(raw, label) {
  // "1,500" is a thousands separator; "62,5" is a decimal comma
  const text = raw.trim().replace(/^(\d{1,3}),(\d{3})$/, "$1$2").replace(",", ".");
  if (text === "") return { error: "" };
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(text)) return { error: "Please use numbers only, like 80 or 62.5." };
  const value = parseFloat(text);
  if (value < 0) return { error: `${label} can't be negative.` };
  if (value === 0) return { error: `${label} must be more than 0.` };
  if (value > 2000) return { error: "That looks too heavy. Please check the number." };
  return { value };
}

function checkReps(raw) {
  const text = raw.trim();
  if (text === "") return { error: "" };
  if (!/^-?\d*\.?\d+$/.test(text)) return { error: "Please use whole numbers only, like 5." };
  const value = Number(text);
  if (value < 0) return { error: "Reps can't be negative." };
  if (!Number.isInteger(value)) return { error: "Reps must be a whole number, like 5." };
  if (value < 1 || value > 12) return { error: "Please enter between 1 and 12 reps." };
  return { value };
}

function showError(input, errorEl, message) {
  errorEl.textContent = message;
  input.classList.toggle("invalid", message !== "");
}

// Restarts a one-off CSS animation class on an element.
function replay(el, className) {
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
}

// Smoothly counts the big number from its old value to the new one.
function stopCount() {
  cancelAnimationFrame(countFrame);
  clearTimeout(countTimer);
}

function animateAverage(target) {
  stopCount();
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const start = shownAverage === null ? target * 0.85 : shownAverage;

  function finish() {
    stopCount();
    shownAverage = target;
    avgEl.textContent = format(target);
  }

  if (reduceMotion || start === target) return finish();

  const duration = 500;
  const startTime = performance.now();
  function step() {
    const t = Math.min(Math.max((performance.now() - startTime) / duration, 0), 1);
    const eased = 1 - Math.pow(1 - t, 3);
    shownAverage = start + (target - start) * eased;
    avgEl.textContent = format(shownAverage);
    if (t < 1) countFrame = requestAnimationFrame(step);
  }
  step();
  // Browsers pause animation frames in background tabs, so always land on the exact number.
  countTimer = setTimeout(finish, duration + 50);
  replay(avgValueEl, "pop");
}

function renderFormulas(results) {
  formulasEl.innerHTML = FORMULAS.map((f, i) => {
    const value = results ? `${format(results[i])}<small>${unit}</small>` : "--";
    return `<div class="formula"><div class="formula-name">${f.name}</div><div class="formula-value">${value}</div></div>`;
  }).join("");
}

function renderTable(average) {
  tableEl.innerHTML = PERCENTAGES.map((p) => {
    const weight = average ? `${format((average * p.pct) / 100)}<small>${unit}</small>` : "--";
    return `<tr>
      <td><div class="pct-cell"><span>${p.pct}%</span><span class="pct-bar"><span style="width:${p.pct}%"></span></span></div></td>
      <td class="weight-cell">${weight}</td>
      <td class="num">${p.reps}</td>
    </tr>`;
  }).join("");
}

function renderEmpty(message) {
  stopCount();
  shownAverage = null;
  lastKey = "";
  avgEl.textContent = "--";
  noteEl.textContent = message;
  rangeEl.hidden = true;
  renderFormulas(null);
  renderTable(null);
}

function calculate() {
  const w = checkWeight(weightInput.value, "Weight");
  const r = checkReps(repsInput.value);

  showError(weightInput, weightError, w.error || "");
  showError(repsInput, repsError, r.error || "");
  for (const id of ["avg-unit", "weight-suffix", "bodyweight-suffix"]) $(id).textContent = unit;

  if (w.value === undefined || r.value === undefined) {
    currentAverage = null;
    lastLift = null;
    const hasErrors = w.error || r.error;
    renderEmpty(hasErrors ? "Fix the highlighted field to see your result." : "Enter your weight and reps to get started.");
  } else {
    const weight = w.value;
    const reps = r.value;

    // With a single rep, the weight lifted is already your 1RM.
    const results = FORMULAS.map((f) => (reps === 1 ? weight : f.calc(weight, reps)));
    currentAverage = results.reduce((sum, x) => sum + x, 0) / results.length;
    lastLift = { weight, reps };

    // Only redraw (and re-animate) when the numbers actually changed, e.g. not for "100" -> "100."
    const key = `${weight}|${reps}|${unit}`;
    if (key !== lastKey) {
      lastKey = key;
      animateAverage(currentAverage);
      noteEl.textContent = `Based on ${format(weight)} ${unit} × ${reps} rep${reps === 1 ? "" : "s"}, averaged across 7 formulas`;
      $("range-min").textContent = `${format(Math.min(...results))} ${unit}`;
      $("range-max").textContent = `${format(Math.max(...results))} ${unit}`;
      rangeEl.hidden = false;
      renderFormulas(results);
      renderTable(currentAverage);
      replay(formulasEl, "updated");
      replay(tableEl, "updated");
    }
  }

  updateStrength();
  copyBtn.disabled = currentAverage === null;
}

// ---------- Strength level ----------
function showStrengthMessage(message) {
  currentLevel = null;
  strengthMessage.textContent = message;
  strengthMessage.hidden = false;
  strengthResult.hidden = true;
}

function updateStrength() {
  const bw = checkWeight(bodyweightInput.value, "Bodyweight");
  showError(bodyweightInput, bodyweightError, bw.error || "");

  const lift = liftSelect.value;
  if (lift === "other") {
    return showStrengthMessage("Strength levels are available for Bench Press, Squat, Deadlift and Overhead Press.");
  }
  if (currentAverage === null) {
    return showStrengthMessage("Enter your weight and reps above to see your level.");
  }
  if (bw.value === undefined) {
    return showStrengthMessage(bw.error ? "Fix your bodyweight to see your level." : "Enter your bodyweight to see your level.");
  }

  const standards = STANDARDS[gender][lift];
  const ratio = currentAverage / bw.value;
  const index = standards.filter((t) => ratio >= t).length; // 0 = Beginner ... 4 = Elite
  const level = LEVELS[index];

  // Place the marker inside its level's fifth of the bar.
  const bounds = [0, ...standards, standards[3] * 1.25];
  const within = Math.min((ratio - bounds[index]) / (bounds[index + 1] - bounds[index]), 1);
  const position = (index + within) * 20;

  if (level !== currentLevel) replay(levelBadge, "pop");
  currentLevel = level;
  levelBadge.textContent = level;
  $("level-ratio").textContent = `${ratio.toFixed(2)}× bodyweight`;
  $("level-marker").style.left = `${Math.min(Math.max(position, 2), 98)}%`;
  document.querySelectorAll("#level-labels > span").forEach((el, i) => el.classList.toggle("current", i === index));

  const nextEl = $("level-next");
  if (index < 4) {
    const target = standards[index] * bw.value;
    nextEl.innerHTML = `Lift <strong>${format(target)} ${unit}</strong> to reach <strong>${LEVELS[index + 1]}</strong> (${format(target - currentAverage)} ${unit} to go).`;
  } else {
    nextEl.innerHTML = `You're at the <strong>top level</strong>. Outstanding work!`;
  }

  strengthMessage.hidden = true;
  strengthResult.hidden = false;
}

// ---------- Two-option toggles (unit and gender) ----------
function selectToggle(toggle, attr, value) {
  toggle.dataset.active = value;
  toggle.querySelectorAll(".toggle-btn").forEach((b) => {
    const active = b.dataset[attr] === value;
    b.classList.toggle("active", active);
    b.setAttribute("aria-checked", String(active));
  });
}

unitToggle.querySelectorAll(".toggle-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    unit = btn.dataset.unit;
    selectToggle(unitToggle, "unit", unit);
    saveSetting("unit", unit);
    calculate();
  });
});

genderToggle.querySelectorAll(".toggle-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    gender = btn.dataset.gender;
    selectToggle(genderToggle, "gender", gender);
    updateStrength();
  });
});

// ---------- Copy and reset ----------
function buildSummary() {
  const liftName = LIFT_NAMES[liftSelect.value];
  const { weight, reps } = lastLift;
  let text = `My estimated ${liftName} 1RM: ${format(currentAverage)} ${unit} (from ${format(weight)} ${unit} × ${reps} rep${reps === 1 ? "" : "s"}).`;
  if (currentLevel) text += ` Strength level: ${currentLevel}.`;
  return text;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    // Older browsers, or pages opened straight from a file, may block the modern way.
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

let copyTimer = null;
copyBtn.addEventListener("click", async () => {
  if (currentAverage === null) return;
  const ok = await copyText(buildSummary());
  copyLabel.textContent = ok ? "Copied!" : "Couldn't copy";
  replay(copyBtn, "copied");
  clearTimeout(copyTimer);
  copyTimer = setTimeout(() => (copyLabel.textContent = "Copy result"), 1800);
});

$("reset-btn").addEventListener("click", () => {
  weightInput.value = "";
  repsInput.value = "";
  bodyweightInput.value = "";
  liftSelect.value = "bench";
  calculate();
  weightInput.focus();
});

// ---------- Start ----------
weightInput.addEventListener("input", calculate);
repsInput.addEventListener("input", calculate);
bodyweightInput.addEventListener("input", updateStrength);
liftSelect.addEventListener("change", updateStrength);

const savedUnit = loadSetting("unit");
if (savedUnit === "kg" || savedUnit === "lbs") unit = savedUnit;
selectToggle(unitToggle, "unit", unit);

calculate();
