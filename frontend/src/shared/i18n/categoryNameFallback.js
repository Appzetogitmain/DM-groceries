/**
 * Built-in Hindi / Gujarati names for common grocery categories.
 *
 * Used only when a category has no admin-entered translation (nameHi / nameGu),
 * so the panels show the selected language out of the box. Keep in sync with
 * backend/scripts/fill-category-translations.js (which stores the same values
 * in the database). First matching rule wins.
 */
// Exact (whole-name) matches win over the group rules below, so e.g. "Butter"
// shows as मक्खन rather than the generic "Dairy Products".
const EXACT = {
    "butter": { hi: "मक्खन", gu: "માખણ" },
    "milk": { hi: "दूध", gu: "દૂધ" },
    "cheese": { hi: "चीज़", gu: "ચીઝ" },
    "paneer": { hi: "पनीर", gu: "પનીર" },
    "curd": { hi: "दही", gu: "દહીં" },
    "curd & yogurt": { hi: "दही और योगर्ट", gu: "દહીં અને યોગર્ટ" },
    "ghee": { hi: "घी", gu: "ઘી" },
    "bread": { hi: "ब्रेड", gu: "બ્રેડ" },
    "eggs": { hi: "अंडे", gu: "ઈંડાં" },
    "rice": { hi: "चावल", gu: "ચોખા" },
    "atta": { hi: "आटा", gu: "લોટ" },
    "sugar": { hi: "चीनी", gu: "ખાંડ" },
    "salt": { hi: "नमक", gu: "મીઠું" },
    "tea": { hi: "चाय", gu: "ચા" },
    "coffee": { hi: "कॉफ़ी", gu: "કૉફી" },
    "almonds": { hi: "बादाम", gu: "બદામ" },
    "cashews": { hi: "काजू", gu: "કાજુ" },
    "raisins": { hi: "किशमिश", gu: "કિસમિસ" },
    "chips": { hi: "चिप्स", gu: "ચિપ્સ" },
    "biscuits": { hi: "बिस्कुट", gu: "બિસ્કિટ" },
    "biscuits & cookies": { hi: "बिस्कुट और कुकीज़", gu: "બિસ્કિટ અને કૂકીઝ" },
    "blended masala": { hi: "मिश्रित मसाले", gu: "મિશ્ર મસાલા" },
    "whole spices": { hi: "साबुत मसाले", gu: "આખા મસાલા" },
    "basic personal hygiene": { hi: "बुनियादी पर्सनल हाइजीन", gu: "મૂળભૂત પર્સનલ હાઇજીન" },
    "breakfast cereals": { hi: "नाश्ते के सीरियल", gu: "નાસ્તાનાં સીરિયલ" },
    "noodles": { hi: "नूडल्स", gu: "નૂડલ્સ" },
    "pasta": { hi: "पास्ता", gu: "પાસ્તા" },
    "juices": { hi: "जूस", gu: "જ્યુસ" },
    "soft drinks": { hi: "कोल्ड ड्रिंक", gu: "કોલ્ડ ડ્રિંક" },
    "detergents": { hi: "डिटर्जेंट", gu: "ડિટર્જન્ટ" },
    "shampoo": { hi: "शैम्पू", gu: "શેમ્પૂ" },
    "toothpaste": { hi: "टूथपेस्ट", gu: "ટૂથપેસ્ટ" },
    "onion & potato": { hi: "प्याज़ और आलू", gu: "ડુંગળી અને બટાકા" },
    "leafy vegetables": { hi: "पत्तेदार सब्ज़ियाँ", gu: "પાંદડાવાળાં શાકભાજી" },
    "chocolates": { hi: "चॉकलेट", gu: "ચૉકલેટ" },
    "namkeen": { hi: "नमकीन", gu: "નમકીન" },
    "jaggery": { hi: "गुड़", gu: "ગોળ" },
};

