/**
 * Rule-based English → Hindi (Devanagari) / Gujarati transliteration for
 * product and package names. Free, offline, no dependencies.
 *
 * It is a best-effort phonetic approximation ("lays" → "लेज़"), meant to give a
 * reasonable first draft that sellers can later correct in the seller panel.
 * Numbers, units and symbols are kept; well-known words/brands come from the
 * dictionary below (which beats the rules).
 *
 * Gujarati is derived from the Devanagari result by Unicode block offset
 * (the two scripts are parallel), except for dictionary entries that carry an
 * explicit Gujarati form.
 */

// ── dictionary: word → hi  |  [hi, gu] ───────────────────────────────────────
const DICT = {
  and: ["और", "અને"],
  the: ["", ""],
  // dairy & staples
  milk: ["दूध", "દૂધ"], butter: ["मक्खन", "માખણ"], cheese: ["चीज़", "ચીઝ"], paneer: ["पनीर", "પનીર"],
  curd: ["दही", "દહીં"], yogurt: ["योगर्ट", "યોગર્ટ"], yoghurt: ["योगर्ट", "યોગર્ટ"], ghee: ["घी", "ઘી"],
  bread: ["ब्रेड", "બ્રેડ"], egg: ["अंडा", "ઈંડું"], eggs: ["अंडे", "ઈંડાં"], rice: ["चावल", "ચોખા"],
  atta: ["आटा", "લોટ"], flour: ["आटा", "લોટ"], maida: ["मैदा", "મેંદો"], besan: ["बेसन", "બેસન"],
  sugar: ["चीनी", "ખાંડ"], salt: ["नमक", "મીઠું"], tea: ["चाय", "ચા"], coffee: ["कॉफ़ी", "કૉફી"],
  oil: ["तेल", "તેલ"], dal: ["दाल", "દાળ"], water: ["पानी", "પાણી"], honey: ["शहद", "મધ"],
  onion: ["प्याज़", "ડુંગળી"], potato: ["आलू", "બટાકા"], tomato: ["टमाटर", "ટામેટા"],
  // snacks & packaged
  chips: ["चिप्स", "ચિપ્સ"], biscuit: ["बिस्कुट", "બિસ્કિટ"], biscuits: ["बिस्कुट", "બિસ્કિટ"],
  cookie: ["कुकी", "કૂકી"], cookies: ["कुकीज़", "કૂકીઝ"], namkeen: ["नमकीन", "નમકીન"],
  noodles: ["नूडल्स", "નૂડલ્સ"], pasta: ["पास्ता", "પાસ્તા"], juice: ["जूस", "જ્યુસ"],
  chocolate: ["चॉकलेट", "ચૉકલેટ"], chocolates: ["चॉकलेट", "ચૉકલેટ"], cream: ["क्रीम", "ક્રીમ"],
  icecream: ["आइसक्रीम", "આઇસક્રીમ"], cone: ["कोन", "કોન"], chutney: ["चटनी", "ચટણી"],
  masala: ["मसाला", "મસાલા"], spices: ["मसाले", "મસાલા"], spice: ["मसाला", "મસાલા"],
  // personal / home care
  soap: ["साबुन", "સાબુ"], shampoo: ["शैम्पू", "શેમ્પૂ"], toothpaste: ["टूथपेस्ट", "ટૂથપેસ્ટ"],
  detergent: ["डिटर्जेंट", "ડિટર્જન્ટ"], wipes: ["वाइप्स", "વાઇપ્સ"], hot: ["हॉट", "હૉટ"],
  // generic words
  bajra: ["बाजरा", "બાજરી"], jowar: ["ज्वार", "જુવાર"], daily: ["डेली", "ડેલી"], needs: ["नीड्स", "નીડ્સ"],
  package: ["पैकेज", "પૅકેજ"], packages: ["पैकेज", "પૅકેજ"],
  fresh: ["ताज़ा", "તાજું"], organic: ["ऑर्गेनिक", "ઑર્ગેનિક"], pack: ["पैक", "પૅક"], combo: ["कॉम्बो", "કૉમ્બો"],
  family: ["फैमिली", "ફેમિલી"], product: ["प्रोडक्ट", "પ્રોડક્ટ"], stock: ["स्टॉक", "સ્ટૉક"],
  testing: ["टेस्टिंग", "ટેસ્ટિંગ"], test: ["टेस्ट", "ટેસ્ટ"], shop: ["शॉप", "શૉપ"],
  // brands / names
  amul: "अमूल", lays: "लेज़", mohit: "मोहित", parle: "पारले", britannia: "ब्रिटानिया", haldiram: "हल्दीराम",
  nestle: "नेस्ले", maggi: "मैगी", tata: "टाटा", dabur: "डाबर", patanjali: "पतंजलि", mdh: "एमडीएच",
  mother: "मदर", mothers: "मदर्स", tamarind: "इमली", date: "खजूर", kurkure: "कुरकुरे", cadbury: "कैडबरी",
  oreo: "ओरियो", pepsi: "पेप्सी", coca: "कोका", cola: "कोला", sprite: "स्प्राइट", fanta: "फैंटा",
  surf: "सर्फ़", excel: "एक्सेल", vim: "विम", dettol: "डेटॉल", colgate: "कोलगेट", lux: "लक्स",
};
const UNITS = {
  kg: ["किलो", "કિલો"], kgs: ["किलो", "કિલો"], g: ["ग्राम", "ગ્રામ"], gm: ["ग्राम", "ગ્રામ"], gms: ["ग्राम", "ગ્રામ"],
  gram: ["ग्राम", "ગ્રામ"], grams: ["ग्राम", "ગ્રામ"], ml: ["मिली", "મિલી"], l: ["लीटर", "લીટર"],
  ltr: ["लीटर", "લીટર"], litre: ["लीटर", "લીટર"], liter: ["लीटर", "લીટર"], pcs: ["पीस", "પીસ"],
  pc: ["पीस", "પીસ"], pack: ["पैक", "પૅક"], units: ["यूनिट", "યુનિટ"], unit: ["यूनिट", "યુનિટ"],
};
const LETTERS = {
  a: "ए", b: "बी", c: "सी", d: "डी", e: "ई", f: "एफ", g: "जी", h: "एच", i: "आई", j: "जे", k: "के",
  l: "एल", m: "एम", n: "एन", o: "ओ", p: "पी", q: "क्यू", r: "आर", s: "एस", t: "टी", u: "यू",
  v: "वी", w: "डबल्यू", x: "एक्स", y: "वाई", z: "ज़ेड",
};

