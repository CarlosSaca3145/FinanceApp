# 📦 Exportación de Brand Campaign Manager

## Archivos Disponibles

He creado **2 archivos** de exportación para ti:

### 1. `brand-campaign-manager-complete.tar.gz` (164 KB) ⭐ RECOMENDADO
**Este es el archivo completo que debes descargar**

Incluye:
- ✅ Todo el código fuente de la aplicación
- ✅ Guía de instalación completa (`INSTALLATION_GUIDE.md`)
- ✅ Archivo de ejemplo para variables de entorno (`.env.example`)
- ✅ Configuraciones del proyecto
- ✅ Documentación

### 2. `brand-campaign-manager-export.tar.gz` (162 KB)
Solo código fuente (sin documentación adicional)

---

## 🚀 Cómo Usar el Export

### Paso 1: Descargar el Archivo
Descarga `brand-campaign-manager-complete.tar.gz` a tu computadora local

### Paso 2: Extraer en tu Nueva Plataforma

```bash
# Extraer archivos
tar -xzf brand-campaign-manager-complete.tar.gz

# Entrar al directorio
cd brand-campaign-manager
```

### Paso 3: Seguir la Guía de Instalación
Lee el archivo `INSTALLATION_GUIDE.md` que está incluido en el export

---

## 📋 Contenido del Export (101 archivos)

```
brand-campaign-manager/
├── 📂 client/                    # Frontend React
│   ├── src/
│   │   ├── components/          # Componentes UI
│   │   ├── pages/               # Páginas (Dashboard, Brands, Templates)
│   │   ├── lib/                 # Utilidades y API
│   │   └── hooks/               # React hooks
│   ├── index.html
│   └── index.css
│
├── 📂 server/                    # Backend Express
│   ├── index.ts                 # Servidor principal
│   ├── routes.ts                # Rutas API
│   ├── storage.ts               # Capa de datos
│   ├── services/
│   │   ├── email.ts             # Servicio de emails
│   │   └── openai.ts            # Integración AI
│   └── db/
│       └── index.ts             # Conexión DB
│
├── 📂 shared/
│   └── schema.ts                # Esquema de base de datos
│
├── 📄 package.json              # Dependencias
├── 📄 tsconfig.json             # Config TypeScript
├── 📄 vite.config.ts            # Config Vite
├── 📄 tailwind.config.ts        # Config Tailwind
├── 📄 drizzle.config.ts         # Config Drizzle ORM
│
├── 📄 INSTALLATION_GUIDE.md     # Guía de instalación
└── 📄 .env.example              # Ejemplo variables de entorno
```

---

## 🔧 Requisitos del Sistema

Para ejecutar la aplicación en otra plataforma necesitas:

- **Node.js** v18 o superior
- **PostgreSQL** database
- **npm** o **yarn**

---

## 🌐 Plataformas Compatibles

Esta aplicación puede ejecutarse en:

- ✅ **Local** (tu computadora)
- ✅ **Vercel** 
- ✅ **Heroku**
- ✅ **Railway**
- ✅ **Render**
- ✅ **DigitalOcean**
- ✅ **AWS / GCP / Azure**
- ✅ **Cualquier servidor con Node.js**

---

## 📥 Cómo Descargar desde Replit

### Opción 1: Desde la Terminal de Replit
1. Haz clic derecho en el archivo `brand-campaign-manager-complete.tar.gz`
2. Selecciona "Download"

### Opción 2: Usando la Shell
```bash
# Esto te dará el enlace para descargar
echo "Descarga: $(pwd)/brand-campaign-manager-complete.tar.gz"
```

---

## ✅ Lo Que Está Incluido

Tu aplicación exportada incluye:

- ✅ Sistema completo de gestión de campañas
- ✅ Dashboard con estadísticas
- ✅ CRUD de marcas (crear, leer, actualizar, eliminar)
- ✅ Gestión de templates de contenido
- ✅ Composer de emails con IA
- ✅ Import/Export Excel
- ✅ Diseño responsive (móvil/tablet/desktop)
- ✅ Integración OpenAI GPT-5
- ✅ Sistema de emails con Nodemailer
- ✅ Base de datos PostgreSQL con Drizzle ORM

---

## 🔐 Importante: Variables de Entorno

Cuando instales en otra plataforma, recuerda configurar:

```env
DATABASE_URL=postgresql://...        # Tu base de datos
EMAIL_USER=tu-email@gmail.com        # Para enviar emails
EMAIL_PASSWORD=tu-app-password       # App password de Gmail
OPENAI_API_KEY=sk-...               # Para funciones AI (opcional)
```

Usa el archivo `.env.example` incluido como referencia.

---

## 📞 Soporte Post-Migración

Si tienes problemas al instalar en otra plataforma:

1. ✅ Verifica que Node.js esté instalado: `node --version`
2. ✅ Verifica que PostgreSQL esté disponible
3. ✅ Lee la guía `INSTALLATION_GUIDE.md` completa
4. ✅ Revisa que las variables de entorno estén configuradas

---

## 🎉 ¡Todo Listo!

Ya puedes llevar tu aplicación a cualquier plataforma. El archivo **`brand-campaign-manager-complete.tar.gz`** contiene todo lo que necesitas.

**¡Buena suerte con tu migración!** 🚀
