import pool from "../lib/db.js";

async function extractFeatures() {
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

    console.log("\n=== TRAFFIC FEATURES ===\n");

    for (const row of rows as any[]) {
      console.log({
        ip_address: row.ip_address,
        request_count: Number(row.request_count),
        unique_endpoints: Number(row.unique_endpoints),
        unique_methods: Number(row.unique_methods),
        error_count: Number(row.error_count),
        avg_response_time: Number(row.avg_response_time),
        max_response_time: Number(row.max_response_time),
      });
    }

    console.log("\n=========================\n");
  } catch (error) {
    console.error("Feature extraction error:", error);
  } finally {
    await pool.end();
  }
}

extractFeatures();
