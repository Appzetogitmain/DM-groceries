import { jest } from "@jest/globals";

// ---- Mocks (no real DB / notification delivery) ----------------------------
const mockFindOne = jest.fn();
const mockUpdateOne = jest.fn();
const mockFind = jest.fn();
const mockFindOneAndUpdate = jest.fn();
const mockNotify = jest.fn();

const chain = (result) => {
  const q = {
    select: () => q,
    sort: () => q,
    limit: () => q,
    populate: () => q,
    lean: () => Promise.resolve(typeof result === "function" ? result() : result),
  };
  return q;
};

jest.unstable_mockModule("../app/models/customerList.js", () => ({
  default: {
    findOne: mockFindOne,
    updateOne: mockUpdateOne,
    find: mockFind,
    findOneAndUpdate: mockFindOneAndUpdate,
  },
}));

jest.unstable_mockModule("../app/modules/notifications/notification.service.js", () => ({
  notify: mockNotify,
}));

jest.unstable_mockModule("../app/services/logger.js", () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const {
  computeNextReminderAt,
  armListReminderAfterOrder,
  sendDueListReminders,
  snoozeListReminder,
} = await import("../app/services/customerListReminderService.js");
const { buildNotification } = await import(
  "../app/modules/notifications/notification.builder.js"
);

const CUSTOMER = "67f0000000000000000000c1";
const LIST_ID = "67f0000000000000000000a1";
const ATTA = "67f000000000000000000011";
const RICE = "67f000000000000000000012";
const SOAP = "67f000000000000000000099"; // not part of the list

const listDoc = (overrides = {}) => ({
  _id: LIST_ID,
  reminderDays: 5,
  items: [{ productId: ATTA }, { productId: RICE }],
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
});

// ---------------------------------------------------------------------------
describe("computeNextReminderAt", () => {
  test("lands N days later at 9:00 AM IST", () => {
    // 18 Nov 2026, 11:00 PM IST (17:30 UTC) + 3 days -> 21 Nov 9:00 AM IST
    const at = computeNextReminderAt(new Date("2026-11-18T17:30:00Z"), 3);
    expect(at.toISOString()).toBe("2026-11-21T03:30:00.000Z");
  });

  test.each([3, 5, 7, 10, 15, 30])("%i-day choice schedules the right day", (days) => {
    const from = new Date("2026-11-18T06:00:00Z"); // 11:30 AM IST
    const at = computeNextReminderAt(from, days);
    const expected = new Date(Date.UTC(2026, 10, 18 + days, 3, 30));
    expect(at.toISOString()).toBe(expected.toISOString());
  });

  test("0 / invalid days means no reminder", () => {
    expect(computeNextReminderAt(new Date(), 0)).toBeNull();
    expect(computeNextReminderAt(new Date(), "abc")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
describe("armListReminderAfterOrder — LIST ORDER", () => {
  test("genuine list order (all items from list) arms the reminder", async () => {
    mockFindOne.mockReturnValue(chain(listDoc()));

    await armListReminderAfterOrder({
      listId: LIST_ID,
      customerId: CUSTOMER,
      orderProductIds: [ATTA, RICE],
    });

    expect(mockFindOne).toHaveBeenCalledWith({ _id: LIST_ID, customerId: CUSTOMER });
    expect(mockUpdateOne).toHaveBeenCalledTimes(1);
    const [, update] = mockUpdateOne.mock.calls[0];
    expect(update.$inc).toEqual({ orderCount: 1 });
    expect(update.$set.lastOrderedAt).toBeInstanceOf(Date);
    expect(update.$set.nextReminderAt).toBeInstanceOf(Date);

    const diffDays =
      (update.$set.nextReminderAt - update.$set.lastOrderedAt) / (24 * 3600 * 1000);
    expect(diffDays).toBeGreaterThan(4); // 5 days, aligned to 9 AM IST
    expect(diffDays).toBeLessThan(6);
  });

  test("partial list order (subset of list items) still arms", async () => {
    mockFindOne.mockReturnValue(chain(listDoc()));
    await armListReminderAfterOrder({
      listId: LIST_ID,
      customerId: CUSTOMER,
      orderProductIds: [ATTA],
    });
    expect(mockUpdateOne).toHaveBeenCalledTimes(1);
  });

  test("list with reminders OFF records the order but sets no reminder", async () => {
    mockFindOne.mockReturnValue(chain(listDoc({ reminderDays: 0 })));
    await armListReminderAfterOrder({
      listId: LIST_ID,
      customerId: CUSTOMER,
      orderProductIds: [ATTA, RICE],
    });
    const [, update] = mockUpdateOne.mock.calls[0];
    expect(update.$set.nextReminderAt).toBeNull();
  });
});

// ---------------------------------------------------------------------------
describe("armListReminderAfterOrder — NORMAL ORDER (must never arm)", () => {
  test("stale list marker + normal cart (product not in list) -> no reminder", async () => {
    mockFindOne.mockReturnValue(chain(listDoc()));
    await armListReminderAfterOrder({
      listId: LIST_ID,
      customerId: CUSTOMER,
      orderProductIds: [SOAP],
    });
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });

  test("list items + an extra non-list product -> no reminder", async () => {
    mockFindOne.mockReturnValue(chain(listDoc()));
    await armListReminderAfterOrder({
      listId: LIST_ID,
      customerId: CUSTOMER,
      orderProductIds: [ATTA, RICE, SOAP],
    });
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });

  test("no order items -> no reminder", async () => {
    mockFindOne.mockReturnValue(chain(listDoc()));
    await armListReminderAfterOrder({ listId: LIST_ID, customerId: CUSTOMER, orderProductIds: [] });
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });

  test("missing / invalid listId -> no DB lookup at all", async () => {
    await armListReminderAfterOrder({ listId: null, customerId: CUSTOMER, orderProductIds: [ATTA] });
    await armListReminderAfterOrder({ listId: "temp-list", customerId: CUSTOMER, orderProductIds: [ATTA] });
    expect(mockFindOne).not.toHaveBeenCalled();
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });

  test("list belonging to another customer -> no reminder", async () => {
    mockFindOne.mockReturnValue(chain(null));
    await armListReminderAfterOrder({
      listId: LIST_ID,
      customerId: "67f0000000000000000000c2",
      orderProductIds: [ATTA],
    });
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });

  test("DB failure never throws (order placement is safe)", async () => {
    mockFindOne.mockImplementation(() => {
      throw new Error("db down");
    });
    await expect(
      armListReminderAfterOrder({ listId: LIST_ID, customerId: CUSTOMER, orderProductIds: [ATTA] }),
    ).resolves.toBeNull();
  });
});

// ---------------------------------------------------------------------------
describe("sendDueListReminders", () => {
  const dueAt = new Date("2026-11-21T03:30:00Z");

  test("sends a MY LIST notification for a due list and clears the timer", async () => {
    mockFind.mockReturnValue(chain([{ _id: LIST_ID, nextReminderAt: dueAt }]));
    mockFindOneAndUpdate.mockReturnValue(
      chain({
        _id: LIST_ID,
        customerId: CUSTOMER,
        name: "Monthly Essentials",
        reminderDays: 5,
        lastOrderedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
        items: [
          { productId: { name: "Aashirvaad Atta 5 kg", salePrice: 253, mainImage: "atta.png" }, quantity: 1 },
          { productId: { name: "Basmati Rice", price: 100 }, quantity: 2 },
        ],
      }),
    );
    mockNotify.mockResolvedValue({ enqueued: 1 });

    const result = await sendDueListReminders();

    expect(result).toEqual({ due: 1, sent: 1, failed: 0 });
    // claimed atomically on the exact nextReminderAt value
    const [filter, update] = mockFindOneAndUpdate.mock.calls[0];
    expect(filter).toEqual({ _id: LIST_ID, nextReminderAt: dueAt });
    expect(update.$set.nextReminderAt).toBeNull();
    expect(update.$inc).toEqual({ reminderCount: 1 });

    const [eventType, payload] = mockNotify.mock.calls[0];
    expect(eventType).toBe("CUSTOMER_LIST_REMINDER");
    expect(payload.userId).toBe(CUSTOMER);
    expect(payload.title).toBe("Your Monthly Essentials may finish soon");
    expect(payload.message).toBe(
      "Last ordered 5 days ago. Reorder Aashirvaad Atta 5 kg + 1 more for ₹453?",
    );
    expect(payload.data.listId).toBe(LIST_ID);
    expect(payload.data.imageUrl).toBe("atta.png");
    expect(payload.messageId).toContain(LIST_ID);
  });

  test("single-item list uses the product name in the title", async () => {
    mockFind.mockReturnValue(chain([{ _id: LIST_ID, nextReminderAt: dueAt }]));
    mockFindOneAndUpdate.mockReturnValue(
      chain({
        _id: LIST_ID,
        customerId: CUSTOMER,
        name: "Atta",
        lastOrderedAt: new Date(Date.now() - 22 * 24 * 3600 * 1000),
        items: [{ productId: { name: "Aashirvaad Atta 5 kg", salePrice: 253 }, quantity: 1 }],
      }),
    );
    await sendDueListReminders();
    const [, payload] = mockNotify.mock.calls[0];
    expect(payload.title).toBe("Aashirvaad Atta 5 kg may finish soon");
    expect(payload.message).toBe("Last ordered 22 days ago. Reorder Aashirvaad Atta 5 kg for ₹253?");
  });

  test("already claimed by another scheduler run -> not sent twice", async () => {
    mockFind.mockReturnValue(chain([{ _id: LIST_ID, nextReminderAt: dueAt }]));
    mockFindOneAndUpdate.mockReturnValue(chain(null));
    const result = await sendDueListReminders();
    expect(mockNotify).not.toHaveBeenCalled();
    expect(result.sent).toBe(0);
  });

  test("nothing due -> nothing sent", async () => {
    mockFind.mockReturnValue(chain([]));
    const result = await sendDueListReminders();
    expect(result).toEqual({ due: 0, sent: 0, failed: 0 });
    expect(mockNotify).not.toHaveBeenCalled();
  });

  test("only active lists with a past nextReminderAt are queried", async () => {
    mockFind.mockReturnValue(chain([]));
    await sendDueListReminders();
    const [filter] = mockFind.mock.calls[0];
    expect(filter.status).toBe("active");
    expect(filter.nextReminderAt.$ne).toBeNull();
    expect(filter.nextReminderAt.$lte).toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
describe("Remind later (snooze)", () => {
  test("pushes the reminder ~24h out for the owner's list", async () => {
    mockFindOneAndUpdate.mockReturnValue(chain({ _id: LIST_ID }));
    const before = Date.now();
    await snoozeListReminder({ listId: LIST_ID, customerId: CUSTOMER, hours: 24 });
    const [filter, update] = mockFindOneAndUpdate.mock.calls[0];
    expect(filter).toEqual({ _id: LIST_ID, customerId: CUSTOMER });
    const hours = (update.$set.nextReminderAt.getTime() - before) / 3600000;
    expect(hours).toBeGreaterThanOrEqual(23.99);
    expect(hours).toBeLessThanOrEqual(24.01);
  });
});

// ---------------------------------------------------------------------------
describe("notification builder", () => {
  test("CUSTOMER_LIST_REMINDER goes to the customer and links to notifications", () => {
    const [n] = buildNotification("CUSTOMER_LIST_REMINDER", {
      userId: CUSTOMER,
      title: "Atta may finish soon",
      message: "Last ordered 22 days ago. Reorder Atta for ₹253?",
      data: { listId: LIST_ID, imageUrl: "atta.png" },
    });
    expect(n.role).toBe("customer");
    expect(n.recipientModel).toBe("Customer");
    expect(n.type).toBe("CUSTOMER_LIST_REMINDER");
    expect(n.data.listId).toBe(LIST_ID);
    expect(n.data.link).toMatch(/\/user\/notifications$/);
  });
});
