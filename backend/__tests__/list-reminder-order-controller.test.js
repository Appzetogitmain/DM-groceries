import { jest } from "@jest/globals";

const mockPlaceOrderAtomic = jest.fn();
const mockHandleResponse = jest.fn();
const mockArmListReminder = jest.fn();

jest.unstable_mockModule("../app/models/order.js", () => ({ default: {} }));
jest.unstable_mockModule("../app/models/seller.js", () => ({ default: {} }));
jest.unstable_mockModule("../app/utils/helper.js", () => ({ default: mockHandleResponse }));
jest.unstable_mockModule("../app/services/finance/orderFinanceService.js", () => ({
  handleCodOrderFinance: jest.fn(),
  reconcileCodCash: jest.fn(),
  settleDeliveredOrder: jest.fn(),
  reverseOrderFinanceOnCancellation: jest.fn(),
}));
jest.unstable_mockModule("../app/services/orderPlacementService.js", () => ({
  placeOrderAtomic: mockPlaceOrderAtomic,
}));
jest.unstable_mockModule("../app/services/paymentService.js", () => ({
  verifyClientPaymentCallback: jest.fn(),
  createPaymentOrderForOrderRef: jest.fn(),
}));
jest.unstable_mockModule("../app/services/checkoutPricingService.js", () => ({
  buildCheckoutPricingSnapshot: jest.fn(),
}));
jest.unstable_mockModule("../app/services/customerListReminderService.js", () => ({
  armListReminderAfterOrder: mockArmListReminder,
}));

const { createOrderWithFinancialSnapshot } = await import(
  "../app/controller/orderFinanceController.js"
);

const CUSTOMER = "67f0000000000000000000c1";
const LIST_ID = "67f0000000000000000000a1";
const ATTA = "67f000000000000000000011";
const RICE = "67f000000000000000000012";

const baseBody = {
  items: [
    { product: ATTA, quantity: 1, price: 253 },
    { product: RICE, quantity: 2, price: 100 },
  ],
  address: { city: "Indore", location: { lat: 22.72, lng: 75.86 } },
  paymentMode: "PENDING",
  timeSlot: "now",
};

const run = (body) =>
  createOrderWithFinancialSnapshot(
    { user: { id: CUSTOMER }, headers: {}, body },
    {},
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockArmListReminder.mockResolvedValue(null);
  mockPlaceOrderAtomic.mockResolvedValue({
    duplicate: false,
    order: { orderId: "ORD-TEST-1" },
    orders: [{ orderId: "ORD-TEST-1" }],
    checkoutGroup: null,
  });
});

describe("POST /orders — NORMAL order", () => {
  test("places the order and does NOT arm any list reminder", async () => {
    await run({ ...baseBody });

    expect(mockPlaceOrderAtomic).toHaveBeenCalledTimes(1);
    const { payload } = mockPlaceOrderAtomic.mock.calls[0][0];
    expect(payload.isListOrder).toBe(false);
    expect(payload.listId).toBeNull();
    expect(mockArmListReminder).not.toHaveBeenCalled();
    expect(mockHandleResponse.mock.calls[0][1]).toBe(201);
  });

  test("isListOrder without a listId does NOT arm a reminder", async () => {
    await run({ ...baseBody, isListOrder: true, listName: "Basket" });
    expect(mockArmListReminder).not.toHaveBeenCalled();
    expect(mockHandleResponse.mock.calls[0][1]).toBe(201);
  });
});

describe("POST /orders — LIST order", () => {
  test("places the order and arms the reminder with the ordered product ids", async () => {
    await run({ ...baseBody, isListOrder: true, listId: LIST_ID, listName: "Monthly Essentials" });

    const { payload } = mockPlaceOrderAtomic.mock.calls[0][0];
    expect(payload.isListOrder).toBe(true);
    expect(payload.listId).toBe(LIST_ID);
    expect(payload.listName).toBe("Monthly Essentials");

    expect(mockArmListReminder).toHaveBeenCalledWith({
      listId: LIST_ID,
      customerId: CUSTOMER,
      orderProductIds: [ATTA, RICE],
    });
    expect(mockHandleResponse.mock.calls[0][1]).toBe(201);
  });

  test("duplicate (idempotent retry) does NOT arm a second time", async () => {
    mockPlaceOrderAtomic.mockResolvedValue({
      duplicate: true,
      order: { orderId: "ORD-TEST-1" },
      orders: [{ orderId: "ORD-TEST-1" }],
    });
    await run({ ...baseBody, isListOrder: true, listId: LIST_ID, listName: "Basket" });
    expect(mockArmListReminder).not.toHaveBeenCalled();
    expect(mockHandleResponse.mock.calls[0][1]).toBe(200);
  });

  test("reminder failure never breaks order placement", async () => {
    mockArmListReminder.mockRejectedValue(new Error("db down"));
    await run({ ...baseBody, isListOrder: true, listId: LIST_ID, listName: "Basket" });
    expect(mockHandleResponse.mock.calls[0][1]).toBe(201);
  });

  test("order placement failure does not arm a reminder", async () => {
    const err = new Error("Out of stock");
    err.statusCode = 409;
    mockPlaceOrderAtomic.mockRejectedValue(err);
    await run({ ...baseBody, isListOrder: true, listId: LIST_ID, listName: "Basket" });
    expect(mockArmListReminder).not.toHaveBeenCalled();
    expect(mockHandleResponse.mock.calls[0][1]).toBe(409);
  });
});
