import pool from "../lib/db.js";

export interface SecurityEvent {
  ip_address: string;
  event_type: string;
  severity: string;
  risk_score?: number;
  anomaly_score?: number;
  action?: string;
  status?: string;
  risk_reasons?: string[];
  message?: string;
}

export async function saveSecurityEvent(
  event: SecurityEvent,
) {
  const query = `
    INSERT INTO security_events (
      ip_address,
      event_type,
      severity,
      risk_score,
      anomaly_score,
      action,
      status,
      risk_reasons,
      message
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    event.ip_address,
    event.event_type,
    event.severity,
    event.risk_score ?? null,
    event.anomaly_score ?? null,
    event.action ?? null,
    event.status ?? "OPEN",
    JSON.stringify(event.risk_reasons ?? []),
    event.message ?? null,
  ];

  const [result] = await pool.execute(
    query,
    values,
  );

  return result;
}
