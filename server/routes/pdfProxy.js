const express = require("express");
const axios = require("axios");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).send("URL required");

    const response = await axios.get(url, {
      responseType: "arraybuffer",
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline");

    res.send(response.data);
  } catch (err) {
    console.error("PDF proxy error:", err.message);
    res.status(500).send("PDF load failed");
  }
});

module.exports = router;
