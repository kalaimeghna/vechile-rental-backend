import Booking from "../models/Booking.js";
import Vehicle from "../models/Vehicle.js";
import Notification from "../models/Notification.js";
import generateBookingId from "../utils/generateBookingId.js";
import calculatePrice from "../utils/calculatePrice.js";

/*
====================================================
CREATE BOOKING
POST /api/bookings
====================================================
*/

export const createBooking = async (req, res) => {
  try {
    const {
      vehicleId,
      startDate,
      endDate,
      pickupLocation,
      returnLocation,
      notes,
    } = req.body;

    /*
    -----------------------------------------------
    VALIDATION
    -----------------------------------------------
    */

    if (
      !vehicleId ||
      !startDate ||
      !endDate ||
      !pickupLocation ||
      !returnLocation
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Vehicle, start date, end date, pickup location and return location are required.",
      });
    }

    /*
    -----------------------------------------------
    FIND VEHICLE
    -----------------------------------------------
    */

    const vehicle = await Vehicle.findById(vehicleId);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found.",
      });
    }

    /*
    -----------------------------------------------
    CHECK VEHICLE APPROVAL
    -----------------------------------------------
    */

    if (!vehicle.isApproved) {
      return res.status(400).json({
        success: false,
        message: "This vehicle is not approved for rental.",
      });
    }

    /*
    -----------------------------------------------
    CHECK VEHICLE AVAILABILITY
    -----------------------------------------------
    */

    if (!vehicle.isAvailable) {
      return res.status(400).json({
        success: false,
        message: "This vehicle is currently unavailable.",
      });
    }

    /*
    -----------------------------------------------
    DATE VALIDATION
    -----------------------------------------------
    */

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking dates.",
      });
    }

    if (start >= end) {
      return res.status(400).json({
        success: false,
        message: "End date must be after start date.",
      });
    }

    /*
    -----------------------------------------------
    PREVENT BOOKING IN THE PAST
    -----------------------------------------------
    */

    const now = new Date();

    if (start < now) {
      return res.status(400).json({
        success: false,
        message: "Booking start date cannot be in the past.",
      });
    }

    /*
    -----------------------------------------------
    CHECK EXISTING BOOKINGS
    -----------------------------------------------

    Existing booking overlaps if:

    existing.startDate < requested.endDate
    AND
    existing.endDate > requested.startDate
    */

    const overlappingBooking = await Booking.findOne({
      vehicle: vehicleId,

      status: {
        $in: ["pending", "confirmed", "ongoing"],
      },

      startDate: {
        $lt: end,
      },

      endDate: {
        $gt: start,
      },
    });

    if (overlappingBooking) {
      return res.status(409).json({
        success: false,
        message: "Vehicle is already booked for the selected dates.",
      });
    }

    /*
    -----------------------------------------------
    CALCULATE PRICE
    -----------------------------------------------
    */

    const { numberOfDays, totalAmount } = calculatePrice(
      vehicle.pricePerDay,
      start,
      end,
    );

    /*
    -----------------------------------------------
    CREATE BOOKING
    -----------------------------------------------
    */

    const booking = await Booking.create({
      bookingId: generateBookingId(),

      user: req.user._id,

      vehicle: vehicle._id,

      startDate: start,

      endDate: end,

      pickupLocation,

      returnLocation,

      numberOfDays,

      pricePerDay: vehicle.pricePerDay,

      totalAmount,

      status: "pending",

      paymentStatus: "pending",

      notes: notes || "",
    });

    /*
    -----------------------------------------------
    NOTIFY VEHICLE OWNER
    -----------------------------------------------
    */

    await Notification.create({
      user: vehicle.owner,

      title: "New Booking Request",

      message: `A new booking request has been created for your vehicle "${vehicle.name}".`,

      type: "booking",
    });

    /*
    -----------------------------------------------
    POPULATE RESPONSE
    -----------------------------------------------
    */

    const populatedBooking = await Booking.findById(booking._id)
      .populate("user", "name email phone")
      .populate("vehicle", "name brand model images pricePerDay owner");

    res.status(201).json({
      success: true,

      message: "Booking created successfully.",

      booking: populatedBooking,
    });
  } catch (error) {
    console.error("Create booking error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to create booking.",

      error: error.message,
    });
  }
};

