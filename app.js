import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

// ── Configuración (inyectada por Vite desde variables de entorno) ────────────
const FIREBASE_CONFIG = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const CLOUDINARY_CONFIG = {
  cloudName:    import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
  uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
};

// ── Estado ──────────────────────────────────────────────────
let db = null;
let allReports = [], currentFilter = 'all';
let formPhotos = []; // array de {url, uploading}
let gestoraOn = false, recurOn = false;
let selectedCat = '', selectedUrg = '';
let isAdmin = false;
let adminPin = 'vecinos2026'; // PIN por defecto — cámbialo desde el panel admin
let cloudinaryReady = false;
let gestoraPhotoUrl = null;

const CAT_LABELS = { jardineria:'🌿 Jardinería',limpieza:'🧹 Limpieza',piscina:'🏊 Piscina',mantenimiento:'🔧 Mantenimiento',iluminacion:'💡 Iluminación',zonas_comunes:'🏛️ Zonas comunes',conserjeria:'🚪 Conserjería',bloque:'🏢 Bloque',otros:'⚙️ Otros' };
const STATUS_LABELS = { nuevo:'Nuevo',reportado:'Reportado a gestora',en_proceso:'En proceso',resuelto:'Resuelto',sin_resolver:'Sin resolver' };

// ── Inicialización ───────────────────────────────────────────
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

function adjustHeaderOffset() {
  const hdr = document.querySelector('.hdr');
  if (hdr) document.documentElement.style.setProperty('--hdr-h', hdr.offsetHeight + 'px');
}

function init() {
  adjustHeaderOffset();
  window.addEventListener('resize', adjustHeaderOffset);
  isAdmin = sessionStorage.getItem('rv_admin') === '1';
  if (isAdmin) applyAdminUI();

  // Cloudinary
  if (!CLOUDINARY_CONFIG.cloudName || CLOUDINARY_CONFIG.cloudName === 'TU_CLOUD_NAME') {
    document.getElementById('setup-banner-cloudinary').classList.add('show');
  } else {
    cloudinaryReady = true;
  }

  if (!FIREBASE_CONFIG.apiKey || FIREBASE_CONFIG.apiKey === 'TU_API_KEY') {
    document.getElementById('setup-banner').classList.add('show');
    document.getElementById('list-content').innerHTML = '<div class="ldg" style="color:var(--danger)">⚠️ Configura las variables de entorno de Firebase en Render.</div>';
    return;
  }

  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.firestore();

    // Escuchar PIN de admin desde Firestore
    db.collection('config').doc('settings').onSnapshot(snap => {
      if (snap.exists && snap.data().adminPin) adminPin = snap.data().adminPin;
    });

    // Escuchar incidencias en tiempo real
    db.collection('reports').orderBy('createdAt','desc').limit(500)
      .onSnapshot(snap => {
        allReports = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        updateStats(); renderList(); updateBadge();
        if (isAdmin) renderAdminList();
      }, err => console.error('Firestore error:', err));

  } catch(e) {
    console.error('Firebase init error:', e);
    document.getElementById('list-content').innerHTML = '<div class="ldg" style="color:var(--danger)">Error al conectar con Firebase. Revisa la configuración.</div>';
  }
}

// ── Tabs ─────────────────────────────────────────────────────
function showTab(t) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('on'));
  document.querySelectorAll('.tab').forEach(b => b.classList.remove('on'));
  document.getElementById('view-'+t).classList.add('on');
  document.getElementById('tab-'+t).classList.add('on');
  if (t === 'admin') renderAdminList();
  window.scrollTo({top:0, behavior:'instant'});
  requestAnimationFrame(adjustHeaderOffset);
}
window.showTab = showTab;

// ── Formulario ───────────────────────────────────────────────
document.querySelectorAll('#cat-pills .pill').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#cat-pills .pill').forEach(b => b.classList.remove('on'));
    btn.classList.add('on'); selectedCat = btn.dataset.v;
    document.getElementById('err-cat').classList.remove('on');
  });
});

document.querySelectorAll('#urg-pills .pill').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#urg-pills .pill').forEach(b => b.classList.remove('on'));
    btn.classList.add('on'); selectedUrg = btn.dataset.v;
    document.getElementById('err-urg').classList.remove('on');
  });
});

