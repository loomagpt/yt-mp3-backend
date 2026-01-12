const express = require("express");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// =======================
// RATE LIMIT (ANTI ABUSE)
// =======================
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
});
app.use(limiter);

// =======================
// UTILITIES
// =======================
function detectPlatform(url) {
  if (/youtube|youtu\.be/.test(url)) return "YouTube";
  if (/tiktok\.com/.test(url)) return "TikTok";
  if (/facebook\.com|fb\.watch/.test(url)) return "Facebook";
  if (/instagram\.com/.test(url)) return "Instagram";
  if (/dailymotion\.com/.test(url)) return "Dailymotion";
  return "Unknown";
}

function sanitizeFilename(name) {
  return name.replace(/[<>:"/\\|?*]+/g, "").substring(0, 150);
}

function cleanup(file) {
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

// =======================
// HOME
// =======================
app.get("/", (req, res) => {
  res.json({ status: "Online Video Downloader API is running" });
});

// =======================
// VIDEO INFO (METADATA)
// =======================
app.post("/info", (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL required" });

  exec(`yt-dlp --dump-json "${url}"`, (err, stdout) => {
    if (err) {
      return res.status(500).json({ error: "Failed to fetch info" });
    }
    const data = JSON.parse(stdout);
    res.json({
      title: data.title,
      thumbnail: data.thumbnail,
      duration: data.duration,
      platform: detectPlatform(url),
    });
  });
});

// =======================
// MP3 DOWNLOAD
// =======================
app.post("/mp3", (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL required" });

  const temp = path.join(__dirname, "audio.mp3");

  const cmd = `yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${temp}" "${url}"`;

  exec(cmd, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "MP3 download failed" });
    }

    res.setHeader("Content-Disposition", "attachment; filename=audio.mp3");
    res.setHeader("Content-Type", "audio/mpeg");

    res.download(temp, () => cleanup(temp));
  });
});

// =======================
// MP4 DOWNLOAD (QUALITY)
// =======================
app.post("/mp4", (req, res) => {
  const { url } = req.body;
  const quality = req.query.quality || "720";

  if (!url) return res.status(400).json({ error: "URL required" });

  const temp = path.join(__dirname, "video.mp4");

  const format = `bestvideo[ext=mp4][height<=${quality}]+bestaudio[ext=m4a]/mp4`;

  const cmd = `yt-dlp -f "${format}" --merge-output-format mp4 -o "${temp}" "${url}"`;

  exec(cmd, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "MP4 download failed" });
    }

    res.setHeader("Content-Disposition", "attachment; filename=video.mp4");
    res.setHeader("Content-Type", "video/mp4");

    res.download(temp, () => cleanup(temp));
  });
});

// =======================
// CLEANUP ON EXIT
// =======================
process.on("exit", () => cleanup("video.mp4"));
process.on("SIGINT", () => cleanup("video.mp4"));
process.on("SIGTERM", () => cleanup("video.mp4"));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
