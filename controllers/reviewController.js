import Review from "../models/Review.js";
import Booking from "../models/Booking.js";
import Vehicle from "../models/Vehicle.js";

/*
====================================================
CREATE REVIEW
POST /api/reviews
====================================================
*/

export const createReview = async (req, res) => {
  try {
    const { vehicleId, bookingId, rating, comment } = req.body;

    /*
    -----------------------------------------------
    VALIDATION
    -----------------------------------------------
    */

    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        message: "Vehicle ID is required.",
      });
    }

    if (!rating) {
      return res.status(400).json({
        success: false,
        message: "Rating is required.",
      });
    }

    const numericRating = Number(rating);

    if (Number.isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5.",
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
    OPTIONAL BOOKING CHECK
    -----------------------------------------------
    */

    let booking = null;

    if (bookingId) {
      booking = await Booking.findById(bookingId);

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking not found.",
        });
      }

      /*
      Make sure booking belongs to
      logged-in user.
      */

      if (booking.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to review this booking.",
        });
      }

      /*
      Make sure booking belongs to
      selected vehicle.
      */

      if (booking.vehicle.toString() !== vehicleId.toString()) {
        return res.status(400).json({
          success: false,
          message: "Booking does not belong to this vehicle.",
        });
      }

      /*
      Only completed bookings can
      submit reviews.
      */

      if (booking.status !== "completed") {
        return res.status(400).json({
          success: false,
          message:
            "You can review a vehicle only after completing the booking.",
        });
      }
    }

    /*
    -----------------------------------------------
    PREVENT DUPLICATE REVIEW
    -----------------------------------------------
    */

    const existingReview = await Review.findOne({
      user: req.user._id,
      vehicle: vehicleId,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this vehicle.",
      });
    }

    /*
    -----------------------------------------------
    CREATE REVIEW
    -----------------------------------------------
    */

    const review = await Review.create({
      user: req.user._id,

      vehicle: vehicleId,

      booking: bookingId || null,

      rating: numericRating,

      comment: comment?.trim() || "",

      isApproved: true,
    });

    /*
    -----------------------------------------------
    POPULATE REVIEW
    -----------------------------------------------
    */

    const populatedReview = await Review.findById(review._id)
      .populate("user", "name email profilePicture")
      .populate("vehicle", "name brand model")
      .populate("booking", "bookingId startDate endDate");

    /*
    -----------------------------------------------
    UPDATE VEHICLE RATING
    -----------------------------------------------
    */

    await updateVehicleRating(vehicleId);

    res.status(201).json({
      success: true,

      message: "Review submitted successfully.",

      review: populatedReview,
    });
  } catch (error) {
    console.error("Create review error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to create review.",

      error: error.message,
    });
  }
};

/*
====================================================
GET VEHICLE REVIEWS
GET /api/reviews/vehicle/:vehicleId
====================================================
*/

export const getVehicleReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10, rating } = req.query;

    const vehicle = await Vehicle.findById(req.params.vehicleId);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found.",
      });
    }

    const filter = {
      vehicle: req.params.vehicleId,

      isApproved: {
        $ne: false,
      },
    };

    /*
    -----------------------------------------------
    RATING FILTER
    -----------------------------------------------
    */

    if (rating) {
      const numericRating = Number(rating);

      if (
        !Number.isNaN(numericRating) &&
        numericRating >= 1 &&
        numericRating <= 5
      ) {
        filter.rating = numericRating;
      }
    }

    const pageNumber = Math.max(Number(page) || 1, 1);

    const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const skip = (pageNumber - 1) * limitNumber;

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate("user", "name profilePicture")
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber),

      Review.countDocuments(filter),
    ]);

    /*
    -----------------------------------------------
    RATING SUMMARY
    -----------------------------------------------
    */

    const ratingSummary = await Review.aggregate([
      {
        $match: {
          vehicle: vehicle._id,

          isApproved: {
            $ne: false,
          },
        },
      },

      {
        $group: {
          _id: "$rating",

          count: {
            $sum: 1,
          },
        },
      },
    ]);

    const summary = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    ratingSummary.forEach((item) => {
      summary[item._id] = item.count;
    });

    const totalRatingCount = Object.values(summary).reduce(
      (totalCount, count) => totalCount + count,
      0,
    );

    const ratingTotal = Object.entries(summary).reduce(
      (totalScore, [star, count]) => totalScore + Number(star) * count,
      0,
    );

    const averageRating =
      totalRatingCount > 0
        ? Number((ratingTotal / totalRatingCount).toFixed(1))
        : 0;

    res.status(200).json({
      success: true,

      count: reviews.length,

      total,

      page: pageNumber,

      pages: Math.ceil(total / limitNumber),

      averageRating,

      ratingSummary: summary,

      reviews,
    });
  } catch (error) {
    console.error("Get vehicle reviews error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to fetch vehicle reviews.",

      error: error.message,
    });
  }
};

