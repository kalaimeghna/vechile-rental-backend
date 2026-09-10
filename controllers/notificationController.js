import Notification from "../models/Notification.js";

/*
====================================================
GET MY NOTIFICATIONS
GET /api/notifications
====================================================
*/

export const getMyNotifications = async (req, res) => {
  try {
    const { type, isRead, page = 1, limit = 20 } = req.query;

    const filter = {
      user: req.user._id,
    };

    /*
    -----------------------------------------------
    FILTER BY TYPE
    -----------------------------------------------
    */

    if (type) {
      filter.type = type;
    }

    /*
    -----------------------------------------------
    FILTER BY READ STATUS
    -----------------------------------------------
    */

    if (isRead === "true") {
      filter.isRead = true;
    }

    if (isRead === "false") {
      filter.isRead = false;
    }

    /*
    -----------------------------------------------
    PAGINATION
    -----------------------------------------------
    */

    const pageNumber = Math.max(Number(page) || 1, 1);

    const limitNumber = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const skip = (pageNumber - 1) * limitNumber;

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber),

      Notification.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,

      count: notifications.length,

      total,

      page: pageNumber,

      pages: Math.ceil(total / limitNumber),

      notifications,
    });
  } catch (error) {
    console.error("Get notifications error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications.",
      error: error.message,
    });
  }
};

/*
====================================================
GET SINGLE NOTIFICATION
GET /api/notifications/:id
====================================================
*/

export const getNotificationById = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    res.status(200).json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error("Get notification error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch notification.",
      error: error.message,
    });
  }
};

/*
====================================================
GET UNREAD NOTIFICATIONS
GET /api/notifications/unread
====================================================
*/

export const getUnreadNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      user: req.user._id,
      isRead: false,
    })
      .sort({
        createdAt: -1,
      })
      .limit(50);

    res.status(200).json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    console.error("Get unread notifications error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch unread notifications.",
      error: error.message,
    });
  }
};

/*
====================================================
GET UNREAD COUNT
GET /api/notifications/unread-count
====================================================
*/

export const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      user: req.user._id,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("Get unread count error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get unread notification count.",
      error: error.message,
    });
  }
};

/*
====================================================
MARK NOTIFICATION AS READ
PUT /api/notifications/:id/read
====================================================
*/

export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    notification.isRead = true;

    await notification.save();

    res.status(200).json({
      success: true,
      message: "Notification marked as read.",
      notification,
    });
  } catch (error) {
    console.error("Mark notification as read error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to mark notification as read.",
      error: error.message,
    });
  }
};

/*
====================================================
MARK ALL NOTIFICATIONS AS READ
PUT /api/notifications/read-all
====================================================
*/

export const markAllAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      {
        user: req.user._id,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
        },
      },
    );

    res.status(200).json({
      success: true,

      message: "All notifications marked as read.",

      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Mark all notifications as read error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to mark all notifications as read.",
      error: error.message,
    });
  }
};

/*
====================================================
DELETE NOTIFICATION
DELETE /api/notifications/:id
====================================================
*/

export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    await notification.deleteOne();

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully.",
    });
  } catch (error) {
    console.error("Delete notification error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete notification.",
      error: error.message,
    });
  }
};

/*
====================================================
DELETE ALL NOTIFICATIONS
DELETE /api/notifications
====================================================
*/

export const deleteAllNotifications = async (req, res) => {
  try {
    const result = await Notification.deleteMany({
      user: req.user._id,
    });

    res.status(200).json({
      success: true,

      message: "All notifications deleted successfully.",

      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Delete all notifications error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete all notifications.",
      error: error.message,
    });
  }
};

/*
====================================================
CREATE NOTIFICATION
POST /api/notifications
====================================================

Useful for admin/system notifications.

Only admin should be allowed to create
notifications manually.
====================================================
*/

export const createNotification = async (req, res) => {
  try {
    const { userId, title, message, type } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({
        success: false,
        message: "userId, title and message are required.",
      });
    }

    const allowedTypes = ["booking", "payment", "vehicle", "review", "system"];

    const notificationType = type || "system";

    if (!allowedTypes.includes(notificationType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification type.",
      });
    }

    const notification = await Notification.create({
      user: userId,

      title,

      message,

      type: notificationType,

      isRead: false,
    });

    res.status(201).json({
      success: true,

      message: "Notification created successfully.",

      notification,
    });
  } catch (error) {
    console.error("Create notification error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create notification.",
      error: error.message,
    });
  }
};
