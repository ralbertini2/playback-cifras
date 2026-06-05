const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';
const DRIVE_FILES = 'https://www.googleapis.com/drive/v3/files';
const STORAGE = {
  token: 'pc_token',
  folder: 'pc_root_folder_id',
  style: 'pc_selected_style',
  stage: 'pc_stage_mode'
};

const els = {};
let tokenClient;
let accessToken = '';
let library = [];
let filteredSongs = [];
let currentIndex = -1;
let pickerReady = false;
let gisReady = false;
let gapiReady = false;
let currentAudioObjectUrl = '';
let audioLoadSeq = 0;

window.addEventListener('DOMContentLoaded', init);

function init(){
  bindEls();
  bindEvents();
  restoreUi();
  registerSW();
  waitForGoogleLibs();
}

function bindEls(){
  ['googleBtn','loginStatus','folderIdInput','pickFolderBtn','refreshBtn','clearFolderBtn','styleSelect','searchInput','songList','songTitle','songMeta','pdfFrame','emptyState','audio','prevBtn','nextBtn','playBtn','stageBtn','fullscreenBtn','sidebar','toggleSidebar','showSidebar','toast'].forEach(id=>els[id]=document.getElementById(id));
}

function bindEvents(){
  els.googleBtn.addEventListener('click', login);
  els.pickFolderBtn.addEventListener('click', openPicker);
  els.refreshBtn.addEventListener('click', refreshLibrary);
  els.clearFolderBtn.addEventListener('click', clearFolder);
  els.styleSelect.addEventListener('change',()=>{localStorage.setItem(STORAGE.style,els.styleSelect.value);applyFilters();});
  els.searchInput.addEventListener('input', applyFilters);
  els.prevBtn.addEventListener('click', prevSong);
  els.nextBtn.addEventListener('click', nextSong);
  els.playBtn.addEventListener('click', togglePlay);
  els.stageBtn.addEventListener('click', toggleStage);
  els.fullscreenBtn.addEventListener('click', fullscreen);
  els.showSidebar.addEventListener('click',()=>els.sidebar.classList.add('open'));
  els.toggleSidebar.addEventListener('click',()=>els.sidebar.classList.remove('open'));
  els.audio.addEventListener('play',()=>els.playBtn.textContent='⏸');
  els.audio.addEventListener('pause',()=>els.playBtn.textContent='▶');
  document.addEventListener('keydown', keyboard);
}

function restoreUi(){
  const savedFolder = localStorage.getItem(STORAGE.folder) || window.APP_CONFIG?.ROOT_FOLDER_ID || '';
  els.folderIdInput.value = savedFolder;
  if(localStorage.getItem(STORAGE.stage)==='1') document.body.classList.add('stage');
  updateStageBtn();
}

function registerSW(){
  if('serviceWorker' in navigator){navigator.serviceWorker.register('./service-worker.js').catch(()=>{});}
}

function waitForGoogleLibs(){
  const timer=setInterval(()=>{
    if(window.google?.accounts?.oauth2 && !gisReady){
      gisReady=true;
      setupTokenClient();
    }
    if(window.gapi && !gapiReady){
      gapiReady=true;
      gapi.load('picker',()=>{pickerReady=true;});
    }
    if(gisReady && gapiReady) clearInterval(timer);
  },200);
}

function setupTokenClient(){
  const clientId = window.APP_CONFIG?.GOOGLE_CLIENT_ID || '';
  if(!clientId || clientId.includes('COLE_SEU_CLIENT_ID')){
    els.loginStatus.textContent = 'Configure o GOOGLE_CLIENT_ID em config.js';
    return;
  }
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPES,
    callback: async (resp)=>{
      if(resp.error){ toast('Erro no login: '+resp.error); return; }
      accessToken = resp.access_token;
      localStorage.setItem(STORAGE.token, accessToken);
      els.loginStatus.textContent = 'Google conectado';
      els.googleBtn.textContent = 'Google conectado';
      if(els.folderIdInput.value.trim()) await refreshLibrary(true);
    }
  });
}

function login(){
  if(!tokenClient){ toast('Login ainda não carregou. Tente novamente.'); return; }
  tokenClient.requestAccessToken({prompt:'consent'});
}

function ensureLogin(){
  if(accessToken) return true;
  toast('Entre com Google primeiro.');
  return false;
}

function authHeaders(){ return {Authorization:`Bearer ${accessToken}`}; }

async function driveList(params){
  const url = new URL(DRIVE_FILES);
  Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,v));
  const res = await fetch(url.toString(), {headers:authHeaders()});
  if(!res.ok){
    const txt = await res.text();
    throw new Error(`Erro Drive ${res.status}: ${txt}`);
  }
  return res.json();
}

