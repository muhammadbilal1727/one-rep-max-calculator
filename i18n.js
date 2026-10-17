// Translations for the calculator page. English is built in; other languages load from lang/<code>.js when chosen.
// Mark text in the HTML with data-i18n="key" (text), data-i18n-html="key" (text with markup)
// or data-i18n-attr="attribute:key;attribute:key".
(function () {
  const LANGUAGES = [
    ["en", "English"], ["zh", "中文"], ["hi", "हिन्दी"], ["es", "Español"], ["fr", "Français"],
    ["ar", "العربية"], ["bn", "বাংলা"], ["pt", "Português"], ["ru", "Русский"], ["ur", "اردو"],
    ["id", "Bahasa Indonesia"], ["de", "Deutsch"], ["ja", "日本語"], ["tr", "Türkçe"], ["ko", "한국어"],
  ];
  const RTL = ["ar", "ur"];

  const strings = {
    en: {
      "nav.calculator": "Calculator",
      "nav.about": "About",
      "nav.privacy": "Privacy",
      "nav.terms": "Terms",
      "nav.contact": "Contact",
      "language": "Language",
      "hero.eyebrow": "Strength training tool",
      "hero.title": 'One Rep Max <span class="highlight">Calculator</span>',
      "hero.subtitle": "Enter a set you've lifted. We'll estimate the heaviest single rep you can do using 7 proven formulas, free and instantly.",
      "in.lift": "Lift type",
      "lift.bench": "Bench Press",
      "lift.squat": "Squat",
      "lift.deadlift": "Deadlift",
      "lift.ohp": "Overhead Press",
      "lift.other": "Other",
      "in.weight": "Weight lifted",
      "in.reps": "Reps performed",
      "in.repsSuffix": "reps",
      "in.unit": "Unit",
      "res.label": "Estimated 1RM",
      "res.empty": "Enter your weight and reps to get started.",
      "res.fix": "Fix the highlighted field to see your result.",
      "res.note": "Based on {weight} {unit} × {reps} reps, averaged across 7 formulas",
      "res.noteOne": "Based on {weight} {unit} × {reps} rep, averaged across 7 formulas",
      "res.low": "Lowest",
      "res.high": "Highest",
      "btn.copy": "Copy result",
      "btn.copied": "Copied!",
      "btn.copyFail": "Couldn't copy",
      "btn.reset": "Reset",
      "str.title": "Strength level",
      "str.sub": "Add your bodyweight to see how your lift compares with other lifters.",
      "str.bw": "Your bodyweight",
      "str.gender": "Gender",
      "str.male": "Male",
      "str.female": "Female",
      "str.start": "Enter your lift above and your bodyweight here to see your level.",
      "str.other": "Strength levels are available for Bench Press, Squat, Deadlift and Overhead Press.",
      "str.needLift": "Enter your weight and reps above to see your level.",
      "str.needBw": "Enter your bodyweight to see your level.",
      "str.fixBw": "Fix your bodyweight to see your level.",
      "level.0": "Beginner",
      "level.1": "Novice",
      "level.2": "Intermediate",
      "level.3": "Advanced",
      "level.4": "Elite",
      "levelShort.0": "Beg.",
      "levelShort.1": "Novice",
      "levelShort.2": "Inter.",
      "levelShort.3": "Adv.",
      "levelShort.4": "Elite",
      "str.ratio": "{ratio}× bodyweight",
      "str.next": "Lift <strong>{target} {unit}</strong> to reach <strong>{level}</strong> ({left} {unit} to go).",
      "str.top": "You're at the <strong>top level</strong>. Outstanding work!",
      "form.title": "By formula",
      "form.sub": "Each formula estimates slightly differently. Your result above is the average.",
      "pct.title": "Training percentages",
      "pct.sub": "Use these weights to plan your sets.",
      "pct.col1": "% of 1RM",
      "pct.col2": "Weight",
      "pct.col3": "Approx. reps",
      "err.number": "Please use numbers only, like 80 or 62.5.",
      "err.weightNeg": "Weight can't be negative.",
      "err.weightZero": "Weight must be more than 0.",
      "err.bwNeg": "Bodyweight can't be negative.",
      "err.bwZero": "Bodyweight must be more than 0.",
      "err.tooHeavy": "That looks too heavy. Please check the number.",
      "err.repsNumber": "Please use whole numbers only, like 5.",
      "err.repsNeg": "Reps can't be negative.",
      "err.repsWhole": "Reps must be a whole number, like 5.",
      "err.repsRange": "Please enter between 1 and 12 reps.",
      "copy.text": "My estimated {lift} 1RM: {avg} {unit} (from {weight} {unit} × {reps} reps).",
      "copy.textOne": "My estimated {lift} 1RM: {avg} {unit} (from {weight} {unit} × {reps} rep).",
      "copy.level": " Strength level: {level}.",
      "footer.note": "These are estimates, not guarantees. Warm up properly, and use a spotter or safety bars when you test heavy lifts.",
      "footer.privacy": "Privacy Policy",
      "footer.terms": "Terms of Use",
      "guide.note": "The guide below is available in English.",
    },
  };

  let lang = "en";

  function t(key, vars) {
    let text = (strings[lang] && strings[lang][key]) || strings.en[key] || key;
    if (vars) text = text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? vars[name] : match));
    return text;
  }

  const select = document.getElementById("lang-select");
  const code = document.getElementById("lang-code");

  function apply() {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = RTL.includes(lang) ? "rtl" : "ltr";
    document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
    document.querySelectorAll("[data-i18n-html]").forEach((el) => (el.innerHTML = t(el.dataset.i18nHtml)));
    document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      el.dataset.i18nAttr.split(";").forEach((pair) => {
        const [attr, key] = pair.split(":");
        el.setAttribute(attr, t(key));
      });
    });
    const note = document.getElementById("guide-note");
    if (note) note.hidden = lang === "en";
    select.value = lang;
    code.textContent = lang.toUpperCase();
    document.dispatchEvent(new CustomEvent("i18n:change"));
  }

  function load(langCode) {
    return new Promise((resolve) => {
      if (strings[langCode]) return resolve(true);
      const script = document.createElement("script");
      script.src = `lang/${langCode}.js`;
      script.onload = () => resolve(!!strings[langCode]);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  }

  async function setLanguage(langCode, save) {
    if (!LANGUAGES.some(([c]) => c === langCode)) langCode = "en";
    if (!(await load(langCode))) langCode = "en";
    lang = langCode;
    apply();
    if (save) {
      try {
        localStorage.setItem("lang", langCode);
      } catch (e) {}
    }
  }

  window.I18N = {
    t,
    setLanguage,
    register: (langCode, dict) => (strings[langCode] = dict),
    get lang() {
      return lang;
    },
  };

  select.innerHTML = LANGUAGES.map(([c, name]) => `<option value="${c}" lang="${c}">${name}</option>`).join("");
  select.addEventListener("change", () => setLanguage(select.value, true));

  // Start with the saved choice, otherwise the browser's language if we have it.
  let start = null;
  try {
    start = localStorage.getItem("lang");
  } catch (e) {}
  if (!start) {
    const wanted = (navigator.languages || [navigator.language || "en"]).map((l) => l.toLowerCase().split("-")[0]);
    start = wanted.find((l) => LANGUAGES.some(([c]) => c === l)) || "en";
  }
  if (start === "en") {
    select.value = "en";
  } else {
    setLanguage(start, false);
  }
})();
