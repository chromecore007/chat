const express = require("express");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file" });
    }

    cloudinary.uploader.upload_stream(
      {
        resource_type: "auto", // IMAGE, VIDEO, PDF sab
      },
      (error, result) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ message: "Cloudinary error" });
        }

        res.json({
          url: result.secure_url,
          fileType: result.resource_type, // image / video / raw
        });
      }
    ).end(req.file.buffer);

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