// ── phonetic rules ───────────────────────────────────────────────────────────
const NUKTA = "़";
const DIGRAPHS = [
  ["tch", "च"], ["sh", "श"], ["ch", "च"], ["th", "थ"], ["ph", "फ" + NUKTA], ["kh", "ख"], ["gh", "ग"],
  ["dh", "ध"], ["bh", "भ"], ["ck", "क"], ["wh", "व"], ["qu", "क्व"],
];
const SINGLE_C = {
  b: "ब", c: "क", d: "ड", f: "फ" + NUKTA, g: "ग", h: "ह", j: "ज", k: "क", l: "ल", m: "म", n: "न",
  p: "प", q: "क", r: "र", s: "स", t: "ट", v: "व", w: "व", x: "क्स", z: "ज" + NUKTA,
};
const VOWEL_GROUPS = [
  ["aa", "aa"], ["ee", "ii"], ["oo", "uu"], ["ea", "ii"], ["ie", "ii"], ["ai", "e"], ["ay", "e"], ["ei", "e"], ["ey", "e"],
  ["au", "aw"], ["aw", "aw"], ["ow", "au"], ["ou", "au"], ["oa", "o"], ["oi", "oy"], ["oy", "oy"],
];
const VOWELS = "aeiou";
const MATRA = {
  inh: "", aa: "ा", a: "ा", i: "ि", ii: "ी", u: "ु", uu: "ू", e: "े", ai: "ै", o: "ो", aw: "ॉ", au: "ाउ", oy: "ॉय", aai: "ाइ",
};
const INDEP = {
  inh: "अ", aa: "आ", a: "आ", i: "इ", ii: "ई", u: "उ", uu: "ऊ", e: "ए", ai: "ऐ", o: "ओ", aw: "ऑ", au: "आउ", oy: "ऑय", aai: "आइ",
};

const isV = (u) => u && u.t === "v";
const isC = (u) => u && u.t === "c";

