const express = require("express");
const multer = require("multer");
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage,
});

router.post("/", upload.single("file"), (req, res) => {
  console.log("📦 FILE RECEIVED:", req.file); // 🔥 DEBUG

  if (!req.file) {
    return res.status(400).json({ message: "No file received" });
  }

  res.json({
    url: `http://localhost:5000/uploads/${req.file.filename}`,
    fileType: req.file.mimetype,
  });
});

module.exports = router;
