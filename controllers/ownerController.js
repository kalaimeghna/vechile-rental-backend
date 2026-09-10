import User from "../models/User.js";
import Vehicle from "../models/Vehicle.js";
import Booking from "../models/Booking.js";

/*
====================================================
GET OWNER PROFILE
GET /api/owners/profile
====================================================
*/

export const getOwnerProfile = async (req, res) => {
  try {
    const owner = await User.findById(req.user._id).select(
      "-password -resetPasswordToken -resetPasswordExpires",
    );

    if (!owner) {
      return res.status(404).json({
        success: false,
        message: "Owner not found.",
      });
    }

    res.status(200).json({
      success: true,
      owner,
    });
  } catch (error) {
    console.error("Get owner profile error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch owner profile.",
      error: error.message,
    });
  }
};

/*
====================================================
UPDATE OWNER PROFILE
PUT /api/owners/profile
====================================================
*/

export const updateOwnerProfile = async (req, res) => {
  try {
    const { name, email, phone, location, profilePicture, bio } = req.body;

    const owner = await User.findById(req.user._id);

    if (!owner) {
      return res.status(404).json({
        success: false,
        message: "Owner not found.",
      });
    }

    if (name !== undefined) {
      owner.name = name;
    }

    if (email !== undefined) {
      owner.email = email;
    }

    if (phone !== undefined) {
      owner.phone = phone;
    }

    if (location !== undefined) {
      owner.location = location;
    }

    if (profilePicture !== undefined) {
      owner.profilePicture = profilePicture;
    }

    if (bio !== undefined) {
      owner.bio = bio;
    }

    await owner.save();

    const updatedOwner = await User.findById(owner._id).select(
      "-password -resetPasswordToken -resetPasswordExpires",
    );

    res.status(200).json({
      success: true,
      message: "Owner profile updated successfully.",
      owner: updatedOwner,
    });
  } catch (error) {
    console.error("Update owner profile error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update owner profile.",
      error: error.message,
    });
  }
};

/*
====================================================
GET OWNER VEHICLES
GET /api/owners/vehicles
====================================================
*/

export const getOwnerVehicles = async (req, res) => {
  try {
    const { status, isAvailable, page = 1, limit = 10 } = req.query;

    const filter = {
      owner: req.user._id,
    };

    if (status) {
      filter.status = status;
    }

    if (isAvailable === "true") {
      filter.isAvailable = true;
    }

    if (isAvailable === "false") {
      filter.isAvailable = false;
    }

    const pageNumber = Math.max(Number(page) || 1, 1);

    const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const skip = (pageNumber - 1) * limitNumber;

    const [vehicles, total] = await Promise.all([
      Vehicle.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),

      Vehicle.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: vehicles.length,
      total,
      page: pageNumber,
      pages: Math.ceil(total / limitNumber),
      vehicles,
    });
  } catch (error) {
    console.error("Get owner vehicles error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch owner vehicles.",
      error: error.message,
    });
  }
};

/*
====================================================
GET OWNER VEHICLE BY ID
GET /api/owners/vehicles/:vehicleId
====================================================
*/

export const getOwnerVehicleById = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({
      _id: req.params.vehicleId,
      owner: req.user._id,
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found.",
      });
    }

    res.status(200).json({
      success: true,
      vehicle,
    });
  } catch (error) {
    console.error("Get owner vehicle error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch vehicle.",
      error: error.message,
    });
  }
};

/*
====================================================
GET OWNER BOOKINGS
GET /api/owners/bookings
====================================================
*/

export const getOwnerBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const vehicles = await Vehicle.find({
      owner: req.user._id,
    }).select("_id");

    const vehicleIds = vehicles.map((vehicle) => vehicle._id);

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

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate("user", "name email phone profilePicture")
        .populate("vehicle", "name brand model images pricePerDay")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),

      Booking.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: bookings.length,
      total,
      page: pageNumber,
      pages: Math.ceil(total / limitNumber),
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
GET OWNER EARNINGS
GET /api/owners/earnings
====================================================
*/

export const getOwnerEarnings = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({
      owner: req.user._id,
    }).select("_id");

    const vehicleIds = vehicles.map((vehicle) => vehicle._id);

    const earnings = await Booking.aggregate([
      {
        $match: {
          vehicle: {
            $in: vehicleIds,
          },
          status: {
            $in: ["confirmed", "ongoing", "completed"],
          },
        },
      },
      {
        $group: {
          _id: null,

          totalBookings: {
            $sum: 1,
          },

          totalEarnings: {
            $sum: "$totalAmount",
          },
        },
      },
    ]);

    const result = earnings[0] || {
      totalBookings: 0,
      totalEarnings: 0,
    };

    res.status(200).json({
      success: true,
      earnings: {
        totalBookings: result.totalBookings || 0,

        totalEarnings: result.totalEarnings || 0,
      },
    });
  } catch (error) {
    console.error("Get owner earnings error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch owner earnings.",
      error: error.message,
    });
  }
};

/*
====================================================
GET OWNER DASHBOARD
GET /api/owners/dashboard
====================================================
*/

