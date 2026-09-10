import User from "../models/User.js";
import Vehicle from "../models/Vehicle.js";
import Booking from "../models/Booking.js";
import Payment from "../models/Payment.js";
import Review from "../models/Review.js";
import Report from "../models/Report.js";
import Notification from "../models/Notification.js";

/*
====================================================
ADMIN DASHBOARD
GET /api/admin/dashboard
====================================================
*/

export const getAdminDashboard = async (req, res) => {
  try {
    const [
      totalUsers,
      totalOwners,
      totalVehicles,
      totalBookings,
      totalPayments,
      totalReviews,
      pendingVehicles,
      pendingBookings,
      pendingReports,
    ] = await Promise.all([
      User.countDocuments(),

      User.countDocuments({
        role: "owner",
      }),

      Vehicle.countDocuments(),

      Booking.countDocuments(),

      Payment.countDocuments(),

      Review.countDocuments(),

      Vehicle.countDocuments({
        isApproved: false,
      }),

      Booking.countDocuments({
        status: "pending",
      }),

      Report.countDocuments({
        status: "pending",
      }),
    ]);

    const revenueResult = await Payment.aggregate([
      {
        $match: {
          status: "success",
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

    const totalRevenue =
      revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    res.status(200).json({
      success: true,
      dashboard: {
        totalUsers,
        totalOwners,
        totalVehicles,
        totalBookings,
        totalPayments,
        totalReviews,
        pendingVehicles,
        pendingBookings,
        pendingReports,
        totalRevenue,
      },
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load admin dashboard.",
      error: error.message,
    });
  }
};

/*
====================================================
GET ALL USERS
GET /api/admin/users
====================================================
*/

export const getAllUsers = async (req, res) => {
  try {
    const { search, role, status } = req.query;

    const filter = {};

    if (search) {
      filter.$or = [
        {
          name: {
            $regex: search,
            $options: "i",
          },
        },
        {
          email: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    if (role) {
      filter.role = role;
    }

    if (status === "active") {
      filter.isActive = true;
    }

    if (status === "inactive") {
      filter.isActive = false;
    }

    const users = await User.find(filter).select("-password").sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Get all users error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch users.",
      error: error.message,
    });
  }
};

/*
====================================================
GET SINGLE USER
GET /api/admin/users/:id
====================================================
*/

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get user error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch user.",
      error: error.message,
    });
  }
};

/*
====================================================
UPDATE USER ROLE
PUT /api/admin/users/:id/role
====================================================
*/

export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    const allowedRoles = ["user", "owner", "admin"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Allowed roles: user, owner, admin.",
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    /*
      Prevent admin from accidentally changing
      their own role.
    */

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot change your own role.",
      });
    }

    user.role = role;

    await user.save();

    res.status(200).json({
      success: true,
      message: "User role updated successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Update user role error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update user role.",
      error: error.message,
    });
  }
};

/*
====================================================
ACTIVATE USER
PUT /api/admin/users/:id/activate
====================================================
*/

export const activateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    user.isActive = true;

    await user.save();

    res.status(200).json({
      success: true,
      message: "User activated successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Activate user error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to activate user.",
      error: error.message,
    });
  }
};

/*
====================================================
DEACTIVATE USER
PUT /api/admin/users/:id/deactivate
====================================================
*/

export const deactivateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot deactivate your own account.",
      });
    }

    user.isActive = false;

    await user.save();

    res.status(200).json({
      success: true,
      message: "User deactivated successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Deactivate user error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to deactivate user.",
      error: error.message,
    });
  }
};

/*
====================================================
DELETE USER
DELETE /api/admin/users/:id
====================================================
*/

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account.",
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "User deleted successfully.",
    });
  } catch (error) {
    console.error("Delete user error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete user.",
      error: error.message,
    });
  }
};

/*
====================================================
GET ALL VEHICLES
GET /api/admin/vehicles
====================================================
*/

export const getAllVehicles = async (req, res) => {
  try {
    const { status, search } = req.query;

    const filter = {};

    if (status === "approved") {
      filter.isApproved = true;
    }

    if (status === "pending") {
      filter.isApproved = false;
    }

    if (search) {
      filter.$or = [
        {
          name: {
            $regex: search,
            $options: "i",
          },
        },
        {
          brand: {
            $regex: search,
            $options: "i",
          },
        },
        {
          model: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const vehicles = await Vehicle.find(filter)
      .populate("owner", "name email phone")
      .sort({
        createdAt: -1,
      });

    res.status(200).json({
      success: true,
      count: vehicles.length,
      vehicles,
    });
  } catch (error) {
    console.error("Get all vehicles error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch vehicles.",
      error: error.message,
    });
  }
};

/*
====================================================
APPROVE VEHICLE
PUT /api/admin/vehicles/:id/approve
====================================================
*/

export const approveVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found.",
      });
    }

    vehicle.isApproved = true;

    await vehicle.save();

    /*
      Notify vehicle owner.
    */

    await Notification.create({
      user: vehicle.owner,
      title: "Vehicle Approved",
      message: `Your vehicle "${vehicle.name}" has been approved.`,
      type: "vehicle",
    });

    res.status(200).json({
      success: true,
      message: "Vehicle approved successfully.",
      vehicle,
    });
  } catch (error) {
    console.error("Approve vehicle error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to approve vehicle.",
      error: error.message,
    });
  }
};

