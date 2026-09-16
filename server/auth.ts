import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: true,
    saveUninitialized: true,
    proxy: true,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: 'lax',
      maxAge: sessionTtl,
      path: '/',
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Check if Google credentials are configured
  const useGoogleAuth = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  if (!useGoogleAuth) {
    console.log("[AUTH] Credenciales de Google no detectadas. Configurando autenticación local simulada (Mock Auth)...");
    
    app.use(async (req: any, res, next) => {
      if (req.session && !req.session.passport) {
        const mockUser = {
          claims: {
            sub: "116630391775518035940",
            email: "ceo.hanktech@gmail.com",
            first_name: "Carlos",
            last_name: "Saca",
            profile_image_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb",
          },
          expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 7,
        };

        try {
          await storage.upsertUser({
            id: mockUser.claims.sub,
            email: mockUser.claims.email,
            firstName: mockUser.claims.first_name,
            lastName: mockUser.claims.last_name,
            profileImageUrl: mockUser.claims.profile_image_url,
          });
        } catch (err) {
          console.error("[AUTH] Error al insertar usuario demo en BD:", err);
        }

        req.session.passport = { user: mockUser };
      }

      if (req.session && req.session.passport && req.session.passport.user) {
        req.user = req.session.passport.user;
      }

      req.isAuthenticated = () => true;
      next();
    });

    app.get("/api/login", (req, res) => {
      res.redirect("/");
    });

    app.get("/api/logout", (req: any, res) => {
      req.session.destroy(() => {
        res.redirect("/");
      });
    });

    return;
  }

  // Google OAuth2 Config
  console.log("[AUTH] Configurando autenticación real con Google OAuth2...");
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: "/api/auth/google/callback",
      proxy: true
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error("No email found in Google profile"));
        }

        const user = await storage.upsertUser({
          id: profile.id,
          email: email,
          firstName: profile.name?.givenName || null,
          lastName: profile.name?.familyName || null,
          profileImageUrl: profile.photos?.[0]?.value || null,
        });

        const loggedUser = {
          claims: {
            sub: user.id,
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
            profile_image_url: user.profileImageUrl,
          },
          expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 7, // 7 days
        };

        done(null, loggedUser);
      } catch (err) {
        done(err);
      }
    }
  ));

  passport.serializeUser((user: any, cb) => cb(null, user));
  passport.deserializeUser((user: any, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    passport.authenticate("google", {
      scope: ["profile", "email"],
      prompt: "select_account"
    })(req, res, next);
  });

  app.get("/api/auth/google/callback", (req, res, next) => {
    passport.authenticate("google", (err: any, user: any) => {
      if (err) {
        console.error("[AUTH] Error en callback de Google:", err);
        return res.redirect("/api/login");
      }
      if (!user) {
        console.error("[AUTH] No se retornó usuario desde Google");
        return res.redirect("/api/login");
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("[AUTH] Error al hacer login de sesión:", loginErr);
          return res.redirect("/api/login");
        }
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("[AUTH] Error al guardar sesión:", saveErr);
          }
          return res.redirect("/");
        });
      });
    })(req, res, next);
  });

  app.get("/api/logout", (req: any, res) => {
    req.logout(() => {
      req.session.destroy(() => {
        res.redirect("/");
      });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  const useGoogleAuth = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  if (!useGoogleAuth) {
    if (!req.user) {
      req.user = {
        claims: {
          sub: "mock-user-123",
          email: "c@saca.technology",
          first_name: "Saca",
          last_name: "Technology",
          profile_image_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb",
        },
        expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 7,
      };
    }
    req.isAuthenticated = () => true;
    return next();
  }

  const user = req.user as any;

  if (!req.isAuthenticated() || !user || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  req.logout(() => {
    res.status(401).json({ message: "Unauthorized" });
  });
};