document.getElementById('gestora-photo-inp').addEventListener('change', async function() {
  const file = this.files[0]; if (!file) return;
  document.getElementById('gestora-photo-spin').style.display = 'inline';
  document.getElementById('gestora-photo-lbl').textContent = 'Subiendo...';
  try {
    gestoraPhotoUrl = await uploadToCloudinary(file);
    document.getElementById('gestora-photo-img').src = gestoraPhotoUrl;
    document.getElementById('gestora-photo-preview').style.display = 'block';
    document.getElementById('gestora-photo-lbl').textContent = 'Captura adjunta ✓';
  } catch(e) {
    alert('No se pudo subir la imagen.');
    document.getElementById('gestora-photo-lbl').textContent = 'Adjuntar captura del correo (opcional)';
  }
  document.getElementById('gestora-photo-spin').style.display = 'none';
  this.value = '';
});

function removeGestoraPhoto() {
  gestoraPhotoUrl = null;
  document.getElementById('gestora-photo-preview').style.display = 'none';
  document.getElementById('gestora-photo-lbl').textContent = 'Adjuntar captura del correo (opcional)';
}
window.removeGestoraPhoto = removeGestoraPhoto;

function toggleGestora() {
  gestoraOn = !gestoraOn;
  document.getElementById('tog-gestora').classList.toggle('on', gestoraOn);
  document.getElementById('gestora-fields').classList.toggle('on', gestoraOn);
  if (gestoraOn && !document.getElementById('f-gdate').value) {
    document.getElementById('f-gdate').value = new Date().toISOString().slice(0,10);
  }
}
window.toggleGestora = toggleGestora;

function toggleRecur() {
  recurOn = !recurOn;
  document.getElementById('tog-recur').classList.toggle('on', recurOn);
}
window.toggleRecur = toggleRecur;

