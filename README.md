# INFINITY STUDIO — Barber Scheduling Platform

Esta es una completa aplicación web full-stack de reserva de horas diseñada para **INFINITY STUDIO**, la barbería de **Emmanuel Rojas**.

---

## 🎨 Características Clave

### 1. Portal de Clientes
* **Servicios Premium:** Catálogo interactivo de servicios con precios y duraciones reales.
* **Control de Disponibilidad:** Buscador en tiempo real de turnos libres para una fecha en formato local, descartando horas bloqueadas o previamente ocupadas.
* **Confirmación Directa a WhatsApp:** Al confirmar la reserva, la cita se registra en base de datos SQLite y se abre la API de WhatsApp con un mensaje pre-formateado que contiene todos los detalles para evitar cargas infinitas. Un botón de respaldo destacado garantiza el envío si el navegador bloquea las ventanas emergentes.

### 2. Panel Administrativo (Emmanuel Rojas)
* **Ingreso Seguro sin Contraseñas:** Magic link que solo autoriza el correo `emmanuel.rojas@infinity.cl` emitiendo un Token JWT seguro válido por 24 horas.
* **Consola de Desarrollo Activa:** El enlace es impreso en consola en modo de desarrollo y devuelto en la interfaz de pruebas de AI Studio para facilitar el testeo inmediato.
* **Estadísticas de Negocio en Tiempo Real:** Contadores de citas recibidas hoy, en la semana y en el mes utilizando la zona horaria real de Santiago (`America/Santiago`) para evitar conflictos de fechas UTC en servidores remotos.
* **Gráficos Interactivos (Recharts):**
  * Gráfico de Área que muestra el volumen de reservas en los últimos 7 días.
  * Gráfico de Barras con la distribución de servicios más solicitados.
* **Consola de Acciones de Reserva:** Tabla con buscador y filtros para alternar estados (`Pendiente`, `Completado`, `Cancelado`) de inmediato.

---

## 📦 Estructura del Código

```
├── /server.ts             # Servidor Express + SQLite + JWT Middleware + Vite de desarrollo
├── /src
│   ├── /components
│   │   ├── ClientPortal.tsx    # Interfaz del portal de clientes
│   │   ├── AdminLogin.tsx      # Gestión de autenticación mágica
│   │   └── AdminDashboard.tsx  # Panel con métricas, gráficos e historial
│   ├── App.tsx            # Enrutador principal y cascarón visual
│   ├── types.ts           # Definiciones estrictas de TypeScript
│   ├── servicesData.ts    # Catálogo de servicios de la barbería
│   ├── index.css          # Estilos TailindCSS v4 y fuentes Premium (Outfit, Inter)
│   └── main.tsx           # Punto de entrada de React
├── /package.json          # Dependencias y scripts de compilación dual (frontend & backend)
└── /vite.config.ts        # Configuración del empaquetador Vite
```

---

## 🚀 Instrucciones para Ejecución Local

### Paso 1: Instalar dependencias
Las dependencias requeridas ya están instaladas en el contenedor, pero si clonas el proyecto localmente ejecuta:
```bash
npm install
```

### Paso 2: Configurar las variables de entorno
Crea un archivo `.env` en la raíz (puedes basarte en el `.env.example` incluido):
```env
# Teléfono del barbero (ej. +56946346791)
BARBER_PHONE="+56946346791"

# Firma secreta JWT
JWT_SECRET="mi_firma_secreta_para_jsonwebtoken"

# Correo autorizado del Administrador
ADMIN_EMAIL="emmanuel.rojas@infinity.cl"

# Configuración SMTP opcional para envío real en producción:
SMTP_HOST=""
SMTP_PORT=""
SMTP_USER=""
SMTP_PASS=""
```

### Paso 3: Ejecutar en Desarrollo
Inicia el servidor conjunto de React + Node corriendo:
```bash
npm run dev
```
La aplicación estará disponible inmediatamente en `http://localhost:3000`.

---

## ☁️ Instrucciones de Despliegue en Google Cloud Run

Dado que hemos configurado un build unificado en `package.json` utilizando `esbuild` para empaquetar el servidor de backend en un único archivo CJS robusto compatible con Node, el despliegue es sumamente sencillo:

### Paso 1: Compilar la aplicación para producción
El script de build compilará el frontend estático a la carpeta `dist/` y empaquetará `server.ts` con esbuild en `dist/server.cjs`:
```bash
npm run build
```

### Paso 2: Crear un contenedor Dockerfile básico
Crea un archivo `Dockerfile` en el directorio raíz de tu proyecto para Cloud Run:
```dockerfile
# Dockerfile para Cloud Run
FROM node:18-slim

WORKDIR /app

# Copia los manifiestos de dependencias
COPY package*.json ./

# Instala únicamente las dependencias de producción (omitiendo devDependencies)
RUN npm ci --only=production

# Copia los archivos finales compilados
COPY dist ./dist/
COPY infinity_studio.db .env ./

# Configura variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000

# Expone el puerto por defecto de Cloud Run
EXPOSE 3000

# Comando para iniciar el bundle compilado
CMD ["npm", "start"]
```

### Paso 3: Desplegar en Google Cloud con gcloud CLI
Ejecuta el siguiente comando en tu terminal para compilar la imagen en Cloud Build de forma remota y levantar el servicio en producción de Cloud Run:
```bash
gcloud run deploy infinity-studio \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,BARBER_PHONE=+56946346791,JWT_SECRET=tu_secreto,ADMIN_EMAIL=emmanuel.rojas@infinity.cl"
```

El asistente configurará la base de datos local SQLite y servirá los activos listos y optimizados para Emmanuel en minutos.