/*
====================================================
GET MY REVIEWS
GET /api/reviews/my
====================================================
*/

export const getMyReviews = async (req, res) => {
  try {
    const reviews = await Review.find({
      user: req.user._id,
    })
      .populate("vehicle", "name brand model images pricePerDay")
      .populate("booking", "bookingId startDate endDate status")
      .sort({
        createdAt: -1,
      });

    res.status(200).json({
      success: true,

      count: reviews.length,

      reviews,
    });
  } catch (error) {
    console.error("Get my reviews error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to fetch your reviews.",

      error: error.message,
    });
  }
};

/*
====================================================
GET SINGLE REVIEW
GET /api/reviews/:id
====================================================
*/

export const getReviewById = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate("user", "name email profilePicture")
      .populate("vehicle", "name brand model images")
      .populate("booking", "bookingId startDate endDate status");

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found.",
      });
    }

    res.status(200).json({
      success: true,

      review,
    });
  } catch (error) {
    console.error("Get review error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to fetch review.",

      error: error.message,
    });
  }
};

/*
====================================================
UPDATE REVIEW
PUT /api/reviews/:id
====================================================
*/

export const updateReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found.",
      });
    }

    /*
    -----------------------------------------------
    AUTHORIZATION
    -----------------------------------------------
    */

    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this review.",
      });
    }

    /*
    -----------------------------------------------
    RATING
    -----------------------------------------------
    */

    if (rating !== undefined) {
      const numericRating = Number(rating);

      if (
        Number.isNaN(numericRating) ||
        numericRating < 1 ||
        numericRating > 5
      ) {
        return res.status(400).json({
          success: false,

          message: "Rating must be between 1 and 5.",
        });
      }

      review.rating = numericRating;
    }

    /*
    -----------------------------------------------
    COMMENT
    -----------------------------------------------
    */

    if (comment !== undefined) {
      review.comment = String(comment).trim();
    }

    /*
    If user edits review,
    optionally send it for approval again.
    */

    if (Object.prototype.hasOwnProperty.call(review, "isApproved")) {
      review.isApproved = true;
    }

    await review.save();

    /*
    -----------------------------------------------
    UPDATE VEHICLE RATING
    -----------------------------------------------
    */

    await updateVehicleRating(review.vehicle);

    const updatedReview = await Review.findById(review._id)
      .populate("user", "name email profilePicture")
      .populate("vehicle", "name brand model");

    res.status(200).json({
      success: true,

      message: "Review updated successfully.",

      review: updatedReview,
    });
  } catch (error) {
    console.error("Update review error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to update review.",

      error: error.message,
    });
  }
};

/*
====================================================
DELETE REVIEW
DELETE /api/reviews/:id
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

    const isAdmin = req.user.role === "admin";

    const isOwner = review.user.toString() === req.user._id.toString();

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this review.",
      });
    }

    const vehicleId = review.vehicle;

    await Review.findByIdAndDelete(review._id);

    /*
    -----------------------------------------------
    UPDATE VEHICLE RATING
    -----------------------------------------------
    */

    await updateVehicleRating(vehicleId);

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
ADMIN - GET ALL REVIEWS
GET /api/reviews/admin
====================================================
*/

export const getAllReviews = async (req, res) => {
  try {
    const { page = 1, limit = 20, rating, approved } = req.query;

    const filter = {};

    /*
    -----------------------------------------------
    RATING FILTER
    -----------------------------------------------
    */

    if (rating) {
      const numericRating = Number(rating);

      if (!Number.isNaN(numericRating)) {
        filter.rating = numericRating;
      }
    }

    /*
    -----------------------------------------------
    APPROVAL FILTER
    -----------------------------------------------
    */

    if (approved !== undefined) {
      filter.isApproved = approved === "true";
    }

    const pageNumber = Math.max(Number(page) || 1, 1);

    const limitNumber = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const skip = (pageNumber - 1) * limitNumber;

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate("user", "name email")
        .populate("vehicle", "name brand model")
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber),

      Review.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,

      count: reviews.length,

      total,

      page: pageNumber,

      pages: Math.ceil(total / limitNumber),

      reviews,
    });
  } catch (error) {
    console.error("Get all reviews error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to fetch reviews.",

      error: error.message,
    });
  }
};

