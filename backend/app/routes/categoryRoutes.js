import express from "express";
import {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    updateCategoryOrders
} from "../controller/categoryController.js";
import { verifyToken, allowRoles, optionalVerifyToken } from "../middleware/authMiddleware.js";
import multer from "multer";

const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = express.Router();

// Public route to get categories
// optionalVerifyToken: lets the controller tell admins (see inactive) from sellers/customers (active only)
router.get("/", optionalVerifyToken, getCategories);

// Admin only routes
router.post(
    "/",
    verifyToken,
    allowRoles("admin"),
    upload.single("image"),
    createCategory
);

router.put(
    "/reorder/bulk",
    verifyToken,
    allowRoles("admin"),
    updateCategoryOrders
);

router.put(
    "/:id",
    verifyToken,
    allowRoles("admin"),
    upload.single("image"),
    updateCategory
);

router.delete(
    "/:id",
    verifyToken,
    allowRoles("admin"),
    deleteCategory
);

export default router;
