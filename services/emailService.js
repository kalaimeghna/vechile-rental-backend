import nodemailer from "nodemailer";

/*
====================================================
EMAIL TRANSPORTER
====================================================
*/

const createTransporter = () => {
  if (
    !process.env.EMAIL_HOST ||
    !process.env.EMAIL_PORT ||
    !process.env.EMAIL_USER ||
    !process.env.EMAIL_PASSWORD
  ) {
    throw new Error("Email configuration is missing in .env");
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,

    port: Number(process.env.EMAIL_PORT),

    secure: process.env.EMAIL_SECURE === "true",

    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

/*
====================================================
BASE EMAIL FUNCTION
====================================================
*/

export const sendEmail = async ({ to, subject, text, html }) => {
  if (!to) {
    throw new Error("Recipient email is required.");
  }

  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,

    to,

    subject,

    text,

    html,
  };

  return transporter.sendMail(mailOptions);
};

/*
====================================================
WELCOME EMAIL
====================================================
*/

export const sendWelcomeEmail = async ({ name, email }) => {
  const subject = "Welcome to Vehicle Rental Platform";

  const text = `
Hello ${name},

Welcome to Vehicle Rental Platform!

Your account has been successfully created.

You can now browse vehicles, make bookings, manage your rentals and track your payments.

Thank you for joining us.

Regards,
Vehicle Rental Platform Team
`;

  const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Welcome to Vehicle Rental Platform!</h2>

        <p>Hello <strong>${name}</strong>,</p>

        <p>
          Your account has been successfully created.
        </p>

        <p>
          You can now browse vehicles, make bookings,
          manage your rentals and track your payments.
        </p>

        <p>
          Thank you for joining us.
        </p>

        <p>
          Regards,<br />
          <strong>Vehicle Rental Platform Team</strong>
        </p>
      </div>
    `;

  return sendEmail({
    to: email,
    subject,
    text,
    html,
  });
};

/*
====================================================
BOOKING CONFIRMATION EMAIL
====================================================
*/

export const sendBookingConfirmationEmail = async ({
  name,
  email,
  booking,
  vehicle,
}) => {
  const bookingId = booking?._id?.toString() || booking?.id || "";

  const vehicleName = vehicle?.name || "Vehicle";

  const startDate = formatDate(booking?.startDate);

  const endDate = formatDate(booking?.endDate);

  const totalAmount = formatPrice(booking?.totalAmount);

  const subject = `Booking Confirmation - ${vehicleName}`;

  const text = `
Hello ${name},

Your vehicle booking has been successfully created.

Booking ID: ${bookingId}
Vehicle: ${vehicleName}
Start Date: ${startDate}
End Date: ${endDate}
Total Amount: ${totalAmount}
Status: ${booking?.status || "pending"}

Thank you for choosing Vehicle Rental Platform.

Regards,
Vehicle Rental Platform Team
`;

  const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Booking Confirmation</h2>

        <p>Hello <strong>${name}</strong>,</p>

        <p>
          Your vehicle booking has been successfully created.
        </p>

        <table style="border-collapse: collapse; width: 100%;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">
              <strong>Booking ID</strong>
            </td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ${bookingId}
            </td>
          </tr>

          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">
              <strong>Vehicle</strong>
            </td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ${vehicleName}
            </td>
          </tr>

          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">
              <strong>Start Date</strong>
            </td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ${startDate}
            </td>
          </tr>

          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">
              <strong>End Date</strong>
            </td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ${endDate}
            </td>
          </tr>

          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">
              <strong>Total Amount</strong>
            </td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ${totalAmount}
            </td>
          </tr>

          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">
              <strong>Status</strong>
            </td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ${booking?.status || "pending"}
            </td>
          </tr>
        </table>

        <p>
          Thank you for choosing Vehicle Rental Platform.
        </p>

        <p>
          Regards,<br />
          <strong>Vehicle Rental Platform Team</strong>
        </p>
      </div>
    `;

  return sendEmail({
    to: email,
    subject,
    text,
    html,
  });
};

/*
====================================================
BOOKING STATUS EMAIL
====================================================
*/

export const sendBookingStatusEmail = async ({
  name,
  email,
  booking,
  vehicle,
}) => {
  const vehicleName = vehicle?.name || "Vehicle";

  const status = booking?.status || "updated";

  const bookingId = booking?._id?.toString() || booking?.id || "";

  const subject = `Booking Status Updated - ${status}`;

  const text = `
Hello ${name},

Your booking status has been updated.

Booking ID: ${bookingId}
Vehicle: ${vehicleName}
Status: ${status}

Regards,
Vehicle Rental Platform Team
`;

  const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Booking Status Updated</h2>

        <p>Hello <strong>${name}</strong>,</p>

        <p>
          Your booking status has been updated.
        </p>

        <p>
          <strong>Booking ID:</strong> ${bookingId}<br />
          <strong>Vehicle:</strong> ${vehicleName}<br />
          <strong>Status:</strong> ${status}
        </p>

        <p>
          Regards,<br />
          <strong>Vehicle Rental Platform Team</strong>
        </p>
      </div>
    `;

  return sendEmail({
    to: email,
    subject,
    text,
    html,
  });
};

/*
====================================================
BOOKING CANCELLATION EMAIL
====================================================
*/

export const sendBookingCancellationEmail = async ({
  name,
  email,
  booking,
  vehicle,
}) => {
  const vehicleName = vehicle?.name || "Vehicle";

  const bookingId = booking?._id?.toString() || booking?.id || "";

  const reason = booking?.cancellationReason || "No reason provided.";

  const subject = "Booking Cancelled";

  const text = `
Hello ${name},

Your vehicle booking has been cancelled.

Booking ID: ${bookingId}
Vehicle: ${vehicleName}
Reason: ${reason}

If you believe this was done incorrectly, please contact support.

Regards,
Vehicle Rental Platform Team
`;

  const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Booking Cancelled</h2>

        <p>Hello <strong>${name}</strong>,</p>

        <p>
          Your vehicle booking has been cancelled.
        </p>

        <p>
          <strong>Booking ID:</strong> ${bookingId}<br />
          <strong>Vehicle:</strong> ${vehicleName}<br />
          <strong>Reason:</strong> ${reason}
        </p>

        <p>
          If you believe this was done incorrectly,
          please contact support.
        </p>

        <p>
          Regards,<br />
          <strong>Vehicle Rental Platform Team</strong>
        </p>
      </div>
    `;

  return sendEmail({
    to: email,
    subject,
    text,
    html,
  });
};

/*
====================================================
PAYMENT SUCCESS EMAIL
====================================================
*/

export const sendPaymentConfirmationEmail = async ({
  name,
  email,
  payment,
  booking,
}) => {
  const paymentId = payment?._id?.toString() || payment?.id || "";

  const bookingId = booking?._id?.toString() || booking?.id || "";

  const amount = formatPrice(payment?.amount || booking?.totalAmount);

  const subject = "Payment Successful";

  const text = `
Hello ${name},

Your payment was successfully processed.

Payment ID: ${paymentId}
Booking ID: ${bookingId}
Amount: ${amount}
Payment Status: ${payment?.status || "paid"}

Thank you for your payment.

Regards,
Vehicle Rental Platform Team
`;

  const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Payment Successful</h2>

        <p>Hello <strong>${name}</strong>,</p>

        <p>
          Your payment was successfully processed.
        </p>

        <p>
          <strong>Payment ID:</strong> ${paymentId}<br />
          <strong>Booking ID:</strong> ${bookingId}<br />
          <strong>Amount:</strong> ${amount}<br />
          <strong>Status:</strong> ${payment?.status || "paid"}
        </p>

        <p>
          Thank you for your payment.
        </p>

        <p>
          Regards,<br />
          <strong>Vehicle Rental Platform Team</strong>
        </p>
      </div>
    `;

  return sendEmail({
    to: email,
    subject,
    text,
    html,
  });
};

/*
====================================================
PASSWORD RESET EMAIL
====================================================
*/

export const sendPasswordResetEmail = async ({ name, email, resetUrl }) => {
  const subject = "Reset Your Password";

  const text = `
Hello ${name},

We received a request to reset your password.

Use the following link to reset your password:

${resetUrl}

This link will expire soon.

If you did not request a password reset, please ignore this email.

Regards,
Vehicle Rental Platform Team
`;

  const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Password Reset</h2>

        <p>Hello <strong>${name}</strong>,</p>

        <p>
          We received a request to reset your password.
        </p>

        <p>
          Click the button below to reset your password:
        </p>

        <p>
          <a
            href="${resetUrl}"
            style="
              display: inline-block;
              padding: 12px 20px;
              background: #2563eb;
              color: #ffffff;
              text-decoration: none;
              border-radius: 6px;
            "
          >
            Reset Password
          </a>
        </p>

        <p>
          This link will expire soon.
        </p>

        <p>
          If you did not request a password reset,
          please ignore this email.
        </p>

        <p>
          Regards,<br />
          <strong>Vehicle Rental Platform Team</strong>
        </p>
      </div>
    `;

  return sendEmail({
    to: email,
    subject,
    text,
    html,
  });
};

/*
====================================================
GENERIC NOTIFICATION EMAIL
====================================================
*/

export const sendNotificationEmail = async ({
  name,
  email,
  subject,
  message,
}) => {
  const text = `
Hello ${name},

${message}

Regards,
Vehicle Rental Platform Team
`;

  const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>${subject}</h2>

        <p>Hello <strong>${name}</strong>,</p>

        <p>
          ${message}
        </p>

        <p>
          Regards,<br />
          <strong>Vehicle Rental Platform Team</strong>
        </p>
      </div>
    `;

  return sendEmail({
    to: email,
    subject,
    text,
    html,
  });
};

/*
====================================================
HELPER: FORMAT DATE
====================================================
*/

const formatDate = (date) => {
  if (!date) {
    return "N/A";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "N/A";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/*
====================================================
HELPER: FORMAT PRICE
====================================================
*/

const formatPrice = (amount) => {
  const numericAmount = Number(amount);

  if (Number.isNaN(numericAmount)) {
    return "₹0.00";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(numericAmount);
};

/*
====================================================
TEST EMAIL CONNECTION
====================================================
*/

export const verifyEmailConnection = async () => {
  const transporter = createTransporter();

  return transporter.verify();
};
