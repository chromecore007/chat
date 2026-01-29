const express = require("express");
const multer = require("multer");
const router = express.Router();
const cloudinary = require("../config/cloudinary");

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file received" });
    }

    // 🔥 IMPORTANT FIX: decide resource_type manually
    const isPdf =
      req.file.mimetype === "application/pdf";

    const resourceType = isPdf ? "raw" : "auto";

    cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary error 👉", error);
          return res.status(500).json({ message: "Upload failed" });
        }

        res.json({
          url: result.secure_url,
          fileType: result.resource_type, // raw | image | video
        });
      }
    ).end(req.file.buffer);

  } catch (err) {
    console.error("Upload route error 👉", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
