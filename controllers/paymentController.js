import Payment from "../models/Payment.js";
import Booking from "../models/Booking.js";
import Notification from "../models/Notification.js";

/*
====================================================
CREATE PAYMENT
POST /api/payments
====================================================
*/

export const createPayment = async (req, res) => {
  try {
    const { bookingId, paymentMethod, transactionId } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: "Booking ID is required.",
      });
    }

    /*
    -----------------------------------------------
    FIND BOOKING
    -----------------------------------------------
    */

    const booking = await Booking.findById(bookingId)
      .populate("vehicle", "name owner pricePerDay")
      .populate("user", "name email");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    /*
    -----------------------------------------------
    CHECK BOOKING OWNER
    -----------------------------------------------
    */

    if (booking.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to pay for this booking.",
      });
    }

    /*
    -----------------------------------------------
    CHECK BOOKING STATUS
    -----------------------------------------------
    */

    if (booking.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Payment cannot be made for a cancelled booking.",
      });
    }

    if (booking.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Payment cannot be created for a completed booking.",
      });
    }

    /*
    -----------------------------------------------
    CHECK EXISTING PAYMENT
    -----------------------------------------------
    */

    const existingPayment = await Payment.findOne({
      booking: booking._id,
    });

    if (existingPayment && existingPayment.status === "paid") {
      return res.status(400).json({
        success: false,
        message: "Payment has already been completed.",
        payment: existingPayment,
      });
    }

    /*
    -----------------------------------------------
    GENERATE PAYMENT ID
    -----------------------------------------------
    */

    const paymentId = `PAY-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    /*
    -----------------------------------------------
    CREATE PAYMENT
    -----------------------------------------------
    */

    let payment;

    if (existingPayment) {
      existingPayment.paymentId = paymentId;
      existingPayment.amount = booking.totalAmount;
      existingPayment.paymentMethod = paymentMethod || "online";
      existingPayment.transactionId = transactionId || "";
      existingPayment.status = "pending";

      payment = await existingPayment.save();
    } else {
      payment = await Payment.create({
        paymentId,

        booking: booking._id,

        user: req.user._id,

        vehicle: booking.vehicle._id,

        amount: booking.totalAmount,

        paymentMethod: paymentMethod || "online",

        transactionId: transactionId || "",

        status: "pending",
      });
    }

    /*
    -----------------------------------------------
    UPDATE BOOKING PAYMENT STATUS
    -----------------------------------------------
    */

    booking.paymentStatus = "pending";

    await booking.save();

    res.status(201).json({
      success: true,
      message: "Payment created successfully.",
      payment,
    });
  } catch (error) {
    console.error("Create payment error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create payment.",
      error: error.message,
    });
  }
};

/*
====================================================
VERIFY / COMPLETE PAYMENT
PUT /api/payments/:paymentId/verify
====================================================
*/

export const verifyPayment = async (req, res) => {
  try {
    const { transactionId, paymentMethod } = req.body;

    const payment = await Payment.findOne({
      $or: [
        {
          _id: req.params.paymentId,
        },
        {
          paymentId: req.params.paymentId,
        },
      ],
    }).populate("booking");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found.",
      });
    }

    /*
    -----------------------------------------------
    AUTHORIZATION
    -----------------------------------------------
    */

    const isOwner = payment.user.toString() === req.user._id.toString();

    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to verify this payment.",
      });
    }

    /*
    -----------------------------------------------
    UPDATE PAYMENT
    -----------------------------------------------
    */

    payment.status = "paid";

    payment.transactionId =
      transactionId || payment.transactionId || `TXN-${Date.now()}`;

    payment.paymentMethod = paymentMethod || payment.paymentMethod || "online";

    payment.paidAt = new Date();

    await payment.save();

    /*
    -----------------------------------------------
    UPDATE BOOKING
    -----------------------------------------------
    */

    const booking = await Booking.findById(payment.booking._id).populate(
      "vehicle",
      "name owner",
    );

    if (booking) {
      booking.paymentStatus = "paid";

      /*
      If booking is still pending,
      move it to confirmed.
      */

      if (booking.status === "pending") {
        booking.status = "confirmed";
      }

      await booking.save();

      /*
      ---------------------------------------------
      NOTIFY USER
      ---------------------------------------------
      */

      await Notification.create({
        user: booking.user,

        title: "Payment Successful",

        message: `Payment for booking ${booking.bookingId} was successful.`,

        type: "payment",
      });

      /*
      ---------------------------------------------
      NOTIFY OWNER
      ---------------------------------------------
      */

      if (booking.vehicle?.owner) {
        await Notification.create({
          user: booking.vehicle.owner,

          title: "Booking Payment Received",

          message: `Payment received for booking ${booking.bookingId}.`,

          type: "payment",
        });
      }
    }

    const updatedPayment = await Payment.findById(payment._id)
      .populate("booking")
      .populate("user", "name email")
      .populate("vehicle", "name brand model");

    res.status(200).json({
      success: true,

      message: "Payment verified successfully.",

      payment: updatedPayment,
    });
  } catch (error) {
    console.error("Verify payment error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to verify payment.",
      error: error.message,
    });
  }
};

/*
====================================================
GET MY PAYMENTS
GET /api/payments/my
====================================================
*/

export const getMyPayments = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const filter = {
      user: req.user._id,
    };

    if (status) {
      filter.status = status;
    }

    const pageNumber = Math.max(Number(page) || 1, 1);

    const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const skip = (pageNumber - 1) * limitNumber;

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate("booking", "bookingId startDate endDate totalAmount status")
        .populate("vehicle", "name brand model images")
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber),

      Payment.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,

      count: payments.length,

      total,

      page: pageNumber,

      pages: Math.ceil(total / limitNumber),

      payments,
    });
  } catch (error) {
    console.error("Get my payments error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to fetch payment history.",

      error: error.message,
    });
  }
};

/*
====================================================
GET SINGLE PAYMENT
GET /api/payments/:id
====================================================
*/

export const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate(
        "booking",
        "bookingId startDate endDate pickupLocation returnLocation totalAmount status paymentStatus",
      )
      .populate("user", "name email phone")
      .populate("vehicle", "name brand model images pricePerDay");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found.",
      });
    }

    const isUser = payment.user._id.toString() === req.user._id.toString();

    const isAdmin = req.user.role === "admin";

    let isOwner = false;

    if (payment.vehicle?.owner) {
      isOwner = payment.vehicle.owner.toString() === req.user._id.toString();
    }

    if (!isUser && !isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this payment.",
      });
    }

    res.status(200).json({
      success: true,
      payment,
    });
  } catch (error) {
    console.error("Get payment error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch payment.",
      error: error.message,
    });
  }
};

/*
====================================================
GET OWNER PAYMENTS
GET /api/payments/owner
====================================================
*/

export const getOwnerPayments = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    /*
    -----------------------------------------------
    FIND OWNER VEHICLES
    -----------------------------------------------
    */

    const vehicles = await Booking.find({
      vehicle: {
        $exists: true,
      },
    })
      .populate({
        path: "vehicle",
        match: {
          owner: req.user._id,
        },
        select: "_id",
      })
      .select("vehicle");

    const vehicleIds = vehicles
      .filter((item) => item.vehicle)
      .map((item) => item.vehicle._id);

    const filter = {
      vehicle: {
        $in: vehicleIds,
      },
    };

    if (status) {
      filter.status = status;
    }

    const pageNumber = Math.max(Number(page) || 1, 1);

    const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const skip = (pageNumber - 1) * limitNumber;

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate("user", "name email phone")
        .populate("vehicle", "name brand model images")
        .populate("booking", "bookingId startDate endDate totalAmount")
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber),

      Payment.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,

      count: payments.length,

      total,

      page: pageNumber,

      pages: Math.ceil(total / limitNumber),

      payments,
    });
  } catch (error) {
    console.error("Get owner payments error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch owner payments.",
      error: error.message,
    });
  }
};

/*
====================================================
REFUND PAYMENT
PUT /api/payments/:id/refund
====================================================
*/

export const refundPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate("booking")
      .populate("vehicle", "name owner");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found.",
      });
    }

    /*
    -----------------------------------------------
    ONLY ADMIN OR VEHICLE OWNER
    -----------------------------------------------
    */

    const isAdmin = req.user.role === "admin";

    const isOwner =
      payment.vehicle?.owner?.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to refund this payment.",
      });
    }

    /*
    -----------------------------------------------
    CHECK PAYMENT STATUS
    -----------------------------------------------
    */

    if (payment.status !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Only paid payments can be refunded.",
      });
    }

    /*
    -----------------------------------------------
    UPDATE PAYMENT
    -----------------------------------------------
    */

    payment.status = "refunded";

    payment.refundedAt = new Date();

    await payment.save();

    /*
    -----------------------------------------------
    UPDATE BOOKING
    -----------------------------------------------
    */

    if (payment.booking) {
      const booking = await Booking.findById(payment.booking._id);

      if (booking) {
        booking.paymentStatus = "refunded";

        booking.status = "cancelled";

        await booking.save();

        await Notification.create({
          user: booking.user,

          title: "Payment Refunded",

          message: `Payment for booking ${booking.bookingId} has been refunded.`,

          type: "payment",
        });
      }
    }

    res.status(200).json({
      success: true,

      message: "Payment refunded successfully.",

      payment,
    });
  } catch (error) {
    console.error("Refund payment error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to refund payment.",

      error: error.message,
    });
  }
};

/*
====================================================
PAYMENT STATISTICS
GET /api/payments/statistics
====================================================
*/

export const getPaymentStatistics = async (req, res) => {
  try {
    let filter = {};

    /*
    -----------------------------------------------
    ADMIN
    -----------------------------------------------
    */

    if (req.user.role === "admin") {
      filter = {};
    }

    /*
    -----------------------------------------------
    NORMAL USER
    -----------------------------------------------
    */

    if (req.user.role === "user") {
      filter.user = req.user._id;
    }

    /*
    -----------------------------------------------
    OWNER
    -----------------------------------------------
    */

    if (req.user.role === "owner") {
      const vehicles = await Booking.find({
        vehicle: {
          $exists: true,
        },
      })
        .populate({
          path: "vehicle",
          match: {
            owner: req.user._id,
          },
          select: "_id",
        })
        .select("vehicle");

      const vehicleIds = vehicles
        .filter((item) => item.vehicle)
        .map((item) => item.vehicle._id);

      filter.vehicle = {
        $in: vehicleIds,
      };
    }

    /*
    -----------------------------------------------
    PAYMENT COUNTS
    -----------------------------------------------
    */

    const [
      totalPayments,
      pendingPayments,
      paidPayments,
      failedPayments,
      refundedPayments,
    ] = await Promise.all([
      Payment.countDocuments(filter),

      Payment.countDocuments({
        ...filter,
        status: "pending",
      }),

      Payment.countDocuments({
        ...filter,
        status: "paid",
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

    /*
    -----------------------------------------------
    REVENUE
    -----------------------------------------------
    */

    const revenue = await Payment.aggregate([
      {
        $match: {
          ...filter,

          status: "paid",
        },
      },

      {
        $group: {
          _id: null,

          totalRevenue: {
            $sum: "$amount",
          },
        },
      },
    ]);

    const totalRevenue = revenue.length > 0 ? revenue[0].totalRevenue : 0;

    /*
    -----------------------------------------------
    REFUNDS
    -----------------------------------------------
    */

    const refunds = await Payment.aggregate([
      {
        $match: {
          ...filter,

          status: "refunded",
        },
      },

      {
        $group: {
          _id: null,

          totalRefunded: {
            $sum: "$amount",
          },
        },
      },
    ]);

    const totalRefunded = refunds.length > 0 ? refunds[0].totalRefunded : 0;

    res.status(200).json({
      success: true,

      statistics: {
        totalPayments,
        pendingPayments,
        paidPayments,
        failedPayments,
        refundedPayments,
        totalRevenue,
        totalRefunded,
        netRevenue: totalRevenue - totalRefunded,
      },
    });
  } catch (error) {
    console.error("Payment statistics error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to fetch payment statistics.",

      error: error.message,
    });
  }
};

/*
====================================================
UPDATE PAYMENT STATUS
PUT /api/payments/:id/status
====================================================
*/

export const updatePaymentStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = ["pending", "paid", "failed", "refunded"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,

        message: "Invalid payment status.",
      });
    }

    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found.",
      });
    }

    /*
    -----------------------------------------------
    ONLY ADMIN
    -----------------------------------------------
    */

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,

        message: "Only admin can manually update payment status.",
      });
    }

    payment.status = status;

    if (status === "paid") {
      payment.paidAt = new Date();
    }

    if (status === "refunded") {
      payment.refundedAt = new Date();
    }

    await payment.save();

    /*
    -----------------------------------------------
    UPDATE BOOKING PAYMENT STATUS
    -----------------------------------------------
    */

    const booking = await Booking.findById(payment.booking);

    if (booking) {
      if (status === "paid") {
        booking.paymentStatus = "paid";

        if (booking.status === "pending") {
          booking.status = "confirmed";
        }
      }

      if (status === "refunded") {
        booking.paymentStatus = "refunded";
      }

      if (status === "failed") {
        booking.paymentStatus = "failed";
      }

      if (status === "pending") {
        booking.paymentStatus = "pending";
      }

      await booking.save();
    }

    res.status(200).json({
      success: true,

      message: "Payment status updated successfully.",

      payment,
    });
  } catch (error) {
    console.error("Update payment status error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to update payment status.",

      error: error.message,
    });
  }
};
