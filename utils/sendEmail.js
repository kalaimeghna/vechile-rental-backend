import nodemailer from "nodemailer";

/*
====================================================
CREATE EMAIL TRANSPORTER
====================================================
*/

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",

  port: Number(process.env.EMAIL_PORT || 587),

  secure: process.env.EMAIL_SECURE === "true",

  auth: {
    user: process.env.EMAIL_USER,

    pass: process.env.EMAIL_PASSWORD,
  },
});

/*
====================================================
SEND EMAIL
====================================================
*/

const sendEmail = async ({ to, subject, text = "", html = "" }) => {
  if (!to) {
    throw new Error("Recipient email is required.");
  }

  if (!subject) {
    throw new Error("Email subject is required.");
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    throw new Error("Email credentials are not configured.");
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,

    to,

    subject,

    text,

    html,
  };

  const info = await transporter.sendMail(mailOptions);

  return {
    success: true,

    messageId: info.messageId,

    response: info.response,
  };
};

/*
====================================================
VERIFY EMAIL CONNECTION
====================================================
*/

export const verifyEmailConnection = async () => {
  await transporter.verify();

  return true;
};

export default sendEmail;
