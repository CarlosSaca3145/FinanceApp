# Brand Campaign Manager - Código Completo

## 📋 Tabla de Contenido

1. [Configuración del Proyecto](#configuración-del-proyecto)
2. [Schema de Base de Datos](#schema-de-base-de-datos)
3. [Backend (Server)](#backend-server)
4. [Frontend (Client)](#frontend-client)
5. [Componentes UI](#componentes-ui)
6. [Instalación y Uso](#instalación-y-uso)

---

## Configuración del Proyecto

### package.json
{
  "name": "rest-express",
  "version": "1.0.0",
  "type": "module",
  "license": "MIT",
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "check": "tsc",
    "db:push": "drizzle-kit push"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.10.0",
    "@jridgewell/trace-mapping": "^0.3.25",
    "@neondatabase/serverless": "^0.10.4",
    "@radix-ui/react-accordion": "^1.2.4",
    "@radix-ui/react-alert-dialog": "^1.1.7",
    "@radix-ui/react-aspect-ratio": "^1.1.3",
    "@radix-ui/react-avatar": "^1.1.4",
    "@radix-ui/react-checkbox": "^1.1.5",
    "@radix-ui/react-collapsible": "^1.1.4",
    "@radix-ui/react-context-menu": "^2.2.7",
    "@radix-ui/react-dialog": "^1.1.7",
    "@radix-ui/react-dropdown-menu": "^2.1.7",
    "@radix-ui/react-hover-card": "^1.1.7",
    "@radix-ui/react-label": "^2.1.3",
    "@radix-ui/react-menubar": "^1.1.7",
    "@radix-ui/react-navigation-menu": "^1.2.6",
    "@radix-ui/react-popover": "^1.1.7",
    "@radix-ui/react-progress": "^1.1.3",
    "@radix-ui/react-radio-group": "^1.2.4",
    "@radix-ui/react-scroll-area": "^1.2.4",
    "@radix-ui/react-select": "^2.1.7",
    "@radix-ui/react-separator": "^1.1.3",
    "@radix-ui/react-slider": "^1.2.4",
    "@radix-ui/react-slot": "^1.2.0",
    "@radix-ui/react-switch": "^1.1.4",
    "@radix-ui/react-tabs": "^1.1.4",
    "@radix-ui/react-toast": "^1.2.7",
    "@radix-ui/react-toggle": "^1.1.3",
    "@radix-ui/react-toggle-group": "^1.1.3",
    "@radix-ui/react-tooltip": "^1.2.0",
    "@sendgrid/mail": "^8.1.5",
    "@tanstack/react-query": "^5.60.5",
    "@types/nodemailer": "^7.0.1",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "connect-pg-simple": "^10.0.0",
    "date-fns": "^3.6.0",
    "drizzle-orm": "^0.39.1",
    "drizzle-zod": "^0.7.0",
    "embla-carousel-react": "^8.6.0",
    "express": "^4.21.2",
    "express-session": "^1.18.1",
    "framer-motion": "^11.13.1",
    "input-otp": "^1.4.2",
    "lucide-react": "^0.453.0",
    "memorystore": "^1.6.7",
    "nanoid": "^5.1.5",
    "next-themes": "^0.4.6",
    "nodemailer": "^7.0.6",
    "openai": "^5.22.0",
    "passport": "^0.7.0",
    "passport-local": "^1.0.0",
    "react": "^18.3.1",
    "react-day-picker": "^8.10.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.55.0",
    "react-icons": "^5.4.0",
    "react-resizable-panels": "^2.1.7",
    "recharts": "^2.15.2",
    "tailwind-merge": "^2.6.0",
    "tailwindcss-animate": "^1.0.7",
    "tw-animate-css": "^1.2.5",
    "vaul": "^1.1.2",
    "wouter": "^3.3.5",
    "ws": "^8.18.0",
    "xlsx": "^0.18.5",
    "zod": "^3.24.2",
    "zod-validation-error": "^3.4.0"
  },
  "devDependencies": {
    "@replit/vite-plugin-cartographer": "^0.3.0",
    "@replit/vite-plugin-runtime-error-modal": "^0.0.3",
    "@tailwindcss/typography": "^0.5.15",
    "@tailwindcss/vite": "^4.1.3",
    "@types/connect-pg-simple": "^7.0.3",
    "@types/express": "4.17.21",
    "@types/express-session": "^1.18.0",
    "@types/node": "20.16.11",
    "@types/passport": "^1.0.16",
    "@types/passport-local": "^1.0.38",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.1",
    "@types/ws": "^8.5.13",
    "@vitejs/plugin-react": "^4.3.2",
    "autoprefixer": "^10.4.20",
    "drizzle-kit": "^0.30.4",
    "esbuild": "^0.25.0",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.17",
    "tsx": "^4.19.1",
    "typescript": "5.6.3",
    "vite": "^5.4.19"
  },
  "optionalDependencies": {
    "bufferutil": "^4.0.8"
  }
}

### tsconfig.json
{
  "include": ["client/src/**/*", "shared/**/*", "server/**/*"],
  "exclude": ["node_modules", "build", "dist", "**/*.test.ts"],
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": "./node_modules/typescript/tsbuildinfo",
    "noEmit": true,
    "module": "ESNext",
    "strict": true,
    "lib": ["esnext", "dom", "dom.iterable"],
    "jsx": "preserve",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "allowImportingTsExtensions": true,
    "moduleResolution": "bundler",
    "baseUrl": ".",
    "types": ["node", "vite/client"],
    "paths": {
      "@/*": ["./client/src/*"],
      "@shared/*": ["./shared/*"]
    }
  }
}

### vite.config.ts
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
```

### tailwind.config.ts
```typescript
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono: ["var(--font-mono)"],
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
```

### drizzle.config.ts
```typescript
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
```

---

## Schema de Base de Datos

### shared/schema.ts
```typescript
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const brands = pgTable("brands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  marca: text("marca").notNull(),
  correo: text("correo").notNull(),
  correos: text("correos").array(), // Additional emails array
  contacto: text("contacto"),
  contactos: text("contactos").array(), // Additional contacts array
  nicho: text("nicho").notNull(),
  campania: text("campania"),
  estado: text("estado").default("Pending"),
  fechaEnvio: timestamp("fecha_envio"),
  seguimientoModelo: text("seguimiento_modelo"),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const contentTemplates = pgTable("content_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nicho: text("nicho").notNull().unique(),
  contenido: text("contenido").notNull(),
  idea: text("idea"),
  videoLinks: text("video_links").array(),
  videoTitles: text("video_titles").array(), // Titles for each video link
  videoIdeas: text("video_ideas").array(), // Ideas for each video link
  videoViews: text("video_views").array(), // Views for each video link
  fullTemplate: text("full_template"), // Complete template from Excel
  originalIdea: text("original_idea"), // Extracted original idea
  proposedIdea: text("proposed_idea"), // Extracted proposed idea
  views: text("views"), // Video views metrics
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const followupTemplates = pgTable("followup_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  template: text("template").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const emailLogs = pgTable("email_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  brandId: varchar("brand_id").references(() => brands.id, { onDelete: 'cascade' }),
  recipient: text("recipient").notNull(),
  subject: text("subject").notNull(),
  htmlBody: text("html_body").notNull(),
  status: text("status").notNull(), // sent, failed, pending
  sentAt: timestamp("sent_at").default(sql`now()`),
  error: text("error"),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertBrandSchema = createInsertSchema(brands).omit({
  id: true,
  createdAt: true,
});

export const insertContentTemplateSchema = createInsertSchema(contentTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFollowupTemplateSchema = createInsertSchema(followupTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({
  id: true,
  sentAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertBrand = z.infer<typeof insertBrandSchema>;
export type Brand = typeof brands.$inferSelect;

export type InsertContentTemplate = z.infer<typeof insertContentTemplateSchema>;
export type ContentTemplate = typeof contentTemplates.$inferSelect;

export type InsertFollowupTemplate = z.infer<typeof insertFollowupTemplateSchema>;
export type FollowupTemplate = typeof followupTemplates.$inferSelect;

export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
export type EmailLog = typeof emailLogs.$inferSelect;
```

---

## Backend (Server)

### server/index.ts
```typescript
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
```

### server/vite.ts
```typescript
import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
```

### server/routes.ts
```typescript
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertBrandSchema, 
  insertContentTemplateSchema, 
  insertFollowupTemplateSchema,
  insertEmailLogSchema 
} from "@shared/schema";
import { sendEmail, generateEmailHTML } from "./services/email";
import { OpenAIService, type ContentGenerationOptions } from "./services/openai";
import { z } from "zod";
import fs from 'fs';
import path from 'path';

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Download page route  
  app.get("/descargar", (req, res) => {
    try {
      const htmlPath = path.join(process.cwd(), 'descarga-simple.html');
      const htmlContent = fs.readFileSync(htmlPath, 'utf8');
      res.send(htmlContent);
    } catch (err) {
      res.status(500).send("Error al cargar la página: " + err);
    }
  });

  // Download export route
  app.get("/download-export", (req, res) => {
    const filePath = process.cwd() + "/brand-campaign-manager-complete.tar.gz";
    res.download(filePath, "brand-campaign-manager-complete.tar.gz", (err) => {
      if (err) {
        console.error("Download error:", err);
        res.status(500).send("Error al descargar el archivo");
      }
    });
  });

  // Brands routes
  app.get("/api/brands", async (req, res) => {
    try {
      const brands = await storage.getBrands();
      res.json(brands);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch brands" });
    }
  });

  app.post("/api/brands", async (req, res) => {
    try {
      const brandData = insertBrandSchema.parse(req.body);
      const brand = await storage.createBrand(brandData);
      res.json(brand);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid brand data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create brand" });
      }
    }
  });

  app.put("/api/brands/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const brandData = req.body;
      const brand = await storage.updateBrand(id, brandData);
      
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }
      
      res.json(brand);
    } catch (error) {
      res.status(500).json({ error: "Failed to update brand" });
    }
  });

  app.delete("/api/brands/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteBrand(id);
      
      if (!success) {
        return res.status(404).json({ error: "Brand not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error(`Error deleting brand ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to delete brand" });
    }
  });

  app.get("/api/brands/niches", async (req, res) => {
    try {
      const niches = await storage.getUniqueNiches();
      res.json(niches);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch niches" });
    }
  });

  // Get predefined campaigns
  app.get("/api/brands/campaigns", async (req, res) => {
    try {
      const campaigns = [
        "IFA",
        "MWC", 
        "iPhone",
        "Samsung",
        "BlackFriday",
        "NewYear",
        "NewLaunch"
      ];
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  });

  // Add new niche
  app.post("/api/brands/niches", async (req, res) => {
    try {
      const { nicho, niche, name } = req.body;
      
      // Accept nicho (Spanish), niche (English), or name for compatibility
      const nicheValue = nicho || niche || name;
      
      if (!nicheValue || typeof nicheValue !== 'string') {
        console.log("Failed to add niche - no valid niche name provided:", req.body);
        return res.status(400).json({ error: "Niche name is required" });
      }

      console.log("Adding new niche:", nicheValue);

      // Get existing niches to check for duplicates
      const existingNiches = await storage.getUniqueNiches();
      if (existingNiches.some(n => n.toLowerCase() === nicheValue.trim().toLowerCase())) {
        return res.status(409).json({ error: "Niche already exists" });
      }

      // Create a placeholder content template for the new niche to ensure it appears in the niches list
      try {
        await storage.createContentTemplate({
          nicho: nicheValue.trim(),
          contenido: `Template for ${nicheValue.trim()} niche`,
          idea: `Content ideas for ${nicheValue.trim()}`,
          videoLinks: [],
          videoTitles: [],
          fullTemplate: null,
          originalIdea: null,
          proposedIdea: null,
          views: null
        });
      } catch (error) {
        // Template might already exist, that's ok
        console.log(`Content template for ${nicheValue} might already exist`);
      }

      const updatedNiches = await storage.getUniqueNiches();
      res.json({ nicho: nicheValue.trim(), niches: updatedNiches });
    } catch (error) {
      console.error("Error adding niche:", error);
      res.status(500).json({ error: "Failed to add niche" });
    }
  });

  app.post("/api/content-templates/import-excel", async (req, res) => {
    try {
      const { videoLinks, ideas } = req.body;
      
      console.log("Received import data:", { videoLinks: videoLinks?.length || 0, ideas: ideas?.length || 0 });
      
      // Group imported data by niche
      const nicheData: { [niche: string]: { videoLinks: any[], ideas: string[] } } = {};
      
      if (videoLinks && Array.isArray(videoLinks)) {
        videoLinks.forEach((item: any) => {
          if (item.niche) {
            if (!nicheData[item.niche]) {
              nicheData[item.niche] = { videoLinks: [], ideas: [] };
            }
            nicheData[item.niche].videoLinks.push(item);
          }
        });
      }
      
      if (ideas && Array.isArray(ideas)) {
        ideas.forEach((item: any) => {
          if (item.niche) {
            if (!nicheData[item.niche]) {
              nicheData[item.niche] = { videoLinks: [], ideas: [] };
            }
            nicheData[item.niche].ideas.push(item.idea);
          }
        });
      }
      
      let updated = 0;
      let created = 0;
      
      for (const [niche, data] of Object.entries(nicheData)) {
        try {
          // Check if template exists
          const existingTemplates = await storage.getContentTemplates();
          const existingTemplate = existingTemplates.find((t: any) => 
            t.nicho.toLowerCase() === niche.toLowerCase()
          );
          
          if (existingTemplate) {
            // Update existing template
            const updateData: any = {};
            
            if (data.videoLinks.length > 0) {
              const newLinks = data.videoLinks.map(v => v.link);
              const newTitles = data.videoLinks.map(v => v.title || '');
              const newIdeas = data.videoLinks.map(v => v.ideas || '');
              const newViews = data.videoLinks.map(v => v.views || '');
              
              updateData.videoLinks = [...(existingTemplate.videoLinks || []), ...newLinks];
              updateData.videoTitles = [...(existingTemplate.videoTitles || []), ...newTitles];
              updateData.videoIdeas = [...(existingTemplate.videoIdeas || []), ...newIdeas];
              updateData.videoViews = [...(existingTemplate.videoViews || []), ...newViews];
            }
            
            if (data.ideas.length > 0) {
              const newIdeasText = data.ideas.map(idea => `• In order to achieve good reach with your product, I propose the following content idea: "${idea}"`).join('\n');
              updateData.idea = existingTemplate.idea ? `${existingTemplate.idea}\n${newIdeasText}` : newIdeasText;
            }
            
            await storage.updateContentTemplate(existingTemplate.id, updateData);
            updated++;
            console.log(`Updated template for niche: ${niche}`);
          } else {
            // Create new template
            const templateData: any = {
              nicho: niche,
              contenido: `Content for ${niche}`,
              idea: '',
              videoLinks: [],
              videoTitles: [],
              videoIdeas: [],
              videoViews: [],
              fullTemplate: null,
              originalIdea: null,
              proposedIdea: null,
              views: null
            };
            
            if (data.videoLinks.length > 0) {
              templateData.videoLinks = data.videoLinks.map(v => v.link);
              templateData.videoTitles = data.videoLinks.map(v => v.title || '');
              templateData.videoIdeas = data.videoLinks.map(v => v.ideas || '');
              templateData.videoViews = data.videoLinks.map(v => v.views || '');
            }
            
            if (data.ideas.length > 0) {
              templateData.idea = data.ideas.map(idea => `• In order to achieve good reach with your product, I propose the following content idea: "${idea}"`).join('\n');
            }
            
            await storage.createContentTemplate(templateData);
            created++;
            console.log(`Created new template for niche: ${niche}`);
          }
        } catch (error) {
          console.error(`Error processing template for ${niche}:`, error);
        }
      }
      
      res.json({ 
        message: "Templates imported successfully", 
        updated, 
        created,
        total: Object.keys(nicheData).length,
        totalVideoLinks: videoLinks?.length || 0,
        totalIdeas: ideas?.length || 0
      });
    } catch (error) {
      console.error("Import error:", error);
      res.status(500).json({ error: "Failed to import templates" });
    }
  });

  // Content Templates routes
  app.get("/api/content-templates", async (req, res) => {
    try {
      const templates = await storage.getContentTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch content templates" });
    }
  });

  app.post("/api/content-templates", async (req, res) => {
    try {
      const templateData = insertContentTemplateSchema.parse(req.body);
      const template = await storage.createContentTemplate(templateData);
      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid template data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create template" });
      }
    }
  });

  app.put("/api/content-templates/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const templateData = req.body;
      const template = await storage.updateContentTemplate(id, templateData);
      
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to update template" });
    }
  });

  app.patch("/api/content-templates/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const templateData = req.body;
      
      console.log(`[PATCH] Updating template ${id} with data:`, JSON.stringify(templateData, null, 2));
      
      const template = await storage.updateContentTemplate(id, templateData);
      
      if (!template) {
        console.log(`[PATCH] Template ${id} not found`);
        return res.status(404).json({ error: "Template not found" });
      }
      
      console.log(`[PATCH] Template ${template.id} updated successfully. New videoLinks:`, template.videoLinks);
      console.log(`[PATCH] Template ${template.id} updated successfully. New videoIdeas:`, template.videoIdeas);
      
      res.json(template);
    } catch (error) {
      console.error(`[PATCH] Error updating template:`, error);
      res.status(500).json({ error: "Failed to update template" });
    }
  });

  app.delete("/api/content-templates/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteContentTemplate(id);
      
      if (!success) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  // Followup Templates routes
  app.get("/api/followup-templates", async (req, res) => {
    try {
      const templates = await storage.getFollowupTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch followup templates" });
    }
  });

  app.post("/api/followup-templates", async (req, res) => {
    try {
      const templateData = insertFollowupTemplateSchema.parse(req.body);
      const template = await storage.createFollowupTemplate(templateData);
      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid template data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create template" });
      }
    }
  });

  // Generate follow-up with AI
  app.post("/api/generate-followup", async (req, res) => {
    try {
      const { prompt } = req.body;
      
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: "Prompt is required" });
      }

      // Use OpenAI integration to generate follow-up
      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
```

### server/storage.ts
```typescript
import { 
  type User, 
  type InsertUser, 
  type Brand, 
  type InsertBrand,
  type ContentTemplate,
  type InsertContentTemplate,
  type FollowupTemplate,
  type InsertFollowupTemplate,
  type EmailLog,
  type InsertEmailLog,
  users,
  brands,
  contentTemplates,
  followupTemplates,
  emailLogs
} from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, desc, sql, isNotNull, ne } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Brands
  getBrands(): Promise<Brand[]>;
  getBrand(id: string): Promise<Brand | undefined>;
  createBrand(brand: InsertBrand): Promise<Brand>;
  updateBrand(id: string, brand: Partial<Brand>): Promise<Brand | undefined>;
  deleteBrand(id: string): Promise<boolean>;
  createManyBrands(brands: InsertBrand[]): Promise<Brand[]>;
  getUniqueNiches(): Promise<string[]>;

  // Content Templates
  getContentTemplates(): Promise<ContentTemplate[]>;
  getContentTemplateByNiche(nicho: string): Promise<ContentTemplate | undefined>;
  createContentTemplate(template: InsertContentTemplate): Promise<ContentTemplate>;
  updateContentTemplate(id: string, template: Partial<ContentTemplate>): Promise<ContentTemplate | undefined>;
  deleteContentTemplate(id: string): Promise<boolean>;
  upsertContentTemplateByNiche(nicho: string, template: Partial<InsertContentTemplate>): Promise<ContentTemplate>;

  // Followup Templates
  getFollowupTemplates(): Promise<FollowupTemplate[]>;
  getFollowupTemplate(id: string): Promise<FollowupTemplate | undefined>;
  createFollowupTemplate(template: InsertFollowupTemplate): Promise<FollowupTemplate>;
  updateFollowupTemplate(id: string, template: Partial<FollowupTemplate>): Promise<FollowupTemplate | undefined>;
  deleteFollowupTemplate(id: string): Promise<boolean>;

  // Email Logs
  getEmailLogs(): Promise<EmailLog[]>;
  createEmailLog(log: InsertEmailLog): Promise<EmailLog>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private brands: Map<string, Brand>;
  private contentTemplates: Map<string, ContentTemplate>;
  private followupTemplates: Map<string, FollowupTemplate>;
  private emailLogs: Map<string, EmailLog>;

  constructor() {
    this.users = new Map();
    this.brands = new Map();
    this.contentTemplates = new Map();
    this.followupTemplates = new Map();
    this.emailLogs = new Map();

    // Initialize with some sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Sample content templates
    const sampleTemplates = [
      {
        id: randomUUID(),
        nicho: "smartphones",
        contenido: "📱 Just tested the new iPhone 15 Pro - the camera quality is incredible! Check out these low-light shots...",
        idea: "Test the camera quality in different lighting conditions",
        videoLinks: ["https://www.youtube.com/shorts/example1"],
        videoTitles: ["iPhone 15 Pro Camera Test - Low Light Performance"],
        videoIdeas: null,
        videoViews: null,
        fullTemplate: null,
        originalIdea: null,
        proposedIdea: null,
        views: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        nicho: "drones",
        contenido: "🚁 Amazing aerial footage from our latest drone test! This DJI Mini 4 Pro captured stunning 4K video at 200ft altitude. Perfect for travel content creators...",
        idea: "Showcase aerial photography capabilities for travel content",
        videoLinks: ["https://www.youtube.com/shorts/example2"],
        videoTitles: ["DJI Mini 4 Pro - 4K Aerial Photography Test"],
        videoIdeas: null,
        videoViews: null,
        fullTemplate: null,
        originalIdea: null,
        proposedIdea: null,
        views: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        nicho: "microphones",
        contenido: "🎙️ Crystal clear audio test with the Blue Yeti X! Perfect for podcasting and streaming. Listen to this before/after comparison...",
        idea: "Test audio quality for podcasting and streaming",
        videoLinks: ["https://www.youtube.com/shorts/example3"],
        videoTitles: ["Blue Yeti X Microphone - Audio Quality Test"],
        videoIdeas: null,
        videoViews: null,
        fullTemplate: null,
        originalIdea: null,
        proposedIdea: null,
        views: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        nicho: "robot vacuums",
        contenido: "🤖 Testing the latest Roomba j7+ - the obstacle avoidance is impressive! Watch how it navigates around pet toys and cables...",
        idea: "Demonstrate smart navigation and obstacle avoidance",
        videoLinks: ["https://www.youtube.com/shorts/example4"],
        videoTitles: ["Roomba j7+ Obstacle Avoidance Test"],
        videoIdeas: null,
        videoViews: null,
        fullTemplate: null,
        originalIdea: null,
        proposedIdea: null,
        views: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    sampleTemplates.forEach(template => {
      this.contentTemplates.set(template.id, template);
    });

    // Sample followup template
    const followupTemplate = {
      id: randomUUID(),
      name: "General Follow-up",
      template: "Hi {{contacto}},\n\nI wanted to follow up on my previous email regarding our collaboration opportunity. We're still very interested in working with your brand and showcasing your products to our engaged audience.\n\nWould you be available for a quick call this week to discuss the partnership?",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.followupTemplates.set(followupTemplate.id, followupTemplate);
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Brands
  async getBrands(): Promise<Brand[]> {
    return Array.from(this.brands.values()).sort((a, b) => 
      a.marca.localeCompare(b.marca)
    );
  }

  async getBrand(id: string): Promise<Brand | undefined> {
    return this.brands.get(id);
  }

  async createBrand(insertBrand: InsertBrand): Promise<Brand> {
    const id = randomUUID();
    const brand: Brand = { 
      ...insertBrand, 
      id, 
      createdAt: new Date(),
      contacto: insertBrand.contacto ?? null,
      contactos: insertBrand.contactos ?? null,
      correos: insertBrand.correos ?? null,
      campania: insertBrand.campania ?? null,
      estado: insertBrand.estado ?? null,
```

### server/db/index.ts
```typescript
```

### server/services/email.ts
```typescript
import nodemailer from "nodemailer";

interface EmailParams {
  to: string;
  subject: string;
  htmlBody: string;
  from?: string;
  name?: string;
}

// Create transporter using environment variables
function createTransporter() {
  const emailService = process.env.EMAIL_SERVICE || "gmail";
  const emailUser = process.env.EMAIL_USER || "c@saca.technology";
  const emailPassword = process.env.EMAIL_PASSWORD || process.env.EMAIL_APP_PASSWORD;

  if (!emailPassword) {
    throw new Error("EMAIL_PASSWORD or EMAIL_APP_PASSWORD environment variable must be set");
  }

  return nodemailer.createTransport({
    service: emailService,
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
  });
}

export async function sendEmail(params: EmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    // Demo mode - if no email credentials are set, simulate successful sending
    const emailUser = process.env.EMAIL_USER || "c@saca.technology";
    const emailPassword = process.env.EMAIL_PASSWORD || process.env.EMAIL_APP_PASSWORD;

    if (!emailPassword) {
      console.log('🔄 DEMO MODE: Email would be sent with the following details:');
      console.log(`📧 From: ${params.name || "Saca Tech"} <${params.from || emailUser}>`);
      console.log(`📬 To: ${params.to}`);
      console.log(`📝 Subject: ${params.subject}`);
      console.log(`✅ Email simulated successfully in demo mode`);
      
      // Simulate a small delay like a real email service
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { success: true };
    }

    const transporter = createTransporter();
    
    const mailOptions = {
      from: `${params.name || "Saca Tech"} <${params.from || emailUser}>`,
      to: params.to,
      subject: params.subject,
      html: params.htmlBody,
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Email sending error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error occurred" 
    };
  }
}

export function generateEmailHTML(
  contacto: string,
  marca: string,
  nicho: string,
  campania: string,
  contenidoTexto: string,
  seguimientoHTML?: string,
  videoLink?: string,
  views?: string,
  contentIdea?: string
): string {
  const nichosEjemplo = "drones, microphones, robot vacuums, smartphones";
  
  // Extract content ideas from template
  let firstIdea = "";
  let secondIdea = "";
  
  if (contentIdea) {
    // Extract first idea (between first quotes)
    const firstIdeaMatch = contentIdea.match(/"([^"]+)"/);
    if (firstIdeaMatch) firstIdea = firstIdeaMatch[1];
    
    // Extract second idea (after "I propose the following content idea:")
    const secondIdeaMatch = contentIdea.match(/I propose the following content idea: "([^"]+)"/);
    if (secondIdeaMatch) secondIdea = secondIdeaMatch[1];
  }

  return `
    <div style="font-family: Arial, sans-serif; color:#333; line-height:1.5;">
      <p>Hi ${contacto || 'team'},</p>
      <p>I'm Carlos Saca from Saca Tech (@saca.technology).</p>
      ${campania && campania.toLowerCase() !== "general" && campania.toLowerCase() !== "seguimiento de correo" ? 
        `<p>Regarding the campaign: <b>${campania}</b>, we would love to collaborate with you during this period.</p>` : ''}
      ${campania && campania.toLowerCase() !== "seguimiento de correo" ? 
        `<p>We collaborate with multiple brands across various niches (${nichosEjemplo}), achieving great reach and impact.</p>` : ''}
      ${campania && campania.toLowerCase() !== "seguimiento de correo" && videoLink && (firstIdea || secondIdea) ? 
        `<p>I want to show you how we have integrated content with the idea of "${firstIdea}" according to the link: <a href="${videoLink}" target="_blank">${videoLink}</a>. In order to achieve good reach with your product, I propose the following content idea: "${secondIdea}"${views ? ` with ${views}` : ''}. It is just one of the many ideas we could discuss together.</p>` : ''}
      ${seguimientoHTML || ''}
      <p>I look forward to discussing this collaboration further with you.</p>
      <p>Best regards,<br><b>Carlos Saca</b><br>Saca Tech<br>@saca.technology</p>
    </div>`;
}
```

### server/services/openai.ts
```typescript
import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface EmailContentSuggestion {
  subject: string;
  content: string;
  tone: string;
}

export interface ContentGenerationOptions {
  brandName: string;
  industry?: string;
  tone?: 'professional' | 'casual' | 'friendly' | 'persuasive';
  purpose?: 'outreach' | 'followup' | 'partnership' | 'collaboration';
  additionalContext?: string;
}

export class OpenAIService {
  static async generateEmailContent(options: ContentGenerationOptions): Promise<EmailContentSuggestion> {
    try {
      const prompt = `Generate a professional outreach email for brand partnership/collaboration.

Brand Name: ${options.brandName}
Industry: ${options.industry || 'general'}
Tone: ${options.tone || 'professional'}
Purpose: ${options.purpose || 'outreach'}
${options.additionalContext ? `Additional Context: ${options.additionalContext}` : ''}

Please generate:
1. An engaging subject line
2. Email content that's personalized and professional
3. Keep it concise and actionable

Respond in JSON format with this structure:
{
  "subject": "subject line here",
  "content": "email body here",
  "tone": "${options.tone || 'professional'}"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert email marketing specialist who creates compelling outreach emails for brand partnerships and collaborations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        subject: result.subject || "Partnership Opportunity",
        content: result.content || "Hello! I'd like to discuss a potential partnership opportunity...",
        tone: result.tone || options.tone || 'professional'
      };
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error('Failed to generate email content: ' + (error as Error).message);
    }
  }

  static async generateSubjectLines(brandName: string, purpose: string, count: number = 3): Promise<string[]> {
    try {
      const prompt = `Generate ${count} engaging email subject lines for outreach to "${brandName}".
      
Purpose: ${purpose}
Requirements:
- Professional yet attention-grabbing
- Personalized to the brand
- Avoid spam-trigger words
- Keep under 50 characters when possible

Respond in JSON format:
{
  "subjects": ["subject 1", "subject 2", "subject 3"]
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert at creating compelling email subject lines that get opened."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result.subjects || [`Partnership with ${brandName}`, `Collaboration Opportunity`, `Let's Work Together`];
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error('Failed to generate subject lines: ' + (error as Error).message);
    }
  }

  static async improveTemplate(currentContent: string, improvements: string): Promise<string> {
    try {
      const prompt = `Improve the following email template based on the requested improvements:

Current Content:
${currentContent}

Requested Improvements:
${improvements}

Please provide an improved version that maintains the original intent while incorporating the requested changes. Keep it professional and engaging.

Respond in JSON format:
{
  "improved_content": "the improved email content here"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert email marketing specialist who improves email templates for better engagement and results."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result.improved_content || currentContent;
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error('Failed to improve template: ' + (error as Error).message);
    }
  }

  static async analyzeEmailResponse(emailContent: string): Promise<{ sentiment: string; suggestions: string[] }> {
    try {
      const prompt = `Analyze the following email response and provide insights:

Email Content:
${emailContent}

Please analyze:
1. Overall sentiment (positive, neutral, negative)
2. Key points mentioned
3. Suggestions for follow-up

Respond in JSON format:
{
  "sentiment": "positive/neutral/negative",
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert at analyzing business email communications and providing actionable insights."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        sentiment: result.sentiment || 'neutral',
        suggestions: result.suggestions || ['Consider a follow-up in 1-2 weeks', 'Personalize based on their response']
      };
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error('Failed to analyze email: ' + (error as Error).message);
    }
  }

  static async generateNicheIdeas(niche: string, brandName: string, customSuggestion?: string): Promise<string[]> {
    try {
      const basePrompt = `Generate 2 brief content ideas (2-3 lines each) for ${niche} products from "${brandName}".`;
      
      const prompt = customSuggestion 
        ? `${basePrompt}

```

---

## Frontend (Client)

### client/index.html
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Architects+Daughter&family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Fira+Code:wght@300..700&family=Geist+Mono:wght@100..900&family=Geist:wght@100..900&family=IBM+Plex+Mono:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;1,100;1,200;1,300;1,400;1,500;1,600;1,700&family=IBM+Plex+Sans:ital,wght@0,100..700;1,100..700&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Lora:ital,wght@0,400..700;1,400..700&family=Merriweather:ital,opsz,wght@0,18..144,300..900;1,18..144,300..900&family=Montserrat:ital,wght@0,100..900;1,100..900&family=Open+Sans:ital,wght@0,300..800;1,300..800&family=Outfit:wght@100..900&family=Oxanium:wght@200..800&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&family=Roboto+Mono:ital,wght@0,100..700;1,100..700&family=Roboto:ital,wght@0,100..900;1,100..900&family=Source+Code+Pro:ital,wght@0,200..900;1,200..900&family=Source+Serif+4:ital,opsz,wght@0,8..60,200..900;1,8..60,200..900&family=Space+Grotesk:wght@300..700&family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
    <!-- This is a replit script which adds a banner on the top of the page when opened in development mode outside the replit environment -->
    <script type="text/javascript" src="https://replit.com/public/js/replit-dev-banner.js"></script>
  </body>
</html>```

### client/src/main.tsx
```typescript
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
```

### client/src/App.tsx
```typescript
import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ResponsiveLayout } from "@/components/layout/responsive-layout";
import { Dashboard } from "@/pages/dashboard";
import { Brands } from "@/pages/brands";
import { ContentTemplates } from "@/pages/content-templates";
import NotFound from "@/pages/not-found";

function Router() {
  const [location] = useLocation();
  
  // Determine active tab from current route
  const getActiveTab = () => {
    if (location === "/brands") return "brands";
    if (location === "/content-templates") return "content";
    return "dashboard";
  };

  return (
    <ResponsiveLayout activeTab={getActiveTab()}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/brands" component={Brands} />
        <Route path="/content-templates" component={ContentTemplates} />
        <Route component={NotFound} />
      </Switch>
    </ResponsiveLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
```

### client/src/index.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: hsl(210, 40%, 98%);
  --foreground: hsl(222, 84%, 4.9%);
  --card: hsl(0, 0%, 100%);
  --card-foreground: hsl(222, 84%, 4.9%);
  --popover: hsl(0, 0%, 100%);
  --popover-foreground: hsl(222, 84%, 4.9%);
  --primary: hsl(214, 95%, 42%);
  --primary-foreground: hsl(210, 40%, 98%);
  --secondary: hsl(210, 40%, 96%);
  --secondary-foreground: hsl(222, 47%, 11%);
  --muted: hsl(210, 40%, 96%);
  --muted-foreground: hsl(215, 16%, 47%);
  --accent: hsl(210, 40%, 96%);
  --accent-foreground: hsl(222, 47%, 11%);
  --destructive: hsl(0, 84%, 60%);
  --destructive-foreground: hsl(210, 40%, 98%);
  --border: hsl(214, 32%, 91%);
  --input: hsl(214, 32%, 91%);
  --ring: hsl(214, 95%, 42%);
  --sidebar: hsl(0, 0%, 100%);
  --sidebar-foreground: hsl(222, 84%, 4.9%);
  --sidebar-primary: hsl(214, 95%, 42%);
  --sidebar-primary-foreground: hsl(210, 40%, 98%);
  --sidebar-accent: hsl(210, 40%, 96%);
  --sidebar-accent-foreground: hsl(222, 47%, 11%);
  --sidebar-border: hsl(214, 32%, 91%);
  --sidebar-ring: hsl(214, 95%, 42%);
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-serif: Georgia, serif;
  --font-mono: Menlo, monospace;
  --radius: 8px;
}

.dark {
  --background: hsl(222, 84%, 4.9%);
  --foreground: hsl(210, 40%, 98%);
  --card: hsl(222, 84%, 4.9%);
  --card-foreground: hsl(210, 40%, 98%);
  --popover: hsl(222, 84%, 4.9%);
  --popover-foreground: hsl(210, 40%, 98%);
  --primary: hsl(217, 91%, 60%);
  --primary-foreground: hsl(222, 84%, 4.9%);
  --secondary: hsl(217, 33%, 17%);
  --secondary-foreground: hsl(210, 40%, 98%);
  --muted: hsl(217, 33%, 17%);
  --muted-foreground: hsl(215, 20%, 65%);
  --accent: hsl(217, 33%, 17%);
  --accent-foreground: hsl(210, 40%, 98%);
  --destructive: hsl(0, 62%, 30%);
  --destructive-foreground: hsl(210, 40%, 98%);
  --border: hsl(217, 33%, 17%);
  --input: hsl(217, 33%, 17%);
  --ring: hsl(224, 76%, 78%);
  --sidebar: hsl(222, 84%, 4.9%);
  --sidebar-foreground: hsl(210, 40%, 98%);
  --sidebar-primary: hsl(217, 91%, 60%);
  --sidebar-primary-foreground: hsl(222, 84%, 4.9%);
  --sidebar-accent: hsl(217, 33%, 17%);
  --sidebar-accent-foreground: hsl(210, 40%, 98%);
  --sidebar-border: hsl(217, 33%, 17%);
  --sidebar-ring: hsl(224, 76%, 78%);
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-serif: Georgia, serif;
  --font-mono: Menlo, monospace;
  --radius: 8px;
}

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply font-sans antialiased bg-background text-foreground;
  }
}
```

### client/src/lib/queryClient.ts
```typescript
import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
```

### client/src/lib/api.ts
```typescript
import { apiRequest } from "./queryClient";

export { apiRequest };
import type { Brand, ContentTemplate, FollowupTemplate, EmailLog } from "@shared/schema";

export interface EmailSendRequest {
  brandId: string;
  templateType?: "general" | "followup";
  subjectOverride?: string;
  htmlOverride?: string;
  nicheIdeaUsed?: string;
}

export interface DashboardStats {
  totalBrands: number;
  emailsSent: number;
  responseRate: string;
  activeCampaigns: number;
}

export async function sendEmailToBrand(request: EmailSendRequest) {
  const response = await apiRequest("POST", "/api/send-email", request);
  return response.json();
}

export async function getBrands() {
  const response = await apiRequest("GET", "/api/brands");
  return response.json();
}

export async function createBrand(brand: any) {
  const response = await apiRequest("POST", "/api/brands", brand);
  return response.json();
}

export async function updateBrand(id: string, brand: any) {
  const response = await apiRequest("PUT", `/api/brands/${id}`, brand);
  return response.json();
}

export async function deleteBrand(id: string) {
  const response = await apiRequest("DELETE", `/api/brands/${id}`);
  return response.json();
}

export async function getContentTemplates() {
  const response = await apiRequest("GET", "/api/content-templates");
  return response.json();
}

export async function createContentTemplate(template: any) {
  const response = await apiRequest("POST", "/api/content-templates", template);
  return response.json();
}

export async function updateContentTemplate(id: string, template: any) {
  const response = await apiRequest("PUT", `/api/content-templates/${id}`, template);
  return response.json();
}

export async function deleteContentTemplate(id: string) {
  const response = await apiRequest("DELETE", `/api/content-templates/${id}`);
  return response.json();
}

export async function getFollowupTemplates() {
  const response = await apiRequest("GET", "/api/followup-templates");
  return response.json();
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await apiRequest("GET", "/api/dashboard/stats");
  return response.json();
}

export async function getBrandsTyped(): Promise<Brand[]> {
  const response = await apiRequest("GET", "/api/brands");
  return response.json();
}

export async function getContentTemplatesTyped(): Promise<ContentTemplate[]> {
  const response = await apiRequest("GET", "/api/content-templates");
  return response.json();
}

export async function getFollowupTemplatesTyped(): Promise<FollowupTemplate[]> {
  const response = await apiRequest("GET", "/api/followup-templates");
  return response.json();
}
```

### client/src/pages/dashboard.tsx
```typescript
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building, Mail, TrendingUp, Megaphone, ArrowUp, ArrowDown, PlaneTakeoff } from "lucide-react";
import { getDashboardStats } from "@/lib/api";

export function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: () => import("@/lib/api").then(m => m.getDashboardStats()),
  });

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <header className="bg-card border-b border-border px-4 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-foreground">Dashboard</h2>
              <p className="text-sm lg:text-base text-muted-foreground">Campaign overview and performance metrics</p>
            </div>
          </div>
        </header>
        <div className="p-4 lg:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 lg:p-6">
                  <div className="h-16 lg:h-20 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <header className="bg-card border-b border-border px-4 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-foreground">Dashboard</h2>
            <p className="text-sm lg:text-base text-muted-foreground">Campaign overview and performance metrics</p>
          </div>
          <Button className="flex items-center justify-center space-x-2 w-full sm:w-auto" data-testid="button-bulk-send">
            <PlaneTakeoff className="h-4 w-4" />
            <span>Send Emails</span>
          </Button>
        </div>
      </header>

      <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <Card>
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-muted-foreground text-xs lg:text-sm font-medium">Total Brands</p>
                  <p className="text-xl lg:text-2xl font-bold text-foreground" data-testid="stat-total-brands">
                    {stats?.totalBrands || 0}
                  </p>
                </div>
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building className="h-5 w-5 lg:h-6 lg:w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="mt-3 lg:mt-4 flex items-center text-xs lg:text-sm">
                <span className="text-green-600 dark:text-green-400 flex items-center">
                  <ArrowUp className="h-3 w-3 mr-1" />
                  12%
                </span>
                <span className="text-muted-foreground ml-1">vs last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-muted-foreground text-xs lg:text-sm font-medium">Emails Sent</p>
                  <p className="text-xl lg:text-2xl font-bold text-foreground" data-testid="stat-emails-sent">
                    {stats?.emailsSent || 0}
                  </p>
                </div>
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="h-5 w-5 lg:h-6 lg:w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="mt-3 lg:mt-4 flex items-center text-xs lg:text-sm">
                <span className="text-green-600 dark:text-green-400 flex items-center">
                  <ArrowUp className="h-3 w-3 mr-1" />
                  8%
                </span>
                <span className="text-muted-foreground ml-1">vs last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-muted-foreground text-xs lg:text-sm font-medium">Response Rate</p>
                  <p className="text-xl lg:text-2xl font-bold text-foreground" data-testid="stat-response-rate">
                    {stats?.responseRate || "0%"}
                  </p>
                </div>
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-5 w-5 lg:h-6 lg:w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
              <div className="mt-3 lg:mt-4 flex items-center text-xs lg:text-sm">
                <span className="text-green-600 dark:text-green-400 flex items-center">
                  <ArrowUp className="h-3 w-3 mr-1" />
                  4%
                </span>
                <span className="text-muted-foreground ml-1">vs last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-muted-foreground text-xs lg:text-sm font-medium">Active Campaigns</p>
                  <p className="text-xl lg:text-2xl font-bold text-foreground" data-testid="stat-active-campaigns">
                    {stats?.activeCampaigns || 0}
                  </p>
                </div>
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Megaphone className="h-5 w-5 lg:h-6 lg:w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div className="mt-3 lg:mt-4 flex items-center text-xs lg:text-sm">
                <span className="text-red-600 dark:text-red-400 flex items-center">
                  <ArrowDown className="h-3 w-3 mr-1" />
                  2%
                </span>
                <span className="text-muted-foreground ml-1">vs last month</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
```

### client/src/pages/brands.tsx
```typescript
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Plus, Upload, Search, Mail, Edit, Trash2, Building, Download } from "lucide-react";
import { AddBrandModal } from "@/components/modals/add-brand-modal";
import { EditBrandModal } from "@/components/modals/edit-brand-modal";
import { EmailComposerModal } from "@/components/modals/email-composer-modal";
import { ImportModal } from "@/components/modals/import-modal";
import { getBrands, deleteBrand, updateBrand } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { exportBrandsToExcel, importCampaignsFromExcel } from "@/lib/excel-utils";
import type { Brand } from "@shared/schema";

export function Brands() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCampaignImportModal, setShowCampaignImportModal] = useState(false);
  const [showAddCampaignModal, setShowAddCampaignModal] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [nicheFilter, setNicheFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ["/api/brands"],
    queryFn: () => import("@/lib/api").then(m => m.getBrandsTyped()),
  });

  const { data: niches = [], isLoading: isLoadingNiches } = useQuery({
    queryKey: ["/api/brands/niches"],
    select: (data: any) => data || [],
  });

  const { data: campaigns = [] } = useQuery<string[]>({
    queryKey: ["/api/brands/campaigns"],
  });

  const deleteBrandMutation = useMutation({
    mutationFn: deleteBrand,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Brand deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete brand",
        variant: "destructive",
      });
    },
  });

  const updateBrandMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateBrand(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/brands"] });
      
      // Snapshot the previous value
      const previousBrands = queryClient.getQueryData(["/api/brands"]);
      
      // Optimistically update to the new value
      queryClient.setQueryData(["/api/brands"], (old: Brand[]) => {
        if (!old) return old;
        return old.map(brand => 
          brand.id === id ? { ...brand, ...data } : brand
        );
      });
      
      // Return a context object with the snapshotted value
      return { previousBrands };
    },
    onError: (error: any, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousBrands) {
        queryClient.setQueryData(["/api/brands"], context.previousBrands);
      }
      toast({
        title: "Error",
        description: error.message || "Failed to update brand",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Brand updated successfully",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure server state is correct
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
    },
  });

  const filteredBrands = brands.filter((brand: Brand) => {
    const matchesSearch = !searchQuery || 
      brand.marca.toLowerCase().includes(searchQuery.toLowerCase()) ||
      brand.contacto?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      brand.correo.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesNiche = !nicheFilter || nicheFilter === "all" || brand.nicho === nicheFilter;
    const matchesStatus = !statusFilter || statusFilter === "all" || brand.estado?.toLowerCase().includes(statusFilter.toLowerCase());
    
    return matchesSearch && matchesNiche && matchesStatus;
  });

  const handleSendEmail = (brand: Brand) => {
    setSelectedBrand(brand);
    setShowEmailModal(true);
  };

  const handleEditBrand = (brand: Brand) => {
    setSelectedBrand(brand);
    setShowEditModal(true);
  };

  const handleDeleteBrand = (brand: Brand) => {
    if (confirm(`Are you sure you want to delete ${brand.marca}?`)) {
      deleteBrandMutation.mutate(brand.id);
    }
  };

  const handleNicheChange = (brandId: string, newNiche: string) => {
    updateBrandMutation.mutate({
      id: brandId,
      data: { nicho: newNiche }
    });
  };

  const handleCampaignChange = (brandId: string, newCampaign: string) => {
    updateBrandMutation.mutate({
      id: brandId,
      data: { campania: newCampaign }
    });
  };

  const handleExportBrands = () => {
    try {
      const filename = exportBrandsToExcel(brands);
      toast({
        title: "Success",
        description: `Brands exported to ${filename}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export brands",
        variant: "destructive",
      });
    }
  };

  const handleCampaignImport = async (file: File) => {
    try {
      const campaigns = await importCampaignsFromExcel(file);
      // Here you would typically send these to the backend to update the campaigns list
      toast({
        title: "Success", 
        description: `Imported ${campaigns.length} campaigns`,
      });
      setShowCampaignImportModal(false);
      // You might want to invalidate campaigns query here
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to import campaigns",
        variant: "destructive",
      });
    }
  };

  const handleAddCampaign = () => {
    if (!newCampaignName.trim()) return;
    
    // Here you would typically send this to the backend to add to campaigns list
    toast({
      title: "Success",
      description: `Campaign "${newCampaignName}" added successfully`,
    });
    setNewCampaignName("");
    setShowAddCampaignModal(false);
```

### client/src/pages/content-templates.tsx
```typescript
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Plus, Link, Lightbulb, Eye, Video, Copy, ExternalLink, Search, X, Sparkles, Trash2, Edit, Download, Upload } from "lucide-react";
import { TemplateModal } from "@/components/modals/template-modal";
import { getContentTemplates, getFollowupTemplates, deleteContentTemplate } from "@/lib/api";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { exportContentTemplatesToExcel, importContentTemplatesFromExcel } from "@/lib/excel-utils";
import type { ContentTemplate, FollowupTemplate } from "@shared/schema";

interface VideoData {
  link: string;
  title: string;
  ideas: string[];
  views?: string;
}

interface NicheLinks {
  [niche: string]: VideoData[];
}

interface NicheIdeas {
  [niche: string]: string[];
}

export function ContentTemplates() {
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNiche, setSelectedNiche] = useState("");
  const [newVideoLink, setNewVideoLink] = useState("");
  const [newVideoIdea, setNewVideoIdea] = useState("");
  const [newVideoViews, setNewVideoViews] = useState("");
  const [newIdea, setNewIdea] = useState("");
  const [showAddLinkDialog, setShowAddLinkDialog] = useState(false);
  const [showAddIdeaDialog, setShowAddIdeaDialog] = useState(false);
  const [editingIdea, setEditingIdea] = useState<{niche: string, index: number, idea: string} | null>(null);
  const [editIdeaText, setEditIdeaText] = useState("");
  const [showAddFollowupDialog, setShowAddFollowupDialog] = useState(false);
  const [showGenerateFollowupDialog, setShowGenerateFollowupDialog] = useState(false);
  const [newFollowupName, setNewFollowupName] = useState("");
  const [newFollowupTemplate, setNewFollowupTemplate] = useState("");
  const [generateFollowupPrompt, setGenerateFollowupPrompt] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contentTemplates = [], isLoading: isLoadingContent } = useQuery({
    queryKey: ["/api/content-templates"],
    queryFn: () => import("@/lib/api").then(m => m.getContentTemplatesTyped()),
  });

  const { data: followupTemplates = [], isLoading: isLoadingFollowup } = useQuery({
    queryKey: ["/api/followup-templates"],
    queryFn: () => import("@/lib/api").then(m => m.getFollowupTemplatesTyped()),
  });

  const { data: niches = [] } = useQuery({
    queryKey: ["/api/brands/niches"],
    select: (data: any) => data || [],
  });

  const updateTemplateMutation = useMutation({
    mutationFn: (data: { id: string; update: Partial<ContentTemplate> }) =>
      apiRequest("PATCH", `/api/content-templates/${data.id}`, data.update),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-templates"] });
      toast({
        title: "Success",
        description: "Template updated successfully",
      });
      setNewVideoLink("");
      setNewVideoIdea("");
      setNewVideoViews("");
      setNewIdea("");
      setShowAddLinkDialog(false);
      setShowAddIdeaDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update template",
        variant: "destructive",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: deleteContentTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-templates"] });
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete template",
        variant: "destructive",
      });
    },
  });

  const createFollowupMutation = useMutation({
    mutationFn: (data: { name: string; template: string }) =>
      apiRequest("POST", "/api/followup-templates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/followup-templates"] });
      toast({
        title: "Success",
        description: "Follow-up template created successfully",
      });
      setNewFollowupName("");
      setNewFollowupTemplate("");
      setShowAddFollowupDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create follow-up template",
        variant: "destructive",
      });
    },
  });

  const generateFollowupMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const response = await apiRequest("POST", "/api/generate-followup", { prompt });
      return response.json();
    },
    onSuccess: (data: { followup: string }) => {
      setNewFollowupTemplate(data.followup);
      setShowGenerateFollowupDialog(false);
      setShowAddFollowupDialog(true);
      toast({
        title: "Success",
        description: "Follow-up generated successfully",
      });
    },
