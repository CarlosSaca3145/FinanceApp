# Brand Campaign Manager - Guía de Instalación

## 📦 Contenido del Export

Este archivo contiene todo el código fuente de tu aplicación **Brand Campaign Manager**.

## 🚀 Instalación en Otra Plataforma

### Requisitos Previos

- **Node.js** v18 o superior
- **PostgreSQL** database
- **npm** o **yarn**

### Paso 1: Extraer Archivos

```bash
tar -xzf brand-campaign-manager-export.tar.gz
cd brand-campaign-manager
```

### Paso 2: Instalar Dependencias

```bash
npm install
```

### Paso 3: Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# Base de datos PostgreSQL
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/nombre_db

# Email Configuration (Gmail)
EMAIL_USER=tu-email@gmail.com
EMAIL_PASSWORD=tu-app-password

# OpenAI API (opcional para funciones AI)
OPENAI_API_KEY=tu-openai-api-key

# Puerto del servidor (opcional, default: 5000)
PORT=5000
```

### Paso 4: Configurar Base de Datos

```bash
# Push schema a la base de datos
npm run db:push
```

### Paso 5: Iniciar la Aplicación

**Desarrollo:**
```bash
npm run dev
```

**Producción:**
```bash
npm run build
npm start
```

La aplicación estará disponible en `http://localhost:5000`

## 📋 Estructura del Proyecto

```
📦 brand-campaign-manager/
├── 📂 client/          # Frontend React + TypeScript
├── 📂 server/          # Backend Express + Node.js
├── 📂 shared/          # Schemas compartidos (Drizzle ORM)
├── 📄 package.json     # Dependencias
├── 📄 vite.config.ts   # Configuración Vite
├── 📄 tailwind.config.ts
└── 📄 drizzle.config.ts
```

## 🗄️ Base de Datos

La aplicación usa **PostgreSQL** con **Drizzle ORM**. El schema se encuentra en `shared/schema.ts`.

### Tablas principales:
- `brands` - Información de marcas
- `content_templates` - Templates de contenido por nicho
- `followup_templates` - Templates de seguimiento
- `email_logs` - Registro de emails enviados
- `users` - Usuarios del sistema (opcional)

## 🔑 Configuración de Email

### Gmail App Password:
1. Ve a tu cuenta de Google
2. Activa la verificación en 2 pasos
3. Genera una "App Password" en Seguridad
4. Usa esa contraseña en `EMAIL_PASSWORD`

## 🤖 Funcionalidades AI (Opcional)

Si deseas usar las funciones de AI (generación de contenido, sugerencias):
- Obtén una API key de OpenAI: https://platform.openai.com/api-keys
- Configura `OPENAI_API_KEY` en tu `.env`

## 🌐 Despliegue en Producción

### Opciones de hosting:
- **Vercel** (Frontend + API)
- **Heroku** (Full-stack)
- **Railway** (Full-stack)
- **DigitalOcean** (VPS)
- **AWS/GCP/Azure** (Cloud)

### Build para producción:
```bash
npm run build
```

Esto genera archivos optimizados en `dist/`

## 📱 Características Incluidas

✅ Dashboard con estadísticas de campaña
✅ Gestión de marcas (CRUD completo)
✅ Sistema de templates de contenido
✅ Composer de emails con AI
✅ Import/Export Excel
✅ Diseño responsive (móvil/tablet/desktop)
✅ Integración OpenAI para generación de contenido
✅ Sistema de email con Nodemailer

## 🛠️ Scripts Disponibles

```bash
npm run dev          # Desarrollo con hot reload
npm run build        # Build para producción
npm run db:push      # Push schema a database
npm run db:studio    # Drizzle Studio (DB GUI)
```

## 📞 Soporte

Si tienes problemas al migrar la aplicación:
1. Verifica que Node.js y PostgreSQL estén instalados
2. Confirma que las variables de entorno están configuradas
3. Revisa los logs de la aplicación

## 🔄 Actualizaciones

Para actualizar dependencias en el futuro:
```bash
npm update
```

---

**Desarrollado con:**
- React 18 + TypeScript
- Express.js
- PostgreSQL + Drizzle ORM
- TailwindCSS + shadcn/ui
- OpenAI GPT-5
- Nodemailer

¡Buena suerte con tu aplicación! 🚀
