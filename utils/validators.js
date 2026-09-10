import mongoose from "mongoose";

/*
====================================================
COMMON HELPERS
====================================================
*/

/**
 * Check whether a value is empty.
 */
export const isEmpty = (value) => {
  return value === undefined || value === null || String(value).trim() === "";
};

/**
 * Check valid MongoDB ObjectId.
 */
export const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Check valid email.
 */
export const isValidEmail = (email) => {
  if (isEmpty(email)) {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailRegex.test(String(email).trim().toLowerCase());
};

/**
 * Check password strength.
 */
export const isValidPassword = (password) => {
  if (isEmpty(password)) {
    return false;
  }

  return String(password).length >= 6;
};

/**
 * Check phone number.
 */
export const isValidPhone = (phone) => {
  if (isEmpty(phone)) {
    return false;
  }

  const phoneRegex = /^[6-9]\d{9}$/;

  return phoneRegex.test(String(phone).trim());
};

/**
 * Check positive number.
 */
export const isPositiveNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number) && number > 0;
};

/**
 * Check non-negative number.
 */
export const isNonNegativeNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number) && number >= 0;
};

/*
====================================================
USER VALIDATION
====================================================
*/

/**
 * Validate user registration.
 */
export const validateRegistration = (data) => {
  const errors = {};

  const { name, email, password, confirmPassword, phone, role } = data || {};

  if (isEmpty(name)) {
    errors.name = "Name is required.";
  } else if (String(name).trim().length < 2) {
    errors.name = "Name must contain at least 2 characters.";
  }

  if (isEmpty(email)) {
    errors.email = "Email is required.";
  } else if (!isValidEmail(email)) {
    errors.email = "Please enter a valid email address.";
  }

  if (isEmpty(password)) {
    errors.password = "Password is required.";
  } else if (!isValidPassword(password)) {
    errors.password = "Password must contain at least 6 characters.";
  }

  if (confirmPassword !== undefined) {
    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }
  }

  if (phone !== undefined && !isEmpty(phone) && !isValidPhone(phone)) {
    errors.phone = "Please enter a valid 10-digit Indian mobile number.";
  }

  const allowedRoles = ["user", "customer", "owner"];

  if (role !== undefined && !allowedRoles.includes(role)) {
    errors.role = "Invalid user role.";
  }

  return {
    isValid: Object.keys(errors).length === 0,

    errors,
  };
};

/**
 * Validate login.
 */
export const validateLogin = (data) => {
  const errors = {};

  if (isEmpty(data?.email)) {
    errors.email = "Email is required.";
  } else if (!isValidEmail(data.email)) {
    errors.email = "Invalid email address.";
  }

  if (isEmpty(data?.password)) {
    errors.password = "Password is required.";
  }

  return {
    isValid: Object.keys(errors).length === 0,

    errors,
  };
};

/**
 * Validate change password.
 */