/*
====================================================
CHECK VEHICLE AVAILABILITY
GET /api/bookings/availability/:vehicleId
====================================================

Query:

?startDate=2026-09-01&endDate=2026-09-05
====================================================
*/

export const checkAvailability = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,

        message: "Start date and end date are required.",
      });
    }

    const vehicle = await Vehicle.findById(vehicleId);

    if (!vehicle) {
      return res.status(404).json({
        success: false,

        message: "Vehicle not found.",
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,

        message: "Invalid dates.",
      });
    }

    if (start >= end) {
      return res.status(400).json({
        success: false,

        message: "End date must be after start date.",
      });
    }

    const existingBooking = await Booking.findOne({
      vehicle: vehicleId,

      status: {
        $in: ["pending", "confirmed", "ongoing"],
      },

      startDate: {
        $lt: end,
      },

      endDate: {
        $gt: start,
      },
    });

    const available =
      !existingBooking && vehicle.isAvailable && vehicle.isApproved;

    res.status(200).json({
      success: true,

      available,

      vehicleId,

      startDate,

      endDate,
    });
  } catch (error) {
    console.error("Availability error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to check vehicle availability.",

      error: error.message,
    });
  }
};

/*
====================================================
GET MY BOOKINGS
GET /api/bookings/my
====================================================
*/

export const getMyBookings = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = {
      user: req.user._id,
    };

    if (status) {
      filter.status = status;
    }

    const bookings = await Booking.find(filter)
      .populate(
        "vehicle",
        "name brand model images type location pricePerDay rating",
      )
      .sort({
        createdAt: -1,
      });

    res.status(200).json({
      success: true,

      count: bookings.length,

      bookings,
    });
  } catch (error) {
    console.error("Get my bookings error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to fetch your bookings.",

      error: error.message,
    });
  }
};

/*
====================================================
GET SINGLE BOOKING
GET /api/bookings/:id
====================================================
*/

export const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("user", "name email phone")
      .populate(
        "vehicle",
        "name brand model images type location pricePerDay owner",
      );

    if (!booking) {
      return res.status(404).json({
        success: false,

        message: "Booking not found.",
      });
    }

    /*
    -----------------------------------------------
    AUTHORIZATION
    -----------------------------------------------
    */

    const isUser = booking.user._id.toString() === req.user._id.toString();

    const vehicleOwner = booking.vehicle.owner?.toString();

    const isOwner = vehicleOwner === req.user._id.toString();

    const isAdmin = req.user.role === "admin";

    if (!isUser && !isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,

        message: "You are not authorized to view this booking.",
      });
    }

    res.status(200).json({
      success: true,

      booking,
    });
  } catch (error) {
    console.error("Get booking error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to fetch booking.",

      error: error.message,
    });
  }
};

/*
====================================================
GET OWNER BOOKINGS
GET /api/bookings/owner
====================================================
*/

export const getOwnerBookings = async (req, res) => {
  try {
    const { status } = req.query;

    /*
    -----------------------------------------------
    FIND OWNER VEHICLES
    -----------------------------------------------
    */

    const vehicles = await Vehicle.find({
      owner: req.user._id,
    }).select("_id");

    const vehicleIds = vehicles.map((vehicle) => vehicle._id);

    /*
    -----------------------------------------------
    BOOKING FILTER
    -----------------------------------------------
    */

    const filter = {
      vehicle: {
        $in: vehicleIds,
      },
    };

    if (status) {
      filter.status = status;
    }

    /*
    -----------------------------------------------
    FETCH BOOKINGS
    -----------------------------------------------
    */

    const bookings = await Booking.find(filter)
      .populate("user", "name email phone")
      .populate("vehicle", "name brand model images type location pricePerDay")
      .sort({
        createdAt: -1,
      });

    res.status(200).json({
      success: true,

      count: bookings.length,

      bookings,
    });
  } catch (error) {
    console.error("Get owner bookings error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to fetch owner bookings.",

      error: error.message,
    });
  }
};

