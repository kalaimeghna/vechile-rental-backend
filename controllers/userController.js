import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Vehicle from "../models/Vehicle.js";

/*
====================================================
GET MY PROFILE
GET /api/users/me
====================================================
*/

export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

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
    console.error("Get my profile error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch profile.",
      error: error.message,
    });
  }
};

/*
====================================================
UPDATE MY PROFILE
PUT /api/users/me
====================================================
*/

export const updateMyProfile = async (req, res) => {
  try {
    const { name, email, phone, location, profilePicture, avatar } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    /*
    -----------------------------------------------
    NAME
    -----------------------------------------------
    */

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({
          success: false,
          message: "Name cannot be empty.",
        });
      }

      user.name = String(name).trim();
    }

    /*
    -----------------------------------------------
    EMAIL
    -----------------------------------------------
    */

    if (email !== undefined) {
      const normalizedEmail = String(email).trim().toLowerCase();

      const existingUser = await User.findOne({
        email: normalizedEmail,
        _id: {
          $ne: req.user._id,
        },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email is already registered.",
        });
      }

      user.email = normalizedEmail;
    }

    /*
    -----------------------------------------------
    PHONE
    -----------------------------------------------
    */

    if (phone !== undefined) {
      user.phone = String(phone).trim();
    }

    /*
    -----------------------------------------------
    LOCATION
    -----------------------------------------------
    */

    if (location !== undefined) {
      user.location = String(location).trim();
    }

    /*
    -----------------------------------------------
    PROFILE PICTURE
    -----------------------------------------------
    */

    if (profilePicture !== undefined) {
      user.profilePicture = profilePicture;
    } else if (avatar !== undefined) {
      user.profilePicture = avatar;
    }

    await user.save();

    const updatedUser = await User.findById(req.user._id).select("-password");

    res.status(200).json({
      success: true,

      message: "Profile updated successfully.",

      user: updatedUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update profile.",
      error: error.message,
    });
  }
};

/*
====================================================
CHANGE PASSWORD
PUT /api/users/change-password
====================================================
*/

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, oldPassword, newPassword, confirmPassword } =
      req.body;

    const current = currentPassword || oldPassword;

    /*
    -----------------------------------------------
    VALIDATION
    -----------------------------------------------
    */

    if (!current || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must contain at least 6 characters.",
      });
    }

    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirm password do not match.",
      });
    }

    /*
    -----------------------------------------------
    FIND USER WITH PASSWORD
    -----------------------------------------------
    */

    const user = await User.findById(req.user._id).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    /*
    -----------------------------------------------
    CHECK CURRENT PASSWORD
    -----------------------------------------------
    */

    const isMatch = await bcrypt.compare(current, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    /*
    -----------------------------------------------
    HASH NEW PASSWORD
    -----------------------------------------------
    */

    const salt = await bcrypt.genSalt(10);

    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    res.status(200).json({
      success: true,

      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error("Change password error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to change password.",

      error: error.message,
    });
  }
};

/*
====================================================
GET ALL USERS
GET /api/users
====================================================
*/

export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role, status } = req.query;

    const filter = {};

    /*
    -----------------------------------------------
    SEARCH
    -----------------------------------------------
    */

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
        {
          phone: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    /*
    -----------------------------------------------
    ROLE
    -----------------------------------------------
    */

    if (role) {
      filter.role = role;
    }

    /*
    -----------------------------------------------
    STATUS
    -----------------------------------------------
    */

    if (status) {
      if (status === "active") {
        filter.isActive = true;
      }

      if (status === "inactive") {
        filter.isActive = false;
      }
    }

    const pageNumber = Math.max(Number(page) || 1, 1);

    const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const skip = (pageNumber - 1) * limitNumber;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password")
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber),

      User.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,

      count: users.length,

      total,

      page: pageNumber,

      pages: Math.ceil(total / limitNumber),

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
GET USER BY ID
GET /api/users/:id
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
    console.error("Get user by ID error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to fetch user.",

      error: error.message,
    });
  }
};

/*
====================================================
ADMIN UPDATE USER
PUT /api/users/:id
====================================================
*/

export const updateUser = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      location,
      role,
      isActive,
      profilePicture,
      avatar,
    } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    /*
    -----------------------------------------------
    NAME
    -----------------------------------------------
    */

    if (name !== undefined) {
      user.name = String(name).trim();
    }

    /*
    -----------------------------------------------
    EMAIL
    -----------------------------------------------
    */

    if (email !== undefined) {
      const normalizedEmail = String(email).trim().toLowerCase();

      const duplicate = await User.findOne({
        email: normalizedEmail,

        _id: {
          $ne: user._id,
        },
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,

          message: "Email is already in use.",
        });
      }

      user.email = normalizedEmail;
    }

    /*
    -----------------------------------------------
    PHONE
    -----------------------------------------------
    */

    if (phone !== undefined) {
      user.phone = String(phone).trim();
    }

    /*
    -----------------------------------------------
    LOCATION
    -----------------------------------------------
    */

    if (location !== undefined) {
      user.location = String(location).trim();
    }

    /*
    -----------------------------------------------
    ROLE
    -----------------------------------------------
    */

    if (role !== undefined) {
      const allowedRoles = ["user", "customer", "owner", "admin"];

      if (!allowedRoles.includes(role)) {
        return res.status(400).json({
          success: false,

          message: "Invalid user role.",
        });
      }

      user.role = role;
    }

    /*
    -----------------------------------------------
    ACTIVE STATUS
    -----------------------------------------------
    */

    if (isActive !== undefined) {
      user.isActive = Boolean(isActive);
    }

    /*
    -----------------------------------------------
    PROFILE PICTURE
    -----------------------------------------------
    */

    if (profilePicture !== undefined) {
      user.profilePicture = profilePicture;
    } else if (avatar !== undefined) {
      user.profilePicture = avatar;
    }

    await user.save();

    const updatedUser = await User.findById(user._id).select("-password");

    res.status(200).json({
      success: true,

      message: "User updated successfully.",

      user: updatedUser,
    });
  } catch (error) {
    console.error("Update user error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to update user.",

      error: error.message,
    });
  }
};

