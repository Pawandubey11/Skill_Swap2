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

    try {
      await pool.execute(
        `INSERT INTO traffic_logs
        (ip_address, endpoint, method, status_code, response_time_ms, user_agent)
        VALUES (?, ?, ?, ?, ?, ?)`,

        [
          req.ip,
          req.originalUrl,
          req.method,
          res.statusCode,
          responseTime,
          req.headers["user-agent"] || "Unknown",
        ],
      );
    } catch (err) {
      console.error("Traffic Logger Error:", err);
    }
  });

  next();
};

export default trafficLogger;
