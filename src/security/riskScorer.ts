import pool from "../lib/db.js";

async function calculateRisk() {
  try {
    const [rows] = await pool.execute(`
      SELECT
        ip_address,
        COUNT(*) AS request_count,
        COUNT(DISTINCT endpoint) AS unique_endpoints,
        COUNT(DISTINCT method) AS unique_methods,
        SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) AS error_count,
        AVG(response_time_ms) AS avg_response_time,
        MAX(response_time_ms) AS max_response_time,
        MAX(is_suspicious) AS is_suspicious
      FROM traffic_logs
      WHERE timestamp >= NOW() - INTERVAL 5 MINUTE
      GROUP BY ip_address
      ORDER BY request_count DESC
    `);

    console.log("\n=== RISK SCORING ===\n");

    for (const row of rows as any[]) {
      const requestCount = Number(row.request_count);
      const uniqueEndpoints = Number(row.unique_endpoints);
      const errorCount = Number(row.error_count);
      const suspicious = Number(row.is_suspicious) === 1;

      let riskScore = 0;
      const reasons: string[] = [];

      // High request volume
      if (requestCount >= 50) {
        riskScore += 30;
        reasons.push("Very high request volume");
      } else if (requestCount >= 20) {
        riskScore += 20;
        reasons.push("High request volume");
      } else if (requestCount >= 10) {
        riskScore += 10;
        reasons.push("Elevated request volume");
      }

      // Many endpoints
      if (uniqueEndpoints >= 20) {
        riskScore += 25;
        reasons.push("Accessing many different endpoints");
      } else if (uniqueEndpoints >= 10) {
        riskScore += 15;
        reasons.push("Accessing multiple endpoints");
      } else if (uniqueEndpoints >= 5) {
        riskScore += 10;
        reasons.push("Multiple endpoint access");
      }

      // Errors
      if (errorCount >= 20) {
        riskScore += 30;
        reasons.push("Very high number of errors");
      } else if (errorCount >= 10) {
        riskScore += 20;
        reasons.push("High number of errors");
      } else if (errorCount >= 5) {
        riskScore += 10;
        reasons.push("Elevated number of errors");
      }

      // Anomaly detector result
      if (suspicious) {
        riskScore += 15;
        reasons.push("Traffic marked as suspicious");
      }

      // Never allow score above 100
      riskScore = Math.min(riskScore, 100);

      let riskLevel: string;

      if (riskScore >= 80) {
        riskLevel = "CRITICAL";
      } else if (riskScore >= 60) {
        riskLevel = "HIGH";
      } else if (riskScore >= 30) {
        riskLevel = "MEDIUM";
      } else {
        riskLevel = "LOW";
      }

      console.log({
        ip_address: row.ip_address,
        request_count: requestCount,
        unique_endpoints: uniqueEndpoints,
        error_count: errorCount,
        suspicious,
        risk_score: riskScore,
        risk_level: riskLevel,
        reasons,
      });
    }

    console.log("\n===================\n");
  } catch (error) {
    console.error("Risk scoring error:", error);
  } finally {
    await pool.end();
  }
}

calculateRisk();
