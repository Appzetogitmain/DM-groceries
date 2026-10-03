import { jest } from "@jest/globals";

const mockSellerFind = jest.fn();
const mockSellerFindOne = jest.fn();
const mockSellerCreate = jest.fn();
const mockVerifySellerVerificationToken = jest.fn();
const mockUploadToCloudinary = jest.fn();

jest.unstable_mockModule("../app/models/seller.js", () => ({
  default: {
    find: mockSellerFind,
    findOne: mockSellerFindOne,
    create: mockSellerCreate,
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
  },
}));

jest.unstable_mockModule("../app/services/sellerVerificationService.js", () => ({
  issueSellerVerificationOtp: jest.fn(),
  verifySellerOtpCode: jest.fn(),
  verifySellerVerificationToken: mockVerifySellerVerificationToken,
  issueSellerResetOtp: jest.fn(),
  verifySellerResetOtpCode: jest.fn(),
}));

jest.unstable_mockModule("../app/services/mediaService.js", () => ({
  uploadToCloudinary: mockUploadToCloudinary,
}));

const { signupSeller } = await import("../app/controller/sellerAuthController.js");

describe("sellerAuthController signupSeller", () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      body: {
        name: "Seller Owner",
        email: "seller@example.com",
        phone: "9876543210",
        password: "secret123",
        emailVerificationToken: "email-token",
        phoneVerificationToken: "phone-token",
        shopName: "Noyo Mart",
        category: "Groceries",
        address: "MG Road",
        documents: JSON.stringify({
          tradeLicense: "https://example.com/trade-license.pdf",
          gstCertificate: "https://example.com/gst.pdf",
          idProof: "https://example.com/id-proof.pdf",
        }),
      },
      files: [],
      ip: "127.0.0.1",
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockSellerFind.mockResolvedValue([]);
    mockSellerFindOne.mockResolvedValue(null);
    mockSellerCreate.mockImplementation(async (payload) => ({
      _id: "seller-1",
      ...payload,
    }));
  });

  it("requires both verified email and phone tokens before creating the seller", async () => {
    await signupSeller(req, res);

    expect(mockVerifySellerVerificationToken).toHaveBeenCalledTimes(2);
    expect(mockVerifySellerVerificationToken).toHaveBeenNthCalledWith(1, {
      channel: "email",
      rawValue: "seller@example.com",
      token: "email-token",
    });
    expect(mockVerifySellerVerificationToken).toHaveBeenNthCalledWith(2, {
      channel: "phone",
      rawValue: "9876543210",
      token: "phone-token",
    });
    expect(mockSellerCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        emailVerified: true,
        phoneVerified: true,
        isVerified: false,
        isActive: false,
        applicationStatus: "pending",
      }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("requires PAN Card and Aadhaar Card for individual sellers", async () => {
    // Missing Aadhaar
    req.body.documents = JSON.stringify({
      panCard: "https://example.com/pan.pdf",
    });
    req.body.sellerType = "individual";

    await signupSeller(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Aadhaar Card"),
      }),
    );

    // Both PAN and Aadhaar provided
    req.body.documents = JSON.stringify({
      panCard: "https://example.com/pan.pdf",
      aadharCard: "https://example.com/aadhar.pdf",
    });
    await signupSeller(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("requires PAN, Aadhaar, and either Trade License or GST Certificate for registered business", async () => {
    req.body.sellerType = "registered_business";
    // Only PAN and Aadhaar without Trade License or GST
    req.body.documents = JSON.stringify({
      panCard: "https://example.com/pan.pdf",
      aadharCard: "https://example.com/aadhar.pdf",
    });

    await signupSeller(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Trade License or GST Certificate"),
      }),
    );

    // With Trade License only -> should succeed
    req.body.documents = JSON.stringify({
      panCard: "https://example.com/pan.pdf",
      aadharCard: "https://example.com/aadhar.pdf",
      tradeLicense: "https://example.com/trade-license.pdf",
    });
    await signupSeller(req, res);
    expect(res.status).toHaveBeenCalledWith(201);

    // With GST Certificate only -> should succeed without requiring Trade License
    req.body.documents = JSON.stringify({
      panCard: "https://example.com/pan.pdf",
      aadharCard: "https://example.com/aadhar.pdf",
      gstCertificate: "https://example.com/gst.pdf",
    });
    await signupSeller(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
