import Booking from "../models/Booking.js";
import Vehicle from "../models/Vehicle.js";
import User from "../models/User.js";
import Payment from "../models/Payment.js";

/*
====================================================
HELPER: GET DATE RANGE
====================================================
*/

const getDateRange = (period, startDate, endDate) => {
  let start;
  let end = new Date();

  /*
  -----------------------------------------------
  CUSTOM DATE RANGE
  -----------------------------------------------
  */

  if (startDate) {
    start = new Date(startDate);

    if (Number.isNaN(start.getTime())) {
      start = null;
    }
  }

  if (endDate) {
    end = new Date(endDate);

    if (Number.isNaN(end.getTime())) {
      end = new Date();
    }

    end.setHours(23, 59, 59, 999);
  }

  /*
  -----------------------------------------------
  PERIOD FILTER
  -----------------------------------------------
  */

  if (!start) {
    start = new Date();

    switch (period) {
      case "today":
        start.setHours(0, 0, 0, 0);
        break;

      case "week":
        start.setDate(start.getDate() - 7);
        break;

      case "month":
        start.setMonth(start.getMonth() - 1);
        break;

      case "year":
        start.setFullYear(start.getFullYear() - 1);
        break;

      default:
        /*
        Last 30 days by default
        */
        start.setDate(start.getDate() - 30);
        break;
    }
  }

  return {
    start,
    end,
  };
};

/*
====================================================
ADMIN OVERVIEW REPORT
GET /api/reports/overview
====================================================
*/

export const getOverviewReport = async (req, res) => {
  try {
    const { period = "month", startDate, endDate } = req.query;

    const { start, end } = getDateRange(period, startDate, endDate);

    /*
    -----------------------------------------------
    BOOKINGS
    -----------------------------------------------
    */

    const bookingStats = await Booking.aggregate([
      {
        $match: {
          createdAt: {
            $gte: start,
            $lte: end,
          },
        },
      },

      {
        $group: {
          _id: "$status",

          count: {
            $sum: 1,
          },

          revenue: {
            $sum: {
              $ifNull: ["$totalAmount", 0],
            },
          },
        },
      },
    ]);

    /*
    -----------------------------------------------
    PAYMENT STATISTICS
    -----------------------------------------------
    */

    const paymentStats = await Payment.aggregate([
      {
        $match: {
          createdAt: {
            $gte: start,
            $lte: end,
          },
        },
      },

      {
        $group: {
          _id: "$status",

          count: {
            $sum: 1,
          },

          amount: {
            $sum: {
              $ifNull: ["$amount", 0],
            },
          },
        },
      },
    ]);

    /*
    -----------------------------------------------
    VEHICLES
    -----------------------------------------------
    */

    const totalVehicles = await Vehicle.countDocuments();

    const availableVehicles = await Vehicle.countDocuments({
      isAvailable: true,
    });

    const unavailableVehicles = await Vehicle.countDocuments({
      isAvailable: false,
    });

    /*
    -----------------------------------------------
    USERS
    -----------------------------------------------
    */

    const totalUsers = await User.countDocuments();

    const totalOwners = await User.countDocuments({
      role: "owner",
    });

    const totalCustomers = await User.countDocuments({
      role: {
        $in: ["user", "customer", "renter"],
      },
    });

    /*
    -----------------------------------------------
    TOTAL REVENUE
    -----------------------------------------------
    */

    const revenueResult = await Payment.aggregate([
      {
        $match: {
          createdAt: {
            $gte: start,
            $lte: end,
          },

          status: "paid",
        },
      },

      {
        $group: {
          _id: null,

          total: {
            $sum: {
              $ifNull: ["$amount", 0],
            },
          },
        },
      },
    ]);

    const totalRevenue = revenueResult[0]?.total || 0;

    /*
    -----------------------------------------------
    RESPONSE
    -----------------------------------------------
    */

    res.status(200).json({
      success: true,

      period: {
        start,
        end,
      },

      report: {
        bookings: bookingStats,

        payments: paymentStats,

        vehicles: {
          total: totalVehicles,
          available: availableVehicles,
          unavailable: unavailableVehicles,
        },

        users: {
          total: totalUsers,
          owners: totalOwners,
          customers: totalCustomers,
        },

        totalRevenue,
      },
    });
  } catch (error) {
    console.error("Overview report error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to generate overview report.",
      error: error.message,
    });
  }
};

