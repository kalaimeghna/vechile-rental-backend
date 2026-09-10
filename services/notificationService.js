import Notification from "../models/Notification.js";

/*
====================================================
CREATE NOTIFICATION
====================================================
*/

export const createNotification = async ({
  userId,
  title,
  message,
  type = "general",
  relatedId = null,
  relatedType = null,
}) => {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  if (!title || !message) {
    throw new Error("Notification title and message are required.");
  }

  const notification = await Notification.create({
    user: userId,
    title,
    message,
    type,
    relatedId,
    relatedType,
    isRead: false,
  });

  return notification;
};

/*
====================================================
BOOKING CREATED NOTIFICATION
====================================================
*/

export const notifyBookingCreated = async ({
  userId,
  bookingId,
  vehicleName,
}) => {
  return createNotification({
    userId,
    title: "Booking Created",
    message: `Your booking for ${
      vehicleName || "the vehicle"
    } has been created successfully.`,
    type: "booking",
    relatedId: bookingId,
    relatedType: "Booking",
  });
};

/*
====================================================
BOOKING CONFIRMED NOTIFICATION
====================================================
*/

export const notifyBookingConfirmed = async ({
  userId,
  bookingId,
  vehicleName,
}) => {
  return createNotification({
    userId,
    title: "Booking Confirmed",
    message: `Your booking for ${
      vehicleName || "the vehicle"
    } has been confirmed.`,
    type: "booking",
    relatedId: bookingId,
    relatedType: "Booking",
  });
};

/*
====================================================
BOOKING REJECTED NOTIFICATION
====================================================
*/

export const notifyBookingRejected = async ({
  userId,
  bookingId,
  vehicleName,
}) => {
  return createNotification({
    userId,
    title: "Booking Rejected",
    message: `Your booking for ${
      vehicleName || "the vehicle"
    } has been rejected.`,
    type: "booking",
    relatedId: bookingId,
    relatedType: "Booking",
  });
};

/*
====================================================
BOOKING CANCELLED NOTIFICATION
====================================================
*/

export const notifyBookingCancelled = async ({
  userId,
  bookingId,
  vehicleName,
}) => {
  return createNotification({
    userId,
    title: "Booking Cancelled",
    message: `Your booking for ${
      vehicleName || "the vehicle"
    } has been cancelled.`,
    type: "booking",
    relatedId: bookingId,
    relatedType: "Booking",
  });
};

/*
====================================================
BOOKING COMPLETED NOTIFICATION
====================================================
*/

export const notifyBookingCompleted = async ({
  userId,
  bookingId,
  vehicleName,
}) => {
  return createNotification({
    userId,
    title: "Booking Completed",
    message: `Your booking for ${
      vehicleName || "the vehicle"
    } has been completed.`,
    type: "booking",
    relatedId: bookingId,
    relatedType: "Booking",
  });
};

/*
====================================================
OWNER NEW BOOKING NOTIFICATION
====================================================
*/

export const notifyOwnerNewBooking = async ({
  ownerId,
  bookingId,
  vehicleName,
}) => {
  return createNotification({
    userId: ownerId,
    title: "New Booking Received",
    message: `You received a new booking for ${vehicleName || "your vehicle"}.`,
    type: "booking",
    relatedId: bookingId,
    relatedType: "Booking",
  });
};

/*
====================================================
PAYMENT SUCCESS NOTIFICATION
====================================================
*/

export const notifyPaymentSuccess = async ({ userId, paymentId, amount }) => {
  return createNotification({
    userId,
    title: "Payment Successful",
    message: `Your payment of ₹${amount || 0} was successfully completed.`,
    type: "payment",
    relatedId: paymentId,
    relatedType: "Payment",
  });
};

/*
====================================================
PAYMENT FAILED NOTIFICATION
====================================================
*/

export const notifyPaymentFailed = async ({ userId, paymentId, amount }) => {
  return createNotification({
    userId,
    title: "Payment Failed",
    message: `Your payment of ₹${amount || 0} could not be completed.`,
    type: "payment",
    relatedId: paymentId,
    relatedType: "Payment",
  });
};

/*
====================================================
PAYMENT REFUND NOTIFICATION
====================================================
*/

