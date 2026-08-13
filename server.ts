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

function getClientIP(
  req: express.Request,
): string {
  const forwardedFor =
    req.headers["x-forwarded-for"];

  let ip: string;

  // If request came through a proxy/load balancer
  if (typeof forwardedFor === "string") {
    ip = forwardedFor
      .split(",")[0]
      .trim();
  } else if (Array.isArray(forwardedFor)) {
    ip = forwardedFor[0]?.trim() || "";
  } else {
    ip =
      req.ip ||
      req.socket.remoteAddress ||
      "unknown";
  }

  // Remove IPv6 mapped IPv4 prefix
  if (ip.startsWith("::ffff:")) {
    ip = ip.substring(7);
  }

  // Normalize localhost IPv6
  if (ip === "::1") {
    ip = "127.0.0.1";
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

    console.log(
      "✅ MySQL Connected Successfully",
    );

    conn.release();

  } catch (err) {

    console.error(
      "❌ MySQL Connection Failed",
    );

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

  } catch (e) {

    console.log(
      "No initial courses data found.",
      e,
    );
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
      req.headers.authorization
        ?.split(" ")[1];

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

      (req as any).user =
        payload;

      next();

    } catch (err) {

      return res.status(401).json({
        error: "Invalid token",
      });
    }
  };

  // ============================================================
  // EXPRESS MIDDLEWARE
  // ============================================================

  app.use(
    express.json(),
  );

  // HTTP request logging
  app.use(
    morgan("dev"),
  );

  // ============================================================
  // PHASE 2 — IP BLOCKING MIDDLEWARE
  // ============================================================
  //
  // IMPORTANT:
  // This middleware runs BEFORE trafficLogger.
  //
  // If an IP is blocked:
  //     request stops here
  //     trafficLogger does NOT process it
  //     API returns HTTP 403
  //
  // ============================================================

  app.use(
    (
      req,
      res,
      next,
    ) => {

      const ip =
        getClientIP(req);

      console.log(
        `🔎 IP CHECK: ${ip} ${req.method} ${req.path}`,
      );

      // --------------------------------------------------------
      // CHECK BLOCK LIST
      // --------------------------------------------------------

      if (isIPBlocked(ip)) {

        console.log(
          `🚫 BLOCKED REQUEST: ${ip} ${req.method} ${req.path}`,
        );

        return res.status(403).json({
          error: "Access denied",

          message:
            "Your IP address has been temporarily blocked.",

          ip_address: ip,

          status: "BLOCKED",
        });
      }

      // --------------------------------------------------------
      // IP IS ALLOWED
      // --------------------------------------------------------

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
  // PHASE 3 — SECURITY EVENT API
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

        return res.json(
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
  // GET SINGLE SECURITY EVENT
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

        return res.json(
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
  // SECURITY EVENT SUMMARY
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

              SUM(
                severity = 'CRITICAL'
              ) AS critical_events,

              SUM(
                severity = 'HIGH'
              ) AS high_events,

              SUM(
                severity = 'MEDIUM'
              ) AS medium_events,

              SUM(
                severity = 'LOW'
              ) AS low_events,

              SUM(
                action = 'BLOCK'
              ) AS blocked_events,

              SUM(
                action = 'ALERT'
              ) AS alert_events,

              SUM(
                action = 'MONITOR'
              ) AS monitored_events

            FROM security_events
          `);

        return res.json(
          rows[0],
        );

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
  //
  // Useful for testing Phase 2 IP blocking.
  //
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

        return res.json({
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

        return res.json({
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
  // SECURITY ANALYSIS MANUAL ENDPOINT
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

        return res.json({
          success: true,

          message:
            "Security analysis completed successfully",
        });

      } catch (error) {

        console.error(
          "❌ Manual security analysis failed:",
          error,
        );

        return res.status(500).json({
          success: false,

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

      if (
        users.find(
          (u) =>
            u.username ===
            username,
        )
      ) {

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
          (s) => ({
            id:
              s.id,

            authorId:
              s.authorId,

            name:
              s.name,

            offer:
              s.offer,

            category:
              s.category,

            want:
              s.want,

            bio:
              s.bio,

            createdAt:
              s.createdAt,

            authorName:
              (s as any)
                .authorName,
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
          (s) =>
            s.id === id,
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
        skills[skillIndex]
          .authorId !==
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

    app.use(
      express.static(
        distPath,
      ),
    );

    app.get(
      "*",
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

      console.log(
        "🛡️ IP blocking middleware enabled",
      );

      // ========================================================
      // INITIAL SECURITY ANALYSIS
      // ========================================================

      console.log(
        "\n🔐 Running initial security analysis...",
      );

      runSecurityAnalysis()
        .catch(
          (error) => {

            console.error(
              "❌ Initial security analysis failed:",
              error,
            );
          },
        );

      // ========================================================
      // AUTOMATIC SECURITY ANALYSIS
      // ========================================================

      setInterval(
        async () => {

          console.log(
            "\n🔐 Running automatic security analysis...",
          );

          try {

            await runSecurityAnalysis();

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