/*
====================================================
ACTIVATE USER
PUT /api/users/:id/activate
====================================================
*/

export const activateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,

      {
        isActive: true,
      },

      {
        new: true,
        runValidators: true,
      },
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    res.status(200).json({
      success: true,

      message: "User activated successfully.",

      user,
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
PUT /api/users/:id/deactivate
====================================================
*/

export const deactivateUser = async (req, res) => {
  try {
    /*
    Prevent admin from
    deactivating themselves.
    */

    if (req.params.id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,

        message: "You cannot deactivate your own account.",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,

      {
        isActive: false,
      },

      {
        new: true,
        runValidators: true,
      },
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    res.status(200).json({
      success: true,

      message: "User deactivated successfully.",

      user,
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
DELETE /api/users/:id
====================================================
*/

export const deleteUser = async (req, res) => {
  try {
    /*
    Prevent deleting own account
    through admin endpoint.
    */

    if (req.params.id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,

        message: "You cannot delete your own account.",
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
    -----------------------------------------------
    DELETE USER
    -----------------------------------------------
    */

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
GET USER STATISTICS
GET /api/users/statistics
====================================================
*/

export const getUserStatistics = async (req, res) => {
  try {
    const [
      totalUsers,
      totalCustomers,
      totalOwners,
      totalAdmins,
      activeUsers,
      inactiveUsers,
    ] = await Promise.all([
      User.countDocuments(),

      User.countDocuments({
        role: {
          $in: ["user", "customer", "renter"],
        },
      }),

      User.countDocuments({
        role: "owner",
      }),

      User.countDocuments({
        role: "admin",
      }),

      User.countDocuments({
        isActive: true,
      }),

      User.countDocuments({
        isActive: false,
      }),
    ]);

    /*
    -----------------------------------------------
    NEW USERS - LAST 30 DAYS
    -----------------------------------------------
    */

    const last30Days = new Date();

    last30Days.setDate(last30Days.getDate() - 30);

    const newUsers = await User.countDocuments({
      createdAt: {
        $gte: last30Days,
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

    res.status(200).json({
      success: true,

      statistics: {
        totalUsers,

        totalCustomers,

        totalOwners,

        totalAdmins,

        activeUsers,

        inactiveUsers,

        newUsersLast30Days: newUsers,

        usersByRole,
      },
    });
  } catch (error) {
    console.error("User statistics error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to fetch user statistics.",

      error: error.message,
    });
  }
};

/*
====================================================
GET USER BOOKINGS
GET /api/users/:id/bookings
====================================================
*/

export const getUserBookings = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      "name email phone role",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const bookings = await Booking.find({
      user: req.params.id,
    })
      .populate("vehicle", "name brand model images pricePerDay")
      .sort({
        createdAt: -1,
      });

    res.status(200).json({
      success: true,

      user,

      count: bookings.length,

      bookings,
    });
  } catch (error) {
    console.error("Get user bookings error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to fetch user bookings.",

      error: error.message,
    });
  }
};

/*
====================================================
GET OWNER VEHICLES
GET /api/users/:id/vehicles
====================================================
*/

export const getUserVehicles = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      "name email phone role",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const vehicles = await Vehicle.find({
      owner: req.params.id,
    }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,

      user,

      count: vehicles.length,

      vehicles,
    });
  } catch (error) {
    console.error("Get user vehicles error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to fetch user vehicles.",

      error: error.message,
    });
  }
};

/*
====================================================
GET OWN PROFILE STATISTICS
GET /api/users/me/statistics
====================================================
*/

export const getMyStatistics = async (req, res) => {
  try {
    const userId = req.user._id;

    const [
      totalBookings,
      completedBookings,
      cancelledBookings,
      pendingBookings,
    ] = await Promise.all([
      Booking.countDocuments({
        user: userId,
      }),

      Booking.countDocuments({
        user: userId,
        status: "completed",
      }),

      Booking.countDocuments({
        user: userId,
        status: "cancelled",
      }),

      Booking.countDocuments({
        user: userId,
        status: "pending",
      }),
    ]);

    /*
    -----------------------------------------------
    TOTAL SPENDING
    -----------------------------------------------
    */

    const spending = await Booking.aggregate([
      {
        $match: {
          user: userId,

          status: {
            $ne: "cancelled",
          },
        },
      },

      {
        $group: {
          _id: null,

          totalSpent: {
            $sum: {
              $ifNull: ["$totalAmount", 0],
            },
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,

      statistics: {
        totalBookings,

        completedBookings,

        cancelledBookings,

        pendingBookings,

        totalSpent: spending[0]?.totalSpent || 0,
      },
    });
  } catch (error) {
    console.error("My statistics error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to fetch your statistics.",

      error: error.message,
    });
  }
};

/*
====================================================
RESET USER PASSWORD - ADMIN
PUT /api/users/:id/reset-password
====================================================
*/

export const adminResetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        success: false,

        message: "New password is required.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,

        message: "Password must contain at least 6 characters.",
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const salt = await bcrypt.genSalt(10);

    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    res.status(200).json({
      success: true,

      message: "User password reset successfully.",
    });
  } catch (error) {
    console.error("Admin reset password error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to reset user password.",

      error: error.message,
    });
  }
};
