const express = require("express");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).send("URL required");

    // 🔥 Native fetch (Node 18+)
    const response = await fetch(url);

    if (!response.ok) {
      console.error("Cloudinary response:", response.status);
      return res.status(500).send("PDF load failed");
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline");

    // stream directly to browser
    response.body.pipe(res);
  } catch (err) {
    console.error("PDF proxy error:", err);
    res.status(500).send("PDF load failed");
  }
});

module.exports = router;
