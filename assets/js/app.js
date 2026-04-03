const API_BASE = './controladores';
let token = localStorage.getItem('qd_token');
let currentClient = JSON.parse(localStorage.getItem('qd_client') || 'null');
let currentPage = '';

// ===== UTILS =====
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function showAlert(id, msg, type = 'error') {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `alert alert-${type}`;
  el.textContent = msg;
  el.classList.remove('hidden');
}
function hideAlert(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

function formatDoc(doc) {
  if (doc.length === 11) return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

function formatBytes(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

async function api(method, endpoint, body, isFormData = false) {
  const headers = {};
  if (token) headers['Authorization'] = 'Bearer ' + token;
  if (!isFormData && body) headers['Content-Type'] = 'application/json';

  const res = await fetch(API_BASE + endpoint, {
    method,
    headers,
    body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erro na requisição');
  return data;
}

// ===== PAGES =====
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  currentPage = id;
}

function checkAuth() {
  if (!token) { showPage('page-login'); return false; }
  return true;
}

// ===== LOGIN =====
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlert('login-alert');
  const doc = document.getElementById('login-doc').value.replace(/\D/g, '');
  const pass = document.getElementById('login-pass').value;

  if (!doc || !pass) { showAlert('login-alert', 'Preencha todos os campos'); return; }

  const btn = document.getElementById('login-btn');
  btn.disabled = true; btn.textContent = 'Entrando...';

  try {
    const data = await api('POST', '/login.php', { document: doc, password: pass });
    token = data.token;
    currentClient = data.client;
    localStorage.setItem('qd_token', token);
    localStorage.setItem('qd_client', JSON.stringify(currentClient));
    goMenu();
  } catch (err) {
    showAlert('login-alert', err.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Entrar';
  }
});

// CPF/CNPJ mask
document.getElementById('login-doc').addEventListener('input', function () {
  let v = this.value.replace(/\D/g, '');
  if (v.length <= 11) {
    v = v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    v = v.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
         .replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
  }
  this.value = v;
});

function logout() {
  token = null; currentClient = null;
  localStorage.removeItem('qd_token');
  localStorage.removeItem('qd_client');
  localStorage.removeItem('qd_remember_page');
  showPage('page-login');
}

function onRememberChange(checked) {
  if (!checked) {
    localStorage.removeItem('qd_remember_page');
  }
}

function goMenu() {
  showPage('page-menu');
  if (currentClient) {
    document.getElementById('menu-greeting').textContent = `Olá, ${currentClient.displayName}`;
  }
}

// ===== PLAYER =====
let playerItems = [];
let playerSettings = {};
let playerIndex = 0;
let playerTimer = null;
let playerPaused = false;
let playerProgress = 0;
let playerProgressInterval = null;

async function goPlayer() {
  if (!checkAuth()) return;
  if (document.getElementById('remember-option').checked) {
    localStorage.setItem('qd_remember_page', 'page-player');
  }
  showPage('page-player');
  document.getElementById('player-loading').style.display = 'flex';
  document.getElementById('player-slides').innerHTML = '';

  try {
    const data = await api('GET', '/retornar-player-ativo.php');
    playerSettings = data.settings;
    playerItems = data.items;

    if (!playerItems.length) {
      document.getElementById('player-loading').innerHTML = '<p style="color:#aaa">Nenhuma mídia na playlist ativa.</p><button class="btn btn-secondary mt-2" onclick="exitPlayer()">Voltar</button>';
      return;
    }

    document.getElementById('player-loading').style.display = 'none';
    playerIndex = 0;
    playerPaused = false;
    document.getElementById('player-pause-btn').textContent = '⏸ Pausar';

    // Aplicar modo retrato se ativo
    const playerPage = document.getElementById('page-player');
    if (playerSettings.portrait_mode) {
      playerPage.classList.add('portrait-mode');
    } else {
      playerPage.classList.remove('portrait-mode');
    }

    buildSlides();
    showSlide(0);

    if (playerSettings.fullscreen_mode) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  } catch (err) {
    document.getElementById('player-loading').innerHTML = `<p style="color:#f88">Erro: ${err.message}</p><button class="btn btn-secondary mt-2" onclick="exitPlayer()">Voltar</button>`;
  }
}

function buildSlides() {
  const container = document.getElementById('player-slides');
  container.innerHTML = '';
  const transition = (playerSettings.transition_type || 'FADE').toLowerCase();

  playerItems.forEach((item, i) => {
    const slide = document.createElement('div');
    slide.className = 'player-slide';
    slide.id = `slide-${i}`;

    const src = item.file_url.startsWith('http') ? item.file_url : '.' + item.file_url;

    if (item.media_type === 'IMAGE') {
      const img = document.createElement('img');
      img.src = src;
      img.alt = item.title || '';
      img.onerror = () => { console.warn('Imagem falhou:', item.file_url); skipSlide(i); };
      slide.appendChild(img);
    } else {
      const video = document.createElement('video');
      video.src = src;
      video.muted = playerSettings.mute_videos !== 0;
      video.playsInline = true;
      video.preload = 'auto';
      video.onerror = () => { console.warn('Vídeo falhou:', item.file_url); skipSlide(i); };
      video.onended = () => { if (!playerPaused) nextSlide(); };
      slide.appendChild(video);
    }
    container.appendChild(slide);
  });
}

function showSlide(idx) {
  clearTimeout(playerTimer);
  clearInterval(playerProgressInterval);

  document.querySelectorAll('.player-slide').forEach(s => s.classList.remove('active', 'zoom-in', 'slide-in'));

  const slide = document.getElementById(`slide-${idx}`);
  if (!slide) return;

  const transition = (playerSettings.transition_type || 'FADE').toLowerCase();
  if (transition === 'zoom') slide.classList.add('zoom-in');
  else if (transition === 'slide') slide.classList.add('slide-in');
  slide.classList.add('active');

  const item = playerItems[idx];
  document.getElementById('player-counter').textContent = `${idx + 1}/${playerItems.length}`;

  const video = slide.querySelector('video');
  if (video) {
    video.currentTime = 0;
    video.play().catch(() => {});
    return;
  }

  const duration = item.image_duration_ms_effective || 7000;
  playerProgress = 0;
  document.getElementById('player-progress').style.width = '0%';

  const step = 100 / (duration / 100);
  playerProgressInterval = setInterval(() => {
    if (!playerPaused) {
      playerProgress += step;
      document.getElementById('player-progress').style.width = Math.min(playerProgress, 100) + '%';
    }
  }, 100);

  playerTimer = setTimeout(() => {
    if (!playerPaused) nextSlide();
  }, duration);
}

function skipSlide(idx) {
  if (idx === playerIndex) nextSlide();
}

function nextSlide() {
  playerIndex = (playerIndex + 1) % playerItems.length;
  showSlide(playerIndex);
}

function prevSlide() {
  playerIndex = (playerIndex - 1 + playerItems.length) % playerItems.length;
  showSlide(playerIndex);
}

function togglePause() {
  playerPaused = !playerPaused;
  document.getElementById('player-pause-btn').textContent = playerPaused ? '▶ Continuar' : '⏸ Pausar';

  const slide = document.getElementById(`slide-${playerIndex}`);
  const video = slide ? slide.querySelector('video') : null;
  if (video) { playerPaused ? video.pause() : video.play(); }
}

function exitPlayer() {
  clearTimeout(playerTimer);
  clearInterval(playerProgressInterval);
  if (document.fullscreenElement) document.exitFullscreen();
  const slides = document.getElementById('player-slides');
  slides.querySelectorAll('video').forEach(v => v.pause());
  goMenu();
}

// ===== ADMIN =====
function goAdmin() {
  if (!checkAuth()) return;
  if (document.getElementById('remember-option').checked) {
    localStorage.setItem('qd_remember_page', 'page-admin');
  }
  showPage('page-admin');
  loadMedia();
  loadPlaylists();
  loadSettings();
  loadAccount();
}

function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`section-${name}`).classList.add('active');
  event.target.classList.add('active');
}

// ===== MEDIA =====
let allMedia = [];

async function loadMedia() {
  const grid = document.getElementById('media-grid');
  grid.innerHTML = '<div class="empty-state"><div class="spinner" style="margin:auto"></div></div>';
  try {
    allMedia = await api('GET', '/listar-midias.php');
    renderMediaGrid(grid);
  } catch (err) {
    grid.innerHTML = `<p class="text-muted">${err.message}</p>`;
  }
}

function renderMediaGrid(grid) {
  if (!allMedia.length) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🖼</div><div class="empty-state-text">Nenhuma mídia cadastrada ainda</div></div>';
    return;
  }
  grid.innerHTML = '';
  allMedia.forEach(m => {
    const card = document.createElement('div');
    card.className = 'media-card' + (m.is_active ? '' : ' inactive');
    const src = m.file_url.startsWith('http') ? m.file_url : '.' + m.file_url;
    const thumb = m.media_type === 'IMAGE'
      ? `<img src="${src}" alt="${m.title}" loading="lazy" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='🖼'" />`
      : `<video src="${src}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='🎬'" muted></video>`;

    card.innerHTML = `
      <div class="media-thumb">${thumb}</div>
      <div class="media-info">
        <div class="media-title">${m.title || m.file_name}</div>
        <div class="media-meta">
          <span class="badge ${m.media_type === 'IMAGE' ? 'badge-purple' : 'badge-orange'}">${m.media_type}</span>
          &nbsp;${formatBytes(m.file_size_bytes)}
        </div>
        <div class="media-actions">
          <button class="btn btn-secondary btn-sm" onclick="toggleMedia(${m.id}, ${m.is_active})">
            ${m.is_active ? '🔴 Desativar' : '🟢 Ativar'}
          </button>
          <button class="btn btn-danger btn-sm" onclick="confirmDeleteMedia(${m.id}, '${(m.title || m.file_name).replace(/'/g, '')}')">🗑</button>
        </div>
      </div>`;
    grid.appendChild(card);
  });
}

