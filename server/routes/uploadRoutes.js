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

    const isPdf = req.file.mimetype === "application/pdf";

    cloudinary.uploader.upload_stream(
      {
        resource_type: isPdf ? "raw" : "auto",
        format: isPdf ? "pdf" : undefined, // 🔥 THIS IS THE KEY FIX
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary error 👉", error);
          return res.status(500).json({ message: "Upload failed" });
        }

        res.json({
          url: result.secure_url,     // 🔥 ab .pdf ke sath aayega
          fileType: result.resource_type,
        });
      }
    ).end(req.file.buffer);

  } catch (err) {
    console.error("Upload route error 👉", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
