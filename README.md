# Registro Vecinal — Comunidad Julia Sanz

Aplicación web anónima para registrar incidencias de la comunidad (jardinería, limpieza, piscina, mantenimiento...). Gratuita, sin servidor propio.

| Servicio | Para qué | Plan gratuito |
|---|---|---|
| **Firebase Firestore** | Base de datos | 1 GB, 50K lecturas/día |
| **Cloudinary** | Almacenamiento de fotos | 25 GB/mes |
| **Render** | Hosting web | Sitios estáticos ilimitados |

---

## Paso 1 — Firebase (base de datos)

1. Ve a [console.firebase.google.com](https://console.firebase.google.com) → **Agregar proyecto**
2. **Compilación → Firestore Database → Crear base de datos**  
   → Modo de prueba → Ubicación `europe-west` → Listo
3. **⚙️ Configuración del proyecto → `</>` Web** → registra la app → copia el objeto `firebaseConfig`

### Reglas de seguridad de Firestore

**Firestore → Reglas** → pega esto → **Publicar**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

---

## Paso 2 — Cloudinary (fotos)

1. Entra en [cloudinary.com/console](https://cloudinary.com/console)
2. Anota tu **Cloud name** (arriba a la izquierda en el dashboard)
3. Ve a **Settings → Upload → Upload presets → Add upload preset**
   - Signing mode: **Unsigned**
   - Folder: `comunidad_julia_sanz` (opcional)
   - Guarda → anota el nombre del preset

---

## Paso 3 — Configurar index.html

Abre `index.html` y rellena las dos secciones al principio:

```javascript
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyAbc123...",
  authDomain:        "mi-proyecto.firebaseapp.com",
  projectId:         "mi-proyecto",
  storageBucket:     "mi-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123:web:abc..."
};

const CLOUDINARY_CONFIG = {
  cloudName:    "mi-cloud-name",
  uploadPreset: "mi-preset-sin-firmar"
};
```

---

## Paso 4 — Subir cambios a GitHub

```bash
git add .
git commit -m "Configurar Firebase y Cloudinary"
git push
```

---

## Paso 5 — Hosting en Render

1. Ve a [render.com](https://render.com) → **New → Static Site**
2. Conecta tu cuenta de GitHub y selecciona el repositorio `comunidad_Julia_Sanz`
3. Configura:
   - **Name:** `comunidad-julia-sanz` (o el que quieras)
   - **Branch:** `main`
   - **Build Command:** *(dejar vacío)*
   - **Publish Directory:** `.`
4. Pulsa **Create Static Site**

En 1-2 minutos tendrás la web en:
```
https://comunidad-julia-sanz.onrender.com
```
Esa URL es la que compartes con los vecinos. Sin dominio, sin coste.

> Cada vez que hagas `git push`, Render re-despliega automáticamente.

---

## Uso

### Vecinos normales
Abrir el enlace → rellenar el formulario → enviar. Las fotos se suben automáticamente a Cloudinary al seleccionarlas.

### Administradores
Abrir el enlace → pie de página → **"Acceso administradores"**  
PIN inicial: **`vecinos2024`** — cámbialo desde el panel **🔑 Gestión** nada más entrar.

---

## Características

- ✅ 100% anónimo — sin login ni datos personales
- ✅ Fotos almacenadas en Cloudinary (URLs, no base64)
- ✅ Categorías: jardinería, limpieza, piscina, mantenimiento, iluminación, zonas comunes, portería
- ✅ Urgencia: leve / moderado / urgente
- ✅ Estado: Nuevo → Reportado → En proceso → Resuelto
- ✅ Registro de comunicaciones con la gestora
- ✅ Actualizaciones de seguimiento por incidencia
- ✅ Marcador de reincidencia
- ✅ Panel admin protegido por PIN (borrado, acciones masivas, cambio de PIN)
- ✅ Exportación CSV para juntas de vecinos
- ✅ Tiempo real — todos los vecinos ven los cambios al instante
- ✅ Responsive — funciona en móvil