export const getOwnerDashboard = async (req, res) => {
  try {
    const ownerId = req.user._id;

    /*
    -----------------------------------------------
    VEHICLE STATISTICS
    -----------------------------------------------
    */

    const [totalVehicles, availableVehicles, unavailableVehicles] =
      await Promise.all([
        Vehicle.countDocuments({
          owner: ownerId,
        }),

        Vehicle.countDocuments({
          owner: ownerId,
          isAvailable: true,
        }),

        Vehicle.countDocuments({
          owner: ownerId,
          isAvailable: false,
        }),
      ]);

    /*
    -----------------------------------------------
    FIND OWNER VEHICLES
    -----------------------------------------------
    */

    const vehicles = await Vehicle.find({
      owner: ownerId,
    }).select("_id");

    const vehicleIds = vehicles.map((vehicle) => vehicle._id);

    /*
    -----------------------------------------------
    BOOKING STATISTICS
    -----------------------------------------------
    */

    const [
      totalBookings,
      pendingBookings,
      confirmedBookings,
      ongoingBookings,
      completedBookings,
      cancelledBookings,
    ] = await Promise.all([
      Booking.countDocuments({
        vehicle: {
          $in: vehicleIds,
        },
      }),

      Booking.countDocuments({
        vehicle: {
          $in: vehicleIds,
        },
        status: "pending",
      }),

      Booking.countDocuments({
        vehicle: {
          $in: vehicleIds,
        },
        status: "confirmed",
      }),

      Booking.countDocuments({
        vehicle: {
          $in: vehicleIds,
        },
        status: "ongoing",
      }),

      Booking.countDocuments({
        vehicle: {
          $in: vehicleIds,
        },
        status: "completed",
      }),

      Booking.countDocuments({
        vehicle: {
          $in: vehicleIds,
        },
        status: "cancelled",
      }),
    ]);

    /*
    -----------------------------------------------
    EARNINGS
    -----------------------------------------------
    */

    const earnings = await Booking.aggregate([
      {
        $match: {
          vehicle: {
            $in: vehicleIds,
          },
          status: {
            $in: ["confirmed", "ongoing", "completed"],
          },
        },
      },
      {
        $group: {
          _id: null,

          totalEarnings: {
            $sum: "$totalAmount",
          },
        },
      },
    ]);

    const totalEarnings = earnings.length > 0 ? earnings[0].totalEarnings : 0;

    /*
    -----------------------------------------------
    RECENT BOOKINGS
    -----------------------------------------------
    */

    const recentBookings = await Booking.find({
      vehicle: {
        $in: vehicleIds,
      },
    })
      .populate("user", "name email phone")
      .populate("vehicle", "name brand model images pricePerDay")
      .sort({
        createdAt: -1,
      })
      .limit(5);

    /*
    -----------------------------------------------
    RESPONSE
    -----------------------------------------------
    */

    res.status(200).json({
      success: true,

      dashboard: {
        vehicles: {
          total: totalVehicles,
          available: availableVehicles,
          unavailable: unavailableVehicles,
        },

        bookings: {
          total: totalBookings,
          pending: pendingBookings,
          confirmed: confirmedBookings,
          ongoing: ongoingBookings,
          completed: completedBookings,
          cancelled: cancelledBookings,
        },

        earnings: {
          total: totalEarnings,
        },

        recentBookings,
      },
    });
  } catch (error) {
    console.error("Get owner dashboard error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch owner dashboard.",
      error: error.message,
    });
  }
};

/*
====================================================
GET OWNER STATISTICS
GET /api/owners/statistics
====================================================
*/

export const getOwnerStatistics = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({
      owner: req.user._id,
    }).select("_id");

    const vehicleIds = vehicles.map((vehicle) => vehicle._id);

    /*
    -----------------------------------------------
    MONTHLY EARNINGS
    -----------------------------------------------
    */

    const monthlyEarnings = await Booking.aggregate([
      {
        $match: {
          vehicle: {
            $in: vehicleIds,
          },

          status: {
            $in: ["confirmed", "ongoing", "completed"],
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
          },

          earnings: {
            $sum: "$totalAmount",
          },

          bookings: {
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

    /*
    -----------------------------------------------
    VEHICLE PERFORMANCE
    -----------------------------------------------
    */

    const vehiclePerformance = await Booking.aggregate([
      {
        $match: {
          vehicle: {
            $in: vehicleIds,
          },

          status: {
            $in: ["confirmed", "ongoing", "completed"],
          },
        },
      },

      {
        $group: {
          _id: "$vehicle",

          bookings: {
            $sum: 1,
          },

          earnings: {
            $sum: "$totalAmount",
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
        $project: {
          _id: 1,

          bookings: 1,

          earnings: 1,

          vehicleName: "$vehicle.name",

          vehicleImage: {
            $arrayElemAt: ["$vehicle.images", 0],
          },
        },
      },

      {
        $sort: {
          earnings: -1,
        },
      },
    ]);

    res.status(200).json({
      success: true,

      statistics: {
        monthlyEarnings,
        vehiclePerformance,
      },
    });
  } catch (error) {
    console.error("Get owner statistics error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch owner statistics.",
      error: error.message,
    });
  }
};

/*
====================================================
GET OWNER RECENT BOOKINGS
GET /api/owners/recent-bookings
====================================================
*/

export const getRecentBookings = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({
      owner: req.user._id,
    }).select("_id");

    const vehicleIds = vehicles.map((vehicle) => vehicle._id);

    const bookings = await Booking.find({
      vehicle: {
        $in: vehicleIds,
      },
    })
      .populate("user", "name email phone profilePicture")
      .populate("vehicle", "name brand model images pricePerDay")
      .sort({
        createdAt: -1,
      })
      .limit(10);

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error("Get recent bookings error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch recent bookings.",
      error: error.message,
    });
  }
};