/*
====================================================
UPDATE BOOKING STATUS
PUT /api/bookings/:id/status
====================================================
*/

export const updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      "pending",
      "confirmed",
      "ongoing",
      "completed",
      "cancelled",
      "rejected",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,

        message: "Invalid booking status.",
      });
    }

    const booking = await Booking.findById(req.params.id).populate(
      "vehicle",
      "name owner",
    );

    if (!booking) {
      return res.status(404).json({
        success: false,

        message: "Booking not found.",
      });
    }

    /*
    -----------------------------------------------
    AUTHORIZATION
    -----------------------------------------------
    */

    const isAdmin = req.user.role === "admin";

    const isOwner =
      booking.vehicle.owner?.toString() === req.user._id.toString();

    const isBookingUser = booking.user.toString() === req.user._id.toString();

    /*
    -----------------------------------------------
    USER CAN ONLY CANCEL
    -----------------------------------------------
    */

    if (isBookingUser && !isOwner && !isAdmin) {
      if (status !== "cancelled") {
        return res.status(403).json({
          success: false,

          message: "Users can only cancel their bookings.",
        });
      }
    }

    /*
    -----------------------------------------------
    OWNER / ADMIN CAN CHANGE STATUS
    -----------------------------------------------
    */

    if (!isOwner && !isAdmin && !isBookingUser) {
      return res.status(403).json({
        success: false,

        message: "You are not authorized to update this booking.",
      });
    }

    /*
    -----------------------------------------------
    PREVENT INVALID COMPLETION
    -----------------------------------------------
    */

    if (status === "completed" && booking.status === "cancelled") {
      return res.status(400).json({
        success: false,

        message: "Cancelled booking cannot be completed.",
      });
    }

    if (status === "confirmed" && booking.status === "completed") {
      return res.status(400).json({
        success: false,

        message: "Completed booking cannot be confirmed again.",
      });
    }

    booking.status = status;

    await booking.save();

    /*
    -----------------------------------------------
    NOTIFY USER
    -----------------------------------------------
    */

    await Notification.create({
      user: booking.user,

      title: "Booking Status Updated",

      message: `Your booking ${booking.bookingId} is now ${status}.`,

      type: "booking",
    });

    /*
    -----------------------------------------------
    IF OWNER CHANGES STATUS,
    NOTIFY USER
    -----------------------------------------------
    */

    const updatedBooking = await Booking.findById(booking._id)
      .populate("user", "name email phone")
      .populate("vehicle", "name brand model images owner");

    res.status(200).json({
      success: true,

      message: "Booking status updated successfully.",

      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Update booking status error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to update booking status.",

      error: error.message,
    });
  }
};

/*
====================================================
CANCEL BOOKING
PUT /api/bookings/:id/cancel
====================================================
*/

export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate(
      "vehicle",
      "name owner",
    );

    if (!booking) {
      return res.status(404).json({
        success: false,

        message: "Booking not found.",
      });
    }

    /*
    -----------------------------------------------
    ONLY BOOKING USER OR ADMIN
    -----------------------------------------------
    */

    const isUser = booking.user.toString() === req.user._id.toString();

    const isAdmin = req.user.role === "admin";

    if (!isUser && !isAdmin) {
      return res.status(403).json({
        success: false,

        message: "You are not authorized to cancel this booking.",
      });
    }

    /*
    -----------------------------------------------
    CHECK STATUS
    -----------------------------------------------
    */

    if (booking.status === "completed" || booking.status === "cancelled") {
      return res.status(400).json({
        success: false,

        message: "This booking cannot be cancelled.",
      });
    }

    if (booking.status === "ongoing") {
      return res.status(400).json({
        success: false,

        message: "Ongoing bookings cannot be cancelled.",
      });
    }

    booking.status = "cancelled";

    /*
    Payment will be refunded separately
    by the payment controller if required.
    */

    if (booking.paymentStatus === "paid") {
      booking.paymentStatus = "refunded";
    }

    await booking.save();

    /*
    -----------------------------------------------
    NOTIFY OWNER
    -----------------------------------------------
    */

    await Notification.create({
      user: booking.vehicle.owner,

      title: "Booking Cancelled",

      message: `Booking ${booking.bookingId} for "${booking.vehicle.name}" has been cancelled.`,

      type: "booking",
    });

    res.status(200).json({
      success: true,

      message: "Booking cancelled successfully.",

      booking,
    });
  } catch (error) {
    console.error("Cancel booking error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to cancel booking.",

      error: error.message,
    });
  }
};

