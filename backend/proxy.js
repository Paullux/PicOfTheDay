import express from 'express';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const PIXABAY_KEY = process.env.PIXABAY_KEY;
const CACHE_FILE = './history.json';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1h

// Chargement du cache depuis le fichier
let cache = {};
if (fs.existsSync(CACHE_FILE)) {
  try {
    cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
  } catch (err) {
    console.error('Erreur lecture du cache JSON :', err);
  }
}

// Route d'API
app.get('/api/photo', async (req, res) => {
  const now = Date.now();

  // S'il y a une image en cache de moins d'une heure
  if (cache.timestamp && (now - cache.timestamp < CACHE_DURATION_MS) && cache.image) {
    return res.json(cache.image);
  }

  // Si une erreur précédente a été enregistrée
  if (cache.error && (now - cache.error < CACHE_DURATION_MS)) {
    return res.status(503).json({
      error: true,
      message: "Erreur temporaire : impossible de récupérer une image. Revenez dans une heure.",
    });
  }

  try {
    const response = await fetch(`https://pixabay.com/api/?key=${PIXABAY_KEY}&image_type=photo&per_page=100`);
    const data = await response.json();

    if (!data.hits || data.hits.length === 0) {
      throw new Error("Aucune image trouvée");
    }

    const randomImage = data.hits[Math.floor(Math.random() * data.hits.length)];

    const imageData = {
      url: randomImage.largeImageURL,
      photographer: randomImage.user,
      link: randomImage.pageURL,
    };

    cache = {
      timestamp: now,
      image: imageData,
    };

    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
    res.json(imageData);
  } catch (err) {
    console.error('Erreur lors de la récupération de l’image Pixabay :', err.message);
    cache.error = now;
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));

    res.status(503).json({
      error: true,
      message: "Erreur temporaire : impossible de récupérer une image. Revenez dans une heure.",
    });
  }
});

app.listen(port, () => {
  console.log(`Backend en écoute sur http://localhost:${port}`);
});
