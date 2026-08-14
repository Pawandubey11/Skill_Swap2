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

// ============================================================
// SECURITY SYSTEM
// ============================================================

import { runSecurityAnalysis } from "./src/security/securityService.js";

import {
  isIPBlocked,
  getBlockedIPs,
} from "./src/security/enforcementEngine.js";

// ============================================================
// HELPER — GET CLIENT IP
// ============================================================

function getClientIP(req: express.Request): string {
  const forwardedFor = req.headers["x-forwarded-for"];

  let ip: string;

  // AWS ALB / NGINX / PROXY
  if (typeof forwardedFor === "string") {
    ip = forwardedFor.split(",")[0].trim();
  }

  // Express can sometimes provide an array
  else if (Array.isArray(forwardedFor)) {
    ip = forwardedFor[0]?.trim() || "";
  }

  // Direct connection
  else {
    ip =
      req.ip ||
      req.socket.remoteAddress ||
      "unknown";
  }

  // Normalize IPv4-mapped IPv6
  // ::ffff:172.17.0.1 -> 172.17.0.1
  if (ip.startsWith("::ffff:")) {
    ip = ip.substring(7);
  }

  // Normalize localhost IPv6
  if (ip === "::1") {
    ip = "127.0.0.1";
  }

  // Remove spaces
  ip = ip.trim();

  if (!ip) {
    ip = "unknown";
  }

  return ip;
}

