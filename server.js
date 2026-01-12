import express from "express";
import cors from "cors";
import { exec } from "child_process";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/mp3", (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL obligatwa" });

  const output = "audio.%(ext)s";
  const cmd = `yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${output}" "${url}"`;

  exec(cmd, (err) => {
    if (err) return res.status(500).json({ error: "Extraction error" });

    res.download("audio.mp3", () => {
      fs.unlinkSync("audio.mp3");
    });
  });
});
app.post("/mp4", (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL obligatwa" });

  const output = "video.%(ext)s";
  const cmd = `yt-dlp -f mp4 -o "${output}" "${url}"`;

  exec(cmd, (err) => {
    if (err) return res.status(500).json({ error: "Video error" });

    res.download("video.mp4", () => {
      fs.unlinkSync("video.mp4");
    });
  });
});


app.listen(3000, () => {
  console.log("MP3 backend running");
});
