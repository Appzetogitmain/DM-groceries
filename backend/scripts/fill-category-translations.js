/**
 * One-time helper: fill Hindi / Gujarati display names (nameHi / nameGu) for
 * existing categories from a built-in dictionary.
 *
 *   node scripts/fill-category-translations.js            # dry run (read-only)
 *   node scripts/fill-category-translations.js --apply    # write changes
 *
 * - Never overwrites a nameHi / nameGu that is already set (admin entries win).
 * - Categories that match no rule are listed; set those in
 *   Admin → Categories (the forms have "Name in Hindi / Gujarati" fields).
 * - Rules are checked in order; the first matching rule wins.
 */
import dns from "dns";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Some networks/ISPs refuse SRV lookups (querySrv ECONNREFUSED) needed by mongodb+srv://.
// Use public resolvers for this script only.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

// Exact whole-name matches (checked first). Keep in sync with
// frontend/src/shared/i18n/categoryNameFallback.js
const EXACT = {
  "butter": ["मक्खन", "માખણ"],
  "milk": ["दूध", "દૂધ"],
  "cheese": ["चीज़", "ચીઝ"],
  "paneer": ["पनीर", "પનીર"],
  "curd": ["दही", "દહીં"],
  "curd & yogurt": ["दही और योगर्ट", "દહીં અને યોગર્ટ"],
  "ghee": ["घी", "ઘી"],
  "bread": ["ब्रेड", "બ્રેડ"],
  "eggs": ["अंडे", "ઈંડાં"],
  "rice": ["चावल", "ચોખા"],
  "atta": ["आटा", "લોટ"],
  "sugar": ["चीनी", "ખાંડ"],
  "salt": ["नमक", "મીઠું"],
  "tea": ["चाय", "ચા"],
  "coffee": ["कॉफ़ी", "કૉફી"],
  "almonds": ["बादाम", "બદામ"],
  "cashews": ["काजू", "કાજુ"],
  "raisins": ["किशमिश", "કિસમિસ"],
  "chips": ["चिप्स", "ચિપ્સ"],
  "biscuits": ["बिस्कुट", "બિસ્કિટ"],
  "biscuits & cookies": ["बिस्कुट और कुकीज़", "બિસ્કિટ અને કૂકીઝ"],
  "blended masala": ["मिश्रित मसाले", "મિશ્ર મસાલા"],
  "whole spices": ["साबुत मसाले", "આખા મસાલા"],
  "basic personal hygiene": ["बुनियादी पर्सनल हाइजीन", "મૂળભૂત પર્સનલ હાઇજીન"],
  "breakfast cereals": ["नाश्ते के सीरियल", "નાસ્તાનાં સીરિયલ"],
  "noodles": ["नूडल्स", "નૂડલ્સ"],
  "pasta": ["पास्ता", "પાસ્તા"],
  "juices": ["जूस", "જ્યુસ"],
  "soft drinks": ["कोल्ड ड्रिंक", "કોલ્ડ ડ્રિંક"],
  "detergents": ["डिटर्जेंट", "ડિટર્જન્ટ"],
  "shampoo": ["शैम्पू", "શેમ્પૂ"],
  "toothpaste": ["टूथपेस्ट", "ટૂથપેસ્ટ"],
  "onion & potato": ["प्याज़ और आलू", "ડુંગળી અને બટાકા"],
  "leafy vegetables": ["पत्तेदार सब्ज़ियाँ", "પાંદડાવાળાં શાકભાજી"],
  "chocolates": ["चॉकलेट", "ચૉકલેટ"],
  "namkeen": ["नमकीन", "નમકીન"],
  "jaggery": ["गुड़", "ગોળ"],
};

