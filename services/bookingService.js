import Booking from "../models/Booking.js";
import Vehicle from "../models/Vehicle.js";

/*
====================================================
HELPER: CALCULATE NUMBER OF DAYS
====================================================
*/

const calculateDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const difference = end.getTime() - start.getTime();

  const days = Math.ceil(difference / (1000 * 60 * 60 * 24));

  return Math.max(days, 1);
};

/*
====================================================
HELPER: VALIDATE DATES
====================================================
*/

const validateDates = (startDate, endDate) => {
  if (!startDate || !endDate) {
    throw new Error("Start date and end date are required.");
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Invalid booking dates.");
  }

  if (end <= start) {
    throw new Error("End date must be after start date.");
  }

  /*
  Allow today's date but don't allow
  bookings that start in the past.
  */

  if (start < now) {
    throw new Error("Booking start date cannot be in the past.");
  }

  return {
    start,
    end,
  };
};

/*
====================================================
CHECK VEHICLE AVAILABILITY
====================================================
*/

export const checkVehicleAvailability = async (
  vehicleId,
  startDate,
  endDate,
  excludeBookingId = null,
) => {
  const { start, end } = validateDates(startDate, endDate);

  const vehicle = await Vehicle.findById(vehicleId);

  if (!vehicle) {
    throw new Error("Vehicle not found.");
  }

  /*
    -----------------------------------------------
    CHECK VEHICLE STATUS
    -----------------------------------------------
    */

  if (vehicle.isAvailable === false) {
    return false;
  }

  if (
    vehicle.status &&
    ["inactive", "unavailable", "maintenance"].includes(vehicle.status)
  ) {
    return false;
  }

  /*
    -----------------------------------------------
    CHECK OVERLAPPING BOOKINGS
    -----------------------------------------------
    */

  const query = {
    vehicle: vehicleId,

    status: {
      $nin: ["cancelled", "rejected", "completed"],
    },

    /*
      Existing booking overlaps when:
      existing.start < requested.end
      AND
      existing.end > requested.start
      */

    startDate: {
      $lt: end,
    },

    endDate: {
      $gt: start,
    },
  };

  /*
    Exclude current booking when updating.
    */

  if (excludeBookingId) {
    query._id = {
      $ne: excludeBookingId,
    };
  }

  const existingBooking = await Booking.findOne(query);

  return !existingBooking;
};

/*
====================================================
CALCULATE BOOKING PRICE
====================================================
*/

export const calculateBookingPrice = async (vehicleId, startDate, endDate) => {
  const vehicle = await Vehicle.findById(vehicleId);

  if (!vehicle) {
    throw new Error("Vehicle not found.");
  }

  const days = calculateDays(startDate, endDate);

  /*
    Support common price field names.
    */

  const pricePerDay = Number(
    vehicle.pricePerDay ?? vehicle.dailyRate ?? vehicle.rentPerDay ?? 0,
  );

  if (!pricePerDay || pricePerDay <= 0) {
    throw new Error("Vehicle daily rental price is not configured.");
  }

  const subtotal = pricePerDay * days;

  /*
    Optional tax.
    Change this if your platform
    uses a different tax percentage.
    */

  const taxRate = Number(process.env.BOOKING_TAX_RATE || 0);

  const tax = subtotal * (taxRate / 100);

  const totalAmount = subtotal + tax;

  return {
    days,

    pricePerDay,

    subtotal,

    taxRate,

    tax,

    totalAmount,
  };
};

/*
====================================================
CREATE BOOKING
====================================================
*/

