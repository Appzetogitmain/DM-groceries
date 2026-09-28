import Delivery from "../../models/delivery.js";
import Order from "../../models/order.js";
import handleResponse from "../../utils/helper.js";
import getPagination from "../../utils/pagination.js";

export const getDeliveryPartners = async (req, res) => {
  try {
    const { status, verified } = req.query;
    const query = {};

    if (status === "online") {
      query.isOnline = true;
    } else if (status === "offline") {
      query.isOnline = false;
    }

    if (verified === "true") {
      query.isVerified = true;
    } else if (verified === "false") {
      query.isVerified = false;
    }

    const { page, limit, skip } = getPagination(req, {
      defaultLimit: 25,
      maxLimit: 200,
    });

    const [deliveryPartners, total] = await Promise.all([
      Delivery.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Delivery.countDocuments(query),
    ]);

    const partnerIds = deliveryPartners.map(p => p._id);
    
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const stats = await Order.aggregate([
      {
        $match: {
          deliveryBoy: { $in: partnerIds },
          orderStatus: "delivered"
        }
      },
      {
        $group: {
          _id: "$deliveryBoy",
          totalOrders: { $sum: 1 },
          todayEarnings: {
            $sum: {
              $cond: [
                { $gte: ["$createdAt", startOfToday] },
                "$paymentBreakdown.riderPayoutTotal",
                0
              ]
            }
          }
        }
      }
    ]);

    const statsMap = stats.reduce((acc, stat) => {
      acc[stat._id.toString()] = stat;
      return acc;
    }, {});

    const items = deliveryPartners.map(partner => ({
      ...partner,
      totalOrders: statsMap[partner._id.toString()]?.totalOrders || 0,
      todayEarnings: statsMap[partner._id.toString()]?.todayEarnings || 0
    }));

    return handleResponse(res, 200, "Delivery partners fetched successfully", {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const approveDeliveryPartner = async (req, res) => {
  try {
    const { id } = req.params;
    const rider = await Delivery.findByIdAndUpdate(
      id,
      { isVerified: true },
      { new: true },
    );

    if (!rider) {
      return handleResponse(res, 404, "Rider not found");
    }

    return handleResponse(res, 200, "Rider approved successfully", rider);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const rejectDeliveryPartner = async (req, res) => {
  try {
    const { id } = req.params;
    const rider = await Delivery.findByIdAndDelete(id);

    if (!rider) {
      return handleResponse(res, 404, "Rider not found");
    }

    return handleResponse(
      res,
      200,
      "Rider application rejected and removed",
    );
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const getPendingDeliveryDocuments = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req, {
      defaultLimit: 25,
      maxLimit: 200,
    });

    const query = { "pendingDocuments.status": "pending" };

    const [partners, total] = await Promise.all([
      Delivery.find(query)
        .select("name phone pendingDocuments documents")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Delivery.countDocuments(query),
    ]);

    return handleResponse(res, 200, "Pending documents fetched", {
      items: partners,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const approveDeliveryDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const delivery = await Delivery.findById(id);

    if (!delivery || !delivery.pendingDocuments || delivery.pendingDocuments.status !== "pending") {
      return handleResponse(res, 404, "No pending documents found");
    }

    if (!delivery.documents) delivery.documents = {};

    // Copy fields
    const fieldsToCopy = ["aadhar", "pan", "drivingLicense", "policeClearance", "bankPassbook"];
    fieldsToCopy.forEach(field => {
      if (delivery.pendingDocuments[field]) {
        delivery.documents[field] = delivery.pendingDocuments[field];
      }
    });

    delivery.pendingDocuments.status = "none";
    delivery.pendingDocuments.rejectionReason = "";

    await delivery.save();

    return handleResponse(res, 200, "Documents approved successfully");
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const rejectDeliveryDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const delivery = await Delivery.findById(id);

    if (!delivery || !delivery.pendingDocuments || delivery.pendingDocuments.status !== "pending") {
      return handleResponse(res, 404, "No pending documents found");
    }

    delivery.pendingDocuments.status = "rejected";
    delivery.pendingDocuments.rejectionReason = reason || "Rejected by admin";

    await delivery.save();

    return handleResponse(res, 200, "Documents rejected");
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const getPendingDeliveryVehicleInfo = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req, {
      defaultLimit: 25,
      maxLimit: 200,
    });

    const query = { "pendingVehicleInfo.status": "pending" };

    const [partners, total] = await Promise.all([
      Delivery.find(query)
        .select("name phone pendingVehicleInfo vehicleType vehicleModel vehicleNumber vehicleColor fuelType drivingLicenseNumber")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Delivery.countDocuments(query),
    ]);

    return handleResponse(res, 200, "Pending vehicle info fetched", {
      items: partners,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const approveDeliveryVehicleInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const delivery = await Delivery.findById(id);

    if (!delivery || !delivery.pendingVehicleInfo || delivery.pendingVehicleInfo.status !== "pending") {
      return handleResponse(res, 404, "No pending vehicle info found");
    }

    // Copy fields
    const fieldsToCopy = ["vehicleType", "vehicleModel", "vehicleNumber", "vehicleColor", "fuelType", "drivingLicenseNumber"];
    fieldsToCopy.forEach(field => {
      if (delivery.pendingVehicleInfo[field]) {
        delivery[field] = delivery.pendingVehicleInfo[field];
      }
    });

    delivery.pendingVehicleInfo.status = "none";
    delivery.pendingVehicleInfo.rejectionReason = "";

    await delivery.save();

    return handleResponse(res, 200, "Vehicle info approved successfully");
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const rejectDeliveryVehicleInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const delivery = await Delivery.findById(id);

    if (!delivery || !delivery.pendingVehicleInfo || delivery.pendingVehicleInfo.status !== "pending") {
      return handleResponse(res, 404, "No pending vehicle info found");
    }

    delivery.pendingVehicleInfo.status = "rejected";
    delivery.pendingVehicleInfo.rejectionReason = reason || "Rejected by admin";

    await delivery.save();

    return handleResponse(res, 200, "Vehicle info rejected");
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const getActiveFleet = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req, {
      defaultLimit: 25,
      maxLimit: 200,
    });

    const query = {
      deliveryBoy: { $ne: null },
      status: {
        $in: ["confirmed", "packed", "shipped", "out_for_delivery"],
      },
    };

    const [activeOrders, total] = await Promise.all([
      Order.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("deliveryBoy", "name phone documents vehicleType")
        .populate("seller", "shopName address name")
        .populate("customer", "name phone")
        .lean(),
      Order.countDocuments(query),
    ]);

    const fleetData = activeOrders.map((order) => ({
      id: order.orderId,
      status:
        order.status === "out_for_delivery"
          ? "On the Way"
          : order.status === "packed"
            ? "At Pickup"
            : order.status === "shipped"
              ? "In Transit"
              : "Assigned",
      deliveryBoy: {
        name: order.deliveryBoy?.name || "Unknown",
        phone: order.deliveryBoy?.phone || "N/A",
        id: order.deliveryBoy?._id || "N/A",
        vehicle: order.deliveryBoy?.vehicleType || "N/A",
        image:
          order.deliveryBoy?.documents?.profileImage ||
          "https://via.placeholder.com/200",
      },
      seller: {
        name: order.seller?.shopName || order.seller?.name || "Unknown",
      },
      customer: {
        name: order.customer?.name || "Guest",
        phone: order.customer?.phone || "N/A",
      },
      lastUpdate: order.updatedAt,
    }));

    return handleResponse(res, 200, "Active fleet fetched successfully", {
      items: fleetData,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};
