import express from "express";
import cors from "cors";
import multer from "multer";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const app = express();
const port = process.env.PORT || 3000;

// Katalog tymczasowy dla operacji wideo
const TEMP_DIR = path.join(os.tmpdir(), "freecut-renders");
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Konfiguracja CORS (zezwolenie dla FreeCut z dowolnej domeny)
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Content-Disposition", "Content-Length", "Content-Type"],
  })
);

// Konfiguracja uploadu plików do pamięci/dysku tymczasowego
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, TEMP_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const ext = path.extname(file.originalname) || ".bin";
    cb(null, `input-${unique}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // limit do 2 GB
});

// Weryfikacja obecności FFmpeg
function checkFFmpegInstalled() {
  return new Promise((resolve) => {
    const proc = spawn("ffmpeg", ["-version"]);
    proc.on("error", () => resolve(false));
    proc.on("close", (code) => resolve(code === 0));
  });
}

// Strona główna
app.get("/", async (_req, res) => {
  const hasFfmpeg = await checkFFmpegInstalled();
  res.json({
    name: "FreeCut FFmpeg Render Server",
    status: "running",
    ffmpegAvailable: hasFfmpeg,
    endpoints: {
      health: "/health",
      transcode: "POST /transcode",
    },
  });
});

// Endpoint weryfikacji zdrowia wymagany przez FreeCut
app.get("/health", async (_req, res) => {
  const hasFfmpeg = await checkFFmpegInstalled();
  if (!hasFfmpeg) {
    return res.status(500).json({
      status: "error",
      message: "FFmpeg nie jest zainstalowany na serwerze.",
    });
  }
  res.json({ status: "ok", timestamp: Date.now() });
});

// Endpoint transkodowania wideo
app.post("/transcode", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).send("Brak przesłanego pliku wideo.");
  }

  const inputPath = req.file.path;
  const originalInputName = req.file.originalname || "input.webm";
  let settings = {};
  let rawArgs = [];

  try {
    if (req.body.settings) {
      settings = typeof req.body.settings === "string" ? JSON.parse(req.body.settings) : req.body.settings;
    }
    if (req.body.args) {
      rawArgs = typeof req.body.args === "string" ? JSON.parse(req.body.args) : req.body.args;
    }
  } catch (err) {
    try { fs.unlinkSync(inputPath); } catch {}
    return res.status(400).send(`Niepoprawny format parametrów: ${err.message}`);
  }

  // Ustalenie formatu wyjściowego
  const container = settings.container || "mp4";
  const outputExt = container === "mp4" ? ".mp4" : container === "webm" ? ".webm" : container === "mkv" ? ".mkv" : container === "gif" ? ".gif" : `.${container}`;
  const uniqueOut = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const outputPath = path.join(TEMP_DIR, `output-${uniqueOut}${outputExt}`);

  // Przygotowanie argumentów FFmpeg
  // Podmieniamy nazwę pliku wejściowego i wyjściowego na ścieżki w tymczasowym katalogu serwera
  let ffmpegArgs = [];
  if (Array.isArray(rawArgs) && rawArgs.length > 0) {
    const rawOutputName = rawArgs[rawArgs.length - 1];
    ffmpegArgs = rawArgs.map((arg, idx) => {
      if (arg === originalInputName || arg.startsWith("input.")) return inputPath;
      if (idx === rawArgs.length - 1 || arg === rawOutputName || arg.startsWith("output.")) return outputPath;
      return arg;
    });
  } else {
    // Domyślne transkodowanie do MP4 H.264 / AAC
    ffmpegArgs = [
      "-y",
      "-i", inputPath,
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "22",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", "192k",
      outputPath,
    ];
  }

  console.log(`[Transcode] Uruchamianie FFmpeg z argumentami:`, ffmpegArgs.join(" "));

  const ffmpeg = spawn("ffmpeg", ffmpegArgs);
  let stderrBuffer = "";

  ffmpeg.stderr.on("data", (data) => {
    stderrBuffer += data.toString();
  });

  // Obsługa anulowania żądania przez klienta (przerwanie połączenia)
  req.on("close", () => {
    if (!res.writableEnded) {
      console.log("[Transcode] Połączenie przerwane przez klienta, zatrzymywanie FFmpeg...");
      ffmpeg.kill("SIGKILL");
      cleanFiles([inputPath, outputPath]);
    }
  });

  ffmpeg.on("error", (err) => {
    console.error("[Transcode] Błąd uruchomienia FFmpeg:", err);
    cleanFiles([inputPath, outputPath]);
    if (!res.headersSent) {
      res.status(500).send(`Nie udało się uruchomić procesu FFmpeg: ${err.message}`);
    }
  });

  ffmpeg.on("close", (code) => {
    if (code !== 0) {
      console.error(`[Transcode] FFmpeg zakończył się błędem (kod ${code}):`, stderrBuffer.slice(-1000));
      cleanFiles([inputPath, outputPath]);
      if (!res.headersSent) {
        return res.status(500).send(`FFmpeg zakończył się błędem (kod ${code}): ${stderrBuffer.slice(-500)}`);
      }
      return;
    }

    if (!fs.existsSync(outputPath)) {
      cleanFiles([inputPath]);
      if (!res.headersSent) {
        return res.status(500).send("Plik wyjściowy nie został utworzony.");
      }
      return;
    }

    const mimeMap = {
      mp4: "video/mp4",
      webm: "video/webm",
      mkv: "video/x-matroska",
      gif: "image/gif",
    };
    const mime = mimeMap[container] || "application/octet-stream";

    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Disposition", `attachment; filename="render${outputExt}"`);

    const readStream = fs.createReadStream(outputPath);
    readStream.pipe(res);

    readStream.on("close", () => {
      cleanFiles([inputPath, outputPath]);
    });
    readStream.on("error", (err) => {
      console.error("[Transcode] Błąd odczytu wyrenderowanego pliku:", err);
      cleanFiles([inputPath, outputPath]);
    });
  });
});

function cleanFiles(paths) {
  for (const p of paths) {
    if (p && fs.existsSync(p)) {
      try {
        fs.unlinkSync(p);
      } catch (e) {
        console.warn(`Nie udało się usunąć pliku ${p}:`, e.message);
      }
    }
  }
}

app.listen(port, "0.0.0.0", () => {
  console.log(`Serwer renderujący FreeCut działa na porcie ${port}`);
});
