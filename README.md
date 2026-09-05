# Registro Vecinal — Comunidad Julia Sanz

Aplicación web anónima para registrar incidencias de la comunidad (jardinería, limpieza, piscina, mantenimiento...). Completamente gratuita, sin servidor propio — usa Firebase como base de datos y GitHub Pages como hosting.

**URL pública:** `https://TU_USUARIO.github.io/comunidad_Julia_Sanz/`

---

## Paso 1 — Crear la base de datos en Firebase

1. Ve a [console.firebase.google.com](https://console.firebase.google.com)
2. Pulsa **"Agregar proyecto"** → dale un nombre (ej: `comunidad-julia-sanz`) → Continuar
3. Desactiva Google Analytics si quieres → **Crear proyecto**

### Activar Firestore (la base de datos)

4. En el menú izquierdo: **Compilación → Firestore Database**
5. Pulsa **"Crear base de datos"**
6. Elige **"Comenzar en modo de prueba"** → siguiente
7. Selecciona la ubicación `europe-west` → **Listo**

### Obtener las credenciales

8. En el menú izquierdo: **⚙️ Configuración del proyecto**
9. Baja hasta **"Tus aplicaciones"** → pulsa el icono **`</>`** (Web)
10. Dale un nombre (ej: `web`) → **Registrar aplicación**
11. Verás un bloque de código con `firebaseConfig`. Cópialo.

---

## Paso 2 — Configurar el archivo index.html

Abre `index.html` y busca esta sección al principio:

```javascript
const FIREBASE_CONFIG = {
  apiKey:            "TU_API_KEY",
  authDomain:        "TU_PROYECTO.firebaseapp.com",
  projectId:         "TU_PROYECTO",
  ...
};
```

Reemplaza los valores con los que copiaste de Firebase. Ejemplo real:

```javascript
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyAbc123...",
  authDomain:        "comunidad-julia-sanz.firebaseapp.com",
  projectId:         "comunidad-julia-sanz",
  storageBucket:     "comunidad-julia-sanz.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123..."
};
```

---

## Paso 3 — Configurar las reglas de seguridad de Firestore

En Firebase Console → **Firestore Database → Reglas**, pega esto y pulsa **Publicar**:

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

> Esto permite que cualquier vecino con el enlace pueda leer y escribir, que es lo que queremos para una app anónima de comunidad. El panel admin está protegido por PIN.

---

## Paso 4 — Subir a GitHub

### Si es la primera vez

```bash
git init
git add .
git commit -m "Primera versión"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/comunidad_Julia_Sanz.git
git push -u origin main
```

### Para actualizar después

```bash
git add .
git commit -m "Descripción del cambio"
git push
```

---

## Paso 5 — Activar GitHub Pages (hosting gratuito)

1. En tu repositorio de GitHub → **Settings**
2. Menú lateral izquierdo → **Pages**
3. En "Source" selecciona **"Deploy from a branch"**
4. Branch: **main** / Folder: **/ (root)**
5. Pulsa **Save**

En 1-2 minutos tu web estará disponible en:
```
https://TU_USUARIO.github.io/comunidad_Julia_Sanz/
```

Esa URL es la que compartes con los vecinos. ¡No hace falta dominio!

---

## Uso

### Vecinos normales
- Abrir el enlace → rellenar el formulario → enviar
- Ver el panel "📋 Registros" para ver todas las incidencias

### Administradores
- Abrir el enlace → ir al pie de página → **"Acceso administradores"**
- PIN inicial: **`vecinos2024`** — ¡cámbialo desde el panel admin!
- Acceso al panel **🔑 Gestión** con: borrado, acciones masivas, cambio de PIN

---

## Características

- ✅ 100% anónimo (sin login, sin datos personales)
- ✅ Fotos adjuntas (hasta 5 por incidencia)
- ✅ Categorías: jardinería, limpieza, piscina, mantenimiento, iluminación, zonas comunes, portería
- ✅ Niveles de urgencia: leve / moderado / urgente
- ✅ Seguimiento del estado: Nuevo → Reportado → En proceso → Resuelto
- ✅ Registro de comunicaciones con la empresa gestora
- ✅ Actualizaciones de seguimiento en cada incidencia
- ✅ Marcador de incidencias reincidentes
- ✅ Panel admin con PIN protegido
- ✅ Exportación a CSV (para juntas de vecinos)
- ✅ Tiempo real: todos los vecinos ven los cambios al instante
- ✅ Funciona en móvil

---

## Coste

| Servicio | Plan gratuito incluye |
|---|---|
| Firebase Firestore | 1 GB almacenamiento, 50.000 lecturas/día, 20.000 escrituras/día |
| GitHub Pages | Hosting ilimitado para proyectos públicos |

Para una comunidad de vecinos normal, **nunca superarás los límites gratuitos**.
