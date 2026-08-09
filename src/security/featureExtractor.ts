import pool from "../lib/db.js";

export interface TrafficFeatures {
  ip_address: string;
  request_count: number;
  unique_endpoints: number;
  unique_methods: number;
  error_count: number;
  avg_response_time: number;
  max_response_time: number;
}

export async function extractFeatures(): Promise<TrafficFeatures[]> {
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

  return (rows as any[]).map((row) => ({
    ip_address: row.ip_address,
    request_count: Number(row.request_count),
    unique_endpoints: Number(row.unique_endpoints),
    unique_methods: Number(row.unique_methods),
    error_count: Number(row.error_count),
    avg_response_time: Number(row.avg_response_time),
    max_response_time: Number(row.max_response_time),
  }));
}
