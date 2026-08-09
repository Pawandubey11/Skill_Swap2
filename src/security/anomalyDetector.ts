import pool from "../lib/db.js";

async function detectAnomalies() {
  try {
    const [rows] = await pool.execute(`
      SELECT
        ip_address,
        COUNT(*) AS request_count,
        COUNT(DISTINCT endpoint) AS unique_endpoints,
        COUNT(DISTINCT method) AS unique_methods,
        SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) AS error_count,
        AVG(response_time_ms) AS avg_response_time,
        MAX(response_time_ms) AS max_response_time
      FROM traffic_logs
      WHERE timestamp >= NOW() - INTERVAL 5 MINUTE
      GROUP BY ip_address
      ORDER BY request_count DESC
    `);

    console.log("\n=== ANOMALY DETECTION ===\n");

    for (const row of rows as any[]) {
      const requestCount = Number(row.request_count);
      const uniqueEndpoints = Number(row.unique_endpoints);
      const errorCount = Number(row.error_count);

      let score = 0;

      // High request volume
      if (requestCount >= 20) {
        score += 40;
      } else if (requestCount >= 10) {
        score += 20;
      }

      // Accessing many different endpoints
      if (uniqueEndpoints >= 10) {
        score += 30;
      } else if (uniqueEndpoints >= 5) {
        score += 15;
      }

      // Large number of errors
      if (errorCount >= 10) {
        score += 30;
      } else if (errorCount >= 5) {
        score += 15;
      }

      const suspicious = score >= 50;

      console.log({
        ip_address: row.ip_address,
        request_count: requestCount,
        unique_endpoints: uniqueEndpoints,
        unique_methods: Number(row.unique_methods),
        error_count: errorCount,
        avg_response_time: Number(row.avg_response_time),
        max_response_time: Number(row.max_response_time),
        anomaly_score: score,
        suspicious,
      });

      // Save detection result to database
      await pool.execute(
        `
        UPDATE traffic_logs
        SET is_suspicious = ?
        WHERE ip_address = ?
        AND timestamp >= NOW() - INTERVAL 5 MINUTE
        `,
        [suspicious ? 1 : 0, row.ip_address]
      );

      console.log(
        `Database updated: ${row.ip_address} -> ${
          suspicious ? "SUSPICIOUS" : "NORMAL"
        }`
      );
    }

    console.log("\n========================\n");
  } catch (error) {
    console.error("Anomaly detection error:", error);
  } finally {
    await pool.end();
  }
}

detectAnomalies();
