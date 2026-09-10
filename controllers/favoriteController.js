import Favorite from "../models/Favorite.js";
import Vehicle from "../models/Vehicle.js";

/*
====================================================
ADD VEHICLE TO FAVORITES
POST /api/favorites/:vehicleId
====================================================
*/

export const addFavorite = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    /*
    -----------------------------------------------
    CHECK VEHICLE
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
    CHECK IF ALREADY FAVORITED
    -----------------------------------------------
    */

    const existingFavorite = await Favorite.findOne({
      user: req.user._id,
      vehicle: vehicleId,
    });

    if (existingFavorite) {
      return res.status(400).json({
        success: false,
        message: "Vehicle is already in your favorites.",
        favorite: existingFavorite,
      });
    }

    /*
    -----------------------------------------------
    CREATE FAVORITE
    -----------------------------------------------
    */

    const favorite = await Favorite.create({
      user: req.user._id,
      vehicle: vehicleId,
    });

    /*
    -----------------------------------------------
    POPULATE VEHICLE
    -----------------------------------------------
    */

    const populatedFavorite = await Favorite.findById(favorite._id).populate(
      "vehicle",
      "name brand model year type fuelType transmission seats pricePerDay location description features images rating totalReviews isAvailable",
    );

    res.status(201).json({
      success: true,
      message: "Vehicle added to favorites.",
      favorite: populatedFavorite,
    });
  } catch (error) {
    console.error("Add favorite error:", error);

    /*
    -----------------------------------------------
    HANDLE DUPLICATE FAVORITE
    -----------------------------------------------
    */

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Vehicle is already in your favorites.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to add vehicle to favorites.",
      error: error.message,
    });
  }
};

/*
====================================================
REMOVE VEHICLE FROM FAVORITES
DELETE /api/favorites/:vehicleId
====================================================
*/

export const removeFavorite = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const favorite = await Favorite.findOne({
      user: req.user._id,
      vehicle: vehicleId,
    });

    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: "Vehicle is not in your favorites.",
      });
    }

    await favorite.deleteOne();

    res.status(200).json({
      success: true,
      message: "Vehicle removed from favorites.",
      vehicleId,
    });
  } catch (error) {
    console.error("Remove favorite error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to remove vehicle from favorites.",
      error: error.message,
    });
  }
};

/*
====================================================
GET MY FAVORITES
GET /api/favorites
====================================================
*/

export const getMyFavorites = async (req, res) => {
  try {
    const favorites = await Favorite.find({
      user: req.user._id,
    })
      .populate(
        "vehicle",
        "name brand model year type fuelType transmission seats pricePerDay location description features images rating totalReviews isAvailable isApproved",
      )
      .sort({
        createdAt: -1,
      });

    /*
    -----------------------------------------------
    REMOVE FAVORITES WHERE VEHICLE WAS DELETED
    -----------------------------------------------
    */

    const validFavorites = favorites.filter(
      (favorite) => favorite.vehicle !== null,
    );

    res.status(200).json({
      success: true,
      count: validFavorites.length,
      favorites: validFavorites,
    });
  } catch (error) {
    console.error("Get favorites error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch favorites.",
      error: error.message,
    });
  }
};

/*
====================================================
CHECK IF VEHICLE IS FAVORITED
GET /api/favorites/check/:vehicleId
====================================================
*/

export const checkFavorite = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const favorite = await Favorite.findOne({
      user: req.user._id,
      vehicle: vehicleId,
    });

    res.status(200).json({
      success: true,
      isFavorite: Boolean(favorite),
      favoriteId: favorite ? favorite._id : null,
    });
  } catch (error) {
    console.error("Check favorite error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to check favorite status.",
      error: error.message,
    });
  }
};

/*
====================================================
TOGGLE FAVORITE
POST /api/favorites/toggle/:vehicleId
====================================================

If favorite exists:
    Remove it

If favorite does not exist:
    Add it
====================================================
*/

export const toggleFavorite = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    /*
    -----------------------------------------------
    CHECK VEHICLE
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
    CHECK EXISTING FAVORITE
    -----------------------------------------------
    */

    const existingFavorite = await Favorite.findOne({
      user: req.user._id,
      vehicle: vehicleId,
    });

    /*
    -----------------------------------------------
    REMOVE
    -----------------------------------------------
    */

    if (existingFavorite) {
      await existingFavorite.deleteOne();

      return res.status(200).json({
        success: true,
        message: "Vehicle removed from favorites.",
        isFavorite: false,
        vehicleId,
      });
    }

    /*
    -----------------------------------------------
    ADD
    -----------------------------------------------
    */

    const favorite = await Favorite.create({
      user: req.user._id,
      vehicle: vehicleId,
    });

    const populatedFavorite = await Favorite.findById(favorite._id).populate(
      "vehicle",
      "name brand model year type fuelType transmission seats pricePerDay location description features images rating totalReviews isAvailable",
    );

    res.status(201).json({
      success: true,
      message: "Vehicle added to favorites.",
      isFavorite: true,
      favorite: populatedFavorite,
    });
  } catch (error) {
    console.error("Toggle favorite error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Vehicle is already in your favorites.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update favorite.",
      error: error.message,
    });
  }
};

/*
====================================================
GET FAVORITE COUNT
GET /api/favorites/count
====================================================
*/

export const getFavoriteCount = async (req, res) => {
  try {
    const count = await Favorite.countDocuments({
      user: req.user._id,
    });

    res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("Get favorite count error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get favorite count.",
      error: error.message,
    });
  }
};

/*
====================================================
GET FAVORITE VEHICLE IDS
GET /api/favorites/ids
====================================================

Useful for the frontend when you want to mark
favorite vehicles with a heart icon.
====================================================
*/

export const getFavoriteVehicleIds = async (req, res) => {
  try {
    const favorites = await Favorite.find({
      user: req.user._id,
    }).select("vehicle");

    const vehicleIds = favorites.map((favorite) => favorite.vehicle);

    res.status(200).json({
      success: true,
      vehicleIds,
    });
  } catch (error) {
    console.error("Get favorite vehicle IDs error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch favorite vehicle IDs.",
      error: error.message,
    });
  }
};
