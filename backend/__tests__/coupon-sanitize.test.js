import { jest } from "@jest/globals";

jest.unstable_mockModule("../app/models/coupon.js", () => ({ default: {} }));
jest.unstable_mockModule("../app/models/order.js", () => ({ default: {} }));

const { sanitizeCouponWritePayload } = await import(
  "../app/services/finance/couponService.js"
);

const base = {
  code: "SAVE10",
  discountType: "percentage",
  discountValue: 10,
  validFrom: "2026-09-08",
  validTill: "2026-10-08",
  description: "Test",
};

describe("sanitizeCouponWritePayload", () => {
  it("requires categories for category_based coupons", () => {
    expect(() =>
      sanitizeCouponWritePayload({ ...base, couponType: "category_based" }),
    ).toThrow(/at least one category/i);
  });

  it("requires minItems for bulk_order coupons", () => {
    expect(() =>
      sanitizeCouponWritePayload({ ...base, couponType: "bulk_order", minItems: 0 }),
    ).toThrow(/minimum item count/i);
  });

  it("locks free_delivery strategy to free_delivery discount type", () => {
    const result = sanitizeCouponWritePayload({
      ...base,
      couponType: "free_delivery",
      discountType: "percentage",
      discountValue: 50,
    });
    expect(result.discountType).toBe("free_delivery");
    expect(result.discountValue).toBe(0);
  });

  it("keeps applicableCategories only for category coupons", () => {
    const catId = "507f1f77bcf86cd799439011";
    const result = sanitizeCouponWritePayload({
      ...base,
      couponType: "generic",
      applicableCategories: [catId],
    });
    expect(result.applicableCategories).toEqual([]);
  });
});
