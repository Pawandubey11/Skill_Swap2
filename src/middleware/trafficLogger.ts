import { Request, Response, NextFunction } from "express";
import pool from "../lib/db.js";

const trafficLogger = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const start = Date.now();

  res.on("finish", async () => {
    const responseTime = Date.now() - start;
    const ipAddress = req.ip || req.socket.remoteAddress || "unknown";
    const endpoint = req.originalUrl || "/";
    const method = req.method || "GET";
    const userAgent = Array.isArray(req.headers["user-agent"])
      ? req.headers["user-agent"].join(", ")
      : req.headers["user-agent"] || "Unknown";

    try {
      await pool.execute(
        `INSERT INTO traffic_logs
        (ip_address, endpoint, method, status_code, response_time_ms, user_agent)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          String(ipAddress),
          String(endpoint),
          String(method),
          Number(res.statusCode),
          Number(responseTime),
          String(userAgent),
        ],
      );
    } catch (err) {
      console.error("Traffic Logger Error:", err);
    }
  });

  next();
};

export default trafficLogger;