/*
====================================================
ADMIN - APPROVE / REJECT REVIEW
PUT /api/reviews/:id/moderate
====================================================
*/

export const moderateReview = async (req, res) => {
  try {
    const { isApproved } = req.body;

    if (typeof isApproved !== "boolean") {
      return res.status(400).json({
        success: false,

        message: "isApproved must be true or false.",
      });
    }

    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found.",
      });
    }

    review.isApproved = isApproved;

    await review.save();

    /*
    Update rating after moderation.
    */

    await updateVehicleRating(review.vehicle);

    res.status(200).json({
      success: true,

      message: isApproved
        ? "Review approved successfully."
        : "Review rejected successfully.",

      review,
    });
  } catch (error) {
    console.error("Moderate review error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to moderate review.",

      error: error.message,
    });
  }
};

/*
====================================================
VEHICLE RATING SUMMARY
GET /api/reviews/vehicle/:vehicleId/summary
====================================================
*/

export const getRatingSummary = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.vehicleId);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found.",
      });
    }

    const result = await Review.aggregate([
      {
        $match: {
          vehicle: vehicle._id,

          isApproved: {
            $ne: false,
          },
        },
      },

      {
        $group: {
          _id: null,

          totalReviews: {
            $sum: 1,
          },

          averageRating: {
            $avg: "$rating",
          },

          fiveStars: {
            $sum: {
              $cond: [
                {
                  $eq: ["$rating", 5],
                },
                1,
                0,
              ],
            },
          },

          fourStars: {
            $sum: {
              $cond: [
                {
                  $eq: ["$rating", 4],
                },
                1,
                0,
              ],
            },
          },

          threeStars: {
            $sum: {
              $cond: [
                {
                  $eq: ["$rating", 3],
                },
                1,
                0,
              ],
            },
          },

          twoStars: {
            $sum: {
              $cond: [
                {
                  $eq: ["$rating", 2],
                },
                1,
                0,
              ],
            },
          },

          oneStar: {
            $sum: {
              $cond: [
                {
                  $eq: ["$rating", 1],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const summary = result[0] || {
      totalReviews: 0,
      averageRating: 0,
      fiveStars: 0,
      fourStars: 0,
      threeStars: 0,
      twoStars: 0,
      oneStar: 0,
    };

    summary.averageRating = Number(
      Number(summary.averageRating || 0).toFixed(1),
    );

    res.status(200).json({
      success: true,

      summary,
    });
  } catch (error) {
    console.error("Rating summary error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to fetch rating summary.",

      error: error.message,
    });
  }
};

/*
====================================================
HELPER FUNCTION
UPDATE VEHICLE RATING
====================================================
*/

const updateVehicleRating = async (vehicleId) => {
  try {
    const result = await Review.aggregate([
      {
        $match: {
          vehicle: vehicleId,

          isApproved: {
            $ne: false,
          },
        },
      },

      {
        $group: {
          _id: null,

          averageRating: {
            $avg: "$rating",
          },

          totalReviews: {
            $sum: 1,
          },
        },
      },
    ]);

    const averageRating = result[0]?.averageRating || 0;

    const totalReviews = result[0]?.totalReviews || 0;

    /*
    -----------------------------------------------
    UPDATE VEHICLE
    -----------------------------------------------
    */

    const vehicle = await Vehicle.findById(vehicleId);

    if (!vehicle) {
      return;
    }

    /*
    Support common field names.
    */

    if (vehicle.schema.path("rating")) {
      vehicle.rating = Number(averageRating.toFixed(1));
    }

    if (vehicle.schema.path("averageRating")) {
      vehicle.averageRating = Number(averageRating.toFixed(1));
    }

    if (vehicle.schema.path("reviewCount")) {
      vehicle.reviewCount = totalReviews;
    }

    if (vehicle.schema.path("totalReviews")) {
      vehicle.totalReviews = totalReviews;
    }

    await vehicle.save();
  } catch (error) {
    console.error("Update vehicle rating error:", error);
  }
};