/*
====================================================
BOOKING REPORT
GET /api/reports/bookings
====================================================
*/

export const getBookingReport = async (req, res) => {
  try {
    const { period = "month", startDate, endDate, status } = req.query;

    const { start, end } = getDateRange(period, startDate, endDate);

    const match = {
      createdAt: {
        $gte: start,
        $lte: end,
      },
    };

    if (status) {
      match.status = status;
    }

    /*
    -----------------------------------------------
    TOTAL BOOKINGS
    -----------------------------------------------
    */

    const totalBookings = await Booking.countDocuments(match);

    /*
    -----------------------------------------------
    STATUS BREAKDOWN
    -----------------------------------------------
    */

    const statusBreakdown = await Booking.aggregate([
      {
        $match: match,
      },

      {
        $group: {
          _id: "$status",

          count: {
            $sum: 1,
          },

          revenue: {
            $sum: {
              $ifNull: ["$totalAmount", 0],
            },
          },
        },
      },

      {
        $sort: {
          count: -1,
        },
      },
    ]);

    /*
    -----------------------------------------------
    DAILY BOOKINGS
    -----------------------------------------------
    */

    const dailyBookings = await Booking.aggregate([
      {
        $match: match,
      },

      {
        $group: {
          _id: {
            year: {
              $year: "$createdAt",
            },

            month: {
              $month: "$createdAt",
            },

            day: {
              $dayOfMonth: "$createdAt",
            },
          },

          bookings: {
            $sum: 1,
          },

          revenue: {
            $sum: {
              $ifNull: ["$totalAmount", 0],
            },
          },
        },
      },

      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
          "_id.day": 1,
        },
      },
    ]);

    /*
    -----------------------------------------------
    RECENT BOOKINGS
    -----------------------------------------------
    */

    const recentBookings = await Booking.find(match)
      .populate("user", "name email phone")
      .populate("vehicle", "name brand model images pricePerDay")
      .sort({
        createdAt: -1,
      })
      .limit(20);

    res.status(200).json({
      success: true,

      period: {
        start,
        end,
      },

      report: {
        totalBookings,

        statusBreakdown,

        dailyBookings,

        recentBookings,
      },
    });
  } catch (error) {
    console.error("Booking report error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to generate booking report.",
      error: error.message,
    });
  }
};

/*
====================================================
REVENUE REPORT
GET /api/reports/revenue
====================================================
*/

export const getRevenueReport = async (req, res) => {
  try {
    const { period = "month", startDate, endDate } = req.query;

    const { start, end } = getDateRange(period, startDate, endDate);

    const match = {
      createdAt: {
        $gte: start,
        $lte: end,
      },

      status: "paid",
    };

    /*
    -----------------------------------------------
    TOTAL REVENUE
    -----------------------------------------------
    */

    const totalResult = await Payment.aggregate([
      {
        $match: match,
      },

      {
        $group: {
          _id: null,

          totalRevenue: {
            $sum: {
              $ifNull: ["$amount", 0],
            },
          },

          totalPayments: {
            $sum: 1,
          },
        },
      },
    ]);

    /*
    -----------------------------------------------
    DAILY REVENUE
    -----------------------------------------------
    */

    const dailyRevenue = await Payment.aggregate([
      {
        $match: match,
      },

      {
        $group: {
          _id: {
            year: {
              $year: "$createdAt",
            },

            month: {
              $month: "$createdAt",
            },

            day: {
              $dayOfMonth: "$createdAt",
            },
          },

          revenue: {
            $sum: {
              $ifNull: ["$amount", 0],
            },
          },

          payments: {
            $sum: 1,
          },
        },
      },

      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
          "_id.day": 1,
        },
      },
    ]);

    /*
    -----------------------------------------------
    MONTHLY REVENUE
    -----------------------------------------------
    */

    const monthlyRevenue = await Payment.aggregate([
      {
        $match: match,
      },

      {
        $group: {
          _id: {
            year: {
              $year: "$createdAt",
            },

            month: {
              $month: "$createdAt",
            },
          },

          revenue: {
            $sum: {
              $ifNull: ["$amount", 0],
            },
          },

          payments: {
            $sum: 1,
          },
        },
      },

      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
        },
      },
    ]);

    const totalRevenue = totalResult[0]?.totalRevenue || 0;

    const totalPayments = totalResult[0]?.totalPayments || 0;

    res.status(200).json({
      success: true,

      period: {
        start,
        end,
      },

      report: {
        totalRevenue,

        totalPayments,

        dailyRevenue,

        monthlyRevenue,
      },
    });
  } catch (error) {
    console.error("Revenue report error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to generate revenue report.",
      error: error.message,
    });
  }
};

