const SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
let tokenClient, accessToken = null;
let library = [], currentStyle = 'Todos', filteredSongs = [], currentIndex = 0;
let objectUrls = [];

const $ = (id) => document.getElementById(id);
const els = {
  loginBtn:$('loginBtn'), syncBtn:$('syncBtn'), rootFolderInput:$('rootFolderInput'),
  styleSelect:$('styleSelect'), searchInput:$('searchInput'), songList:$('songList'),
  songTitle:$('songTitle'), songMeta:$('songMeta'), pdfFrame:$('pdfFrame'), audio:$('audio'),
  prevBtn:$('prevBtn'), nextBtn:$('nextBtn'), playBtn:$('playBtn'), fullscreenBtn:$('fullscreenBtn'), toast:$('toast')
};

function toast(msg){ els.toast.textContent=msg; els.toast.style.display='block'; setTimeout(()=>els.toast.style.display='none',3500); }
function normalizeName(name){ return name.replace(/\.[^.]+$/,'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
function fileExt(name){ return (name.split('.').pop()||'').toLowerCase(); }
function revokeUrls(){ objectUrls.forEach(URL.revokeObjectURL); objectUrls=[]; }

window.onload = () => {
  els.rootFolderInput.value = localStorage.getItem('rootFolderId') || window.APP_CONFIG.ROOT_FOLDER_ID || '';
  initGoogle();
  bindEvents();
};

function initGoogle(){
  const wait = setInterval(()=>{
    if(window.google?.accounts?.oauth2){
      clearInterval(wait);
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: window.APP_CONFIG.GOOGLE_CLIENT_ID,
        scope: SCOPE,
        callback: (resp) => {
          if(resp.error){ toast('Erro no login Google.'); return; }
          accessToken = resp.access_token;
          els.loginBtn.textContent = 'Google conectado';
          toast('Google Drive conectado.');
        }
      });
    }
  },150);
}

function bindEvents(){
  els.loginBtn.onclick = () => tokenClient?.requestAccessToken({prompt:'consent'});
  els.syncBtn.onclick = syncLibrary;
  els.styleSelect.onchange = () => { currentStyle=els.styleSelect.value; applyFilters(); };
  els.searchInput.oninput = applyFilters;
  els.prevBtn.onclick = () => go(-1);
  els.nextBtn.onclick = () => go(1);
  els.playBtn.onclick = () => els.audio.paused ? els.audio.play() : els.audio.pause();
  els.audio.onplay = () => els.playBtn.textContent = '⏸';
  els.audio.onpause = () => els.playBtn.textContent = '▶';
  els.fullscreenBtn.onclick = () => document.documentElement.requestFullscreen?.();
  document.addEventListener('keydown', e => {
    if(e.key === 'ArrowRight') go(1);
    if(e.key === 'ArrowLeft') go(-1);
    if(e.code === 'Space'){ e.preventDefault(); els.playBtn.click(); }
  });
}

async function driveList(folderId){
  const q = `'${folderId}' in parents and trashed=false`;
  const fields = 'files(id,name,mimeType,modifiedTime),nextPageToken';
  let files=[], pageToken='';
  do{
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', q);
    url.searchParams.set('fields', fields);
    url.searchParams.set('pageSize','1000');
    if(pageToken) url.searchParams.set('pageToken', pageToken);
    const res = await fetch(url, {headers:{Authorization:`Bearer ${accessToken}`}});
    if(!res.ok) throw new Error('Falha ao ler pasta do Drive');
    const data = await res.json();
    files = files.concat(data.files || []);
    pageToken = data.nextPageToken || '';
  } while(pageToken);
  return files;
}

async function fetchFileBlob(fileId){
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {headers:{Authorization:`Bearer ${accessToken}`}});
  if(!res.ok) throw new Error('Falha ao baixar arquivo');
  return await res.blob();
}

async function syncLibrary(){
  if(!accessToken){ toast('Primeiro entre com Google.'); return; }
  const rootId = els.rootFolderInput.value.trim();
  if(!rootId){ toast('Cole o ID da pasta principal do Drive.'); return; }
  localStorage.setItem('rootFolderId', rootId);
  toast('Atualizando biblioteca...');
  try{
    const rootFiles = await driveList(rootId);
    const styleFolders = rootFiles.filter(f=>f.mimeType==='application/vnd.google-apps.folder').sort((a,b)=>a.name.localeCompare(b.name));
    const songs=[];
    for(const style of styleFolders){
      const files = await driveList(style.id);
      const byBase = new Map();
      for(const f of files){
        const ext = fileExt(f.name);
        if(ext !== 'pdf' && ext !== 'mp3') continue;
        const key = normalizeName(f.name);
        if(!byBase.has(key)) byBase.set(key,{title:f.name.replace(/\.[^.]+$/,''), style:style.name});
        byBase.get(key)[ext] = f;
      }
      [...byBase.values()].filter(x=>x.pdf && x.mp3).forEach(x=>songs.push(x));
    }
    library = songs.sort((a,b)=>a.style.localeCompare(b.style)||a.title.localeCompare(b.title));
    renderStyles(); applyFilters();
    toast(`${library.length} músicas sincronizadas.`);
  }catch(err){ console.error(err); toast(err.message || 'Erro ao sincronizar.'); }
}

function renderStyles(){
  const styles = ['Todos', ...new Set(library.map(s=>s.style))];
  els.styleSelect.innerHTML = styles.map(s=>`<option>${s}</option>`).join('');
  els.styleSelect.value = styles.includes(currentStyle) ? currentStyle : 'Todos';
}

function applyFilters(){
  const q = els.searchInput.value.trim().toLowerCase();
  filteredSongs = library.filter(s => (currentStyle==='Todos'||s.style===currentStyle) && s.title.toLowerCase().includes(q));
  currentIndex = 0;
  renderList();
  if(filteredSongs.length) loadSong(0); else clearStage();
}

function renderList(){
  els.songList.innerHTML = filteredSongs.map((s,i)=>`<div class="song-item ${i===currentIndex?'active':''}" data-i="${i}"><strong>${s.title}</strong><span>${s.style}</span></div>`).join('');
  els.songList.querySelectorAll('.song-item').forEach(el=>el.onclick=()=>loadSong(Number(el.dataset.i)));
}

async function loadSong(i){
  if(!filteredSongs[i]) return;
  currentIndex=i; renderList(); revokeUrls();
  const song = filteredSongs[i];
  els.songTitle.textContent = song.title;
  els.songMeta.textContent = `${song.style} • ${i+1} de ${filteredSongs.length}`;
  els.pdfFrame.src = '';
  els.audio.removeAttribute('src');
  toast('Carregando música...');
  try{
    const [pdfBlob, mp3Blob] = await Promise.all([fetchFileBlob(song.pdf.id), fetchFileBlob(song.mp3.id)]);
    const pdfUrl = URL.createObjectURL(pdfBlob); const mp3Url = URL.createObjectURL(mp3Blob);
    objectUrls.push(pdfUrl, mp3Url);
    els.pdfFrame.src = pdfUrl;
    els.audio.src = mp3Url;
  }catch(err){ console.error(err); toast('Erro ao carregar PDF/MP3.'); }
}

function clearStage(){
  els.songTitle.textContent='Nenhuma música encontrada'; els.songMeta.textContent=''; els.pdfFrame.src=''; els.audio.removeAttribute('src'); els.songList.innerHTML='';
}
function go(delta){ if(!filteredSongs.length) return; loadSong((currentIndex + delta + filteredSongs.length) % filteredSongs.length); }