// [pattern on the lower-cased English name, Hindi, Gujarati]
const RULES = [
  [/^all$/, "सभी", "બધું"],
  [/dal|pulse|lentil/, "दाल और दलहन", "દાળ અને કઠોળ"],
  [/breakfast/, "नाश्ते का सामान", "નાસ્તાની વસ્તુઓ"],
  [/dry ?fruit|nuts?/, "सूखे मेवे", "સૂકો મેવો"],
  [/almond/, "बादाम", "બદામ"],
  [/atta|flour|rice|grain/, "आटा, चावल और अनाज", "લોટ, ચોખા અને અનાજ"],
  [/edible oil|cooking oil|ghee|^oils?/, "खाने के तेल और घी", "ખાદ્ય તેલ અને ઘી"],
  [/fresh fruit|^fruits?$/, "ताज़े फल", "તાજાં ફળો"],
  [/fresh veg|^veg/, "ताज़ी सब्ज़ियाँ", "તાજાં શાકભાજી"],
  [/biscuit|cookie/, "बिस्कुट और कुकीज़", "બિસ્કિટ અને કૂકીઝ"],
  [/bakery|bread/, "बेकरी और ब्रेड", "બેકરી અને બ્રેડ"],
  [/dairy|milk|butter|cheese|paneer|curd/, "डेयरी उत्पाद", "ડેરી ઉત્પાદનો"],
  [/masala|spice/, "मसाले", "મસાલા"],
  [/baby/, "बेबी केयर", "બેબી કેર"],
  [/bath|soap|body wash/, "नहाने और बॉडी वॉश", "સ્નાન અને બૉડી વૉશ"],
  [/personal|hygiene|skin|hair|care/, "पर्सनल केयर", "પર્સનલ કેર"],
  [/household|cleaning|detergent|home care/, "घरेलू ज़रूरी सामान", "ઘરગથ્થુ જરૂરી વસ્તુઓ"],
  [/packaged|packed|instant|noodle|pasta/, "पैकेज्ड फ़ूड", "પૅકેજ્ડ ફૂડ"],
  [/beverage|drinks?|juice|tea|coffee/, "पेय पदार्थ", "પીણાં"],
  [/snack|namkeen|chips/, "स्नैक्स और नमकीन", "સ્નૅક્સ અને નમકીન"],
  [/sweet|chocolate|candy|dessert/, "मिठाई और चॉकलेट", "મીઠાઈ અને ચૉકલેટ"],
  [/eggs?|meat|fish|chicken/, "अंडे, मांस और मछली", "ઈંડાં, માંસ અને માછલી"],
  [/frozen/, "फ़्रोज़न फ़ूड", "ફ્રોઝન ફૂડ"],
  [/pets?/, "पालतू जानवरों का सामान", "પાળતુ પ્રાણીઓનો સામાન"],
  [/sauce|ketchup|condiment|spread/, "सॉस और स्प्रेड", "સૉસ અને સ્પ્રેડ"],
  [/sugar|salt|jaggery/, "चीनी, नमक और गुड़", "ખાંડ, મીઠું અને ગોળ"],
];

const match = (name) => {
  const n = String(name || "").trim().toLowerCase().replace(/\s+and\s+/g, " & ").replace(/\s+/g, " ");
  if (EXACT[n]) return { hi: EXACT[n][0], gu: EXACT[n][1] };
  const rule = RULES.find(([re]) => re.test(n));
  return rule ? { hi: rule[1], gu: rule[2] } : null;
};

const apply = process.argv.includes("--apply");

const Category = mongoose.model(
  "Category",
  new mongoose.Schema({}, { strict: false }),
  "categories",
);

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const cats = await Category.find({}).select("name nameHi nameGu type").lean();
  const unmatched = [];
  let changed = 0;

  for (const c of cats) {
    const m = match(c.name);
    if (!m) {
      unmatched.push(`${c.type}: ${c.name}`);
      continue;
    }
    const set = {};
    if (!c.nameHi) set.nameHi = m.hi;
    if (!c.nameGu) set.nameGu = m.gu;
    if (!Object.keys(set).length) continue;
    changed += 1;
    console.log(`${apply ? "SET " : "WOULD SET "}[${c.type}] ${c.name} → ${set.nameHi || c.nameHi} | ${set.nameGu || c.nameGu}`);
    if (apply) await Category.updateOne({ _id: c._id }, { $set: set });
  }

  console.log(`\n${cats.length} categories, ${changed} ${apply ? "updated" : "would be updated"}.`);
  if (unmatched.length) {
    console.log(`\nNo rule matched (${unmatched.length}) — set these in Admin → Categories:`);
    unmatched.forEach((u) => console.log("  - " + u));
  }
  if (!apply) console.log("\nDry run only. Re-run with --apply to write.");
  await mongoose.disconnect();
};

run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