/*
====================================================
VEHICLE PERFORMANCE REPORT
GET /api/reports/vehicles
====================================================
*/

export const getVehicleReport = async (req, res) => {
  try {
    const { period = "month", startDate, endDate } = req.query;

    const { start, end } = getDateRange(period, startDate, endDate);

    /*
    -----------------------------------------------
    VEHICLE PERFORMANCE
    -----------------------------------------------
    */

    const vehiclePerformance = await Booking.aggregate([
      {
        $match: {
          createdAt: {
            $gte: start,
            $lte: end,
          },
        },
      },

      {
        $group: {
          _id: "$vehicle",

          totalBookings: {
            $sum: 1,
          },

          revenue: {
            $sum: {
              $ifNull: ["$totalAmount", 0],
            },
          },

          completedBookings: {
            $sum: {
              $cond: [
                {
                  $eq: ["$status", "completed"],
                },
                1,
                0,
              ],
            },
          },

          cancelledBookings: {
            $sum: {
              $cond: [
                {
                  $eq: ["$status", "cancelled"],
                },
                1,
                0,
              ],
            },
          },
        },
      },

      {
        $lookup: {
          from: "vehicles",

          localField: "_id",

          foreignField: "_id",

          as: "vehicle",
        },
      },

      {
        $unwind: {
          path: "$vehicle",

          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "users",

          localField: "vehicle.owner",

          foreignField: "_id",

          as: "owner",
        },
      },

      {
        $unwind: {
          path: "$owner",

          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          _id: 1,

          totalBookings: 1,

          revenue: 1,

          completedBookings: 1,

          cancelledBookings: 1,

          vehicleName: "$vehicle.name",

          brand: "$vehicle.brand",

          model: "$vehicle.model",

          images: "$vehicle.images",

          ownerName: "$owner.name",

          ownerEmail: "$owner.email",
        },
      },

      {
        $sort: {
          revenue: -1,
        },
      },
    ]);

    /*
    -----------------------------------------------
    VEHICLE COUNT
    -----------------------------------------------
    */

    const totalVehicles = await Vehicle.countDocuments();

    const availableVehicles = await Vehicle.countDocuments({
      isAvailable: true,
    });

    res.status(200).json({
      success: true,

      period: {
        start,
        end,
      },

      report: {
        totalVehicles,

        availableVehicles,

        vehiclePerformance,
      },
    });
  } catch (error) {
    console.error("Vehicle report error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to generate vehicle report.",
      error: error.message,
    });
  }
};

/*
====================================================
USER REPORT
GET /api/reports/users
====================================================
*/