// Fotos — subida a Cloudinary
async function uploadToCloudinary(file) {
  if (!cloudinaryReady) {
    return await compressToBase64(file);
  }
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
  fd.append('folder', 'comunidad_julia_sanz');
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`, {
    method: 'POST', body: fd
  });
  if (!res.ok) throw new Error('Error subiendo foto a Cloudinary');
  const data = await res.json();
  return data.secure_url.replace('/upload/', '/upload/w_900,q_auto,f_auto/');
}

async function compressToBase64(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(900/img.width, 700/img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width*ratio); canvas.height = Math.round(img.height*ratio);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function handleFiles(files) {
  const toAdd = Array.from(files).filter(f=>f.type.startsWith('image/')).slice(0, 5-formPhotos.length);
  for (const f of toAdd) {
    if (formPhotos.length >= 5) break;
    const idx = formPhotos.length;
    formPhotos.push({ url: null, uploading: true });
    renderPhotoThumbs();
    try {
      const url = await uploadToCloudinary(f);
      formPhotos[idx] = { url, uploading: false };
    } catch(e) {
      formPhotos.splice(idx, 1);
      alert('No se pudo subir la foto. Comprueba tu configuración de Cloudinary.');
    }
    renderPhotoThumbs();
  }
}

document.getElementById('photo-inp').addEventListener('change', async e => {
  await handleFiles(e.target.files); e.target.value = '';
});

const pz = document.getElementById('photo-zone');
pz.addEventListener('dragover', e => { e.preventDefault(); pz.classList.add('drag'); });
pz.addEventListener('dragleave', () => pz.classList.remove('drag'));
pz.addEventListener('drop', async e => {
  e.preventDefault(); pz.classList.remove('drag');
  await handleFiles(e.dataTransfer.files);
});

function renderPhotoThumbs() {
  document.getElementById('photo-thumbs').innerHTML = formPhotos.map((p,i) =>
    p.uploading
      ? `<div class="ph-wrap"><div class="ph-uploading">⏳</div></div>`
      : `<div class="ph-wrap"><img class="ph-img" src="${p.url}" onclick="openPhotoModal('${p.url}')"><button class="ph-del" type="button" onclick="removePhoto(${i})">✕</button></div>`
  ).join('');
  const done = formPhotos.filter(p=>!p.uploading).length;
  pz.classList.toggle('has-p', formPhotos.length>0);
  pz.querySelector('.pz-txt').textContent = formPhotos.length>=5 ? 'Máximo 5 fotos' : 'Toca para añadir fotos';
  pz.querySelector('.pz-hint').textContent = formPhotos.some(p=>p.uploading)
    ? `Subiendo... (${done}/${formPhotos.length} listas)` : 'Hasta 5 fotos · JPG, PNG';
}

function removePhoto(i) { formPhotos.splice(i,1); renderPhotoThumbs(); }
window.removePhoto = removePhoto;

// Envío
document.getElementById('report-form').addEventListener('submit', async e => {
  e.preventDefault();
  let ok = true;
  if (!selectedCat) { document.getElementById('err-cat').classList.add('on'); ok=false; }
  if (!selectedUrg) { document.getElementById('err-urg').classList.add('on'); ok=false; }
  const title = document.getElementById('f-title').value.trim();
  if (!title) { document.getElementById('err-title').classList.add('on'); ok=false; }
  if (!ok) return;
  if (!db) { alert('Firebase no está configurado.'); return; }
  if (formPhotos.some(p=>p.uploading)) { alert('Espera a que terminen de subirse las fotos.'); return; }

  const btn = document.getElementById('submit-btn');
  btn.disabled = true; document.getElementById('submit-txt').textContent = 'Registrando...';

  const report = {
    createdAt: new Date().toISOString(),
    category: selectedCat, urgency: selectedUrg, title,
    description: document.getElementById('f-desc').value.trim(),
    zone: document.getElementById('f-zone').value.trim(),
    photos: formPhotos.map(p => p.url),
    reportedToGestora: gestoraOn,
    reportedDate: gestoraOn ? (document.getElementById('f-gdate').value||null) : null,
    gestoraResponse: gestoraOn ? document.getElementById('f-gresp').value.trim() : '',
    gestoraPhoto: gestoraOn ? (gestoraPhotoUrl || null) : null,
    isRecurring: recurOn, status: 'nuevo', updates: []
  };

  try {
    await db.collection('reports').add(report);
    resetForm();
    const t = document.getElementById('toast');
    t.style.display='flex'; setTimeout(()=>{t.style.display='none';},5000);
    showTab('list');
  } catch(err) {
    alert('Error al guardar. Inténtalo de nuevo.\n'+err.message);
    btn.disabled=false; document.getElementById('submit-txt').textContent='📤 Registrar incidencia';
  }
});

function resetForm() {
  document.getElementById('report-form').reset();
  selectedCat=''; selectedUrg=''; formPhotos=[]; gestoraOn=false; recurOn=false;
  document.querySelectorAll('.pill.on').forEach(p=>p.classList.remove('on'));
  document.getElementById('tog-gestora').classList.remove('on');
  document.getElementById('gestora-fields').classList.remove('on');
  gestoraPhotoUrl = null;
  document.getElementById('gestora-photo-preview').style.display = 'none';
  document.getElementById('gestora-photo-lbl').textContent = 'Adjuntar captura del correo (opcional)';
  document.getElementById('tog-recur').classList.remove('on');
  renderPhotoThumbs();
  document.getElementById('submit-btn').disabled=false;
  document.getElementById('submit-txt').textContent='📤 Registrar incidencia';
}

// ── Lista ────────────────────────────────────────────────────
function setFilter(el,f) {
  document.querySelectorAll('.fbtn').forEach(b=>b.classList.remove('on'));
  el.classList.add('on'); currentFilter=f; renderList();
}
window.setFilter = setFilter;

function getFiltered() {
  if (currentFilter==='all') return allReports;
  if (currentFilter==='urgente') return allReports.filter(r=>r.urgency==='urgente');
  return allReports.filter(r=>r.status===currentFilter);
}
function updateStats() {
  document.getElementById('s-total').textContent = allReports.length;
  document.getElementById('s-open').textContent = allReports.filter(r=>r.status!=='resuelto').length;
  document.getElementById('s-rep').textContent = allReports.filter(r=>r.reportedToGestora).length;
  document.getElementById('s-done').textContent = allReports.filter(r=>r.status==='resuelto').length;
  if (isAdmin) {
    document.getElementById('a-total').textContent = allReports.length;
    document.getElementById('a-nuevo').textContent = allReports.filter(r=>r.status==='nuevo').length;
    document.getElementById('a-urgente').textContent = allReports.filter(r=>r.urgency==='urgente').length;
    document.getElementById('a-resuelto').textContent = allReports.filter(r=>r.status==='resuelto').length;
  }
}
function updateBadge() { document.getElementById('count-badge').textContent = allReports.length; }

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
}

function renderList() {
  const list = getFiltered(), cont = document.getElementById('list-content');
  if (!list.length) {
    cont.innerHTML = `<div class="empty"><div class="empty-ico">📋</div><h3>Sin incidencias</h3><p>${currentFilter==='all'?'Sé el primero en registrar una incidencia.':'No hay incidencias con este filtro.'}</p></div>`;
    return;
  }
  cont.innerHTML = list.map(r=>cardHTML(r,false)).join('');
}

function renderAdminList() {
  const cont = document.getElementById('admin-list-content');
  if (!allReports.length) { cont.innerHTML='<p style="font-size:13px;color:var(--muted)">No hay incidencias.</p>'; return; }
  cont.innerHTML = allReports.map(r=>cardHTML(r,true)).join('');
  updateStats();
}

function cardHTML(r, admin) {
  const pRow = r.photos&&r.photos.length
    ? `<div class="prow">${r.photos.map(p=>`<img class="pthumb" src="${p}" onclick="openPhotoModal('${p}')" alt="foto">`).join('')}</div>` : '';
  const tags = [
    r.reportedToGestora ? `<span class="tag t-rep">📞 Reportado</span>` : '',
    r.isRecurring ? `<span class="tag t-rec">🔁 Recurrente</span>` : '',
    r.photos&&r.photos.length ? `<span class="tag t-photo">📷 ${r.photos.length}</span>` : ''
  ].filter(Boolean).join('');
  const updList = r.updates&&r.updates.length
    ? `<ul class="updates">${r.updates.map(u=>`<li><div class="upd-date">${fmtDate(u.date)}</div>${escHtml(u.text)}</li>`).join('')}</ul>`
    : '<p style="font-size:13px;color:var(--faint)">Sin actualizaciones.</p>';
  const gestInfo = r.reportedToGestora
    ? `<div class="gest-info">${r.reportedDate?`<strong>Reportado el</strong> ${new Date(r.reportedDate).toLocaleDateString('es-ES',{day:'2-digit',month:'long',year:'numeric'})}<br>`:''}${r.gestoraResponse?`<strong>Respuesta:</strong> ${escHtml(r.gestoraResponse)}`:'<em>Sin respuesta registrada</em>'}${r.gestoraPhoto?`<br><a href="${r.gestoraPhoto}" target="_blank"><img src="${r.gestoraPhoto}" style="margin-top:8px;max-width:100%;max-height:160px;object-fit:contain;border-radius:6px;border:1.5px solid var(--border-l);display:block"></a>`:''}}</div>`
    : '<p style="font-size:13px;color:var(--faint)">No comunicado a la gestora.</p>';
  const delBtn = admin ? `<button class="btn-danger" onclick="deleteReport('${r.id}')" style="padding:4px 10px;font-size:12px">🗑️ Eliminar</button>` : '';
  return `<div class="rcard">
  <div class="ubar ${r.urgency}"></div>
  <div class="rbody">
    <div class="rmeta">
      <div><div class="rcat">${CAT_LABELS[r.category]||r.category}</div>${r.zone?`<div class="rzone">📍 ${escHtml(r.zone)}</div>`:''}</div>
      <span class="spill s-${r.status}">${STATUS_LABELS[r.status]||r.status}</span>
    </div>
    <div class="rtitle">${escHtml(r.title)}</div>
    ${r.description?`<div class="rdesc">${escHtml(r.description)}</div>`:''}
    ${pRow}
    <div class="rfoot"><span class="rdate">🕐 ${fmtDate(r.createdAt)}</span><div class="rtags">${tags}</div></div>
    <div class="card-actions">
      <button class="exp-btn" onclick="toggleDetail('${r.id}')">Ver detalles ▾</button>
      ${delBtn}
    </div>
  </div>
  <div class="rdetail" id="det-${r.id}">
    <div class="dlbl" style="margin-top:14px">Gestora</div>${gestInfo}
    <div class="dlbl">Actualizaciones</div>${updList}
    <div class="upd-form">
      <input type="text" id="upd-inp-${r.id}" placeholder="Añadir seguimiento..." maxlength="300">
      <button class="btn-s" onclick="addUpdate('${r.id}')">Añadir</button>
    </div>
    <div class="status-row">
      <label>Estado:</label>
      <select class="ssel" onchange="changeStatus('${r.id}',this.value)">
        <option value="nuevo" ${r.status==='nuevo'?'selected':''}>Nuevo</option>
        <option value="reportado" ${r.status==='reportado'?'selected':''}>Reportado a gestora</option>
        <option value="en_proceso" ${r.status==='en_proceso'?'selected':''}>En proceso</option>
        <option value="resuelto" ${r.status==='resuelto'?'selected':''}>Resuelto ✅</option>
        <option value="sin_resolver" ${r.status==='sin_resolver'?'selected':''}>Sin resolver ❌</option>
      </select>
    </div>
  </div>