/*
====================================================
REJECT VEHICLE
PUT /api/admin/vehicles/:id/reject
====================================================
*/

export const rejectVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found.",
      });
    }

    vehicle.isApproved = false;

    await vehicle.save();

    await Notification.create({
      user: vehicle.owner,
      title: "Vehicle Rejected",
      message: `Your vehicle "${vehicle.name}" has been rejected by admin.`,
      type: "vehicle",
    });

    res.status(200).json({
      success: true,
      message: "Vehicle rejected successfully.",
      vehicle,
    });
  } catch (error) {
    console.error("Reject vehicle error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to reject vehicle.",
      error: error.message,
    });
  }
};

/*
====================================================
DELETE VEHICLE
DELETE /api/admin/vehicles/:id
====================================================
*/

export const deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found.",
      });
    }

    await Vehicle.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Vehicle deleted successfully.",
    });
  } catch (error) {
    console.error("Delete vehicle error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete vehicle.",
      error: error.message,
    });
  }
};

/*
====================================================
GET ALL BOOKINGS
GET /api/admin/bookings
====================================================
*/

export const getAllBookings = async (req, res) => {
  try {
    const { status, paymentStatus } = req.query;

    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    const bookings = await Booking.find(filter)
      .populate("user", "name email phone")
      .populate("vehicle", "name brand model pricePerDay owner")
      .sort({
        createdAt: -1,
      });

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error("Get all bookings error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch bookings.",
      error: error.message,
    });
  }
};

/*
====================================================
UPDATE BOOKING STATUS
PUT /api/admin/bookings/:id/status
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

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    booking.status = status;

    await booking.save();

    await Notification.create({
      user: booking.user,
      title: "Booking Status Updated",
      message: `Your booking ${booking.bookingId} is now ${status}.`,
      type: "booking",
    });

    res.status(200).json({
      success: true,
      message: "Booking status updated successfully.",
      booking,
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
GET ALL PAYMENTS
GET /api/admin/payments
====================================================
*/

export const getAllPayments = async (req, res) => {
  try {
    const { status, paymentMethod } = req.query;

    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }

    const payments = await Payment.find(filter)
      .populate("user", "name email")
      .populate("booking", "bookingId totalAmount status")
      .sort({
        createdAt: -1,
      });

    const revenueResult = await Payment.aggregate([
      {
        $match: {
          ...filter,
          status: "success",
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

    const totalRevenue =
      revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    res.status(200).json({
      success: true,
      count: payments.length,
      totalRevenue,
      payments,
    });
  } catch (error) {
    console.error("Get payments error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch payments.",
      error: error.message,
    });
  }
};

/*
====================================================
GET ALL REVIEWS
GET /api/admin/reviews
====================================================
*/

export const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("user", "name email")
      .populate("vehicle", "name brand model")
      .sort({
        createdAt: -1,
      });

    res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    console.error("Get reviews error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch reviews.",
      error: error.message,
    });
  }
};

/*
====================================================
DELETE REVIEW
DELETE /api/admin/reviews/:id
====================================================
*/

export const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found.",
      });
    }

    const vehicleId = review.vehicle;

    await review.deleteOne();

    /*
      Recalculate vehicle rating.
    */

    const reviews = await Review.find({
      vehicle: vehicleId,
    });

    const totalReviews = reviews.length;

    const rating =
      totalReviews > 0
        ? reviews.reduce((sum, item) => sum + item.rating, 0) / totalReviews
        : 0;

    await Vehicle.findByIdAndUpdate(vehicleId, {
      rating: Number(rating.toFixed(1)),
      totalReviews,
    });

    res.status(200).json({
      success: true,
      message: "Review deleted successfully.",
    });
  } catch (error) {
    console.error("Delete review error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete review.",
      error: error.message,
    });
  }
};

/*
====================================================
GET ALL REPORTS
GET /api/admin/reports
====================================================
*/

export const getAllReports = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = {};

    if (status) {
      filter.status = status;
    }

    const reports = await Report.find(filter)
      .populate("reportedBy", "name email")
      .populate("vehicle", "name brand model")
      .populate("booking", "bookingId status")
      .sort({
        createdAt: -1,
      });

    res.status(200).json({
      success: true,
      count: reports.length,
      reports,
    });
  } catch (error) {
    console.error("Get reports error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch reports.",
      error: error.message,
    });
  }
};

/*
====================================================
UPDATE REPORT STATUS
PUT /api/admin/reports/:id/status
====================================================
*/

export const updateReportStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = ["pending", "reviewing", "resolved", "rejected"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report status.",
      });
    }

    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found.",
      });
    }

    report.status = status;

    await report.save();

    await Notification.create({
      user: report.reportedBy,
      title: "Report Updated",
      message: `Your report status is now ${status}.`,
      type: "system",
    });

    res.status(200).json({
      success: true,
      message: "Report status updated successfully.",
      report,
    });
  } catch (error) {
    console.error("Update report status error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update report status.",
      error: error.message,
    });
  }
};

/*
====================================================
DELETE REPORT
DELETE /api/admin/reports/:id
====================================================
*/

export const deleteReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found.",
      });
    }

    await report.deleteOne();

    res.status(200).json({
      success: true,
      message: "Report deleted successfully.",
    });
  } catch (error) {
    console.error("Delete report error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete report.",
      error: error.message,
    });
  }
};
