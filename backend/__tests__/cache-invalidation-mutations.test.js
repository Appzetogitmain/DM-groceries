import { jest } from "@jest/globals";

const mockCreate = jest.fn();
const mockFindByIdAndUpdate = jest.fn();
const mockFindById = jest.fn();
const mockFind = jest.fn();
const mockFindByIdAndDelete = jest.fn();
const mockFindOne = jest.fn();
const mockInvalidate = jest.fn();
const mockHandleResponse = jest.fn();

jest.unstable_mockModule("../app/models/category.js", () => ({
  default: {
    create: mockCreate,
    findByIdAndUpdate: mockFindByIdAndUpdate,
    findById: mockFindById,
    find: mockFind,
    findByIdAndDelete: mockFindByIdAndDelete,
    findOne: mockFindOne,
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

const {
  createCategory,
  updateCategory,
  deleteCategory,
} = await import("../app/controller/categoryController.js");

describe("cache invalidation on category mutations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockResolvedValue({ _id: "cat-1", name: "Fruits" });
    mockFindByIdAndUpdate.mockResolvedValue({ _id: "cat-1", name: "Updated" });
    mockFindById.mockReturnValue({
      select: () => ({
        lean: async () => ({ type: "header", parentId: null }),
      }),
    });
    mockFind.mockReturnValue({
      select: () => ({ lean: async () => [] }),
    });
    mockFindByIdAndDelete.mockResolvedValue({ _id: "cat-1" });
    mockFindOne.mockReturnValue({ lean: async () => null });
  });

  test("createCategory invalidates category caches", async () => {
    await createCategory(
      {
        body: { name: "Fruits", slug: "fruits", type: "header", iconId: "electronics" },
      },
      {},
    );
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ iconId: "electronics" }),
    );
    expect(mockInvalidate).toHaveBeenCalledWith("cache:catalog:categories:*");
  });

  test("updateCategory invalidates category caches", async () => {
    await updateCategory(
      {
        params: { id: "507f1f77bcf86cd799439011" },
        body: { name: "Updated", iconId: "fashion" },
      },
      {},
    );
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      "507f1f77bcf86cd799439011",
      expect.objectContaining({
        $set: expect.objectContaining({ iconId: "fashion" }),
      }),
      expect.any(Object),
    );
    expect(mockInvalidate).toHaveBeenCalledWith("cache:catalog:categories:*");
  });

  test("deleteCategory invalidates category caches", async () => {
    await deleteCategory(
      {
        params: { id: "507f1f77bcf86cd799439011" },
      },
      {},
    );
    expect(mockInvalidate).toHaveBeenCalledWith("cache:catalog:categories:*");
  });

  test("deleteCategory refuses to delete the default \"All\" header", async () => {
    mockFindById.mockReturnValue({
      select: () => ({
        lean: async () => ({ type: "header", name: "All", slug: "all" }),
      }),
    });
    await deleteCategory({ params: { id: "507f1f77bcf86cd799439011" } }, {});
    expect(mockFindByIdAndDelete).not.toHaveBeenCalled();
    expect(mockHandleResponse).toHaveBeenCalledWith(
      expect.anything(),
      400,
      expect.stringContaining("cannot be deleted"),
    );
  });

  test("updateCategory keeps the \"All\" header's name/slug/status but saves its image and icon", async () => {
    mockFindById.mockReturnValue({
      select: () => ({
        lean: async () => ({ type: "header", parentId: null, name: "All", slug: "all" }),
      }),
    });
    await updateCategory(
      {
        params: { id: "507f1f77bcf86cd799439011" },
        body: {
          name: "Everything",
          slug: "everything",
          status: "inactive",
          adminCommission: "5",
          handlingFees: "10",
          iconId: "grocery",
          image: "https://example.com/all.png",
        },
      },
      {},
    );
    const [, update] = mockFindByIdAndUpdate.mock.calls[0];
    expect(update.$set).toEqual(
      expect.objectContaining({ iconId: "grocery", image: "https://example.com/all.png" }),
    );
    expect(update.$set).not.toHaveProperty("name");
    expect(update.$set).not.toHaveProperty("slug");
    expect(update.$set).not.toHaveProperty("status");
    expect(update.$set).not.toHaveProperty("adminCommission");
    expect(update.$set).not.toHaveProperty("handlingFees");
  });
});