async function toggleMedia(id, current) {
  try {
    await api('PATCH', `/atualizar-midia.php?id=${id}`, { is_active: !current });
    toast(current ? 'Mídia desativada' : 'Mídia ativada', 'success');
    loadMedia();
  } catch (err) { toast(err.message, 'error'); }
}

function confirmDeleteMedia(id, name) {
  document.getElementById('confirm-title').textContent = 'Remover mídia';
  document.getElementById('confirm-msg').textContent = `Deseja remover "${name}"? Esta ação não pode ser desfeita.`;
  const btn = document.getElementById('confirm-ok-btn');
  btn.onclick = async () => {
    closeModal('modal-confirm');
    try {
      await api('DELETE', `/remover-midia.php?id=${id}`);
      toast('Mídia removida', 'success');
      loadMedia();
    } catch (err) { toast(err.message, 'error'); }
  };
  openModal('modal-confirm');
}

// Upload
let selectedFile = null;
function openUploadModal() {
  selectedFile = null;
  document.getElementById('upload-file-input').value = '';
  document.getElementById('upload-title').value = '';
  document.getElementById('upload-area-text').textContent = 'Clique ou arraste uma imagem / vídeo aqui';
  document.getElementById('upload-progress-wrap').classList.add('hidden');
  document.getElementById('upload-progress-bar').style.width = '0%';
  hideAlert('upload-alert');
  openModal('modal-upload');
}

