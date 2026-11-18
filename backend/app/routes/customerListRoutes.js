import express from "express";
import {
  createList,
  getLists,
  getListById,
  updateList,
  deleteList,
  addListToCart,
  snoozeListReminderHandler,
} from "../controller/customerListController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import {
  createCustomerListSchema,
  updateCustomerListSchema,
  snoozeListReminderSchema,
} from "../validation/customerListValidation.js";

const router = express.Router();

// All customer list routes require authentication
router.use(verifyToken);

router.get("/", getLists);
router.post("/", validate(createCustomerListSchema), createList);
router.get("/:id", getListById);
router.put("/:id", validate(updateCustomerListSchema), updateList);
router.delete("/:id", deleteList);
router.post("/:id/add-to-cart", addListToCart);
router.post(
  "/:id/reminder/snooze",
  validate(snoozeListReminderSchema),
  snoozeListReminderHandler
);

export default router;
