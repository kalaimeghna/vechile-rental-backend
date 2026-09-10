import express from "express";

import {
  createPayment,
  getMyPayments,
  getPaymentById,
  getAllPayments,
  updatePaymentStatus,
  getOwnerPayments,
  refundPayment,
} from "../controllers/paymentController.js";

import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";

const router = express.Router();

/*
====================================================
ALL PAYMENT ROUTES REQUIRE LOGIN
====================================================
*/

router.use(protect);

/*
====================================================
CREATE PAYMENT
====================================================
*/

/*
POST /api/payments

Customer makes a payment for a booking.
*/

router.post("/", authorizeRoles("user", "customer"), createPayment);

/*
====================================================
MY PAYMENTS
====================================================
*/

/*
GET /api/payments/my

Get payments made by logged-in customer.
*/

router.get("/my", authorizeRoles("user", "customer"), getMyPayments);

/*
====================================================
OWNER PAYMENTS
====================================================
*/

/*
GET /api/payments/owner

Get payments related to owner's vehicles.
*/

router.get("/owner", authorizeRoles("owner"), getOwnerPayments);

/*
====================================================
ALL PAYMENTS
====================================================
*/

/*
GET /api/payments

Admin can view all payments.
*/

router.get("/", authorizeRoles("admin"), getAllPayments);

/*
====================================================
UPDATE PAYMENT STATUS
====================================================
*/

/*
PUT /api/payments/:id/status

Admin can update payment status.
*/

router.put("/:id/status", authorizeRoles("admin"), updatePaymentStatus);

/*
====================================================
REFUND PAYMENT
====================================================
*/

/*
PUT /api/payments/:id/refund

Admin can refund a payment.
*/

router.put("/:id/refund", authorizeRoles("admin"), refundPayment);

/*
====================================================
GET PAYMENT BY ID
====================================================
*/

/*
GET /api/payments/:id

Get payment details.
*/

router.get("/:id", getPaymentById);

export default router;