document.getElementById('upload-file-input').addEventListener('change', function () {
  if (this.files[0]) {
    selectedFile = this.files[0];
    document.getElementById('upload-area-text').textContent = `Arquivo: ${selectedFile.name}`;
  }
});

const uploadArea = document.getElementById('upload-area');
uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
uploadArea.addEventListener('drop', (e) => {
  e.preventDefault(); uploadArea.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) {
    selectedFile = e.dataTransfer.files[0];
    document.getElementById('upload-area-text').textContent = `Arquivo: ${selectedFile.name}`;
  }
});

async function submitUpload() {
  if (!selectedFile) { showAlert('upload-alert', 'Selecione um arquivo'); return; }
  hideAlert('upload-alert');

  const btn = document.getElementById('upload-submit-btn');
  btn.disabled = true;
  document.getElementById('upload-progress-wrap').classList.remove('hidden');

  const formData = new FormData();
  formData.append('file', selectedFile);
  const title = document.getElementById('upload-title').value.trim();
  if (title) formData.append('title', title);

  try {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', API_BASE + '/enviar-midia.php');
    xhr.setRequestHeader('Authorization', 'Bearer ' + token);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round(e.loaded / e.total * 100);
        document.getElementById('upload-progress-bar').style.width = pct + '%';
        document.getElementById('upload-progress-text').textContent = pct + '%';
      }
    };

    xhr.onload = () => {
      btn.disabled = false;
      if (xhr.status >= 200 && xhr.status < 300) {
        toast('Mídia enviada com sucesso!', 'success');
        closeModal('modal-upload');
        loadMedia();
      } else {
        const err = JSON.parse(xhr.responseText || '{}');
        showAlert('upload-alert', err.error || 'Erro no upload');
      }
    };
    xhr.onerror = () => { btn.disabled = false; showAlert('upload-alert', 'Falha na conexão'); };
    xhr.send(formData);
  } catch (err) {
    btn.disabled = false;
    showAlert('upload-alert', err.message);
  }
}

