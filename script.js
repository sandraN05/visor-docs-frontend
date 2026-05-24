// ══════════════════════════════════════════════════
//  CONFIGURACIÓN
//  Cuando tengas el backend listo, cambia esta URL
//  por la de tu Spring Boot en Render:
//  const API = 'https://tu-backend.onrender.com/api';
// ══════════════════════════════════════════════════
const API = 'https://visor-docs-backend.onrender.com/api';

// ══════════════════════════════════════════════════
//  VISOR PDF
// ══════════════════════════════════════════════════
function abrirVisor(urlPdf, titulo) {
  const modal    = document.getElementById('visor-modal');
  const iframe   = document.getElementById('visor-iframe');
  const tituloEl = document.getElementById('visor-titulo');

  tituloEl.textContent         = titulo;
  iframe.src                   = urlPdf;  // directo al backend local
  modal.classList.add('activo');
  document.body.style.overflow = 'hidden';
}

function cerrarVisor(event) {
  if (event && event.target !== document.getElementById('visor-modal')) return;
  const modal  = document.getElementById('visor-modal');
  const iframe = document.getElementById('visor-iframe');
  modal.classList.remove('activo');
  iframe.src                   = '';
  document.body.style.overflow = '';
}

// Cerrar con ESC
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') cerrarVisor();
});

