import express from "express";
import Contact from "../models/Contact.js"; // Ensure this matches your exact filename casing (contact.js or Contact.js)

const router = express.Router();

router.post("/contact", async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    const newContact = new Contact({ name, email, phone, subject, message });
    await newContact.save();

    res
      .status(201)
      .json({ success: true, message: "Message sent successfully!" });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Server error, please try again later.",
      });
  }
});

export default router;
