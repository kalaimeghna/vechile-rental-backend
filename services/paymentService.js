import Payment from "../models/Payment.js";
import Booking from "../models/Booking.js";

/*
====================================================
PAYMENT STATUS
====================================================
*/

const ALLOWED_PAYMENT_STATUSES = [
  "pending",
  "processing",
  "paid",
  "failed",
  "refunded",
  "cancelled",
];

/*
====================================================
PAYMENT METHOD
====================================================
*/

const ALLOWED_PAYMENT_METHODS = [
  "cash",
  "card",
  "upi",
  "razorpay",
  "stripe",
  "netbanking",
];

/*
====================================================
VALIDATE PAYMENT STATUS
====================================================
*/

const validatePaymentStatus = (status) => {
  if (!ALLOWED_PAYMENT_STATUSES.includes(status)) {
    throw new Error(
      `Invalid payment status. Allowed values: ${ALLOWED_PAYMENT_STATUSES.join(
        ", ",
      )}`,
    );
  }
};

/*
====================================================
VALIDATE PAYMENT METHOD
====================================================
*/

const validatePaymentMethod = (method) => {
  if (!ALLOWED_PAYMENT_METHODS.includes(method)) {
    throw new Error(
      `Invalid payment method. Allowed values: ${ALLOWED_PAYMENT_METHODS.join(
        ", ",
      )}`,
    );
  }
};

/*
====================================================
GET BOOKING
====================================================
*/

const getBooking = async (bookingId) => {
  if (!bookingId) {
    throw new Error("Booking ID is required.");
  }

  const booking = await Booking.findById(bookingId)
    .populate("user", "name email phone")
    .populate("vehicle", "name brand model owner pricePerDay");

  if (!booking) {
    throw new Error("Booking not found.");
  }

  return booking;
};

/*
====================================================
CALCULATE PAYMENT AMOUNT
====================================================
*/

export const calculatePaymentAmount = async (bookingId) => {
  const booking = await getBooking(bookingId);

  const amount = Number(booking.totalAmount);

  if (Number.isNaN(amount) || amount <= 0) {
    throw new Error("Invalid booking amount.");
  }

  return {
    booking,
    amount,
  };
};

/*
====================================================
CREATE PAYMENT
====================================================
*/

export const createPayment = async ({
  userId,
  bookingId,
  paymentMethod,
  transactionId = null,
}) => {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  if (!bookingId) {
    throw new Error("Booking ID is required.");
  }

  if (!paymentMethod) {
    throw new Error("Payment method is required.");
  }

  validatePaymentMethod(paymentMethod);

  /*
    -----------------------------------------------
    GET BOOKING
    -----------------------------------------------
    */

  const booking = await getBooking(bookingId);

  /*
    -----------------------------------------------
    CHECK BOOKING OWNER
    -----------------------------------------------
    */

  if (booking.user?._id?.toString() !== userId.toString()) {
    throw new Error("You are not authorized to pay for this booking.");
  }

  /*
    -----------------------------------------------
    CHECK BOOKING STATUS
    -----------------------------------------------
    */

  if (["cancelled", "rejected", "completed"].includes(booking.status)) {
    throw new Error(
      `Payment cannot be created for a ${booking.status} booking.`,
    );
  }

  /*
    -----------------------------------------------
    CHECK EXISTING PAYMENT
    -----------------------------------------------
    */

  const existingPayment = await Payment.findOne({
    booking: bookingId,
    status: {
      $in: ["pending", "processing", "paid"],
    },
  });

  if (existingPayment) {
    throw new Error("A payment already exists for this booking.");
  }

  /*
    -----------------------------------------------
    AMOUNT
    -----------------------------------------------
    */

  const amount = Number(booking.totalAmount);

  if (Number.isNaN(amount) || amount <= 0) {
    throw new Error("Invalid booking payment amount.");
  }

  /*
    -----------------------------------------------
    CREATE PAYMENT
    -----------------------------------------------
    */

  const payment = await Payment.create({
    user: userId,

    booking: bookingId,

    amount,

    paymentMethod,

    transactionId,

    status: "pending",
  });

  /*
    -----------------------------------------------
    UPDATE BOOKING PAYMENT STATUS
    -----------------------------------------------
    */

  booking.paymentStatus = "pending";

  await booking.save();

  /*
    -----------------------------------------------
    RETURN PAYMENT
    -----------------------------------------------
    */

  return Payment.findById(payment._id)
    .populate("user", "name email phone")
    .populate("booking");
};

/*
====================================================
GET PAYMENT BY ID
====================================================
*/

