import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import morgan from "morgan";
import jwt from "jsonwebtoken";
import fs from "fs";

import dotenv from "dotenv";
dotenv.config();

import pool from "./src/lib/db.js";
import trafficLogger from "./src/middleware/trafficLogger.js";

// Automatic security analysis
import { runSecurityAnalysis } from "./src/security/securityService.js";

// Phase 2 — Enforcement
import { isIPBlocked } from "./src/security/enforcementEngine.js";

async function startServer() {
  // ============================================================
  // MYSQL CONNECTION
  // ============================================================

  try {
    const conn = await pool.getConnection();

    console.log("✅ MySQL Connected Successfully");

    conn.release();
  } catch (err) {
    console.error("❌ MySQL Connection Failed");
    console.error(err);

    process.exit(1);
  }

  const app = express();

  const PORT = Number(process.env.PORT) || 3000;

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const JWT_SECRET =
    process.env.JWT_SECRET ||
    "skillswap-super-secret-key-12345";

  // ============================================================
  // USER INTERFACE
  // ============================================================

  interface User {
    id: string;
    username: string;
    passwordHash: string;
  }

  let users: User[] = [];

  // ============================================================
  // SKILL INTERFACE
  // ============================================================

  interface Skill {
    id: string;
    authorId: string;
    name: string;
    offer: string;
    category: string;
    want: string;
    bio: string;
    createdAt: number;
  }

  // ============================================================
  // IN-MEMORY DATABASE
  // ============================================================

  let skills: Skill[] = [];

  try {
    const data = fs.readFileSync(
      path.join(process.cwd(), "data", "courses.json"),
      "utf8",
    );

    skills = JSON.parse(data);
  } catch (e) {
    console.log("No initial courses data found.", e);
  }

  // ============================================================
  // AUTHENTICATION MIDDLEWARE
  // ============================================================

  const authenticate = (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    const token =
      req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    try {
      const payload = jwt.verify(
        token,
        JWT_SECRET,
      ) as {
        id: string;
        username: string;
      };

      (req as any).user = payload;

      next();
    } catch (err) {
      res.status(401).json({
        error: "Invalid token",
      });
    }
  };

  // ============================================================
  // EXPRESS MIDDLEWARE
  // ============================================================

  app.use(express.json());

  app.use(morgan("dev"));

  // ============================================================
  // TRAFFIC LOGGER
  // ============================================================

  app.use(trafficLogger);

  // ============================================================
  // PHASE 2 — IP ENFORCEMENT MIDDLEWARE
  // ============================================================

  app.use((req, res, next) => {
    const forwardedFor =
      req.headers["x-forwarded-for"];

    let ip: string;

    if (typeof forwardedFor === "string") {
      ip = forwardedFor
        .split(",")[0]
        .trim();
    } else {
      ip =
        req.ip ||
        req.socket.remoteAddress ||
        "unknown";
    }

    // Remove IPv6-mapped IPv4 prefix
    if (ip.startsWith("::ffff:")) {
      ip = ip.substring(7);
    }

    // Check whether IP is currently blocked
    if (isIPBlocked(ip)) {
      console.log(
        `🚫 BLOCKED REQUEST: ${ip} ${req.method} ${req.path}`,
      );

      return res.status(403).json({
        error: "Access denied",
        message:
          "Your IP address has been temporarily blocked.",
      });
    }

    next();
  });

  // ============================================================
  // API ROUTES
  // ============================================================

  // ============================================================
  // REGISTER
  // ============================================================

  app.post("/api/register", (req, res) => {
    const {
      username,
      password,
    } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: "Missing fields",
      });
    }

    if (
      users.find(
        (u) => u.username === username,
      )
    ) {
      return res.status(400).json({
        error: "Username taken",
      });
    }

    const newUser: User = {
      id: Math.random()
        .toString(36)
        .substring(2, 9),

      username,

      passwordHash: password,
    };

    users.push(newUser);

    const token = jwt.sign(
      {
        id: newUser.id,
        username: newUser.username,
      },
      JWT_SECRET,
      {
        expiresIn: "24h",
      },
    );

    res.status(201).json({
      token,

      user: {
        id: newUser.id,
        username: newUser.username,
      },
    });
  });

  // ============================================================
  // LOGIN
  // ============================================================

  app.post("/api/login", (req, res) => {
    const {
      username,
      password,
    } = req.body;

    const user = users.find(
      (u) =>
        u.username === username &&
        u.passwordHash === password,
    );

    if (!user) {
      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
      },
      JWT_SECRET,
      {
        expiresIn: "24h",
      },
    );

    res.json({
      token,

      user: {
        id: user.id,
        username: user.username,
      },
    });
  });

  // ============================================================
  // GET ALL SKILLS
  // ============================================================

  app.get("/api/skills", (req, res) => {
    const summarySkills = skills.map(
      (s) => ({
        id: s.id,
        authorId: s.authorId,
        name: s.name,
        offer: s.offer,
        category: s.category,
        want: s.want,
        bio: s.bio,
        createdAt: s.createdAt,
        authorName: (s as any).authorName,
      }),
    );

    res.json(summarySkills);
  });

  // ============================================================
  // GET SINGLE SKILL
  // ============================================================

  app.get(
    "/api/skills/:id",
    (req, res) => {
      const skill = skills.find(
        (s) =>
          s.id === req.params.id,
      );

      if (!skill) {
        return res.status(404).json({
          error: "Skill not found",
        });
      }

      res.json(skill);
    },
  );

  // ============================================================
  // CREATE SKILL
  // ============================================================

  app.post(
    "/api/skills",
    authenticate,
    (req, res) => {
      const {
        name,
        offer,
        category,
        want,
        bio,
      } = req.body;

      const user = (req as any).user;

      if (
        !name ||
        !offer ||
        !category ||
        !want
      ) {
        return res.status(400).json({
          error:
            "Missing required fields",
        });
      }

      const newSkill: Skill = {
        id: Math.random()
          .toString(36)
          .substring(2, 9),

        authorId: user.id,

        name,

        offer,

        category,

        want,

        bio:
          bio ||
          `${name} is offering ${offer} in exchange for ${want}.`,

        createdAt: Date.now(),
      };

      skills.unshift(newSkill);

      res.status(201).json(
        newSkill,
      );
    },
  );

  // ============================================================
  // DELETE SKILL
  // ============================================================

  app.delete(
    "/api/skills/:id",
    authenticate,
    (req, res) => {
      const { id } = req.params;

      const user = (req as any).user;

      const skillIndex =
        skills.findIndex(
          (s) => s.id === id,
        );

      if (skillIndex === -1) {
        return res.status(404).json({
          error: "Skill not found",
        });
      }

      if (
        skills[skillIndex]
          .authorId !== user.id
      ) {
        return res.status(403).json({
          error:
            "Forbidden: You can only delete your own skills",
        });
      }

      skills.splice(
        skillIndex,
        1,
      );

      res.status(204).send();
    },
  );

  // ============================================================
  // VITE / PRODUCTION
  // ============================================================

  if (
    process.env.NODE_ENV !==
    "production"
  ) {
    const vite =
      await createViteServer({
        server: {
          middlewareMode: true,
        },

        appType: "spa",
      });

    app.use(
      vite.middlewares,
    );
  } else {
    const distPath =
      path.join(
        process.cwd(),
        "dist",
      );

    app.use(
      express.static(distPath),
    );

    app.get(
      "*",
      (req, res) => {
        res.sendFile(
          path.join(
            distPath,
            "index.html",
          ),
        );
      },
    );
  }

  // ============================================================
  // START SERVER
  // ============================================================

  app.listen(
    PORT,
    "0.0.0.0",
    () => {
      console.log(
        `Server running on http://localhost:${PORT}`,
      );

      console.log(
        "🔐 Automatic security analysis enabled",
      );

      // ========================================================
      // INITIAL SECURITY ANALYSIS
      // ========================================================

      console.log(
        "\n🔐 Running initial security analysis...",
      );

      runSecurityAnalysis();

      // ========================================================
      // AUTOMATIC SECURITY ANALYSIS
      // ========================================================
      //
      // Run every 5 minutes
      //

      setInterval(
        async () => {
          console.log(
            "\n🔐 Running automatic security analysis...",
          );

          await runSecurityAnalysis();
        },
        5 * 60 * 1000,
      );
    },
  );
}

startServer();