// ===== PLAYLISTS =====
let playlists = [];
let currentPlaylistId = null;
let playlistItems = [];

async function loadPlaylists() {
  const list = document.getElementById('playlist-list');
  list.innerHTML = '<div class="empty-state"><div class="spinner" style="margin:auto"></div></div>';
  try {
    playlists = await api('GET', '/listar-playlists.php');
    renderPlaylists();
  } catch (err) {
    list.innerHTML = `<p class="text-muted">${err.message}</p>`;
  }
}

function renderPlaylists() {
  const list = document.getElementById('playlist-list');
  if (!playlists.length) {
    list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">Nenhuma playlist criada</div></div>';
    return;
  }
  list.innerHTML = '';
  playlists.forEach(p => {
    const item = document.createElement('div');
    item.className = 'playlist-item';
    item.innerHTML = `
      <div class="playlist-item-info">
        <span class="playlist-item-name">${p.name}</span>
        <span class="badge ${p.is_active ? 'badge-green' : 'badge-red'}">${p.is_active ? 'Ativa' : 'Inativa'}</span>
      </div>
      <div class="playlist-item-actions">
        ${!p.is_active ? `<button class="btn btn-success btn-sm" onclick="activatePlaylist(${p.id})">✅ Ativar</button>` : ''}
        <button class="btn btn-secondary btn-sm" onclick="editPlaylist(${p.id}, '${p.name.replace(/'/g, '')}')">✏️ Editar</button>
        <button class="btn btn-danger btn-sm" onclick="confirmDeletePlaylist(${p.id}, '${p.name.replace(/'/g, '')}')">🗑</button>
      </div>`;
    list.appendChild(item);
  });
}

async function activatePlaylist(id) {
  try {
    await api('PATCH', `/ativar-playlist.php?id=${id}`);
    toast('Playlist ativada!', 'success');
    loadPlaylists();
  } catch (err) { toast(err.message, 'error'); }
}

function openCreatePlaylist() {
  document.getElementById('new-playlist-name').value = '';
  hideAlert('create-playlist-alert');
  openModal('modal-create-playlist');
}

async function createPlaylist() {
  const name = document.getElementById('new-playlist-name').value.trim();
  if (!name) { showAlert('create-playlist-alert', 'Nome obrigatório'); return; }
  try {
    await api('POST', '/criar-playlist.php', { name });
    toast('Playlist criada!', 'success');
    closeModal('modal-create-playlist');
    loadPlaylists();
  } catch (err) { showAlert('create-playlist-alert', err.message); }
}