export const getPaymentById = async (paymentId, userId = null, role = null) => {
  const payment = await Payment.findById(paymentId)
    .populate("user", "name email phone")
    .populate({
      path: "booking",
      populate: {
        path: "vehicle",
        select: "name brand model owner",
      },
    });

  if (!payment) {
    throw new Error("Payment not found.");
  }

  /*
    -----------------------------------------------
    ADMIN CAN VIEW ANY PAYMENT
    -----------------------------------------------
    */

  if (role === "admin") {
    return payment;
  }

  /*
    -----------------------------------------------
    CUSTOMER AUTHORIZATION
    -----------------------------------------------
    */

  if (userId) {
    const paymentUserId = payment.user?._id?.toString();

    const vehicleOwnerId = payment.booking?.vehicle?.owner?.toString();

    const currentUserId = userId.toString();

    const isCustomer = paymentUserId === currentUserId;

    const isOwner = vehicleOwnerId === currentUserId;

    if (!isCustomer && !isOwner) {
      throw new Error("You are not authorized to view this payment.");
    }
  }

  return payment;
};

/*
====================================================
GET USER PAYMENTS
====================================================
*/

export const getUserPayments = async (userId, options = {}) => {
  const { status, page = 1, limit = 10 } = options;

  const filter = {
    user: userId,
  };

  if (status) {
    validatePaymentStatus(status);

    filter.status = status;
  }

  const pageNumber = Math.max(Number(page) || 1, 1);

  const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);

  const skip = (pageNumber - 1) * limitNumber;

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate("booking")
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limitNumber),

    Payment.countDocuments(filter),
  ]);

  return {
    payments,
    total,
    page: pageNumber,
    pages: Math.ceil(total / limitNumber),
  };
};

/*
====================================================
GET OWNER PAYMENTS
====================================================
*/

export const getOwnerPayments = async (ownerId, options = {}) => {
  const { status, page = 1, limit = 10 } = options;

  const pageNumber = Math.max(Number(page) || 1, 1);

  const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);

  const skip = (pageNumber - 1) * limitNumber;

  /*
    -----------------------------------------------
    FIND PAYMENTS THROUGH VEHICLES
    -----------------------------------------------
    */

  const bookings = await Booking.find()
    .populate({
      path: "vehicle",
      select: "owner",
    })
    .select("_id vehicle");

  const ownerBookingIds = bookings
    .filter(
      (booking) => booking.vehicle?.owner?.toString() === ownerId.toString(),
    )
    .map((booking) => booking._id);

  const filter = {
    booking: {
      $in: ownerBookingIds,
    },
  };

  if (status) {
    validatePaymentStatus(status);

    filter.status = status;
  }

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate("user", "name email phone")
      .populate("booking")
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limitNumber),

    Payment.countDocuments(filter),
  ]);

  return {
    payments,
    total,
    page: pageNumber,
    pages: Math.ceil(total / limitNumber),
  };
};

/*
====================================================
GET ALL PAYMENTS
====================================================
*/

export const getAllPayments = async (options = {}) => {
  const { status, method, page = 1, limit = 20 } = options;

  const filter = {};

  if (status) {
    validatePaymentStatus(status);

    filter.status = status;
  }

  if (method) {
    validatePaymentMethod(method);

    filter.paymentMethod = method;
  }

  const pageNumber = Math.max(Number(page) || 1, 1);

  const limitNumber = Math.min(Math.max(Number(limit) || 20, 1), 100);

  const skip = (pageNumber - 1) * limitNumber;

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate("user", "name email phone")
      .populate({
        path: "booking",
        populate: {
          path: "vehicle",
          select: "name brand model owner",
        },
      })
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limitNumber),

    Payment.countDocuments(filter),
  ]);

  return {
    payments,
    total,
    page: pageNumber,
    pages: Math.ceil(total / limitNumber),
  };
};

/*
====================================================
UPDATE PAYMENT STATUS
====================================================
*/

export const updatePaymentStatus = async (
  paymentId,
  status,
  transactionId = null,
) => {
  validatePaymentStatus(status);

  const payment = await Payment.findById(paymentId);

  if (!payment) {
    throw new Error("Payment not found.");
  }

  /*
    -----------------------------------------------
    PREVENT INVALID CHANGES
    -----------------------------------------------
    */

  if (payment.status === "refunded" && status !== "refunded") {
    throw new Error("A refunded payment cannot be changed.");
  }

  if (payment.status === "cancelled" && status !== "cancelled") {
    throw new Error("A cancelled payment cannot be changed.");
  }

  /*
    -----------------------------------------------
    UPDATE PAYMENT
    -----------------------------------------------
    */

  payment.status = status;

  if (transactionId) {
    payment.transactionId = transactionId;
  }

  await payment.save();

  /*
    -----------------------------------------------
    UPDATE BOOKING
    -----------------------------------------------
    */

  if (payment.booking) {
    const booking = await Booking.findById(payment.booking);

    if (booking) {
      if (status === "paid") {
        booking.paymentStatus = "paid";

        /*
          Automatically confirm
          pending booking after payment.
          */

        if (booking.status === "pending") {
          booking.status = "confirmed";
        }
      }

      if (status === "failed") {
        booking.paymentStatus = "failed";
      }

      if (status === "refunded") {
        booking.paymentStatus = "refunded";
      }

      if (status === "cancelled") {
        booking.paymentStatus = "cancelled";
      }

      await booking.save();
    }
  }

  return Payment.findById(payment._id)
    .populate("user", "name email phone")
    .populate("booking");
};