export const validateChangePassword = (data) => {
  const errors = {};

  const { currentPassword, newPassword, confirmPassword } = data || {};

  if (isEmpty(currentPassword)) {
    errors.currentPassword = "Current password is required.";
  }

  if (isEmpty(newPassword)) {
    errors.newPassword = "New password is required.";
  } else if (!isValidPassword(newPassword)) {
    errors.newPassword = "New password must contain at least 6 characters.";
  }

  if (newPassword !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return {
    isValid: Object.keys(errors).length === 0,

    errors,
  };
};

/*
====================================================
VEHICLE VALIDATION
====================================================
*/

/**
 * Validate vehicle creation/update.
 */
export const validateVehicle = (data) => {
  const errors = {};

  const {
    name,
    brand,
    model,
    category,
    pricePerDay,
    location,
    registrationNumber,
  } = data || {};

  if (isEmpty(name)) {
    errors.name = "Vehicle name is required.";
  }

  if (isEmpty(brand)) {
    errors.brand = "Vehicle brand is required.";
  }

  if (isEmpty(model)) {
    errors.model = "Vehicle model is required.";
  }

  if (isEmpty(category)) {
    errors.category = "Vehicle category is required.";
  }

  if (!isPositiveNumber(pricePerDay)) {
    errors.pricePerDay = "Price per day must be greater than 0.";
  }

  if (isEmpty(location)) {
    errors.location = "Vehicle location is required.";
  }

  if (registrationNumber !== undefined && isEmpty(registrationNumber)) {
    errors.registrationNumber = "Registration number cannot be empty.";
  }

  return {
    isValid: Object.keys(errors).length === 0,

    errors,
  };
};

/*
====================================================
BOOKING DATE VALIDATION
====================================================
*/

/**
 * Validate rental dates.
 */
export const validateBookingDates = (startDate, endDate) => {
  const errors = {};

  if (isEmpty(startDate)) {
    errors.startDate = "Start date is required.";
  }

  if (isEmpty(endDate)) {
    errors.endDate = "End date is required.";
  }

  if (!isEmpty(startDate) && !isEmpty(endDate)) {
    const start = new Date(startDate);

    const end = new Date(endDate);

    if (Number.isNaN(start.getTime())) {
      errors.startDate = "Invalid start date.";
    }

    if (Number.isNaN(end.getTime())) {
      errors.endDate = "Invalid end date.";
    }

    if (!errors.startDate && !errors.endDate) {
      if (end <= start) {
        errors.endDate = "End date must be after start date.";
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,

    errors,
  };
};

/*
====================================================
BOOKING VALIDATION
====================================================
*/

/**
 * Validate complete booking.
 */
export const validateBooking = (data) => {
  const errors = {};

  if (!isValidObjectId(data?.vehicleId || data?.vehicle)) {
    errors.vehicle = "Valid vehicle ID is required.";
  }

  const dateValidation = validateBookingDates(data?.startDate, data?.endDate);

  Object.assign(errors, dateValidation.errors);

  if (data?.pickupLocation !== undefined && isEmpty(data.pickupLocation)) {
    errors.pickupLocation = "Pickup location cannot be empty.";
  }

  return {
    isValid: Object.keys(errors).length === 0,

    errors,
  };
};

/*
====================================================
PAYMENT VALIDATION
====================================================
*/

/**
 * Validate payment.
 */
export const validatePayment = (data) => {
  const errors = {};

  if (!isValidObjectId(data?.bookingId || data?.booking)) {
    errors.booking = "Valid booking ID is required.";
  }

  if (!isPositiveNumber(data?.amount)) {
    errors.amount = "Payment amount must be greater than 0.";
  }

  const allowedMethods = [
    "cash",
    "card",
    "upi",
    "razorpay",
    "stripe",
    "netbanking",
  ];

  if (!allowedMethods.includes(data?.paymentMethod)) {
    errors.paymentMethod = "Invalid payment method.";
  }

  return {
    isValid: Object.keys(errors).length === 0,

    errors,
  };
};

/*
====================================================
REVIEW VALIDATION
====================================================
*/

/**
 * Validate vehicle review.
 */
export const validateReview = (data) => {
  const errors = {};

  if (!isValidObjectId(data?.vehicleId || data?.vehicle)) {
    errors.vehicle = "Valid vehicle ID is required.";
  }

  const rating = Number(data?.rating);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    errors.rating = "Rating must be an integer between 1 and 5.";
  }

  if (
    data?.comment !== undefined &&
    String(data.comment).trim().length > 1000
  ) {
    errors.comment = "Review cannot exceed 1000 characters.";
  }

  return {
    isValid: Object.keys(errors).length === 0,

    errors,
  };
};

/*
====================================================
FAVORITE VALIDATION
====================================================
*/

/**
 * Validate favorite vehicle.
 */
export const validateFavorite = (data) => {
  const errors = {};

  if (!isValidObjectId(data?.vehicleId || data?.vehicle)) {
    errors.vehicle = "Valid vehicle ID is required.";
  }

  return {
    isValid: Object.keys(errors).length === 0,

    errors,
  };
};

/*
====================================================
NOTIFICATION VALIDATION
====================================================
*/

/**
 * Validate notification.
 */
export const validateNotification = (data) => {
  const errors = {};

  if (!isValidObjectId(data?.userId || data?.user)) {
    errors.user = "Valid user ID is required.";
  }

  if (isEmpty(data?.title)) {
    errors.title = "Notification title is required.";
  }

  if (isEmpty(data?.message)) {
    errors.message = "Notification message is required.";
  }

  return {
    isValid: Object.keys(errors).length === 0,

    errors,
  };
};

/*
====================================================
PASSWORD RESET VALIDATION
====================================================
*/

export const validatePasswordReset = (data) => {
  const errors = {};

  if (isEmpty(data?.password)) {
    errors.password = "Password is required.";
  } else if (!isValidPassword(data.password)) {
    errors.password = "Password must contain at least 6 characters.";
  }

  if (data?.confirmPassword !== data?.password) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return {
    isValid: Object.keys(errors).length === 0,

    errors,
  };
};

/*
====================================================
ID VALIDATION
====================================================
*/

/**
 * Validate one or more MongoDB IDs.
 */
export const validateIds = (ids) => {
  if (!Array.isArray(ids)) {
    ids = [ids];
  }

  const invalidIds = ids.filter((id) => !isValidObjectId(id));

  return {
    isValid: invalidIds.length === 0,

    invalidIds,
  };
};

/*
====================================================
VALIDATION MIDDLEWARE
====================================================
*/

/**
 * Reusable Express validation middleware.
 *
 * Usage:
 *
 * router.post(
 *   "/",
 *   validateBody(validateLogin),
 *   login
 * );
 */
export const validateBody = (validator) => {
  return (req, res, next) => {
    try {
      const result = validator(req.body);

      if (!result.isValid) {
        return res.status(400).json({
          success: false,
          message: "Validation failed.",
          errors: result.errors,
        });
      }

      next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message || "Validation failed.",
      });
    }
  };
};

/*
====================================================
PARAM ID VALIDATION MIDDLEWARE
====================================================
*/

/**
 * Validate MongoDB ID from route params.
 *
 * Usage:
 *
 * router.get(
 *   "/:id",
 *   validateParamId("id"),
 *   controller
 * );
 */
export const validateParamId = (paramName = "id") => {
  return (req, res, next) => {
    const id = req.params[paramName];

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName}.`,
      });
    }

    next();
  };
};

/*
====================================================
SANITIZE EMAIL
====================================================
*/

export const normalizeEmail = (email) => {
  if (isEmpty(email)) {
    return "";
  }

  return String(email).trim().toLowerCase();
};

/*
====================================================
SANITIZE STRING
====================================================
*/

export const normalizeString = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
};

/*
====================================================
EXPORT DEFAULT VALIDATORS
====================================================
*/

export default {
  isEmpty,

  isValidObjectId,

  isValidEmail,

  isValidPassword,

  isValidPhone,

  isPositiveNumber,

  isNonNegativeNumber,

  validateRegistration,

  validateLogin,

  validateChangePassword,

  validateVehicle,

  validateBookingDates,

  validateBooking,

  validatePayment,

  validateReview,

  validateFavorite,

  validateNotification,

  validatePasswordReset,

  validateIds,

  validateBody,

  validateParamId,

  normalizeEmail,

  normalizeString,
};