// ============================================================
// START SERVER
// ============================================================

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

  // ============================================================
  // EXPRESS APPLICATION
  // ============================================================

  const app = express();

  const PORT =
    Number(process.env.PORT) || 3000;

  const __filename =
    fileURLToPath(import.meta.url);

  const __dirname =
    path.dirname(__filename);

  // Prevent unused-variable issues
  void __dirname;

  // ============================================================
  // JWT CONFIGURATION
  // ============================================================

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

  const users: User[] = [];

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
    authorName?: string;
  }

  // ============================================================
  // IN-MEMORY DATABASE
  // ============================================================

  let skills: Skill[] = [];

  try {

    const data =
      fs.readFileSync(
        path.join(
          process.cwd(),
          "data",
          "courses.json",
        ),
        "utf8",
      );

    skills = JSON.parse(data);

    console.log(
      `✅ Loaded ${skills.length} skills`,
    );

  } catch (error) {

    console.log(
      "⚠️ No initial courses data found.",
    );

    console.error(error);
  }

  // ============================================================
  // EXPRESS MIDDLEWARE
  // ============================================================

  app.use(
    express.json(),
  );

  // ============================================================
  // MORGAN HTTP LOGGING
  // ============================================================

  app.use(
    morgan("dev"),
  );

  // ============================================================
  // AUTHENTICATION MIDDLEWARE
  // ============================================================

  const authenticate = (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {

    const authorization =
      req.headers.authorization;

    const token =
      authorization?.split(" ")[1];

    if (!token) {

      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    try {

      const payload =
        jwt.verify(
          token,
          JWT_SECRET,
        ) as {
          id: string;
          username: string;
        };

      (req as any).user = payload;

      next();

    } catch (error) {

      console.error(
        "JWT verification failed:",
        error,
      );

      return res.status(401).json({
        error: "Invalid token",
      });
    }
  };

  // ============================================================
  // PHASE 2 — IP BLOCKING MIDDLEWARE
  // ============================================================

  app.use(
    (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {

      const ip =
        getClientIP(req);

      console.log(
        `🔎 IP CHECK: ${ip} ${req.method} ${req.path}`,
      );

      // ========================================================
      // CHECK IP BLOCK LIST
      // ========================================================

      try {

        const blocked =
          isIPBlocked(ip);

        if (blocked) {

          console.log(
            `🚫 BLOCKED REQUEST: ${ip} ${req.method} ${req.path}`,
          );

          return res.status(403).json({

            error:
              "Access denied",

            message:
              "Your IP address has been temporarily blocked.",

            ip_address:
              ip,

            status:
              "BLOCKED",
          });
        }

      } catch (error) {

        console.error(
          "❌ IP blocking check failed:",
          error,
        );

        // Do not crash application.
        // Allow request to continue.
      }

      next();
    },
  );

  // ============================================================
  // TRAFFIC LOGGER
  // ============================================================

  app.use(
    trafficLogger,
  );

  // ============================================================
  // HEALTH CHECK
  // ============================================================

  app.get(
    "/health",
    async (
      req,
      res,
    ) => {

      try {

        await pool.query(
          "SELECT 1",
        );

        return res.status(200).json({

          status:
            "healthy",

          service:
            "SkillSwap",

          database:
            "connected",

          timestamp:
            new Date().toISOString(),

        });

      } catch (error) {

        console.error(
          "❌ Health check database error:",
          error,
        );

        return res.status(503).json({

          status:
            "unhealthy",

          service:
            "SkillSwap",

          database:
            "disconnected",

          timestamp:
            new Date().toISOString(),

        });
      }
    },
  );

  // ============================================================
  // ROOT HEALTH / APPLICATION CHECK
  // ============================================================

  app.get(
    "/api/health",
    (
      req,
      res,
    ) => {

      return res.status(200).json({

        status:
          "ok",

        service:
          "SkillSwap",

        timestamp:
          new Date().toISOString(),

      });
    },
  );

  // ============================================================
  // PHASE 3 — SECURITY EVENTS
  // ============================================================


  // ============================================================
  // GET ALL SECURITY EVENTS
  // ============================================================

  app.get(
    "/api/security-events",
    async (
      req,
      res,
    ) => {

      try {

        const [rows] =
          await pool.query(`
            SELECT
              id,
              ip_address,
              event_type,
              severity,
              risk_score,
              anomaly_score,
              action,
              status,
              risk_reasons,
              message,
              created_at

            FROM security_events

            ORDER BY created_at DESC

            LIMIT 100
          `);

        return res.status(200).json(
          rows,
        );

      } catch (error) {

        console.error(
          "❌ Failed to fetch security events:",
          error,
        );

        return res.status(500).json({
          error:
            "Failed to fetch security events",
        });
      }
    },
  );


  // ============================================================
  // SECURITY EVENT SUMMARY
  //
  // IMPORTANT:
  // This MUST be BEFORE /api/security-events/:id
  // ============================================================

  app.get(
    "/api/security-events/summary",
    async (
      req,
      res,
    ) => {

      try {

        const [rows]: any =
          await pool.query(`
            SELECT

              COUNT(*) AS total_events,

              COALESCE(
                SUM(severity = 'CRITICAL'),
                0
              ) AS critical_events,

              COALESCE(
                SUM(severity = 'HIGH'),
                0
              ) AS high_events,

              COALESCE(
                SUM(severity = 'MEDIUM'),
                0
              ) AS medium_events,

              COALESCE(
                SUM(severity = 'LOW'),
                0
              ) AS low_events,

              COALESCE(
                SUM(action = 'BLOCK'),
                0
              ) AS blocked_events,

              COALESCE(
                SUM(action = 'ALERT'),
                0
              ) AS alert_events,

              COALESCE(
                SUM(action = 'MONITOR'),
                0
              ) AS monitored_events

            FROM security_events
          `);

        return res.status(200).json({

          total_events:
            Number(rows[0].total_events),

          critical_events:
            Number(rows[0].critical_events),

          high_events:
            Number(rows[0].high_events),

          medium_events:
            Number(rows[0].medium_events),

          low_events:
            Number(rows[0].low_events),

          blocked_events:
            Number(rows[0].blocked_events),

          alert_events:
            Number(rows[0].alert_events),

          monitored_events:
            Number(rows[0].monitored_events),

        });

      } catch (error) {

        console.error(
          "❌ Failed to fetch security summary:",
          error,
        );

        return res.status(500).json({
          error:
            "Failed to fetch security summary",
        });
      }
    },
  );


  // ============================================================
  // GET CURRENTLY BLOCKED IPS
  // ============================================================

  app.get(
    "/api/security/blocked-ips",
    (
      req,
      res,
    ) => {

      try {

        const blockedIPs =
          getBlockedIPs();

        return res.status(200).json({

          total_blocked:
            blockedIPs.length,

          blocked_ips:
            blockedIPs,

        });

      } catch (error) {

        console.error(
          "❌ Failed to fetch blocked IPs:",
          error,
        );

        return res.status(500).json({
          error:
            "Failed to fetch blocked IPs",
        });
      }
    },
  );


  // ============================================================
  // UPDATE SECURITY EVENT STATUS
  //
  // IMPORTANT:
  // This MUST be BEFORE /api/security-events/:id
  // ============================================================

  app.patch(
    "/api/security-events/:id/status",
    async (
      req,
      res,
    ) => {

      try {

        const {
          status,
        } = req.body;

        const allowedStatuses = [
          "OPEN",
          "INVESTIGATING",
          "RESOLVED",
        ];

        if (
          !allowedStatuses.includes(
            status,
          )
        ) {

          return res.status(400).json({

            error:
              "Invalid status",

            allowedStatuses,

          });
        }

        const [result]: any =
          await pool.query(
            `
            UPDATE security_events

            SET status = ?

            WHERE id = ?
            `,
            [
              status,
              req.params.id,
            ],
          );

        if (
          result.affectedRows === 0
        ) {

          return res.status(404).json({
            error:
              "Security event not found",
          });
        }

        return res.status(200).json({

          message:
            "Security event status updated",

          id:
            req.params.id,

          status,

        });

      } catch (error) {

        console.error(
          "❌ Failed to update security event:",
          error,
        );

        return res.status(500).json({
          error:
            "Failed to update security event",
        });
      }
    },
  );


  // ============================================================
  // GET SINGLE SECURITY EVENT
  //
  // IMPORTANT:
  // This dynamic route MUST be AFTER:
  //
  // /summary
  // /blocked-ips
  // /:id/status
  //
  // Otherwise "summary" can be interpreted as an ID.
  // ============================================================

  app.get(
    "/api/security-events/:id",
    async (
      req,
      res,
    ) => {

      try {

        const [rows]: any =
          await pool.query(
            `
            SELECT
              id,
              ip_address,
              event_type,
              severity,
              risk_score,
              anomaly_score,
              action,
              status,
              risk_reasons,
              message,
              created_at

            FROM security_events

            WHERE id = ?
            `,
            [
              req.params.id,
            ],
          );

        if (
          rows.length === 0
        ) {

          return res.status(404).json({
            error:
              "Security event not found",
          });
        }

        return res.status(200).json(
          rows[0],
        );

      } catch (error) {

        console.error(
          "❌ Failed to fetch security event:",
          error,
        );

        return res.status(500).json({
          error:
            "Failed to fetch security event",
        });
      }
    },
  );


  // ============================================================
  // MANUAL SECURITY ANALYSIS
  // ============================================================

  app.post(
    "/api/security/analyze",
    async (
      req,
      res,
    ) => {

      try {

        console.log(
          "\n🔐 Manual security analysis requested...",
        );

        await runSecurityAnalysis();

        return res.status(200).json({

          success:
            true,

          message:
            "Security analysis completed successfully",

        });

      } catch (error) {

        console.error(
          "❌ Manual security analysis failed:",
          error,
        );

        return res.status(500).json({

          success:
            false,

          error:
            "Security analysis failed",

        });
      }
    },
  );


  // ============================================================
  // REGISTER
  // ============================================================

  app.post(
    "/api/register",
    (
      req,
      res,
    ) => {

      const {
        username,
        password,
      } = req.body;

      if (
        !username ||
        !password
      ) {

        return res.status(400).json({
          error:
            "Missing fields",
        });
      }

      const existingUser =
        users.find(
          (user) =>
            user.username ===
            username,
        );

      if (existingUser) {

        return res.status(400).json({
          error:
            "Username taken",
        });
      }

      const newUser: User = {

        id:
          Math.random()
            .toString(36)
            .substring(2, 9),

        username,

        passwordHash:
          password,
      };

      users.push(
        newUser,
      );

      const token =
        jwt.sign(
          {
            id:
              newUser.id,

            username:
              newUser.username,
          },

          JWT_SECRET,

          {
            expiresIn:
              "24h",
          },
        );

      return res.status(201).json({

        token,

        user: {

          id:
            newUser.id,

          username:
            newUser.username,

        },

      });
    },
  );


  // ============================================================
  // LOGIN
  // ============================================================

  app.post(
    "/api/login",
    (
      req,
      res,
    ) => {

      const {
        username,
        password,
      } = req.body;

      const user =
        users.find(
          (u) =>
            u.username ===
              username &&
            u.passwordHash ===
              password,
        );

      if (!user) {

        return res.status(401).json({
          error:
            "Invalid credentials",
        });
      }

      const token =
        jwt.sign(
          {
            id:
              user.id,

            username:
              user.username,
          },

          JWT_SECRET,

          {
            expiresIn:
              "24h",
          },
        );

      return res.json({

        token,

        user: {

          id:
            user.id,

          username:
            user.username,

        },

      });
    },
  );


  // ============================================================
  // GET ALL SKILLS
  // ============================================================

  app.get(
    "/api/skills",
    (
      req,
      res,
    ) => {

      const summarySkills =
        skills.map(
          (skill) => ({

            id:
              skill.id,

            authorId:
              skill.authorId,

            name:
              skill.name,

            offer:
              skill.offer,

            category:
              skill.category,

            want:
              skill.want,

            bio:
              skill.bio,

            createdAt:
              skill.createdAt,

            authorName:
              skill.authorName,

          }),
        );

      return res.json(
        summarySkills,
      );
    },
  );


  // ============================================================
  // GET SINGLE SKILL
  // ============================================================

  app.get(
    "/api/skills/:id",
    (
      req,
      res,
    ) => {

      const skill =
        skills.find(
          (s) =>
            s.id ===
            req.params.id,
        );

      if (!skill) {

        return res.status(404).json({
          error:
            "Skill not found",
        });
      }

      return res.json(
        skill,
      );
    },
  );


  // ============================================================
  // CREATE SKILL
  // ============================================================

  app.post(
    "/api/skills",
    authenticate,
    (
      req,
      res,
    ) => {

      const {
        name,
        offer,
        category,
        want,
        bio,
      } = req.body;

      const user =
        (req as any).user;

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

        id:
          Math.random()
            .toString(36)
            .substring(2, 9),

        authorId:
          user.id,

        name,

        offer,

        category,

        want,

        bio:
          bio ||
          `${name} is offering ${offer} in exchange for ${want}.`,

        createdAt:
          Date.now(),
      };

      skills.unshift(
        newSkill,
      );

      return res.status(201).json(
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
    (
      req,
      res,
    ) => {

      const {
        id,
      } = req.params;

      const user =
        (req as any).user;

      const skillIndex =
        skills.findIndex(
          (skill) =>
            skill.id ===
            id,
        );

      if (
        skillIndex === -1
      ) {

        return res.status(404).json({
          error:
            "Skill not found",
        });
      }

      if (
        skills[skillIndex].authorId !==
        user.id
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

      return res.status(204).send();
    },
  );


  // ============================================================
  // VITE DEVELOPMENT MODE
  // ============================================================

  if (
    process.env.NODE_ENV !==
    "production"
  ) {

    const vite =
      await createViteServer({

        server: {

          middlewareMode:
            true,

        },

        appType:
          "spa",

      });

    app.use(
      vite.middlewares,
    );

  }

  // ============================================================
  // PRODUCTION MODE
  // ============================================================

  else {

    const distPath =
      path.join(
        process.cwd(),
        "dist",
      );

    console.log(
      `📦 Serving production files from: ${distPath}`,
    );

    app.use(
      express.static(
        distPath,
      ),
    );

    // ==========================================================
    // SPA FALLBACK
    //
    // Express 5 does not accept "*" in the same way as older
    // versions. Use a regex instead.
    // ==========================================================

    app.get(
      /^(?!\/api).*/,
      (
        req,
        res,
      ) => {

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
  // 404 HANDLER
  // ============================================================

  app.use(
    (
      req,
      res,
    ) => {

      if (
        req.path.startsWith(
          "/api/",
        )
      ) {

        return res.status(404).json({

          error:
            "API endpoint not found",

          path:
            req.path,

        });
      }

      return res.status(404).send(
        "Not Found",
      );
    },
  );


  // ============================================================
  // GLOBAL ERROR HANDLER
  // ============================================================

  app.use(
    (
      error: any,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {

      console.error(
        "❌ Express error:",
        error,
      );

      if (res.headersSent) {
        return next(error);
      }

      return res.status(500).json({

        error:
          "Internal server error",

      });
    },
  );


  // ============================================================
  // START SERVER
  // ============================================================

  const server =
    app.listen(
      PORT,
      "0.0.0.0",
      () => {

        console.log(
          `🚀 Server running on http://0.0.0.0:${PORT}`,
        );

        console.log(
          `🌐 Local access: http://localhost:${PORT}`,
        );

        console.log(
          "🔐 Automatic security analysis enabled",
        );

        console.log(
          "🛡️ IP blocking middleware enabled",
        );

        console.log(
          "📊 Traffic logging enabled",
        );

        console.log(
          "❤️ Health check: /health",
        );

        // ======================================================
        // INITIAL SECURITY ANALYSIS
        // ======================================================

        console.log(
          "\n🔐 Running initial security analysis...",
        );

        runSecurityAnalysis()
          .then(() => {

            console.log(
              "✅ Initial security analysis completed",
            );

          })
          .catch(
            (error) => {

              console.error(
                "❌ Initial security analysis failed:",
                error,
              );

            },
          );

        // ======================================================
        // AUTOMATIC SECURITY ANALYSIS
        // ======================================================

        setInterval(
          async () => {

            console.log(
              "\n🔐 Running automatic security analysis...",
            );

            try {

              await runSecurityAnalysis();

              console.log(
                "✅ Automatic security analysis completed",
              );

            } catch (error) {

              console.error(
                "❌ Automatic security analysis failed:",
                error,
              );
            }

          },

          5 * 60 * 1000,
        );
      },
    );


  // ============================================================
  // SERVER ERROR HANDLER
  // ============================================================

  server.on(
    "error",
    (error: NodeJS.ErrnoException) => {

      console.error(
        "❌ Server error:",
        error,
      );

      if (
        error.code ===
        "EADDRINUSE"
      ) {

        console.error(
          `❌ Port ${PORT} is already in use.`,
        );

        process.exit(1);
      }
    },
  );
}


// ============================================================
// APPLICATION START
// ============================================================

startServer().catch(
  (error) => {

    console.error(
      "❌ Failed to start server:",
      error,
    );

    process.exit(1);
  },
);