function wordToUnits(word) {
  let w = word;
  let longVowelAt = -1;

  // Silent final "e" (and "-le"): "rice" → ric + long i, "apple" → appl
  if (w.length > 3 && w.endsWith("e") && !VOWELS.includes(w[w.length - 2])) {
    const body = w.slice(0, -1);
    if (!body.endsWith("l") || VOWELS.includes(body[body.length - 2] || "")) {
      // magic-e: vowel + single consonant + e
      const m = body.match(/([aeiou])([^aeiou])$/);
      if (m && !/[aeiou]$/.test(body.slice(0, -2))) longVowelAt = body.length - 2;
    }
    w = body;
  }

  const units = [];
  let i = 0;
  while (i < w.length) {
    const rest = w.slice(i);
    if (i > 0 && /^tion/.test(rest)) { units.push({ t: "r", s: "शन" }); i += 4; continue; }
    if (i === 0 && rest.startsWith("kn")) { units.push({ t: "c", s: "न" }); i += 2; continue; }
    if (/^(er|ur|ir)(?![aeiou])/.test(rest) && i > 0) {
      units.push({ t: "v", v: "inh", ru: true }, { t: "c", s: "र" });
      i += 2; continue;
    }
    const dg = DIGRAPHS.find(([k]) => rest.startsWith(k));
    if (dg) { units.push({ t: "c", s: dg[1] }); i += dg[0].length; continue; }
    const vg = VOWEL_GROUPS.find(([k]) => rest.startsWith(k));
    if (vg) { units.push({ t: "v", v: vg[1] }); i += 2; continue; }

    const ch = w[i];
    if (VOWELS.includes(ch)) {
      units.push({ t: "v", v: ch, long: i === longVowelAt });
      i += 1; continue;
    }
    if (ch === "y") {
      const prev = units[units.length - 1];
      if (isC(prev) && i === w.length - 1) units.push({ t: "v", v: "ii" });
      else if (isC(prev)) units.push({ t: "v", v: "i" });
      else units.push({ t: "c", s: "य" });
      i += 1; continue;
    }
    if (ch === "c" && /^c[eiy]/.test(rest)) { units.push({ t: "c", s: "स" }); i += 1; continue; }
    if (SINGLE_C[ch]) {
      const dbl = w[i + 1] === ch;
      let s = SINGLE_C[ch];
      // final "s" after a vowel is voiced: lays → लेज़
      if (ch === "s" && i === w.length - 1 && isV(units[units.length - 1])) s = "ज" + NUKTA;
      units.push({ t: "c", s, dbl });
      i += dbl ? 2 : 1; continue;
    }
    i += 1; // unknown char
  }
  return units;
}

function realizeVowel(u, idx, units) {
  if (u.v !== "a" && u.v !== "e" && u.v !== "i" && u.v !== "o" && u.v !== "u") return u.v; // already a group
  const atStart = idx === 0;
  if (u.long) return { a: "e", e: "ii", i: "aai", o: "o", u: "uu" }[u.v];
  const n1 = units[idx + 1];
  const n2 = units[idx + 2];
  const open = !n1 || (isC(n1) && !n1.dbl && isV(n2)) || isV(n1);
  switch (u.v) {
    case "a": return atStart ? "inh" : open ? "a" : "ai";
    case "e": return "e";
    case "i": return open && !n1 ? "ii" : "i";
    case "o": return open ? "o" : "aw";
    case "u": return !n1 ? "uu" : open ? "u" : "inh";
    default: return "inh";
  }
}

function transliterateWordHi(word) {
  const units = wordToUnits(word);
  let out = "";
  let pendingC = false; // last emitted char is a consonant without vowel
  units.forEach((u, idx) => {
    const prev = units[idx - 1];
    if (u.t === "r") { out += u.s; pendingC = false; return; }
    if (u.t === "c") {
      const next = units[idx + 1];
      // n / m before a consonant → anusvara (candy → कैंडी)
      if ((u.s === "न" || u.s === "म") && isC(next) && next.s !== "न" && next.s !== "म" && next.s !== "य" && idx > 0) {
        out += "ं"; return;
      }
      if (pendingC) out += "्";
      out += u.s; pendingC = true; return;
    }
    const kind = realizeVowel(u, idx, units);
    const afterConsonant = isC(prev) && pendingC;
    if (afterConsonant) out += MATRA[kind] ?? "";
    else out += idx === 0 || isV(prev) || !pendingC ? INDEP[kind] ?? "" : MATRA[kind] ?? "";
    pendingC = false;
  });
  // "ं" directly after nothing/vowel is fine; strip a dangling halant at end
  return out.replace(/्$/, "");
}

const toGujarati = (hi) =>
  hi
    .replace(/ज़/g, "झ")
    .replace(/़/g, "")
    .replace(/[ऀ-ॿ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x180));

const pick = (entry, lang) => (Array.isArray(entry) ? (lang === "gu" ? entry[1] : entry[0]) : lang === "gu" ? toGujarati(entry) : entry);

/** Transliterate a free-text English name. lang: "hi" | "gu". */
export function transliterate(text, lang = "hi") {
  const source = String(text || "");
  const out = source.replace(/[A-Za-z][A-Za-z']*/g, (token, offset) => {
    const clean = token.replace(/'/g, "");
    const lower = clean.toLowerCase();
    const before = source.slice(0, offset).trimEnd();
    if (/\d$/.test(before) && UNITS[lower]) return pick(UNITS[lower], lang);
    if (DICT[lower] !== undefined) return pick(DICT[lower], lang);
    if (clean.length >= 1 && clean.length <= 3 && (clean.length > 1 || /^[A-Z]$/.test(clean))  && clean === clean.toUpperCase()) {
      return [...lower].map((c) => pick(LETTERS[c] || c, lang)).join("");
    }
    const hi = transliterateWordHi(lower);
    return lang === "gu" ? toGujarati(hi) : hi;
  });
  return out.replace(/\s{2,}/g, " ").trim();
}

export default transliterate;