function confirmDeletePlaylist(id, name) {
  document.getElementById('confirm-title').textContent = 'Remover playlist';
  document.getElementById('confirm-msg').textContent = `Deseja remover "${name}"?`;
  document.getElementById('confirm-ok-btn').onclick = async () => {
    closeModal('modal-confirm');
    try {
      await api('DELETE', `/remover-playlist.php?id=${id}`);
      toast('Playlist removida', 'success');
      loadPlaylists();
    } catch (err) { toast(err.message, 'error'); }
  };
  openModal('modal-confirm');
}

async function editPlaylist(id, name) {
  currentPlaylistId = id;
  document.getElementById('playlist-editor-title').textContent = `✏️ Editando: ${name}`;
  document.getElementById('playlist-editor').classList.remove('hidden');
  await loadPlaylistItems();
}

function closePlaylistEditor() {
  currentPlaylistId = null;
  document.getElementById('playlist-editor').classList.add('hidden');
}

async function loadPlaylistItems() {
  const list = document.getElementById('dnd-list');
  list.innerHTML = '<div class="spinner" style="margin:auto"></div>';
  try {
    playlistItems = await api('GET', `/listar-itens-playlist.php?id=${currentPlaylistId}`);
    renderDndList();
  } catch (err) {
    list.innerHTML = `<p class="text-muted">${err.message}</p>`;
  }
}

function renderDndList() {
  const list = document.getElementById('dnd-list');
  if (!playlistItems.length) {
    list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🎞</div><div class="empty-state-text">Nenhum item na playlist</div></div>';
    return;
  }
  list.innerHTML = '';
  playlistItems.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'dnd-item';
    el.draggable = true;
    el.dataset.index = i;
    el.dataset.id = item.id;

    const src = item.file_url.startsWith('http') ? item.file_url : '.' + item.file_url;
    const thumbContent = item.media_type === 'IMAGE'
      ? `<img src="${src}" alt="" onerror="this.parentElement.innerHTML='🖼'" />`
      : `🎬`;

    const durSeconds = item.media_type === 'IMAGE'
      ? Math.round((item.image_duration_ms || item.image_duration_ms_effective || 7000) / 1000)
      : null;

    el.innerHTML = `
      <span class="dnd-handle">⠿</span>
      <div class="dnd-thumb">${thumbContent}</div>
      <div class="dnd-info">
        <div class="dnd-title">${item.title || item.file_name || 'Sem título'}</div>
        <div class="dnd-meta">${item.media_type} &bull; ${item.is_active ? 'Ativo' : 'Inativo'}</div>
      </div>
      ${item.media_type === 'IMAGE' ? `
        <div class="dnd-duration">
          <input type="number" min="1" max="600" value="${durSeconds}" title="Duração em segundos" data-item-id="${item.id}" />
          <span class="text-sm text-muted">s</span>
        </div>` : ''}
      <div class="flex gap-1">
        <button class="btn btn-secondary btn-sm btn-icon" onclick="togglePlaylistItem(${item.id}, ${item.is_active})" title="${item.is_active ? 'Desativar' : 'Ativar'}">
          ${item.is_active ? '🔴' : '🟢'}
        </button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="removePlaylistItem(${item.id})" title="Remover">🗑</button>
      </div>`;

    setupDnd(el);
    list.appendChild(el);
  });
}

async function togglePlaylistItem(id, current) {
  try {
    await api('PATCH', `/atualizar-item-playlist.php?id=${currentPlaylistId}&item_id=${id}`, { is_active: !current });
    toast(current ? 'Item desativado' : 'Item ativado', 'success');
    loadPlaylistItems();
  } catch (err) { toast(err.message, 'error'); }
}

async function removePlaylistItem(id) {
  try {
    await api('DELETE', `/remover-item-playlist.php?id=${currentPlaylistId}&item_id=${id}`);
    toast('Item removido', 'success');
    loadPlaylistItems();
  } catch (err) { toast(err.message, 'error'); }
}

