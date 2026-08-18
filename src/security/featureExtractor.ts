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

/**
 * Extract traffic features from the last 5 minutes.
 *
 * Features:
 * - Request count
 * - Unique endpoints
 * - Unique HTTP methods
 * - Error count
 * - Average response time
 * - Maximum response time
 */
export async function extractFeatures(): Promise<TrafficFeatures[]> {
  try {
    const [rows] = await pool.execute(`
      SELECT
        ip_address,

        COUNT(*) AS request_count,

        COUNT(DISTINCT endpoint) AS unique_endpoints,

        COUNT(DISTINCT method) AS unique_methods,

        SUM(
          CASE
            WHEN status_code >= 400 THEN 1
            ELSE 0
          END
        ) AS error_count,

        COALESCE(
          AVG(response_time_ms),
          0
        ) AS avg_response_time,

        COALESCE(
          MAX(response_time_ms),
          0
        ) AS max_response_time

      FROM traffic_logs

      WHERE timestamp >= NOW() - INTERVAL 5 MINUTE

      GROUP BY ip_address

      ORDER BY request_count DESC
    `);

    const trafficRows = rows as any[];

    if (trafficRows.length === 0) {
      console.log(
        "ℹ️ No traffic found in the last 5 minutes.",
      );

      return [];
    }

    const features: TrafficFeatures[] =
      trafficRows.map((row) => ({
        ip_address: String(
          row.ip_address ?? "unknown",
        ),

        request_count:
          Number(row.request_count ?? 0),

        unique_endpoints:
          Number(row.unique_endpoints ?? 0),

        unique_methods:
          Number(row.unique_methods ?? 0),

        error_count:
          Number(row.error_count ?? 0),

        avg_response_time:
          Number(row.avg_response_time ?? 0),

        max_response_time:
          Number(row.max_response_time ?? 0),
      }));

    console.log(
      `✅ Features extracted: ${features.length}`,
    );

    for (const feature of features) {
      console.log(
        `📊 Features → IP: ${feature.ip_address} | ` +
        `Requests: ${feature.request_count} | ` +
        `Endpoints: ${feature.unique_endpoints} | ` +
        `Methods: ${feature.unique_methods} | ` +
        `Errors: ${feature.error_count} | ` +
        `Avg Response: ${feature.avg_response_time.toFixed(2)}ms | ` +
        `Max Response: ${feature.max_response_time.toFixed(2)}ms`,
      );
    }

    return features;
  } catch (error) {
    console.error(
      "❌ Feature extraction failed:",
      error,
    );

    return [];
  }
}
