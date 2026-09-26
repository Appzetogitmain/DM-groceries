# Subscription Module Implementation Plan

## Overview
This plan outlines the end-to-end development of the Subscription Module for the DM Groceries MERN stack project, as per the provided 3-page developer specification. The UI will follow the existing DM Groceries design system (solid colors, clean typography, primary brand green) instead of the reference "blur" theme. Razorpay will be used as the payment gateway.

## Implementation Phases

### Phase 1: Database Architecture (In Progress)
- **Objective:** Create the foundational Mongoose models.
- **Models:** `PlanFeature`, `SubscriptionPlan`, `SubscriptionOffer`, `Subscription`, `SubscriptionPayment`.
- **Status:** Done. Models enforce the strict schema defined in the specification (including feature codes and subscription snapshotting).

### Phase 2: Admin API Development
- **Objective:** Build backend controllers and routes for Admin management.
- **APIs:** 
  - CRUD for Plan Features.
  - CRUD for Subscription Plans (with feature mapping).
  - CRUD for Subscription Offers (percentage/fixed discounts).
  - Fetch all active/expired subscriptions.
- **Rules:** Ensure deactivated plans/features are preserved for historical data integrity.

### Phase 3: Seller API & Razorpay Payment Integration
- **Objective:** Enable sellers to view, select, and pay for plans.
- **APIs:**
  - `GET /api/seller/subscriptions/plans` (available plans).
  - `POST /api/seller/subscriptions/create-order` (calculates final price minus offers, generates Razorpay order).
  - `POST /api/seller/subscriptions/verify-payment` (Razorpay signature verification, activates subscription).

### Phase 4: Core Middleware & Feature Toggles
- **Objective:** Enforce subscription limits at the API level.
- **Tasks:**
  - Create `checkSubscriptionFeature(featureCode)` middleware.
  - Create order limit checking middleware for new orders.
  - Apply middleware to existing DM Groceries routes (Products, Orders, Analytics, etc.).

### Phase 5: Expiry & Renewal System
- **Objective:** Handle subscription lifecycles automatically.
- **Tasks:**
  - Implement a `node-cron` job to expire subscriptions past their `endDate`.
  - Add API endpoints for sellers to manually renew or upgrade their plans (with prorated calculations if necessary).

### Phase 6: Admin Frontend Panel
- **Objective:** Build the management UI for admins using the DM Groceries solid green theme.
- **Screens:**
  - `/admin/subscriptions/features`
  - `/admin/subscriptions/plans`
  - `/admin/subscriptions/offers`
  - `/admin/subscriptions/subscribers`

### Phase 7: Seller Frontend Panel & Registration Flow
- **Objective:** Integrate subscriptions into the seller's workflow.
- **Screens:**
  - Registration Flow: Add a step during seller onboarding to pick a plan (Free or Paid) and complete Razorpay checkout before the account goes live.
  - Seller Dashboard: `Subscription` menu to view current usage (orders used), expiry date, and plan features.
  - Upgrade/Compare Plans screen based on the UI reference but adapted to the solid theme.

## Next Steps
We will proceed phase by phase. I have completed **Phase 1** by generating the backend database models. Please review the plan, and if it looks good, I will proceed with **Phase 2 (Admin API Development)**.