async function savePlaylistOrder() {
  const items = [...document.querySelectorAll('.dnd-item')].map((el, i) => {
    const id = parseInt(el.dataset.id);
    const durInput = el.querySelector(`input[data-item-id="${id}"]`);
    const durSec = durInput ? parseInt(durInput.value) : null;
    return { id, sort_order: i + 1, dur_ms: durSec ? durSec * 1000 : null };
  });

  try {
    await api('PUT', `/reordenar-itens-playlist.php?id=${currentPlaylistId}`, { items });

    for (const item of items) {
      if (item.dur_ms !== null) {
        await api('PATCH', `/atualizar-item-playlist.php?id=${currentPlaylistId}&item_id=${item.id}`, { image_duration_ms: item.dur_ms });
      }
    }
    toast('Ordem e durações salvas!', 'success');
    loadPlaylistItems();
  } catch (err) { toast(err.message, 'error'); }
}

function openAddToPlaylistModal() {
  const grid = document.getElementById('add-media-grid');
  grid.innerHTML = '';
  const active = allMedia.filter(m => m.is_active);
  if (!active.length) {
    grid.innerHTML = '<p class="text-muted text-sm">Nenhuma mídia ativa disponível</p>';
    openModal('modal-add-to-playlist');
    return;
  }
  active.forEach(m => {
    const el = document.createElement('div');
    el.className = 'media-card';
    const src = m.file_url.startsWith('http') ? m.file_url : '.' + m.file_url;
    el.innerHTML = `
      <div class="media-thumb">
        ${m.media_type === 'IMAGE' ? `<img src="${src}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;" />` : '🎬'}
      </div>
      <div class="media-info">
        <div class="media-title">${m.title || m.file_name}</div>
        <button class="btn btn-primary btn-sm w-full mt-1" onclick="addToPlaylist(${m.id})">+ Adicionar</button>
      </div>`;
    grid.appendChild(el);
  });
  openModal('modal-add-to-playlist');
}

async function addToPlaylist(mediaId) {
  try {
    await api('POST', `/adicionar-item-playlist.php?id=${currentPlaylistId}`, { media_id: mediaId });
    toast('Mídia adicionada!', 'success');
    closeModal('modal-add-to-playlist');
    loadPlaylistItems();
  } catch (err) { toast(err.message, 'error'); }
}

// Drag and drop
let dragSrcIndex = null;
function setupDnd(el) {
  el.addEventListener('dragstart', () => {
    dragSrcIndex = parseInt(el.dataset.index);
    el.classList.add('dragging');
  });
  el.addEventListener('dragend', () => el.classList.remove('dragging'));
  el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('drag-over'); });
  el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
  el.addEventListener('drop', (e) => {
    e.preventDefault();
    el.classList.remove('drag-over');
    const targetIndex = parseInt(el.dataset.index);
    if (dragSrcIndex === null || dragSrcIndex === targetIndex) return;
    const [moved] = playlistItems.splice(dragSrcIndex, 1);
    playlistItems.splice(targetIndex, 0, moved);
    renderDndList();
  });
}

