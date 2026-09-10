import multer from "multer";
import path from "path";
import fs from "fs";

/*
====================================================
UPLOAD DIRECTORY
====================================================
*/

const uploadDirectory = "uploads/vehicles";

/*
Create folder automatically if it doesn't exist.
*/

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true,
  });
}

/*
====================================================
MULTER STORAGE
====================================================
*/

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);

    const originalName = path
      .basename(file.originalname, extension)
      .replace(/[^a-zA-Z0-9-_]/g, "-");

    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9,
    )}-${originalName}${extension}`;

    cb(null, uniqueName);
  },
});

/*
====================================================
ALLOWED FILE TYPES
====================================================
*/

const allowedImageTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const allowedDocumentTypes = [
  "application/pdf",

  "application/msword",

  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

/*
====================================================
FILE FILTER
====================================================
*/

const fileFilter = (req, file, cb) => {
  /*
  -----------------------------------------------
  VEHICLE IMAGES
  -----------------------------------------------
  */

  if (file.fieldname === "images" || file.fieldname === "image") {
    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, JPEG, PNG and WEBP images are allowed."), false);
    }

    return;
  }

  /*
  -----------------------------------------------
  VEHICLE DOCUMENTS
  -----------------------------------------------
  */

  if (
    file.fieldname === "document" ||
    file.fieldname === "registrationDocument" ||
    file.fieldname === "insuranceDocument"
  ) {
    if (allowedDocumentTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, DOC and DOCX documents are allowed."), false);
    }

    return;
  }

  /*
  -----------------------------------------------
  GENERAL FILE CHECK
  -----------------------------------------------
  */

  if (
    allowedImageTypes.includes(file.mimetype) ||
    allowedDocumentTypes.includes(file.mimetype)
  ) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file type."), false);
  }
};

/*
====================================================
MULTER CONFIGURATION
====================================================
*/

const upload = multer({
  storage,

  fileFilter,

  limits: {
    /*
    Maximum individual file size:
    5 MB
    */

    fileSize: 5 * 1024 * 1024,

    /*
    Maximum number of files.
    */

    files: 10,
  },
});

/*
====================================================
VEHICLE IMAGE UPLOAD
====================================================
*/

export const uploadVehicleImages = upload.array("images", 10);

/*
====================================================
SINGLE VEHICLE IMAGE
====================================================
*/

export const uploadVehicleImage = upload.single("image");

/*
====================================================
VEHICLE DOCUMENT
====================================================
*/

export const uploadDocument = upload.single("document");

/*
====================================================
REGISTRATION DOCUMENT
====================================================
*/

export const uploadRegistrationDocument = upload.single("registrationDocument");

/*
====================================================
INSURANCE DOCUMENT
====================================================
*/

export const uploadInsuranceDocument = upload.single("insuranceDocument");

/*
====================================================
MULTIPLE VEHICLE FILES
====================================================
*/

export const uploadVehicleFiles = upload.fields([
  {
    name: "images",
    maxCount: 10,
  },

  {
    name: "registrationDocument",
    maxCount: 1,
  },

  {
    name: "insuranceDocument",
    maxCount: 1,
  },
]);

/*
====================================================
DEFAULT EXPORT
====================================================
*/

export default upload;
