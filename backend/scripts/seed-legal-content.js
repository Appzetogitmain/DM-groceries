/**
 * Fill the Privacy Policy and Support pages for the customer, seller and
 * delivery apps (Setting fields shown on /privacy and /support pages).
 *
 * Content lives in scripts/legal-content/*.md. Placeholders like
 * {{APP_NAME}}, {{SUPPORT_EMAIL}}, {{SUPPORT_PHONE}}, {{SUPPORT_HOURS}},
 * {{COMPANY_NAME}}, {{ADDRESS}} and {{DATE}} are filled from the current
 * Settings document. A line whose placeholder has no value is dropped.
 *
 * By default a field is only written when it is empty or still holds the
 * one-line model default, so text an admin already wrote is never replaced.
 *
 * Usage (from backend/):
 *   node scripts/seed-legal-content.js            # fill empty/default fields
 *   node scripts/seed-legal-content.js --force    # overwrite all six fields
 *   node scripts/seed-legal-content.js --dry-run  # show what would change
 */
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import connectDB from "../app/dbConfig/dbConfig.js";
import Setting from "../app/models/setting.js";
import { invalidate } from "../app/services/cacheService.js";

dotenv.config();

const FORCE = process.argv.includes("--force");
const DRY_RUN = process.argv.includes("--dry-run");
const CONTENT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "legal-content");

// Setting field -> content file (field names are what the pages read)
const FIELDS = {
  privacyPolicy: "customer-privacy.md", // customer /privacy
  termsConditions: "customer-support.md", // customer /support
  sellerPrivacyPolicy: "seller-privacy.md", // /seller/privacy
  sellerTermsConditions: "seller-support.md", // /seller/support
  deliveryPrivacyPolicy: "delivery-privacy.md", // /delivery/privacy
  deliveryTermsConditions: "delivery-support.md", // /delivery/support
};

function fillPlaceholders(text, values) {
  return text
    .split("\n")
    .filter((line) => {
      const keys = [...line.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
      return keys.every((k) => String(values[k] ?? "").trim() !== "");
    })
    .join("\n")
    .replace(/\{\{(\w+)\}\}/g, (_, k) => String(values[k]).trim());
}

async function seedLegalContent() {
  await connectDB();

  const setting = (await Setting.findOne({}).lean()) || {};
  const appName = setting.appName || "DM Groceries";
  const values = {
    APP_NAME: appName,
    COMPANY_NAME: setting.companyName || appName,
    SUPPORT_EMAIL: setting.supportEmail,
    SUPPORT_PHONE: setting.supportPhone,
    SUPPORT_HOURS: setting.supportHours,
    ADDRESS: setting.address,
    DATE: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
  };

  for (const [k, v] of Object.entries(values)) {
    if (!String(v ?? "").trim()) {
      console.warn(`[seed-legal-content] ${k} is empty in Settings - lines using it are left out.`);
    }
  }

  const update = {};
  for (const [field, file] of Object.entries(FIELDS)) {
    const current = String(setting[field] ?? "").trim();
    const modelDefault = String(Setting.schema.path(field)?.defaultValue ?? "").trim();
    const isUntouched = current === "" || current === modelDefault;

    if (!FORCE && !isUntouched) {
      console.log(`[seed-legal-content] skip ${field} (already has custom text; use --force to replace)`);
      continue;
    }
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf8");
    update[field] = fillPlaceholders(raw, values);
    console.log(`[seed-legal-content] ${DRY_RUN ? "would set" : "set"} ${field} <- ${file}`);
  }

  if (!DRY_RUN && Object.keys(update).length) {
    await Setting.findOneAndUpdate({}, { $set: update }, { upsert: true });
    await invalidate("cache:platform:settings:*");
  }

  console.log(`[seed-legal-content] Done (${Object.keys(update).length} field(s)${DRY_RUN ? ", dry run" : ""}).`);
  await mongoose.disconnect();
  process.exit(0);
}

seedLegalContent().catch((error) => {
  console.error("[seed-legal-content] Failed:", error);
  process.exit(1);
});
