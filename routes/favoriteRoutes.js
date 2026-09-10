import express from "express";

import {
  addFavorite,
  removeFavorite,
  getMyFavorites,
  checkFavorite,
  clearFavorites,
} from "../controllers/favoriteController.js";

import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";

const router = express.Router();

/*
====================================================
ALL FAVORITE ROUTES REQUIRE LOGIN
====================================================
*/

router.use(protect);

/*
====================================================
GET MY FAVORITES
====================================================
*/

/*
GET /api/favorites

Get all vehicles favorited by logged-in user.
*/

router.get("/", authorizeRoles("user", "customer"), getMyFavorites);

/*
====================================================
CHECK FAVORITE
====================================================
*/

/*
GET /api/favorites/check/:vehicleId

Check whether a vehicle is already favorited.
*/

router.get(
  "/check/:vehicleId",
  authorizeRoles("user", "customer"),
  checkFavorite,
);

/*
====================================================
ADD FAVORITE
====================================================
*/

/*
POST /api/favorites/:vehicleId

Add a vehicle to favorites.
*/

router.post("/:vehicleId", authorizeRoles("user", "customer"), addFavorite);

/*
====================================================
REMOVE FAVORITE
====================================================
*/

/*
DELETE /api/favorites/:vehicleId

Remove a vehicle from favorites.
*/

router.delete(
  "/:vehicleId",
  authorizeRoles("user", "customer"),
  removeFavorite,
);

/*
====================================================
CLEAR ALL FAVORITES
====================================================
*/

/*
DELETE /api/favorites

Remove all favorites belonging to logged-in user.
*/

router.delete("/", authorizeRoles("user", "customer"), clearFavorites);

export default router;