// ══════════════════════════════════════════════════
//  FORMATEAR FECHA
// ══════════════════════════════════════════════════
function formatearFecha(fechaStr) {
  const fecha = new Date(fechaStr);
  return fecha.toLocaleDateString('es-PE', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
}

// ══════════════════════════════════════════════════
//  CARGAR DOCUMENTOS — PÁGINA PÚBLICA (index.html)
// ══════════════════════════════════════════════════
async function cargarDocumentos() {
  const cargando = document.getElementById('cargando');
  const sinDocs  = document.getElementById('sinDocs');
  const grid     = document.getElementById('gridDocs');
  if (!grid) return;

  try {
    const res  = await fetch(API + '/documentos');
    const docs = await res.json();

    cargando.style.display = 'none';

    if (docs.length === 0) {
      sinDocs.style.display = 'flex';
      return;
    }

    grid.style.display = 'grid';
    grid.innerHTML = docs.map(function(doc) {
      return `
        <div class="doc-card">
          <div class="doc-portada">📄</div>
          <div class="doc-info">
            <div class="doc-titulo">${doc.titulo}</div>
            <div class="doc-desc">${doc.descripcion || 'Sin descripción'}</div>
            <div class="doc-fecha">📅 ${formatearFecha(doc.fechaSubida)}</div>
            <div class="doc-btns">
              <button class="btn-ver" onclick="abrirVisor('${doc.urlPdf}', '${doc.titulo}')">
                👁 Ver
              </button>
              <a href="${doc.urlPdf}" download class="btn-dl">⬇ Descargar</a>
            </div>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    cargando.style.display = 'none';
    sinDocs.style.display  = 'flex';
    sinDocs.innerHTML      = '<div style="font-size:2rem;">⚠️</div><p>No se pudo conectar con el servidor.<br>Verifica que el backend esté corriendo.</p>';
    console.error('Error al cargar documentos:', err);
  }
}

// ══════════════════════════════════════════════════
//  CARGAR DOCUMENTOS — PANEL ADMIN (admin.html)
// ══════════════════════════════════════════════════
async function cargarDocumentosAdmin() {
  const cargando = document.getElementById('cargandoAdmin');
  const sinDocs  = document.getElementById('sinDocsAdmin');
  const lista    = document.getElementById('listaAdmin');
  if (!lista) return;

  try {
    const res  = await fetch(API + '/documentos');
    const docs = await res.json();

    cargando.style.display = 'none';

    if (docs.length === 0) {
      sinDocs.style.display = 'block';
      return;
    }

    lista.innerHTML = docs.map(function(doc) {
      return `
        <div class="admin-doc-item" id="doc-${doc.id}">
          <div class="admin-doc-info">
            <div class="admin-doc-titulo">📄 ${doc.titulo}</div>
            <div class="admin-doc-fecha">${formatearFecha(doc.fechaSubida)}</div>
          </div>
          <button class="btn-eliminar" onclick="eliminarDocumento(${doc.id})">
            🗑 Eliminar
          </button>
        </div>
      `;
    }).join('');

  } catch (err) {
    cargando.style.display = 'none';
    lista.innerHTML = '<p style="color:#c62828;font-size:0.85rem;">⚠️ No se pudo conectar con el servidor.</p>';
    console.error('Error:', err);
  }
}

// ══════════════════════════════════════════════════
//  SUBIR DOCUMENTO (admin.html)
// ══════════════════════════════════════════════════
async function subirDocumento(e) {
  e.preventDefault();

  const titulo      = document.getElementById('titulo').value.trim();
  const descripcion = document.getElementById('descripcion').value.trim();
  const archivo     = document.getElementById('archivoPdf').files[0];
  const msg         = document.getElementById('uploadMsg');
  const btnSubir    = document.getElementById('btnSubir');
  const btnTexto    = document.getElementById('btnSubirTexto');
  const spinner     = document.getElementById('spinnerSubir');

  if (!archivo) {
    mostrarMsgUpload('⚠️ Selecciona un archivo PDF.', 'error');
    return;
  }

  // Mostrar cargando
  spinner.style.display = 'inline-block';
  btnTexto.textContent  = 'Subiendo...';
  btnSubir.disabled     = true;

  try {
    // Enviar como multipart/form-data al backend
    const formData = new FormData();
    formData.append('titulo',      titulo);
    formData.append('descripcion', descripcion);
    formData.append('archivo',     archivo);

    const res = await fetch(API + '/documentos/subir', {
      method: 'POST',
      // No pongas Content-Type aquí, el browser lo pone solo con el boundary
      headers: {
        'Authorization': 'Bearer ' + sessionStorage.getItem('token') || ''
      },
      body: formData
    });

    if (res.ok) {
      mostrarMsgUpload('✅ Documento subido correctamente.', 'ok');
      document.getElementById('subirForm').reset();
      document.getElementById('fileTexto').textContent = 'Haz clic o arrastra tu PDF aquí';
      document.getElementById('fileDrop').classList.remove('file-ok');
      cargarDocumentosAdmin(); // refrescar la lista
    } else {
      const data = await res.json();
      mostrarMsgUpload('⚠️ Error: ' + (data.mensaje || 'No se pudo subir.'), 'error');
    }

  } catch (err) {
    mostrarMsgUpload('⚠️ No se pudo conectar con el servidor.', 'error');
    console.error('Error al subir:', err);
  } finally {
    spinner.style.display = 'none';
    btnTexto.textContent  = '📤 Subir documento';
    btnSubir.disabled     = false;
  }
}

function mostrarMsgUpload(texto, tipo) {
  const msg = document.getElementById('uploadMsg');
  msg.textContent  = texto;
  msg.className    = 'upload-msg ' + tipo;
  msg.style.display = 'block';
  setTimeout(function() { msg.style.display = 'none'; }, 4000);
}

// ══════════════════════════════════════════════════
//  ELIMINAR DOCUMENTO (admin.html)
// ══════════════════════════════════════════════════
async function eliminarDocumento(id) {
  if (!confirm('¿Seguro que quieres eliminar este documento?')) return;

  try {
    const res = await fetch(API + '/documentos/' + id, {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer ' + sessionStorage.getItem('token') || ''
      }
    });

    if (res.ok) {
      // Quitar el item del DOM sin recargar todo
      const item = document.getElementById('doc-' + id);
      if (item) item.remove();
    } else {
      alert('No se pudo eliminar el documento.');
    }
  } catch (err) {
    alert('Error de conexión.');
    console.error(err);
  }
}