```

### client/src/components/layout/responsive-layout.tsx
```typescript
import { useState } from "react";
import { cn } from "@/lib/utils";
import { BarChart3, Building, FileText, PlaneTakeoff, Menu, X } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface ResponsiveLayoutProps {
  activeTab: string;
  children: React.ReactNode;
}

const navigation = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3, path: "/" },
  { id: "brands", label: "Brands", icon: Building, path: "/brands" },
  { id: "content", label: "Content Templates", icon: FileText, path: "/content-templates" },
];

export function ResponsiveLayout({ activeTab, children }: ResponsiveLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-card border-r border-border flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <PlaneTakeoff className="text-primary-foreground h-4 w-4" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Brand Campaign Manager</h1>
              <p className="text-xs text-muted-foreground">Saca Tech</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <Link 
                    href={item.path}
                    className={cn(
                      "w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors font-medium no-underline",
                      activeTab === item.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                    data-testid={`nav-${item.id}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        
        <div className="p-4 border-t border-border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
              <span className="text-muted-foreground text-sm font-medium">CS</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Carlos Saca</p>
              <p className="text-xs text-muted-foreground">c@saca.technology</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={closeMobileMenu}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={cn(
        "lg:hidden fixed left-0 top-0 h-full w-64 bg-card border-r border-border flex flex-col z-50 transition-transform duration-200",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <PlaneTakeoff className="text-primary-foreground h-4 w-4" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground">Brand Campaign</h1>
              <p className="text-xs text-muted-foreground">Saca Tech</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={closeMobileMenu}
            data-testid="close-mobile-menu"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <Link 
                    href={item.path}
                    onClick={closeMobileMenu}
                    className={cn(
                      "w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors font-medium no-underline",
                      activeTab === item.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                    data-testid={`mobile-nav-${item.id}`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        
        <div className="p-4 border-t border-border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
              <span className="text-muted-foreground text-sm font-medium">CS</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Carlos Saca</p>
              <p className="text-xs text-muted-foreground">c@saca.technology</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
```