/*
====================================================
GET BOOKING SUMMARY
GET /api/bookings/summary/:id
====================================================
*/

export const getBookingSummary = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("user", "name email phone")
      .populate("vehicle", "name brand model images type location pricePerDay");

    if (!booking) {
      return res.status(404).json({
        success: false,

        message: "Booking not found.",
      });
    }

    /*
    -----------------------------------------------
    AUTHORIZATION
    -----------------------------------------------
    */

    if (
      booking.user._id.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,

        message: "You are not authorized to view this summary.",
      });
    }

    res.status(200).json({
      success: true,

      summary: {
        bookingId: booking.bookingId,

        vehicle: booking.vehicle,

        user: booking.user,

        startDate: booking.startDate,

        endDate: booking.endDate,

        pickupLocation: booking.pickupLocation,

        returnLocation: booking.returnLocation,

        numberOfDays: booking.numberOfDays,

        pricePerDay: booking.pricePerDay,

        totalAmount: booking.totalAmount,

        status: booking.status,

        paymentStatus: booking.paymentStatus,

        notes: booking.notes,

        createdAt: booking.createdAt,
      },
    });
  } catch (error) {
    console.error("Booking summary error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to fetch booking summary.",

      error: error.message,
    });
  }
};

/*
====================================================
GET BOOKING STATISTICS
GET /api/bookings/statistics
====================================================
*/

export const getBookingStatistics = async (req, res) => {
  try {
    let filter = {};

    /*
    -----------------------------------------------
    OWNER
    -----------------------------------------------
    */

    if (req.user.role === "owner") {
      const vehicles = await Vehicle.find({
        owner: req.user._id,
      }).select("_id");

      const vehicleIds = vehicles.map((vehicle) => vehicle._id);

      filter.vehicle = {
        $in: vehicleIds,
      };
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
    COUNTS
    -----------------------------------------------
    */

    const [total, pending, confirmed, ongoing, completed, cancelled, rejected] =
      await Promise.all([
        Booking.countDocuments(filter),

        Booking.countDocuments({
          ...filter,
          status: "pending",
        }),

        Booking.countDocuments({
          ...filter,
          status: "confirmed",
        }),

        Booking.countDocuments({
          ...filter,
          status: "ongoing",
        }),

        Booking.countDocuments({
          ...filter,
          status: "completed",
        }),

        Booking.countDocuments({
          ...filter,
          status: "cancelled",
        }),

        Booking.countDocuments({
          ...filter,
          status: "rejected",
        }),
      ]);

    /*
    -----------------------------------------------
    TOTAL REVENUE
    -----------------------------------------------
    */

    const revenueResult = await Booking.aggregate([
      {
        $match: {
          ...filter,
          status: {
            $in: ["confirmed", "ongoing", "completed"],
          },
        },
      },
      {
        $group: {
          _id: null,

          totalRevenue: {
            $sum: "$totalAmount",
          },
        },
      },
    ]);

    const totalRevenue =
      revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    res.status(200).json({
      success: true,

      statistics: {
        total,
        pending,
        confirmed,
        ongoing,
        completed,
        cancelled,
        rejected,
        totalRevenue,
      },
    });
  } catch (error) {
    console.error("Booking statistics error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to fetch booking statistics.",

      error: error.message,
    });
  }
};