</div>`;
}

function toggleDetail(id) {
  const el = document.getElementById('det-'+id);
  el.classList.toggle('on');
  document.querySelectorAll(`[onclick="toggleDetail('${id}')"]`).forEach(b=>
    b.textContent = el.classList.contains('on') ? 'Ocultar ▴' : 'Ver detalles ▾');
}
window.toggleDetail = toggleDetail;

async function addUpdate(id) {
  const inp = document.getElementById('upd-inp-'+id);
  const txt = inp.value.trim();
  if (!txt||!db) return;
  const r = allReports.find(r=>r.id===id); if (!r) return;
  inp.value = '';
  await db.collection('reports').doc(id).update({ updates: [...(r.updates||[]),{date:new Date().toISOString(),text:txt}] }).catch(console.error);
}
window.addUpdate = addUpdate;

async function changeStatus(id, status) {
  if (!db) return;
  await db.collection('reports').doc(id).update({status}).catch(console.error);
}
window.changeStatus = changeStatus;

async function deleteReport(id) {
  if (!isAdmin||!db) return;
  if (!confirm('¿Eliminar esta incidencia? Esta acción no se puede deshacer.')) return;
  await db.collection('reports').doc(id).delete().catch(console.error);
}
window.deleteReport = deleteReport;

async function bulkStatus(from, to) {
  if (!isAdmin||!db) return;
  const targets = allReports.filter(r=>r.status===from);
  if (!targets.length) { alert(`No hay incidencias con estado "${STATUS_LABELS[from]}"`); return; }
  if (!confirm(`¿Cambiar ${targets.length} incidencia(s) de "${STATUS_LABELS[from]}" a "${STATUS_LABELS[to]}"?`)) return;
  await Promise.all(targets.map(r=>db.collection('reports').doc(r.id).update({status:to}).catch(console.error)));
}
window.bulkStatus = bulkStatus;

// ── Admin ────────────────────────────────────────────────────
function showPinModal() {
  document.getElementById('pin-input').value='';
  document.getElementById('pin-err').textContent='';
  document.getElementById('pin-modal').classList.add('on');
  setTimeout(()=>document.getElementById('pin-input').focus(),100);
}
window.showPinModal = showPinModal;

function hidePinModal() { document.getElementById('pin-modal').classList.remove('on'); }
window.hidePinModal = hidePinModal;

document.getElementById('pin-input').addEventListener('keydown', e=>{if(e.key==='Enter')checkPin();});

function checkPin() {
  const entered = document.getElementById('pin-input').value.trim();
  if (!entered) { document.getElementById('pin-err').textContent='Introduce el PIN'; return; }
  if (entered===adminPin) {
    hidePinModal();
    isAdmin=true; sessionStorage.setItem('rv_admin','1');
    applyAdminUI();
  } else {
    document.getElementById('pin-err').textContent='PIN incorrecto. Inténtalo de nuevo.';
    document.getElementById('pin-input').value='';
    document.getElementById('pin-input').focus();
  }
}
window.checkPin = checkPin;

function applyAdminUI() {
  document.getElementById('admin-badge').style.display='flex';
  document.getElementById('tab-admin').style.display='flex';
  requestAnimationFrame(() => { adjustHeaderOffset(); showTab('admin'); });
}

function lockAdmin() {
  isAdmin=false; sessionStorage.removeItem('rv_admin');
  document.getElementById('admin-badge').style.display='none';
  document.getElementById('tab-admin').style.display='none';
  requestAnimationFrame(adjustHeaderOffset);
  showTab('list');
}
window.lockAdmin = lockAdmin;

async function changePin() {
  if (!isAdmin||!db) return;
  const newPin = document.getElementById('new-pin').value.trim();
  const errEl = document.getElementById('pin-change-err');
  if (newPin.length<4) { errEl.textContent='El PIN debe tener al menos 4 caracteres'; return; }
  errEl.textContent='';
  try {
    await db.collection('config').doc('settings').set({adminPin:newPin});
    adminPin=newPin; document.getElementById('new-pin').value='';
    errEl.style.color='var(--success)'; errEl.textContent='✅ PIN actualizado';
    setTimeout(()=>{errEl.textContent='';errEl.style.color='';},3000);
  } catch(e) { errEl.textContent='Error al guardar: '+e.message; }
}
window.changePin = changePin;

// ── Foto modal ───────────────────────────────────────────────
function openPhotoModal(src) {
  document.getElementById('modal-img').src=src;
  document.getElementById('photo-modal').classList.add('on');
}
window.openPhotoModal = openPhotoModal;

function closePhotoModal() { document.getElementById('photo-modal').classList.remove('on'); }
window.closePhotoModal = closePhotoModal;

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

init();

// ── Impresión PDF ────────────────────────────────────────────
function printReports(modo) {
  const ahora = new Date().toLocaleDateString('es-ES',{day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'});
  let registros = [...allReports].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  let tituloFiltro = 'Todos los registros';
  if (modo === 'pendientes') {
    registros = registros.filter(r => r.status !== 'resuelto');
    tituloFiltro = 'Registros pendientes';
  } else if (modo === 'gestora') {
    registros = registros.filter(r => r.reportedToGestora);
    tituloFiltro = 'Reportados a Avalon';
  }

  const tarjetas = registros.map(r => {
    const fecha = new Date(r.createdAt).toLocaleDateString('es-ES',{day:'2-digit',month:'long',year:'numeric'});
    const hora  = new Date(r.createdAt).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
    const fotos = r.photos && r.photos.length
      ? `<div class="pv-photos">${r.photos.map(p=>`<img src="${p}" alt="foto">`).join('')}</div>` : '';
    let gestoraHtml = '';
    if (r.reportedToGestora) {
      const fechaGest = r.reportedDate ? new Date(r.reportedDate).toLocaleDateString('es-ES',{day:'2-digit',month:'long',year:'numeric'}) : null;
      gestoraHtml = `<div class="pv-gestora">
        <strong>📞 Reportado a Avalon</strong>${fechaGest ? ` el ${fechaGest}` : ''}<br>
        ${r.gestoraResponse ? escHtml(r.gestoraResponse) : '<em>Sin respuesta registrada</em>'}
        ${r.gestoraPhoto ? `<img src="${r.gestoraPhoto}" alt="captura correo">` : ''}
      </div>`;
    }
    const urgClass = r.urgency === 'urgente' ? 'pv-urg-urgente' : r.urgency === 'moderado' ? 'pv-urg-moderado' : '';
    return `<div class="pv-card ${urgClass}">
      <div class="pv-card-header">
        <span class="pv-cat">${CAT_LABELS[r.category]||r.category}</span>
        <span class="pv-status s-${r.status}">${STATUS_LABELS[r.status]||r.status}</span>
      </div>
      <div class="pv-title">${escHtml(r.title)}</div>
      <div class="pv-meta">📅 ${fecha} · ${hora}${r.zone ? ` · 📍 ${escHtml(r.zone)}` : ''}${r.isRecurring ? ' · 🔁 Recurrente' : ''}</div>
      ${r.description ? `<div class="pv-desc">${escHtml(r.description)}</div>` : ''}
      ${fotos}
      ${gestoraHtml}
    </div>`;
  }).join('');

  document.getElementById('print-view').innerHTML = `
    <div class="pv-header">
      <h1>Comunidad Julia Sanz 3 — ${tituloFiltro}</h1>
      <p>Generado el ${ahora} · ${registros.length} registro${registros.length!==1?'s':''}</p>
    </div>
    ${tarjetas || '<p style="color:#888">No hay registros con este filtro.</p>'}`;

  window.print();
}
window.printReports = printReports;
