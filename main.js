import './style.css';
import { createApi } from 'unsplash-js';

const unsplash = createApi({ accessKey: import.meta.env.VITE_ACCESS_KEY });
const appElement = document.querySelector('#app');

appElement.innerHTML = `
  <div>
    <h2 id="dateOfTheDay"></h2>
    <a href="" target="_blank">
      <img id="picOfDay" class="logo" alt="Pic Of The Day" />
    </a>
    <div>
      <button id="previousPicButton">Image précédente</button>
      <button id="nextPicButton">Image suivante</button>
    </div>
    <h1>Pic Of The Day!</h1>
  </div>
`;

let dayOffset = 0;
let jsonHistory = {};

async function loadHistory() {
  try {
    const storedHistory = localStorage.getItem('jsonHistory');
    jsonHistory = storedHistory ? JSON.parse(storedHistory) : {};
  } catch (error) {
    console.error('Error loading the history:', error);
  }
}

async function generateFullHistory() {
  await loadHistory();

  const dates = Object.keys(jsonHistory);
  if (dates.length === 0) {
      jsonHistory[new Date().toISOString().split('T')[0]] = await fetchRandomImage();
  }

  let oldestDate = new Date(Math.min(...dates.map(date => new Date(date))));
  const today = new Date();
  while (oldestDate < today) {
      const dateString = oldestDate.toISOString().split('T')[0];
      if (!jsonHistory[dateString]) {
          const imageUrl = await fetchRandomImage();
          jsonHistory[dateString] = imageUrl;
      }
      oldestDate.setDate(oldestDate.getDate() + 1);
  }

  localStorage.setItem('jsonHistory', JSON.stringify(jsonHistory));
}

async function fetchRandomImage() {
  try {
    const result = await unsplash.photos.getRandom({});
    if (result.errors) {
      console.log('error occurred: ', result.errors[0]);
    } else {
      const photo = result.response;
      const imageUrl = photo.urls.regular;
      return imageUrl;
    }
  } catch (error) {
    console.error('Error loading the image:', error);
  }
}

async function updateImage(dayOffset) {
  await loadHistory();
  let targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + dayOffset);
  const dateString = targetDate.toISOString().split('T')[0];
  
  let imageUrl = jsonHistory[dateString];
  if (!imageUrl && dayOffset < 0) { // If the image is not in the history and it's a past date, fetch a new random image
    imageUrl = await fetchRandomImage();
    jsonHistory[dateString] = imageUrl;
    localStorage.setItem('jsonHistory', JSON.stringify(jsonHistory));
  }
  
  if (imageUrl) {
    const imageElement = document.getElementById('picOfDay');
    imageElement.src = imageUrl;
    imageElement.closest('a').href = imageUrl;
  }

  // Récupération de la date actuelle
  const today = new Date();
  targetDate = new Date();
  targetDate.setDate(today.getDate() + dayOffset);

  // Récupération de la plus ancienne date dans l'historique
  const dates = Object.keys(jsonHistory);
  let oldestDate = new Date(Math.min(...dates.map(date => new Date(date))));

  // Comparaison de la date cible avec la date la plus ancienne et aujourd'hui pour déterminer l'état des boutons
  document.getElementById('previousPicButton').disabled = targetDate.toISOString().split('T')[0] <= oldestDate.toISOString().split('T')[0];
  document.getElementById('nextPicButton').disabled = dayOffset >= 0;

  // Affichage dateOfTheDay
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };  

  const dateOfTheDay = targetDate.toLocaleDateString('fr-FR', options);
  const firstLetter = dateOfTheDay.charAt(0);
  const firstLetterCap = firstLetter.toUpperCase();
  const remainingLetters = dateOfTheDay.slice(1);
  const capitalizedDateOfTheDay = firstLetterCap + remainingLetters;

  document.getElementById('dateOfTheDay').innerHTML = capitalizedDateOfTheDay;
}

document.getElementById('previousPicButton').addEventListener('click', () => {
  dayOffset--;
  updateImage(dayOffset);
});

document.getElementById('nextPicButton').addEventListener('click', () => {
  dayOffset++;
  updateImage(dayOffset);
});

// Initialisation de l'application
async function init() {
  await generateFullHistory();
  updateImage(dayOffset);
}

init();