// ===== SETTINGS =====
async function loadSettings() {
  const form = document.getElementById('settings-form');
  form.innerHTML = '<div class="spinner" style="margin:auto"></div>';
  try {
    const [s, p] = await Promise.all([
      api('GET', '/retornar-configuracoes.php'),
      api('GET', '/listar-playlists.php')
    ]);

    const playlistOptions = p.map(pl => `<option value="${pl.id}" ${pl.is_active ? 'selected' : ''}>${pl.name}</option>`).join('');

    form.innerHTML = `
      <div class="settings-group">
        <div class="settings-row">
          <div><span class="font-bold">Modo tela cheia</span><br><span class="text-sm text-muted">O player deve iniciar em tela cheia</span></div>
          <label class="toggle">
            <input type="checkbox" id="s-fullscreen" ${s.fullscreen_mode ? 'checked' : ''} />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="settings-row">
          <div><span class="font-bold">Modo Retrato</span><br><span class="text-sm text-muted">Girar a apresentação para vertical</span></div>
          <label class="toggle">
            <input type="checkbox" id="s-portrait" ${s.portrait_mode ? 'checked' : ''} />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
      <div class="settings-group">
        <label class="label" style="font-weight:700;color:var(--text)">Transição entre slides</label>
        <select id="s-transition" class="input-field">
          <option value="fade" ${s.transition_type === 'fade' ? 'selected' : ''}>Fade (padrão)</option>
          <option value="zoom" ${s.transition_type === 'zoom' ? 'selected' : ''}>Zoom</option>
          <option value="slide" ${s.transition_type === 'slide' ? 'selected' : ''}>Slide</option>
        </select>
      </div>
      <div class="settings-group">
        <label class="label" style="font-weight:700;color:var(--text)">Playlist ativa</label>
        <select id="s-playlist" class="input-field">${playlistOptions}</select>
      </div>
      <button class="btn btn-primary" onclick="saveSettings()">Salvar configurações</button>`;
  } catch (err) {
    form.innerHTML = `<p class="text-muted">${err.message}</p>`;
  }
}

async function saveSettings() {
  try {
    const activePlaylistId = document.getElementById('s-playlist').value;
    await api('PATCH', `/ativar-playlist.php?id=${activePlaylistId}`);

    await api('PATCH', '/salvar-configuracoes.php', {
      fullscreen_mode: document.getElementById('s-fullscreen').checked,
      portrait_mode: document.getElementById('s-portrait').checked,
      transition_type: document.getElementById('s-transition').value,
    });
    toast('Configurações salvas!', 'success');
    loadPlaylists(); // Recarrega playlists para mostrar qual está ativa
  } catch (err) { toast(err.message, 'error'); }
}

// ===== ACCOUNT =====
async function loadAccount() {
  try {
    const acc = await api('GET', '/conta.php');
    document.getElementById('account-doc').value = formatDoc(acc.document);
    document.getElementById('account-name').value = acc.display_name;
  } catch (err) { console.error(err); }
}

async function saveAccount() {
  const name = document.getElementById('account-name').value.trim();
  if (!name) { showAlert('account-alert', 'Nome obrigatório', 'error'); return; }
  try {
    const acc = await api('PATCH', '/conta.php', { display_name: name });
    currentClient.displayName = acc.display_name;
    localStorage.setItem('qd_client', JSON.stringify(currentClient));
    showAlert('account-alert', 'Dados salvos!', 'success');
    toast('Dados atualizados!', 'success');
  } catch (err) { showAlert('account-alert', err.message, 'error'); }
}

async function changePassword() {
  hideAlert('pwd-alert');
  const cur = document.getElementById('pwd-current').value;
  const nw = document.getElementById('pwd-new').value;
  const conf = document.getElementById('pwd-confirm').value;

  if (!cur || !nw || !conf) { showAlert('pwd-alert', 'Preencha todos os campos'); return; }
  if (nw !== conf) { showAlert('pwd-alert', 'As senhas não coincidem'); return; }
  if (nw.length < 6) { showAlert('pwd-alert', 'Mínimo 6 caracteres'); return; }

  try {
    await api('POST', '/alterar-senha.php', { current_password: cur, new_password: nw });
    toast('Senha alterada com sucesso!', 'success');
    document.getElementById('pwd-current').value = '';
    document.getElementById('pwd-new').value = '';
    document.getElementById('pwd-confirm').value = '';
  } catch (err) { showAlert('pwd-alert', err.message); }
}

// ===== INIT =====
(function init() {
  if (token && currentClient) {
    const remembered = localStorage.getItem('qd_remember_page');
    if (remembered) {
      document.getElementById('remember-option').checked = true;
      if (remembered === 'page-player') {
        goPlayer();
      } else if (remembered === 'page-admin') {
        goAdmin();
      } else {
        goMenu();
      }
    } else {
      goMenu();
    }
  } else {
    showPage('page-login');
  }
})();