async function listAll(params){
  let files=[]; let pageToken='';
  do{
    const data = await driveList({...params, pageToken});
    files = files.concat(data.files || []);
    pageToken = data.nextPageToken || '';
  }while(pageToken);
  return files;
}

async function refreshLibrary(silent=false){
  if(!ensureLogin()) return;
  const rootId = extractFolderId(els.folderIdInput.value.trim());
  if(!rootId){ toast('Informe ou selecione a pasta principal.'); return; }
  els.folderIdInput.value = rootId;
  localStorage.setItem(STORAGE.folder, rootId);
  if(!silent) toast('Atualizando biblioteca...');
  try{
    const styles = await listAll({
      q: `'${rootId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields:'nextPageToken, files(id,name,mimeType)',
      orderBy:'name',
      pageSize:'1000'
    });
    const result=[];
    for(const style of styles){
      const files = await listAll({
        q: `'${style.id}' in parents and trashed=false and (mimeType='application/pdf' or mimeType='audio/mpeg' or name contains '.mp3')`,
        fields:'nextPageToken, files(id,name,mimeType,webViewLink,webContentLink)',
        orderBy:'name',
        pageSize:'1000'
      });
      result.push(...pairFiles(style, files));
    }
    library = result.sort((a,b)=>a.style.localeCompare(b.style,'pt-BR') || a.title.localeCompare(b.title,'pt-BR'));
    renderStyles();
    applyFilters();
    toast(`Biblioteca atualizada: ${library.length} música(s).`);
  }catch(err){
    console.error(err);
    toast('Erro ao acessar o Drive. Confira a pasta e as permissões.');
  }
}

function pairFiles(style, files){
  const map = new Map();
  for(const file of files){
    const ext = getExt(file.name);
    if(ext !== 'pdf' && ext !== 'mp3') continue;
    const base = normalizeBase(file.name);
    if(!map.has(base)) map.set(base,{title:base,style:style.name,styleId:style.id});
    const item = map.get(base);
    if(ext==='pdf') item.pdf = file;
    if(ext==='mp3') item.mp3 = file;
  }
  return [...map.values()].filter(x=>x.pdf && x.mp3).map(x=>({
    title:x.title,
    style:x.style,
    styleId:x.styleId,
    pdfId:x.pdf.id,
    mp3Id:x.mp3.id,
    pdfUrl:`https://drive.google.com/file/d/${x.pdf.id}/preview`,
    mp3Url:`https://www.googleapis.com/drive/v3/files/${x.mp3.id}?alt=media`
  }));
}

