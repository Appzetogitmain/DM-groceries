/**
 * Centralized permission definitions for the Admin RBAC system.
 * This is the single source of truth used by both middleware and frontend.
 */

export const ADMIN_SECTIONS = {
  dashboard: { label: "Dashboard", actions: ["view"] },
  categories: { label: "Categories", actions: ["view", "create", "delete"] },
  products: { label: "Products", actions: ["view", "create", "delete"] },
  marketing: { label: "Marketing Tools", actions: ["view", "create", "delete"] },
  support: { label: "Customer Support", actions: ["view", "create"] },
  sellers: { label: "Sellers", actions: ["view", "create", "delete"] },
  delivery: { label: "Delivery Drivers", actions: ["view", "create", "delete"] },
  wallet: { label: "Wallet", actions: ["view"] },
  withdrawals: { label: "Money Requests", actions: ["view", "create"] },
  seller_transactions: { label: "Seller Payments", actions: ["view"] },
  cash_collection: { label: "Collect Cash", actions: ["view", "create"] },
  customers: { label: "Customers", actions: ["view", "create"] },
  faqs: { label: "FAQs", actions: ["view", "create", "delete"] },
  orders: { label: "Orders", actions: ["view", "create"] },
  billing: { label: "Fees & Charges", actions: ["view", "create"] },
  settings: { label: "Settings", actions: ["view", "create"] },
  sub_admins: { label: "Sub Admin Management", actions: ["view", "create", "delete"] },
};

export const ALL_ACTIONS = ["view", "create", "delete"];

export const SECTION_KEYS = Object.keys(ADMIN_SECTIONS);

/**
 * Check if an admin document represents a super admin.
 */
export function isSuperAdmin(admin) {
  return admin?.adminType === "super_admin";
}

/**
 * Validate that a permissions object only contains valid sections and actions.
 * Returns { valid: boolean, errors: string[] }
 */
export function validatePermissions(permissions) {
  const errors = [];

  if (!permissions || typeof permissions !== "object") {
    return { valid: false, errors: ["Permissions must be an object"] };
  }

  for (const [section, actions] of Object.entries(permissions)) {
    if (!ADMIN_SECTIONS[section]) {
      errors.push(`Unknown section: ${section}`);
      continue;
    }

    if (!Array.isArray(actions)) {
      errors.push(`Actions for section "${section}" must be an array`);
      continue;
    }

    const validActions = ADMIN_SECTIONS[section].actions;
    for (const action of actions) {
      if (!validActions.includes(action)) {
        errors.push(`Invalid action "${action}" for section "${section}". Valid: ${validActions.join(", ")}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