export const notifyPaymentRefunded = async ({ userId, paymentId, amount }) => {
  return createNotification({
    userId,
    title: "Payment Refunded",
    message: `A refund of ₹${amount || 0} has been processed for your payment.`,
    type: "payment",
    relatedId: paymentId,
    relatedType: "Payment",
  });
};

/*
====================================================
REVIEW CREATED NOTIFICATION
====================================================
*/

export const notifyReviewCreated = async ({
  ownerId,
  reviewId,
  vehicleName,
  rating,
}) => {
  return createNotification({
    userId: ownerId,
    title: "New Vehicle Review",
    message: `Your vehicle ${
      vehicleName || ""
    } received a ${rating || ""}-star review.`,
    type: "review",
    relatedId: reviewId,
    relatedType: "Review",
  });
};

/*
====================================================
VEHICLE APPROVED NOTIFICATION
====================================================
*/

export const notifyVehicleApproved = async ({
  ownerId,
  vehicleId,
  vehicleName,
}) => {
  return createNotification({
    userId: ownerId,
    title: "Vehicle Approved",
    message: `Your vehicle ${
      vehicleName || ""
    } has been approved and is now available on the platform.`,
    type: "vehicle",
    relatedId: vehicleId,
    relatedType: "Vehicle",
  });
};

/*
====================================================
VEHICLE REJECTED NOTIFICATION
====================================================
*/

export const notifyVehicleRejected = async ({
  ownerId,
  vehicleId,
  vehicleName,
}) => {
  return createNotification({
    userId: ownerId,
    title: "Vehicle Rejected",
    message: `Your vehicle ${
      vehicleName || ""
    } has been rejected by the administrator.`,
    type: "vehicle",
    relatedId: vehicleId,
    relatedType: "Vehicle",
  });
};

/*
====================================================
GENERAL USER NOTIFICATION
====================================================
*/

export const notifyUser = async ({
  userId,
  title,
  message,
  type = "general",
  relatedId = null,
  relatedType = null,
}) => {
  return createNotification({
    userId,
    title,
    message,
    type,
    relatedId,
    relatedType,
  });
};

/*
====================================================
GET USER NOTIFICATIONS
====================================================
*/

export const getUserNotifications = async (userId, options = {}) => {
  const { page = 1, limit = 20, unreadOnly = false } = options;

  const pageNumber = Math.max(Number(page) || 1, 1);

  const limitNumber = Math.min(Math.max(Number(limit) || 20, 1), 100);

  const filter = {
    user: userId,
  };

  if (unreadOnly === true) {
    filter.isRead = false;
  }

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

  return {
    notifications,
    total,
    page: pageNumber,
    pages: Math.ceil(total / limitNumber),
  };
};

/*
====================================================
GET UNREAD COUNT
====================================================
*/

export const getUnreadCount = async (userId) => {
  return Notification.countDocuments({
    user: userId,
    isRead: false,
  });
};

/*
====================================================
MARK ONE AS READ
====================================================
*/

export const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOneAndUpdate(
    {
      _id: notificationId,
      user: userId,
    },
    {
      $set: {
        isRead: true,
      },
    },
    {
      new: true,
    },
  );

  if (!notification) {
    throw new Error("Notification not found.");
  }

  return notification;
};

/*
====================================================
MARK ALL AS READ
====================================================
*/

export const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    {
      user: userId,
      isRead: false,
    },
    {
      $set: {
        isRead: true,
      },
    },
  );

  return {
    modifiedCount: result.modifiedCount || 0,
  };
};

/*
====================================================
DELETE NOTIFICATION
====================================================
*/

export const deleteNotification = async (notificationId, userId) => {
  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    user: userId,
  });

  if (!notification) {
    throw new Error("Notification not found.");
  }

  return notification;
};

/*
====================================================
DELETE ALL NOTIFICATIONS
====================================================
*/

export const clearUserNotifications = async (userId) => {
  const result = await Notification.deleteMany({
    user: userId,
  });

  return {
    deletedCount: result.deletedCount || 0,
  };
};

/*
====================================================
DELETE OLD NOTIFICATIONS
====================================================
*/

export const deleteOldNotifications = async (days = 30) => {
  const date = new Date();

  date.setDate(date.getDate() - days);

  const result = await Notification.deleteMany({
    createdAt: {
      $lt: date,
    },
  });

  return {
    deletedCount: result.deletedCount || 0,
  };
};
