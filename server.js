const express = require("express");
const { spawn, exec } = require("child_process");
const app = express();
const PORT = 3000;

let currentDownload = null;

app.use(express.static(__dirname));
app.use(express.json());

// Count total videos
app.get("/count", (req, res) => {
  const username = req.query.username;
  if (!username) return res.send("Username is required.");
  const url = `https://www.tiktok.com/@${username}`;

  exec(`yt-dlp --flat-playlist --print "%(id)s" --user-agent "Mozilla/5.0" "${url}"`, (err, stdout, stderr) => {
    if (err) return res.send("Error: " + stderr);
    const lines = stdout.trim().split("\n").filter(Boolean);
    res.send(`Total videos found: ${lines.length}`);
  });
});

// Start download + stream logs
app.get("/start", (req, res) => {
  const username = req.query.username;
  if (!username) return res.status(400).send("Missing username");

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const profileURL = `https://www.tiktok.com/@${username}`;
  const outputDir = `${username}_tiktok_videos`;
  const archive = `${outputDir}/archive.txt`;

 const args = [
  "--proxy", "socks5://127.0.0.1:1080",
  "--no-check-certificate", // <--- disables SSL validation
  "-P", outputDir,
  "--ignore-errors",
  "--no-overwrites",
  "--download-archive", archive,
  "--user-agent", "Mozilla/5.0",
  profileURL
];

  currentDownload = spawn("yt-dlp", args);

  const handleData = (data) => {
    const lines = data.toString().split("\n");
    for (let line of lines) {
      if (line.includes("has already been downloaded") || line.includes("Skipping")) {
        res.write(`data: SKIPPED: ${line}\n\n`);
      } else {
        res.write(`data: ${line}\n\n`);
      }
    }
  };

  currentDownload.stdout.on("data", handleData);
  currentDownload.stderr.on("data", handleData);

  currentDownload.on("close", (code) => {
    res.write(`data: Download finished with code ${code}\n\n`);
    res.end();
    currentDownload = null;
  });
});

// Pause
app.get("/pause", (req, res) => {
  if (currentDownload) {
    currentDownload.kill();
    currentDownload = null;
    res.send("Download paused.");
  } else {
    res.send("No download in progress.");
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