function renderStyles(){
  const styles = [...new Set(library.map(s=>s.style))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const saved = localStorage.getItem(STORAGE.style);
  els.styleSelect.innerHTML = '<option value="">Todos os estilos</option>' + styles.map(s=>`<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
  if(saved && styles.includes(saved)) els.styleSelect.value = saved;
}

function applyFilters(){
  const style = els.styleSelect.value;
  const q = removeAccents(els.searchInput.value.trim().toLowerCase());
  filteredSongs = library.filter(s=>(!style || s.style===style) && (!q || removeAccents(s.title.toLowerCase()).includes(q)));
  renderSongs();
  if(filteredSongs.length){ loadSong(Math.max(0, Math.min(currentIndex, filteredSongs.length-1)), false); }
  else { clearCurrent(); }
}

function renderSongs(){
  els.songList.innerHTML = filteredSongs.map((s,i)=>`<div class="song-item ${i===currentIndex?'active':''}" data-index="${i}"><strong>${escapeHtml(s.title)}</strong><span>${escapeHtml(s.style)}</span></div>`).join('');
  els.songList.querySelectorAll('.song-item').forEach(el=>el.addEventListener('click',()=>{loadSong(Number(el.dataset.index), true); els.sidebar.classList.remove('open');}));
}

async function loadSong(index, autoplay=false){
  if(index<0 || index>=filteredSongs.length) return;
  currentIndex=index;
  const seq = ++audioLoadSeq;
  const song = filteredSongs[index];

  els.songTitle.textContent = song.title;
  els.songMeta.textContent = `${song.style} • ${index+1} de ${filteredSongs.length} • carregando MP3...`;
  els.pdfFrame.src = song.pdfUrl;
  els.emptyState.style.display = 'none';
  renderSongs();

  resetAudioSource();

  try{
    const audioUrl = await getAuthorizedAudioUrl(song.mp3Id);
    if(seq !== audioLoadSeq) return;
    els.audio.src = audioUrl;
    els.audio.load();
    els.songMeta.textContent = `${song.style} • ${index+1} de ${filteredSongs.length}`;
    if(autoplay){
      setTimeout(()=>els.audio.play().catch(()=>{}),250);
    }
  }catch(err){
    console.error(err);
    if(seq === audioLoadSeq){
      els.songMeta.textContent = `${song.style} • ${index+1} de ${filteredSongs.length} • erro ao carregar MP3`;
      toast('Não consegui carregar o MP3. Confira permissões e nome do arquivo.');
    }
  }
}

async function getAuthorizedAudioUrl(fileId){
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: authHeaders()
  });
  if(!res.ok){
    const txt = await res.text();
    throw new Error(`Erro ao baixar MP3 ${res.status}: ${txt}`);
  }
  const blob = await res.blob();
  if(currentAudioObjectUrl) URL.revokeObjectURL(currentAudioObjectUrl);
  currentAudioObjectUrl = URL.createObjectURL(blob);
  return currentAudioObjectUrl;
}

function resetAudioSource(){
  els.audio.pause();
  els.audio.removeAttribute('src');
  els.audio.load();
  els.playBtn.textContent='▶';
  if(currentAudioObjectUrl){
    URL.revokeObjectURL(currentAudioObjectUrl);
    currentAudioObjectUrl = '';
  }
}

function clearCurrent(){
  currentIndex=-1;
  els.songTitle.textContent = library.length ? 'Nenhuma música neste filtro' : 'Nenhuma música carregada';
  els.songMeta.textContent = '';
  els.pdfFrame.removeAttribute('src');
  resetAudioSource();
  els.emptyState.style.display = 'grid';
}

function prevSong(){ if(filteredSongs.length) loadSong((currentIndex-1+filteredSongs.length)%filteredSongs.length, false); }
function nextSong(){ if(filteredSongs.length) loadSong((currentIndex+1)%filteredSongs.length, false); }
function togglePlay(){ if(!els.audio.src) return; els.audio.paused ? els.audio.play() : els.audio.pause(); }

function toggleStage(){
  document.body.classList.toggle('stage');
  localStorage.setItem(STORAGE.stage, document.body.classList.contains('stage')?'1':'0');
  updateStageBtn();
}
function updateStageBtn(){ els.stageBtn.textContent = document.body.classList.contains('stage') ? 'Sair do palco' : 'Modo palco'; }
function fullscreen(){ const el=document.documentElement; if(!document.fullscreenElement) el.requestFullscreen?.(); else document.exitFullscreen?.(); }

function clearFolder(){
  localStorage.removeItem(STORAGE.folder);
  els.folderIdInput.value='';
  library=[]; filteredSongs=[]; renderStyles(); renderSongs(); clearCurrent();
  toast('Pasta salva removida deste dispositivo.');
}

function openPicker(){
  if(!ensureLogin()) return;
  if(!pickerReady || !window.google?.picker){ toast('Seletor do Drive ainda está carregando.'); return; }
  const apiKey = window.APP_CONFIG?.GOOGLE_API_KEY || '';
  if(!apiKey){ toast('Google Picker precisa de API Key. Você ainda pode colar o ID da pasta manualmente.'); return; }
  const view = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
    .setIncludeFolders(true)
    .setSelectFolderEnabled(true)
    .setMimeTypes('application/vnd.google-apps.folder');
  const picker = new google.picker.PickerBuilder()
    .addView(view)
    .setOAuthToken(accessToken)
    .setDeveloperKey(apiKey)
    .setCallback(data=>{
      if(data.action === google.picker.Action.PICKED){
        const folder = data.docs[0];
        els.folderIdInput.value = folder.id;
        localStorage.setItem(STORAGE.folder, folder.id);
        refreshLibrary();
      }
    })
    .build();
  picker.setVisible(true);
}

function keyboard(e){
  if(e.target.matches('input,select,textarea')) return;
  if(e.key==='ArrowRight') nextSong();
  if(e.key==='ArrowLeft') prevSong();
  if(e.key===' ') { e.preventDefault(); togglePlay(); }
  if(e.key.toLowerCase()==='m') toggleStage();
}

function extractFolderId(value){
  if(!value) return '';
  const match = value.match(/folders\/([a-zA-Z0-9_-]+)/) || value.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : value.trim();
}
function getExt(name){ return (name.split('.').pop()||'').toLowerCase(); }
function normalizeBase(name){ return name.replace(/\.[^.]+$/,'').trim(); }
function removeAccents(s){ return s.normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
function escapeHtml(s){ return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function toast(msg){
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t=setTimeout(()=>els.toast.classList.remove('show'),3600);
}