export const createBooking = async ({
  userId,
  vehicleId,
  startDate,
  endDate,
  pickupLocation,
  dropoffLocation,
  notes,
}) => {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  if (!vehicleId) {
    throw new Error("Vehicle ID is required.");
  }

  /*
    -----------------------------------------------
    VALIDATE DATES
    -----------------------------------------------
    */

  validateDates(startDate, endDate);

  /*
    -----------------------------------------------
    FIND VEHICLE
    -----------------------------------------------
    */

  const vehicle = await Vehicle.findById(vehicleId);

  if (!vehicle) {
    throw new Error("Vehicle not found.");
  }

  /*
    -----------------------------------------------
    CHECK VEHICLE OWNER
    -----------------------------------------------
    */

  if (vehicle.owner && vehicle.owner.toString() === userId.toString()) {
    throw new Error("You cannot book your own vehicle.");
  }

  /*
    -----------------------------------------------
    CHECK AVAILABILITY
    -----------------------------------------------
    */

  const available = await checkVehicleAvailability(
    vehicleId,
    startDate,
    endDate,
  );

  if (!available) {
    throw new Error("Vehicle is not available for the selected dates.");
  }

  /*
    -----------------------------------------------
    CALCULATE PRICE
    -----------------------------------------------
    */

  const pricing = await calculateBookingPrice(vehicleId, startDate, endDate);

  /*
    -----------------------------------------------
    CREATE BOOKING
    -----------------------------------------------
    */

  const booking = await Booking.create({
    user: userId,

    vehicle: vehicleId,

    startDate: new Date(startDate),

    endDate: new Date(endDate),

    pickupLocation: pickupLocation || "",

    dropoffLocation: dropoffLocation || "",

    notes: notes || "",

    numberOfDays: pricing.days,

    pricePerDay: pricing.pricePerDay,

    subtotal: pricing.subtotal,

    tax: pricing.tax,

    totalAmount: pricing.totalAmount,

    status: "pending",

    paymentStatus: "pending",
  });

  /*
    -----------------------------------------------
    POPULATE RESULT
    -----------------------------------------------
    */

  const populatedBooking = await Booking.findById(booking._id)
    .populate("user", "name email phone")
    .populate("vehicle", "name brand model images pricePerDay owner");

  return populatedBooking;
};

/*
====================================================
GET BOOKING BY ID
====================================================
*/

export const getBookingById = async (bookingId, userId = null, role = null) => {
  const booking = await Booking.findById(bookingId)
    .populate("user", "name email phone")
    .populate("vehicle", "name brand model images pricePerDay owner");

  if (!booking) {
    throw new Error("Booking not found.");
  }

  /*
    -----------------------------------------------
    AUTHORIZATION
    -----------------------------------------------
    */

  if (userId && role !== "admin") {
    const bookingUserId = booking.user?._id?.toString();

    const ownerId = booking.vehicle?.owner?.toString();

    const currentUserId = userId.toString();

    const isCustomer = bookingUserId === currentUserId;

    const isOwner = ownerId === currentUserId;

    if (!isCustomer && !isOwner) {
      throw new Error("You are not authorized to view this booking.");
    }
  }

  return booking;
};

/*
====================================================
GET USER BOOKINGS
====================================================
*/

export const getUserBookings = async (userId, options = {}) => {
  const { status, page = 1, limit = 10 } = options;

  const filter = {
    user: userId,
  };

  if (status) {
    filter.status = status;
  }

  const pageNumber = Math.max(Number(page) || 1, 1);

  const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);

  const skip = (pageNumber - 1) * limitNumber;

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate("vehicle", "name brand model images pricePerDay location")
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limitNumber),

    Booking.countDocuments(filter),
  ]);

  return {
    bookings,

    total,

    page: pageNumber,

    pages: Math.ceil(total / limitNumber),
  };
};

/*
====================================================
GET OWNER BOOKINGS
====================================================
*/

export const getOwnerBookings = async (ownerId, options = {}) => {
  const { status, page = 1, limit = 10 } = options;

  /*
    -----------------------------------------------
    FIND OWNER VEHICLES
    -----------------------------------------------
    */

  const vehicles = await Vehicle.find({
    owner: ownerId,
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
      .populate("user", "name email phone")
      .populate("vehicle", "name brand model images pricePerDay")
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limitNumber),

    Booking.countDocuments(filter),
  ]);

  return {
    bookings,

    total,

    page: pageNumber,

    pages: Math.ceil(total / limitNumber),
  };
};

/*
====================================================
GET ALL BOOKINGS
====================================================
*/

export const getAllBookings = async (options = {}) => {
  const { status, page = 1, limit = 10, search } = options;

  const filter = {};

  if (status) {
    filter.status = status;
  }

  /*
    Search is intentionally basic here.
    For more advanced searching, use aggregation.
    */

  const pageNumber = Math.max(Number(page) || 1, 1);

  const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);

  const skip = (pageNumber - 1) * limitNumber;

  let query = Booking.find(filter)
    .populate("user", "name email phone")
    .populate("vehicle", "name brand model images pricePerDay owner")
    .sort({
      createdAt: -1,
    })
    .skip(skip)
    .limit(limitNumber);

  /*
    Search by booking ID if provided.
    */

  if (search) {
    /*
      Search support can be extended later.
      */
  }

  const [bookings, total] = await Promise.all([
    query,

    Booking.countDocuments(filter),
  ]);

  return {
    bookings,

    total,

    page: pageNumber,

    pages: Math.ceil(total / limitNumber),
  };
};

