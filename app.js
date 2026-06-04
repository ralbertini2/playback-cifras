let songs = [];
let filteredSongs = [];
let currentIndex = 0;

const els = {
  sidebar: document.getElementById('sidebar'),
  menuBtn: document.getElementById('menuBtn'),
  songList: document.getElementById('songList'),
  searchInput: document.getElementById('searchInput'),
  songTitle: document.getElementById('songTitle'),
  songCounter: document.getElementById('songCounter'),
  pdfViewer: document.getElementById('pdfViewer'),
  audioPlayer: document.getElementById('audioPlayer'),
  prevBtn: document.getElementById('prevBtn'),
  nextBtn: document.getElementById('nextBtn'),
  fullscreenBtn: document.getElementById('fullscreenBtn')
};

function extractDriveId(url) {
  if (!url) return '';
  const patterns = [/\/d\/([^/]+)/, /id=([^&]+)/, /file\/d\/([^/]+)/];
  for (const p of patterns) {
    const match = url.match(p);
    if (match) return match[1];
  }
  return '';
}

function drivePreviewUrl(url) {
  const id = extractDriveId(url);
  return id ? `https://drive.google.com/file/d/${id}/preview` : url;
}

function driveAudioUrl(url) {
  const id = extractDriveId(url);
  return id ? `https://drive.google.com/uc?export=download&id=${id}` : url;
}

async function loadSongs() {
  const response = await fetch('songs.json', { cache: 'no-store' });
  songs = await response.json();
  filteredSongs = [...songs];
  renderList();
  openSong(0);
}

function renderList() {
  els.songList.innerHTML = '';
  filteredSongs.forEach((song) => {
    const originalIndex = songs.indexOf(song);
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = `song-item ${originalIndex === currentIndex ? 'active' : ''}`;
    btn.innerHTML = `<strong>${song.title}</strong><small>${originalIndex + 1} de ${songs.length}</small>`;
    btn.addEventListener('click', () => {
      openSong(originalIndex);
      els.sidebar.classList.remove('open');
    });
    li.appendChild(btn);
    els.songList.appendChild(li);
  });
}

function openSong(index, autoplay = false) {
  if (!songs.length) return;
  currentIndex = Math.max(0, Math.min(index, songs.length - 1));
  const song = songs[currentIndex];

  els.songTitle.textContent = song.title;
  els.songCounter.textContent = `${currentIndex + 1} de ${songs.length}`;
  els.pdfViewer.src = drivePreviewUrl(song.pdf);
  els.audioPlayer.src = driveAudioUrl(song.mp3);

  if (autoplay) {
    els.audioPlayer.play().catch(() => {});
  }
  renderList();
}

function nextSong() { openSong(currentIndex + 1, false); }
function prevSong() { openSong(currentIndex - 1, false); }

els.nextBtn.addEventListener('click', nextSong);
els.prevBtn.addEventListener('click', prevSong);
els.menuBtn.addEventListener('click', () => els.sidebar.classList.toggle('open'));
els.searchInput.addEventListener('input', () => {
  const q = els.searchInput.value.trim().toLowerCase();
  filteredSongs = songs.filter(s => s.title.toLowerCase().includes(q));
  renderList();
});
els.fullscreenBtn.addEventListener('click', () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
  else document.exitFullscreen?.();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') nextSong();
  if (e.key === 'ArrowLeft') prevSong();
  if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
    e.preventDefault();
    if (els.audioPlayer.paused) els.audioPlayer.play(); else els.audioPlayer.pause();
  }
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js').catch(() => {});
}

loadSongs().catch(err => {
  els.songTitle.textContent = 'Erro ao carregar songs.json';
  console.error(err);
});
