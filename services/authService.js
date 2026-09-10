import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

/*
====================================================
JWT TOKEN GENERATOR
====================================================
*/

const generateToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured in .env");
  }

  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    },
  );
};

/*
====================================================
REGISTER USER
====================================================
*/

export const registerUser = async ({
  name,
  email,
  password,
  phone,
  location,
  role,
}) => {
  /*
  -----------------------------------------------
  VALIDATION
  -----------------------------------------------
  */

  if (!name || !email || !password) {
    throw new Error("Name, email and password are required.");
  }

  if (password.length < 6) {
    throw new Error("Password must contain at least 6 characters.");
  }

  /*
  -----------------------------------------------
  NORMALIZE EMAIL
  -----------------------------------------------
  */

  const normalizedEmail = email.trim().toLowerCase();

  /*
  -----------------------------------------------
  CHECK EXISTING USER
  -----------------------------------------------
  */

  const existingUser = await User.findOne({
    email: normalizedEmail,
  });

  if (existingUser) {
    throw new Error("An account with this email already exists.");
  }

  /*
  -----------------------------------------------
  ALLOWED ROLES
  -----------------------------------------------
  */

  const allowedRoles = ["user", "customer", "owner"];

  /*
  Do not allow normal registration
  to create an admin account.
  */

  const userRole = allowedRoles.includes(role) ? role : "customer";

  /*
  -----------------------------------------------
  HASH PASSWORD
  -----------------------------------------------
  */

  const salt = await bcrypt.genSalt(10);

  const hashedPassword = await bcrypt.hash(password, salt);

  /*
  -----------------------------------------------
  CREATE USER
  -----------------------------------------------
  */

  const user = await User.create({
    name: name.trim(),

    email: normalizedEmail,

    password: hashedPassword,

    phone: phone?.trim() || "",

    location: location?.trim() || "",

    role: userRole,

    isActive: true,
  });

  /*
  -----------------------------------------------
  GENERATE TOKEN
  -----------------------------------------------
  */

  const token = generateToken(user);

  /*
  -----------------------------------------------
  RETURN SAFE USER DATA
  -----------------------------------------------
  */

  return {
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      location: user.location,
      role: user.role,
      profilePicture: user.profilePicture,
      isActive: user.isActive,
    },

    token,
  };
};

/*
====================================================
LOGIN USER
====================================================
*/

export const loginUser = async ({ email, password }) => {
  /*
  -----------------------------------------------
  VALIDATION
  -----------------------------------------------
  */

  if (!email || !password) {
    throw new Error("Email and password are required.");
  }

  /*
  -----------------------------------------------
  FIND USER
  -----------------------------------------------
  */

  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({
    email: normalizedEmail,
  }).select("+password");

  if (!user) {
    throw new Error("Invalid email or password.");
  }

  /*
  -----------------------------------------------
  CHECK ACCOUNT STATUS
  -----------------------------------------------
  */

  if (user.isActive === false) {
    throw new Error(
      "Your account has been deactivated. Please contact support.",
    );
  }

  /*
  -----------------------------------------------
  CHECK PASSWORD
  -----------------------------------------------
  */

  const passwordMatch = await bcrypt.compare(password, user.password);

  if (!passwordMatch) {
    throw new Error("Invalid email or password.");
  }

  /*
  -----------------------------------------------
  GENERATE TOKEN
  -----------------------------------------------
  */

  const token = generateToken(user);

  /*
  -----------------------------------------------
  RETURN USER + TOKEN
  -----------------------------------------------
  */

  return {
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      location: user.location,
      role: user.role,
      profilePicture: user.profilePicture,
      isActive: user.isActive,
    },

    token,
  };
};

/*
====================================================
COMPARE PASSWORD
====================================================
*/

export const comparePassword = async (plainPassword, hashedPassword) => {
  return bcrypt.compare(plainPassword, hashedPassword);
};

/*
====================================================
HASH PASSWORD
====================================================
*/

export const hashPassword = async (password) => {
  if (!password) {
    throw new Error("Password is required.");
  }

  const salt = await bcrypt.genSalt(10);

  return bcrypt.hash(password, salt);
};

/*
====================================================
GENERATE TOKEN
====================================================
*/

export const createToken = (user) => {
  return generateToken(user);
};

/*
====================================================
GET SAFE USER
====================================================
*/

export const getSafeUser = (user) => {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    location: user.location,
    role: user.role,
    profilePicture: user.profilePicture,
    isActive: user.isActive,
  };
};
s