export const getUserReport = async (req, res) => {
  try {
    const { period = "month", startDate, endDate } = req.query;

    const { start, end } = getDateRange(period, startDate, endDate);

    /*
    -----------------------------------------------
    USER COUNTS
    -----------------------------------------------
    */

    const totalUsers = await User.countDocuments();

    const totalOwners = await User.countDocuments({
      role: "owner",
    });

    const totalAdmins = await User.countDocuments({
      role: "admin",
    });

    const totalCustomers = await User.countDocuments({
      role: {
        $in: ["user", "customer", "renter"],
      },
    });

    /*
    -----------------------------------------------
    NEW USERS
    -----------------------------------------------
    */

    const newUsers = await User.countDocuments({
      createdAt: {
        $gte: start,
        $lte: end,
      },
    });

    /*
    -----------------------------------------------
    USERS BY ROLE
    -----------------------------------------------
    */

    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: "$role",

          count: {
            $sum: 1,
          },
        },
      },

      {
        $sort: {
          count: -1,
        },
      },
    ]);

    /*
    -----------------------------------------------
    DAILY USER REGISTRATION
    -----------------------------------------------
    */

    const dailyRegistrations = await User.aggregate([
      {
        $match: {
          createdAt: {
            $gte: start,
            $lte: end,
          },
        },
      },

      {
        $group: {
          _id: {
            year: {
              $year: "$createdAt",
            },

            month: {
              $month: "$createdAt",
            },

            day: {
              $dayOfMonth: "$createdAt",
            },
          },

          users: {
            $sum: 1,
          },
        },
      },

      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
          "_id.day": 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,

      period: {
        start,
        end,
      },

      report: {
        totalUsers,

        totalOwners,

        totalAdmins,

        totalCustomers,

        newUsers,

        usersByRole,

        dailyRegistrations,
      },
    });
  } catch (error) {
    console.error("User report error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to generate user report.",
      error: error.message,
    });
  }
};

/*
====================================================
OWNER PERFORMANCE REPORT
GET /api/reports/owners
====================================================
*/

export const getOwnerReport = async (req, res) => {
  try {
    const { period = "month", startDate, endDate } = req.query;

    const { start, end } = getDateRange(period, startDate, endDate);

    /*
    -----------------------------------------------
    OWNER PERFORMANCE
    -----------------------------------------------
    */

    const ownerPerformance = await Booking.aggregate([
      {
        $match: {
          createdAt: {
            $gte: start,
            $lte: end,
          },
        },
      },

      {
        $lookup: {
          from: "vehicles",

          localField: "vehicle",

          foreignField: "_id",

          as: "vehicle",
        },
      },

      {
        $unwind: {
          path: "$vehicle",

          preserveNullAndEmptyArrays: false,
        },
      },

      {
        $group: {
          _id: "$vehicle.owner",

          totalBookings: {
            $sum: 1,
          },

          revenue: {
            $sum: {
              $ifNull: ["$totalAmount", 0],
            },
          },

          completedBookings: {
            $sum: {
              $cond: [
                {
                  $eq: ["$status", "completed"],
                },
                1,
                0,
              ],
            },
          },
        },
      },

      {
        $lookup: {
          from: "users",

          localField: "_id",

          foreignField: "_id",

          as: "owner",
        },
      },

      {
        $unwind: {
          path: "$owner",

          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          _id: 1,

          ownerName: "$owner.name",

          ownerEmail: "$owner.email",

          phone: "$owner.phone",

          totalBookings: 1,

          revenue: 1,

          completedBookings: 1,
        },
      },

      {
        $sort: {
          revenue: -1,
        },
      },
    ]);

    /*
    -----------------------------------------------
    OWNER COUNT
    -----------------------------------------------
    */

    const totalOwners = await User.countDocuments({
      role: "owner",
    });

    res.status(200).json({
      success: true,

      period: {
        start,
        end,
      },

      report: {
        totalOwners,

        ownerPerformance,
      },
    });
  } catch (error) {
    console.error("Owner report error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to generate owner report.",
      error: error.message,
    });
  }
};

/*
====================================================
PAYMENT REPORT
GET /api/reports/payments
====================================================
*/

