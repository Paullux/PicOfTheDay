import './style.css';

const appElement = document.querySelector('#app');

appElement.innerHTML = `
  <div>
    <h2 id="dateOfTheDay"></h2>
    <div id="imageContainer"></div>
    <div id="errorMessage" style="display: none;" class="error-box"></div>
    <div>
      <button id="previousPicButton">Image précédente</button>
      <button id="nextPicButton">Image suivante</button>
    </div>
    <h1>Pic Of The Day!</h1>
  </div>
`;

let dayOffset = 0;
let jsonHistory = {};

function getLocalDateString(date) {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60000));
  return localDate.toISOString().split('T')[0];
}

async function loadHistory() {
  try {
    const storedHistory = localStorage.getItem('jsonHistory');
    jsonHistory = storedHistory ? JSON.parse(storedHistory) : {};
  } catch (error) {
    console.error('Error loading the history:', error);
  }
}

async function fetchRandomImage() {
  const errorBox = document.getElementById('errorMessage');
  try {
    const res = await fetch('/api/photo');
    const photo = await res.json();

    if (photo.error) {
      errorBox.textContent = photo.message || "Erreur inconnue.";
      errorBox.style.display = 'block';
      return null;
    }

    errorBox.style.display = 'none'; // Si tout va bien, on cache l'erreur

    return {
      url: photo.url,
      photographer: photo.photographer,
      link: photo.link,
      source: photo.source || 'unsplash' // ← AJOUT ESSENTIEL ICI
    };
  } catch (error) {
    errorBox.textContent = "Une erreur s’est produite. Veuillez réessayer plus tard.";
    errorBox.style.display = 'block';
    console.error('Erreur lors du chargement de l’image :', error);
    return null;
  }
}

async function generateFullHistory() {
  await loadHistory();

  const today = new Date();
  const todayStr = getLocalDateString(today);

  // Si aucune image dans l'historique, on en récupère une pour aujourd'hui
  if (Object.keys(jsonHistory).length === 0) {
    const image = await fetchRandomImage();
    if (image) {
      jsonHistory[todayStr] = image;
    }
  }

  const dates = Object.keys(jsonHistory);
  if (dates.length === 0) {
    return; // rien à faire si aucune image n'a pu être récupérée
  }

  let oldestDate = new Date(Math.min(...dates.map(date => new Date(date))));

  while (oldestDate < today) {
    const dateString = getLocalDateString(oldestDate);
    if (!jsonHistory[dateString]) {
      const image = await fetchRandomImage();
      if (image) {
        jsonHistory[dateString] = image;
      } else {
        break; // arrêt si on atteint une limite ou une erreur (évite de consommer tout le quota)
      }
    }
    oldestDate.setDate(oldestDate.getDate() + 1);
  }

  localStorage.setItem('jsonHistory', JSON.stringify(jsonHistory));
}

async function updateImage(dayOffset) {
  await loadHistory();

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + dayOffset);
  const dateString = getLocalDateString(targetDate);

  const imageContainer = document.getElementById('imageContainer');
  const errorMessage = document.getElementById('errorMessage');
  errorMessage.style.display = 'none';
  imageContainer.innerHTML = '';

  let imageInfo = jsonHistory[dateString];

  if (!imageInfo || !imageInfo.url || !imageInfo.photographer || !imageInfo.link) {
    imageInfo = await fetchRandomImage();

    if (!imageInfo || imageInfo.error) {
      errorMessage.textContent = imageInfo?.message || "Une erreur est survenue.";
      errorMessage.style.display = 'block';
      return;
    }

    jsonHistory[dateString] = imageInfo;
    localStorage.setItem('jsonHistory', JSON.stringify(jsonHistory));
  }

  let sourceName = 'Unsplash';
  let sourceUrl = 'https://unsplash.com';
  let licenseText = 'Licence Unsplash — usage libre, attribution conseillée';

  if (imageInfo.url?.includes('pixabay.com')) {
    sourceName = 'Pixabay';
    sourceUrl = 'https://pixabay.com';
    licenseText = 'Licence Pixabay — usage commercial autorisé, attribution non requise';
  }

  imageContainer.innerHTML = `
    <a id="imageLink" href="${imageInfo.link}" target="_blank">
      <img id="picOfDay" class="logo" src="${imageInfo.url}" alt="Pic Of The Day" />
    </a>
    <p id="photoCredit">
      Photo par <span id="photographerName">${imageInfo.photographer}</span> sur 
      <a href="${sourceUrl}" target="_blank">${sourceName}</a>
      <br />
      <small style="font-size: 0.8em; color: #888;">
        <span title="${licenseText}" style="cursor: help;">ⓘ Informations sur la licence</span>
      </small>
    </p>
  `;

  const dates = Object.keys(jsonHistory);
  const oldestDate = new Date(Math.min(...dates.map(date => new Date(date))));
  document.getElementById('previousPicButton').disabled = getLocalDateString(targetDate) <= getLocalDateString(oldestDate);
  document.getElementById('nextPicButton').disabled = dayOffset >= 0;

  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const dateOfTheDay = targetDate.toLocaleDateString('fr-FR', options);
  document.getElementById('dateOfTheDay').textContent =
    dateOfTheDay.charAt(0).toUpperCase() + dateOfTheDay.slice(1);
}

document.getElementById('previousPicButton').addEventListener('click', () => {
  dayOffset--;
  updateImage(dayOffset);
});

document.getElementById('nextPicButton').addEventListener('click', () => {
  dayOffset++;
  updateImage(dayOffset);
});

async function init() {
  try {
    await generateFullHistory();
    updateImage(dayOffset);
  } catch (err) {
    console.warn("Erreur à l'initialisation :", err);
  }
}

init();