/*
====================================================
UPDATE BOOKING STATUS
====================================================
*/

export const updateBookingStatus = async (
  bookingId,
  status,
  userId = null,
  role = null,
) => {
  const allowedStatuses = [
    "pending",
    "confirmed",
    "approved",
    "rejected",
    "active",
    "completed",
    "cancelled",
  ];

  if (!allowedStatuses.includes(status)) {
    throw new Error(
      `Invalid booking status. Allowed statuses: ${allowedStatuses.join(", ")}`,
    );
  }

  const booking = await Booking.findById(bookingId).populate(
    "vehicle",
    "owner",
  );

  if (!booking) {
    throw new Error("Booking not found.");
  }

  /*
    -----------------------------------------------
    OWNER AUTHORIZATION
    -----------------------------------------------
    */

  if (role === "owner") {
    const ownerId = booking.vehicle?.owner?.toString();

    if (ownerId !== userId.toString()) {
      throw new Error("You are not authorized to update this booking.");
    }
  }

  /*
    -----------------------------------------------
    CUSTOMER AUTHORIZATION
    -----------------------------------------------
    */

  if (role === "customer" || role === "user") {
    if (booking.user.toString() !== userId.toString()) {
      throw new Error("You are not authorized to update this booking.");
    }
  }

  /*
    -----------------------------------------------
    STATUS RULES
    -----------------------------------------------
    */

  if (booking.status === "completed" && status !== "completed") {
    throw new Error("Completed bookings cannot be changed.");
  }

  if (booking.status === "cancelled" && status !== "cancelled") {
    throw new Error("Cancelled bookings cannot be changed.");
  }

  booking.status = status;

  /*
    -----------------------------------------------
    PAYMENT STATUS
    -----------------------------------------------
    */

  if (status === "cancelled" || status === "rejected") {
    if (booking.paymentStatus !== "paid") {
      booking.paymentStatus = "cancelled";
    }
  }

  await booking.save();

  return Booking.findById(booking._id)
    .populate("user", "name email phone")
    .populate("vehicle", "name brand model images pricePerDay owner");
};

/*
====================================================
CANCEL BOOKING
====================================================
*/

export const cancelBooking = async (bookingId, userId, reason = "") => {
  const booking = await Booking.findById(bookingId);

  if (!booking) {
    throw new Error("Booking not found.");
  }

  /*
    -----------------------------------------------
    ONLY BOOKING OWNER
    -----------------------------------------------
    */

  if (booking.user.toString() !== userId.toString()) {
    throw new Error("You can only cancel your own booking.");
  }

  /*
    -----------------------------------------------
    CHECK STATUS
    -----------------------------------------------
    */

  if (["completed", "cancelled"].includes(booking.status)) {
    throw new Error(
      `Booking cannot be cancelled because it is already ${booking.status}.`,
    );
  }

  /*
    -----------------------------------------------
    UPDATE BOOKING
    -----------------------------------------------
    */

  booking.status = "cancelled";

  booking.cancellationReason = reason;

  /*
    Payment handling.
    */

  if (booking.paymentStatus !== "paid") {
    booking.paymentStatus = "cancelled";
  }

  await booking.save();

  return Booking.findById(booking._id)
    .populate("user", "name email phone")
    .populate("vehicle", "name brand model images pricePerDay owner");
};

/*
====================================================
CHECK IF USER HAS BOOKED VEHICLE
====================================================
*/

export const hasUserBookedVehicle = async (userId, vehicleId) => {
  const booking = await Booking.findOne({
    user: userId,

    vehicle: vehicleId,

    status: {
      $nin: ["cancelled", "rejected"],
    },
  });

  return Boolean(booking);
};

/*
====================================================
GET BOOKING PRICE
====================================================
*/

export const getBookingPrice = async (vehicleId, startDate, endDate) => {
  return calculateBookingPrice(vehicleId, startDate, endDate);
};