const RULES = [
    [/^all$/, { hi: 'सभी', gu: 'બધું' }],
    [/\bdal\b|pulse|lentil/, { hi: 'दाल और दलहन', gu: 'દાળ અને કઠોળ' }],
    [/breakfast/, { hi: 'नाश्ते का सामान', gu: 'નાસ્તાની વસ્તુઓ' }],
    [/dry ?fruit|\bnuts?\b/, { hi: 'सूखे मेवे', gu: 'સૂકો મેવો' }],
    [/almond/, { hi: 'बादाम', gu: 'બદામ' }],
    [/\batta\b|flour|\brice\b|grain/, { hi: 'आटा, चावल और अनाज', gu: 'લોટ, ચોખા અને અનાજ' }],
    [/edible oil|cooking oil|\bghee\b|^oils?\b/, { hi: 'खाने के तेल और घी', gu: 'ખાદ્ય તેલ અને ઘી' }],
    [/fresh fruit|^fruits?$/, { hi: 'ताज़े फल', gu: 'તાજાં ફળો' }],
    [/fresh veg|^veg/, { hi: 'ताज़ी सब्ज़ियाँ', gu: 'તાજાં શાકભાજી' }],
    [/biscuit|cookie/, { hi: 'बिस्कुट और कुकीज़', gu: 'બિસ્કિટ અને કૂકીઝ' }],
    [/bakery|bread/, { hi: 'बेकरी और ब्रेड', gu: 'બેકરી અને બ્રેડ' }],
    [/dairy|\bmilk\b|butter|cheese|paneer|curd/, { hi: 'डेयरी उत्पाद', gu: 'ડેરી ઉત્પાદનો' }],
    [/masala|spice/, { hi: 'मसाले', gu: 'મસાલા' }],
    [/baby/, { hi: 'बेबी केयर', gu: 'બેબી કેર' }],
    [/bath|soap|body wash/, { hi: 'नहाने और बॉडी वॉश', gu: 'સ્નાન અને બૉડી વૉશ' }],
    [/personal|hygiene|skin|hair|\bcare\b/, { hi: 'पर्सनल केयर', gu: 'પર્સનલ કેર' }],
    [/household|cleaning|detergent|home care/, { hi: 'घरेलू ज़रूरी सामान', gu: 'ઘરગથ્થુ જરૂરી વસ્તુઓ' }],
    [/packaged|packed|instant|noodle|pasta/, { hi: 'पैकेज्ड फ़ूड', gu: 'પૅકેજ્ડ ફૂડ' }],
    [/beverage|\bdrinks?\b|juice|\btea\b|coffee/, { hi: 'पेय पदार्थ', gu: 'પીણાં' }],
    [/snack|namkeen|chips/, { hi: 'स्नैक्स और नमकीन', gu: 'સ્નૅક્સ અને નમકીન' }],
    [/sweet|chocolate|candy|dessert/, { hi: 'मिठाई और चॉकलेट', gu: 'મીઠાઈ અને ચૉકલેટ' }],
    [/\beggs?\b|meat|fish|chicken/, { hi: 'अंडे, मांस और मछली', gu: 'ઈંડાં, માંસ અને માછલી' }],
    [/frozen/, { hi: 'फ़्रोज़न फ़ूड', gu: 'ફ્રોઝન ફૂડ' }],
    [/\bpets?\b/, { hi: 'पालतू जानवरों का सामान', gu: 'પાળતુ પ્રાણીઓનો સામાન' }],
    [/sauce|ketchup|condiment|spread/, { hi: 'सॉस और स्प्रेड', gu: 'સૉસ અને સ્પ્રેડ' }],
    [/sugar|\bsalt\b|jaggery/, { hi: 'चीनी, नमक और गुड़', gu: 'ખાંડ, મીઠું અને ગોળ' }],
];

const cache = new Map();

/** Built-in translation for a category name, or '' when none is known. */
export const fallbackCategoryName = (name, lang) => {
    if (!name || !lang || lang === 'en') return '';
    const key = `${lang}|${name}`;
    if (cache.has(key)) return cache.get(key);
    const n = String(name).trim().toLowerCase().replace(/\s+and\s+/g, ' & ').replace(/\s+/g, ' ');
    const exact = EXACT[n];
    const rule = exact ? null : RULES.find(([re]) => re.test(n));
    const value = (exact && exact[lang]) || (rule && rule[1][lang]) || '';
    cache.set(key, value);
    return value;
};
