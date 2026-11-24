/**
 * One-time helper: fill Hindi / Gujarati display names (nameHi / nameGu) for
 * existing PRODUCTS and PACKAGES by transliterating the English name
 * ("lays" → "लेज़" / "લેઝ"). Free and offline — no translation API.
 *
 *   node scripts/fill-name-translations.js                 # dry run (read-only)
 *   node scripts/fill-name-translations.js --apply         # write changes
 *   node scripts/fill-name-translations.js --only=products # or --only=packages
 *   node scripts/fill-name-translations.js --limit=50      # first N documents
 *
 * - Never overwrites a nameHi / nameGu that is already set (seller entries win).
 * - Output is a phonetic best-effort; sellers can correct any name afterwards
 *   in Seller → Products / Packages ("Name in Hindi / Gujarati").
 */
import dns from "dns";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { transliterate } from "../app/utils/transliterate.js";

// Some networks/ISPs refuse SRV lookups (querySrv ECONNREFUSED) needed by mongodb+srv://.
// Use public resolvers for this script only.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const apply = process.argv.includes("--apply");
const only = (process.argv.find((a) => a.startsWith("--only=")) || "").split("=")[1];
const limit = Number((process.argv.find((a) => a.startsWith("--limit=")) || "").split("=")[1]) || 0;

const targets = [
  { label: "product", collection: "products" },
  { label: "package", collection: "packages" },
].filter((t) => !only || `${t.label}s` === only);

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  let totalChanged = 0;

  for (const { label, collection } of targets) {
    const Model = mongoose.model(`Fill_${collection}`, new mongoose.Schema({}, { strict: false }), collection);
    let query = Model.find({}).select("name nameHi nameGu");
    if (limit) query = query.limit(limit);
    const docs = await query.lean();
    let changed = 0;

    for (const d of docs) {
      const name = String(d.name || "").trim();
      if (!name) continue;
      const set = {};
      if (!String(d.nameHi || "").trim()) set.nameHi = transliterate(name, "hi");
      if (!String(d.nameGu || "").trim()) set.nameGu = transliterate(name, "gu");
      // skip when transliteration produced nothing useful
      Object.keys(set).forEach((k) => {
        if (!set[k] || set[k] === name) delete set[k];
      });
      if (!Object.keys(set).length) continue;
      changed += 1;
      console.log(`${apply ? "SET " : "WOULD SET "}[${label}] ${name} → ${set.nameHi || d.nameHi || "-"} | ${set.nameGu || d.nameGu || "-"}`);
      if (apply) await Model.updateOne({ _id: d._id }, { $set: set });
    }
    console.log(`\n${label}s: ${docs.length} checked, ${changed} ${apply ? "updated" : "would be updated"}.\n`);
    totalChanged += changed;
  }

  if (!apply && totalChanged) console.log("Dry run only. Re-run with --apply to write.");
  await mongoose.disconnect();
};

run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
