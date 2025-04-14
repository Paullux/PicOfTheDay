import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
const ONE_HOUR = 60 * 60 * 1000;

let cache = {
  timestamp: 0,
  data: null,
  failed: false,
};

app.use(cors());

app.get("/api/photo", async (req, res) => {
  const now = Date.now();

  if (cache.failed && now - cache.timestamp < ONE_HOUR) {
    return res.status(429).json({
      error: true,
      message: "Erreur temporaire : trop de demandes. Revenez dans une heure.",
    });
  }

  if (cache.data && now - cache.timestamp < ONE_HOUR) {
    return res.json(cache.data);
  }

  try {
    const response = await fetch(
      `https://api.unsplash.com/photos/random?client_id=${process.env.VITE_ACCESS_KEY}`
    );

    if (!response.ok) throw new Error("Erreur Unsplash");

    const data = await response.json();

    const formatted = {
      url: data.urls.regular,
      photographer: data.user.name,
      link: data.links.html,
    };

    cache = {
      timestamp: now,
      data: formatted,
      failed: false,
    };

    res.json(formatted);
  } catch (error) {
    console.error("Erreur proxy Unsplash:", error);
    cache = {
      timestamp: now,
      data: null,
      failed: true,
    };

    res.status(429).json({
      error: true,
      message: "Erreur temporaire : impossible de récupérer une image. Revenez dans une heure.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Serveur proxy en ligne sur http://localhost:${PORT}`);
});
