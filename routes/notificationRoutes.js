import express from "express";

import {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearNotifications,
} from "../controllers/notificationController.js";

import protect from "../middleware/authMiddleware.js";

const router = express.Router();

/*
====================================================
ALL NOTIFICATION ROUTES REQUIRE LOGIN
====================================================
*/

router.use(protect);

/*
====================================================
GET MY NOTIFICATIONS
====================================================
*/

/*
GET /api/notifications

Get notifications for logged-in user.
*/

router.get("/", getMyNotifications);

/*
====================================================
UNREAD NOTIFICATION COUNT
====================================================
*/

/*
GET /api/notifications/unread-count

Returns number of unread notifications.
*/

router.get("/unread-count", getUnreadNotificationCount);

/*
====================================================
MARK ALL AS READ
====================================================
*/

/*
PUT /api/notifications/read-all

Mark all user notifications as read.
*/

router.put("/read-all", markAllNotificationsAsRead);

/*
====================================================
MARK SINGLE NOTIFICATION AS READ
====================================================
*/

/*
PUT /api/notifications/:id/read

Mark one notification as read.
*/

router.put("/:id/read", markNotificationAsRead);

/*
====================================================
DELETE SINGLE NOTIFICATION
====================================================
*/

/*
DELETE /api/notifications/:id

Delete one notification.
*/

router.delete("/:id", deleteNotification);

/*
====================================================
CLEAR ALL NOTIFICATIONS
====================================================
*/

/*
DELETE /api/notifications

Delete all notifications for logged-in user.
*/

router.delete("/", clearNotifications);

export default router;
