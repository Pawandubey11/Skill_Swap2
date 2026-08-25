import pool from "./db.js";

/**
 * Initializes and verifies all required security database tables in MySQL.
 * Creates tables if they do not exist and adds missing indexes/columns.
 */
export async function ensureSecurityTables(): Promise<void> {
  try {
    console.log("🛠️ Ensuring MySQL security database tables exist...");

    // 1. traffic_logs table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS traffic_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ip_address VARCHAR(45) NOT NULL,
        endpoint VARCHAR(255) NOT NULL,
        method VARCHAR(10) NOT NULL,
        status_code INT NOT NULL,
        response_time_ms INT DEFAULT 0,
        user_agent TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_suspicious TINYINT(1) DEFAULT 0,
        anomaly_score INT DEFAULT 0,
        risk_score INT DEFAULT 0,
        risk_level VARCHAR(20) DEFAULT 'LOW',
        risk_reasons JSON,
        INDEX idx_ip_time (ip_address, timestamp),
        INDEX idx_timestamp (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 2. security_events table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS security_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ip_address VARCHAR(45) NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        risk_score INT DEFAULT 0,
        anomaly_score INT DEFAULT 0,
        action VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'OPEN',
        risk_reasons JSON,
        message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_ip (ip_address),
        INDEX idx_severity (severity),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 3. blocked_ips table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS blocked_ips (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ip_address VARCHAR(45) NOT NULL,
        reason TEXT,
        risk_score INT DEFAULT 0,
        blocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NULL,
        status VARCHAR(20) DEFAULT 'BLOCKED',
        INDEX idx_status_expires (status, expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure UNIQUE index on blocked_ips(ip_address)
    try {
      await pool.execute(`
        ALTER TABLE blocked_ips ADD UNIQUE INDEX uq_blocked_ip (ip_address);
      `);
    } catch {
      // Index already exists or ignored
    }

    console.log("✅ MySQL security database tables verified successfully.");
  } catch (error) {
    console.error("⚠️ Security database table initialization warning:", error);
  }
}
