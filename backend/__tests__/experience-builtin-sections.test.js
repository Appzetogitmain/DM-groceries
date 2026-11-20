import { jest } from "@jest/globals";

const mockFind = jest.fn();
const mockFindById = jest.fn();
const mockFindByIdAndDelete = jest.fn();
const mockUpdateMany = jest.fn();
const mockInsertMany = jest.fn();
const mockBulkWrite = jest.fn();
const mockInvalidate = jest.fn();
const mockHandleResponse = jest.fn();

jest.unstable_mockModule("../app/models/experienceSection.js", () => ({
  default: {
    find: mockFind,
    findById: mockFindById,
    findByIdAndDelete: mockFindByIdAndDelete,
    updateMany: mockUpdateMany,
    insertMany: mockInsertMany,
    bulkWrite: mockBulkWrite,
  },
}));

jest.unstable_mockModule("../app/utils/helper.js", () => ({
  default: mockHandleResponse,
}));

jest.unstable_mockModule("../app/services/cacheService.js", () => ({
  buildKey: jest.fn(),
  getOrSet: jest.fn(),
  getTTL: jest.fn(),
  invalidate: mockInvalidate,
}));

const { deleteExperienceSection, updateExperienceSection } = await import(
  "../app/controller/experienceController.js"
);
const { ensureBuiltinSections, BUILTIN_KEYS, repairDuplicateSectionOrders } = await import(
  "../app/services/builtinSectionsService.js"
);

const ID = "507f1f77bcf86cd799439011";

describe("built-in experience sections", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInvalidate.mockResolvedValue();
  });

  test("built-in sections cannot be deleted", async () => {
    mockFindById.mockReturnValue({
      select: () => ({ lean: async () => ({ displayType: "builtin" }) }),
    });
    await deleteExperienceSection({ params: { id: ID } }, {});
    expect(mockFindByIdAndDelete).not.toHaveBeenCalled();
    expect(mockHandleResponse).toHaveBeenCalledWith(
      expect.anything(),
      400,
      expect.stringContaining("can't be deleted"),
    );
  });

  test("custom sections can still be deleted", async () => {
    mockFindById.mockReturnValue({
      select: () => ({ lean: async () => ({ displayType: "banners" }) }),
    });
    mockFindByIdAndDelete.mockResolvedValue({ _id: ID });
    await deleteExperienceSection({ params: { id: ID } }, {});
    expect(mockFindByIdAndDelete).toHaveBeenCalledWith(ID);
    expect(mockHandleResponse).toHaveBeenCalledWith(expect.anything(), 200, expect.any(String));
  });

  test("updating a built-in only changes its status", async () => {
    const doc = {
      displayType: "builtin",
      builtinKey: "combos",
      title: "Bachat Combos",
      status: "active",
      save: jest.fn().mockResolvedValue(),
    };
    mockFindById.mockResolvedValue(doc);
    await updateExperienceSection(
      {
        params: { id: ID },
        body: { status: "inactive", title: "Hacked", displayType: "banners", builtinKey: "hero" },
      },
      {},
    );
    expect(doc.status).toBe("inactive");
    expect(doc.title).toBe("Bachat Combos");
    expect(doc.displayType).toBe("builtin");
    expect(doc.builtinKey).toBe("combos");
    expect(doc.save).toHaveBeenCalled();
    expect(mockInvalidate).toHaveBeenCalledWith("cache:experience:public:*");
  });

  test("ensureBuiltinSections adds missing built-ins at the top and shifts existing sections", async () => {
    mockFind.mockReturnValue({
      select: () => ({ lean: async () => [{ builtinKey: "hero" }] }),
    });
    mockUpdateMany.mockResolvedValue({});
    mockInsertMany.mockResolvedValue([]);

    const created = await ensureBuiltinSections("home");

    expect(created).toBe(true);
    const missing = BUILTIN_KEYS.filter((k) => k !== "hero");
    expect(mockUpdateMany).toHaveBeenCalledWith(
      { pageType: "home", headerId: null },
      { $inc: { order: missing.length } },
    );
    const [docs] = mockInsertMany.mock.calls[0];
    expect(docs.map((d) => d.builtinKey)).toEqual(missing);
    expect(docs.map((d) => d.order)).toEqual(missing.map((_, i) => i));
    expect(docs.every((d) => d.displayType === "builtin" && d.status === "active")).toBe(true);
  });

  test("repairDuplicateSectionOrders moves a later section that collides on order 0 to the end", async () => {
    // Real case: "cool" was created with order 0 after the built-ins existed
    const rows = [
      { _id: "hero", order: 0, createdAt: "2026-11-20T10:00:00Z" },
      { _id: "cool", order: 0, createdAt: "2026-11-20T12:00:00Z" },
      { _id: "my_list", order: 1, createdAt: "2026-11-20T10:00:00Z" },
      { _id: "combos", order: 2, createdAt: "2026-11-20T10:00:00Z" },
      { _id: "categories", order: 3, createdAt: "2026-11-20T10:00:00Z" },
      { _id: "products", order: 4, createdAt: "2026-11-20T10:00:00Z" },
    ];
    mockFind.mockReturnValue({
      select: () => ({ sort: () => ({ lean: async () => rows }) }),
    });
    mockBulkWrite.mockResolvedValue({});

    expect(await repairDuplicateSectionOrders("home")).toBe(true);
    const ops = mockBulkWrite.mock.calls[0][0];
    expect(ops.map((op) => op.updateOne.filter._id)).toEqual([
      "hero", "my_list", "combos", "categories", "products", "cool",
    ]);
    expect(ops.map((op) => op.updateOne.update.$set.order)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  test("repairDuplicateSectionOrders leaves a clean page alone", async () => {
    mockFind.mockReturnValue({
      select: () => ({
        sort: () => ({ lean: async () => [{ _id: "a", order: 0 }, { _id: "b", order: 1 }] }),
      }),
    });
    expect(await repairDuplicateSectionOrders("home")).toBe(false);
    expect(mockBulkWrite).not.toHaveBeenCalled();
  });

  test("ensureBuiltinSections does nothing when all built-ins exist", async () => {
    mockFind.mockReturnValue({
      select: () => ({ lean: async () => BUILTIN_KEYS.map((k) => ({ builtinKey: k })) }),
    });
    expect(await ensureBuiltinSections("home")).toBe(false);
    expect(mockUpdateMany).not.toHaveBeenCalled();
    expect(mockInsertMany).not.toHaveBeenCalled();
  });
});