export const getPaymentReport = async (req, res) => {
  try {
    const { period = "month", startDate, endDate, status } = req.query;

    const { start, end } = getDateRange(period, startDate, endDate);

    const match = {
      createdAt: {
        $gte: start,
        $lte: end,
      },
    };

    if (status) {
      match.status = status;
    }

    /*
    -----------------------------------------------
    PAYMENT STATUS BREAKDOWN
    -----------------------------------------------
    */

    const statusBreakdown = await Payment.aggregate([
      {
        $match: match,
      },

      {
        $group: {
          _id: "$status",

          count: {
            $sum: 1,
          },

          amount: {
            $sum: {
              $ifNull: ["$amount", 0],
            },
          },
        },
      },

      {
        $sort: {
          amount: -1,
        },
      },
    ]);

    /*
    -----------------------------------------------
    PAYMENT METHOD BREAKDOWN
    -----------------------------------------------
    */

    const methodBreakdown = await Payment.aggregate([
      {
        $match: match,
      },

      {
        $group: {
          _id: "$paymentMethod",

          count: {
            $sum: 1,
          },

          amount: {
            $sum: {
              $ifNull: ["$amount", 0],
            },
          },
        },
      },

      {
        $sort: {
          amount: -1,
        },
      },
    ]);

    /*
    -----------------------------------------------
    TOTAL PAYMENT AMOUNT
    -----------------------------------------------
    */

    const total = await Payment.aggregate([
      {
        $match: match,
      },

      {
        $group: {
          _id: null,

          amount: {
            $sum: {
              $ifNull: ["$amount", 0],
            },
          },

          count: {
            $sum: 1,
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,

      period: {
        start,
        end,
      },

      report: {
        totalAmount: total[0]?.amount || 0,

        totalPayments: total[0]?.count || 0,

        statusBreakdown,

        methodBreakdown,
      },
    });
  } catch (error) {
    console.error("Payment report error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to generate payment report.",
      error: error.message,
    });
  }
};

/*
====================================================
TOP VEHICLES REPORT
GET /api/reports/top-vehicles
====================================================
*/

export const getTopVehicles = async (req, res) => {
  try {
    const { period = "month", startDate, endDate, limit = 10 } = req.query;

    const { start, end } = getDateRange(period, startDate, endDate);

    const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 50);

    const vehicles = await Booking.aggregate([
      {
        $match: {
          createdAt: {
            $gte: start,
            $lte: end,
          },
        },
      },

      {
        $group: {
          _id: "$vehicle",

          bookings: {
            $sum: 1,
          },

          revenue: {
            $sum: {
              $ifNull: ["$totalAmount", 0],
            },
          },
        },
      },

      {
        $lookup: {
          from: "vehicles",

          localField: "_id",

          foreignField: "_id",

          as: "vehicle",
        },
      },

      {
        $unwind: {
          path: "$vehicle",

          preserveNullAndEmptyArrays: false,
        },
      },

      {
        $project: {
          _id: 1,

          name: "$vehicle.name",

          brand: "$vehicle.brand",

          model: "$vehicle.model",

          images: "$vehicle.images",

          bookings: 1,

          revenue: 1,
        },
      },

      {
        $sort: {
          revenue: -1,
        },
      },

      {
        $limit: limitNumber,
      },
    ]);

    res.status(200).json({
      success: true,

      period: {
        start,
        end,
      },

      vehicles,
    });
  } catch (error) {
    console.error("Top vehicles report error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch top vehicles.",
      error: error.message,
    });
  }
};

/*
====================================================
EXPORT REPORT SUMMARY
GET /api/reports
====================================================
*/

export const getReportSummary = async (req, res) => {
  try {
    const { period = "month", startDate, endDate } = req.query;

    const { start, end } = getDateRange(period, startDate, endDate);

    const [totalBookings, totalVehicles, totalUsers, totalOwners] =
      await Promise.all([
        Booking.countDocuments({
          createdAt: {
            $gte: start,
            $lte: end,
          },
        }),

        Vehicle.countDocuments(),

        User.countDocuments(),

        User.countDocuments({
          role: "owner",
        }),
      ]);

    const revenue = await Payment.aggregate([
      {
        $match: {
          createdAt: {
            $gte: start,
            $lte: end,
          },

          status: "paid",
        },
      },

      {
        $group: {
          _id: null,

          total: {
            $sum: {
              $ifNull: ["$amount", 0],
            },
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,

      period: {
        start,
        end,
      },

      summary: {
        totalBookings,

        totalVehicles,

        totalUsers,

        totalOwners,

        totalRevenue: revenue[0]?.total || 0,
      },
    });
  } catch (error) {
    console.error("Report summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to generate report summary.",
      error: error.message,
    });
  }
};