/*
====================================================
MARK PAYMENT AS PAID
====================================================
*/

export const markPaymentAsPaid = async (paymentId, transactionId) => {
  return updatePaymentStatus(paymentId, "paid", transactionId);
};

/*
====================================================
MARK PAYMENT AS FAILED
====================================================
*/

export const markPaymentAsFailed = async (paymentId, transactionId = null) => {
  return updatePaymentStatus(paymentId, "failed", transactionId);
};

/*
====================================================
REFUND PAYMENT
====================================================
*/

export const refundPayment = async (paymentId, refundAmount = null) => {
  const payment = await Payment.findById(paymentId);

  if (!payment) {
    throw new Error("Payment not found.");
  }

  /*
    -----------------------------------------------
    CHECK PAYMENT STATUS
    -----------------------------------------------
    */

  if (payment.status !== "paid") {
    throw new Error("Only paid payments can be refunded.");
  }

  /*
    -----------------------------------------------
    REFUND AMOUNT
    -----------------------------------------------
    */

  const originalAmount = Number(payment.amount);

  const amountToRefund =
    refundAmount === null ? originalAmount : Number(refundAmount);

  if (Number.isNaN(amountToRefund) || amountToRefund <= 0) {
    throw new Error("Invalid refund amount.");
  }

  if (amountToRefund > originalAmount) {
    throw new Error("Refund amount cannot exceed the payment amount.");
  }

  /*
    -----------------------------------------------
    UPDATE PAYMENT
    -----------------------------------------------
    */

  payment.status = "refunded";

  /*
    If your Payment model contains
    refundAmount, save it.
    */

  if ("refundAmount" in payment) {
    payment.refundAmount = amountToRefund;
  }

  payment.refundedAt = new Date();

  await payment.save();

  /*
    -----------------------------------------------
    UPDATE BOOKING
    -----------------------------------------------
    */

  if (payment.booking) {
    const booking = await Booking.findById(payment.booking);

    if (booking) {
      booking.paymentStatus = "refunded";

      await booking.save();
    }
  }

  return Payment.findById(payment._id)
    .populate("user", "name email phone")
    .populate("booking");
};

/*
====================================================
CANCEL PAYMENT
====================================================
*/

export const cancelPayment = async (paymentId) => {
  const payment = await Payment.findById(paymentId);

  if (!payment) {
    throw new Error("Payment not found.");
  }

  if (["paid", "refunded"].includes(payment.status)) {
    throw new Error(`A ${payment.status} payment cannot be cancelled.`);
  }

  payment.status = "cancelled";

  await payment.save();

  if (payment.booking) {
    const booking = await Booking.findById(payment.booking);

    if (booking) {
      booking.paymentStatus = "cancelled";

      await booking.save();
    }
  }

  return payment;
};

/*
====================================================
PAYMENT SUMMARY
====================================================
*/

export const getPaymentSummary = async (userId = null) => {
  const filter = {};

  if (userId) {
    filter.user = userId;
  }

  const [
    totalPayments,
    paidPayments,
    pendingPayments,
    failedPayments,
    refundedPayments,
  ] = await Promise.all([
    Payment.countDocuments(filter),

    Payment.countDocuments({
      ...filter,
      status: "paid",
    }),

    Payment.countDocuments({
      ...filter,
      status: "pending",
    }),

    Payment.countDocuments({
      ...filter,
      status: "failed",
    }),

    Payment.countDocuments({
      ...filter,
      status: "refunded",
    }),
  ]);

  const amountResult = await Payment.aggregate([
    {
      $match: {
        ...filter,
        status: "paid",
      },
    },

    {
      $group: {
        _id: null,

        totalAmount: {
          $sum: "$amount",
        },
      },
    },
  ]);

  const totalAmount = amountResult[0]?.totalAmount || 0;

  return {
    totalPayments,
    paidPayments,
    pendingPayments,
    failedPayments,
    refundedPayments,
    totalAmount,
  };
};
