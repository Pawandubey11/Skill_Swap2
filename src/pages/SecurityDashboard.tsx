import React, {
  useEffect,
  useState,
} from "react";

import {
  ShieldCheck,
  ShieldAlert,
  Ban,
  Activity,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";

// ============================================================
// SECURITY EVENT
// ============================================================

interface SecurityEvent {

  id: number;

  ip_address: string;

  event_type: string;

  severity: string;

  risk_score: number;

  anomaly_score: number;

  action: string;

  status: string;

  risk_reasons: string[];

  message: string;

  created_at: string;
}

// ============================================================
// BLOCKED IP
// ============================================================

interface BlockedIP {

  ip: string;

  blockedAt: number;

  expiresAt: number | null;

  reason: string;
}

// ============================================================
// TIMELINE
// ============================================================

interface TimelineItem {

  date: string;

  events: number;
}

// ============================================================
// STATISTICS
// ============================================================

interface SecurityStatistics {

  total_events: number;

  critical_events: number;

  high_events: number;

  medium_events: number;

  low_events: number;

  blocked_events: number;

  alert_events: number;

  monitored_events: number;

  currently_blocked_ips: number;

  severity_distribution: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };

  timeline: TimelineItem[];
}

// ============================================================
// DASHBOARD
// ============================================================

export default function SecurityDashboard() {

  const [
    events,
    setEvents,
  ] = useState<SecurityEvent[]>([]);

  const [
    statistics,
    setStatistics,
  ] = useState<SecurityStatistics | null>(
    null,
  );

  const [
    blockedIPs,
    setBlockedIPs,
  ] = useState<BlockedIP[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    analyzing,
    setAnalyzing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  // ==========================================================
  // FETCH EVENTS
  // ==========================================================

  const fetchEvents =
    async () => {

      try {

        const response =
          await fetch(
            "/api/security-events",
          );

        if (!response.ok) {

          throw new Error(
            "Failed to fetch security events",
          );
        }

        const data =
          await response.json();

        setEvents(
          Array.isArray(data)
            ? data
            : [],
        );

      } catch (err) {

        console.error(err);

        setError(
          "Unable to load security events.",
        );
      }
    };

  // ==========================================================
  // FETCH STATISTICS
  // ==========================================================

  const fetchStatistics =
    async () => {

      try {

        const response =
          await fetch(
            "/api/security/statistics",
          );

        if (!response.ok) {

          throw new Error(
            "Failed to fetch statistics",
          );
        }

        const data =
          await response.json();

        setStatistics(data);

      } catch (err) {

        console.error(err);

        setError(
          "Unable to load security statistics.",
        );
      }
    };

  // ==========================================================
  // FETCH BLOCKED IPS
  // ==========================================================

  const fetchBlockedIPs =
    async () => {

      try {

        const response =
          await fetch(
            "/api/security/blocked-ips",
          );

        if (!response.ok) {

          throw new Error(
            "Failed to fetch blocked IPs",
          );
        }

        const data =
          await response.json();

        setBlockedIPs(
          Array.isArray(
            data.blocked_ips,
          )
            ? data.blocked_ips
            : [],
        );

      } catch (err) {

        console.error(err);

        setError(
          "Unable to load blocked IPs.",
        );
      }
    };

  // ==========================================================
  // FETCH EVERYTHING
  // ==========================================================

  const fetchDashboard =
    async () => {

      try {

        setLoading(true);

        setError("");

        await Promise.all([
          fetchEvents(),
          fetchStatistics(),
          fetchBlockedIPs(),
        ]);

      } finally {

        setLoading(false);
      }
    };

  // ==========================================================
  // RUN SECURITY ANALYSIS
  // ==========================================================

  const runAnalysis =
    async () => {

      try {

        setAnalyzing(true);

        setError("");

        const response =
          await fetch(
            "/api/security/analyze",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },
            },
          );

        if (!response.ok) {

          throw new Error(
            "Security analysis failed",
          );
        }

        await response.json();

        await fetchDashboard();

      } catch (err) {

        console.error(err);

        setError(
          "Security analysis could not be completed.",
        );

      } finally {

        setAnalyzing(false);
      }
    };

  // ==========================================================
  // INITIAL LOAD + AUTO REFRESH
  // ==========================================================

  useEffect(() => {

    fetchDashboard();

    const interval =
      setInterval(
        () => {
          fetchDashboard();
        },
        30000,
      );

    return () =>
      clearInterval(interval);

  }, []);

  // ==========================================================
  // SEVERITY CLASS
  // ==========================================================

  const getSeverityClass =
    (
      severity: string,
    ) => {

      switch (severity) {

        case "CRITICAL":

          return "bg-red-500/20 text-red-400 border-red-500/30";

        case "HIGH":

          return "bg-orange-500/20 text-orange-400 border-orange-500/30";

        case "MEDIUM":

          return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";

        case "LOW":

          return "bg-green-500/20 text-green-400 border-green-500/30";

        default:

          return "bg-white/5 text-muted border-white/10";
      }
    };

  // ==========================================================
  // ACTION CLASS
  // ==========================================================

  const getActionClass =
    (
      action: string,
    ) => {

      switch (action) {

        case "BLOCK":

          return "text-red-400";

        case "ALERT":

          return "text-yellow-400";

        case "MONITOR":

          return "text-blue-400";

        default:

          return "text-muted";
      }
    };

  // ==========================================================
  // FORMAT DATE
  // ==========================================================

  const formatDate =
    (
      date: string,
    ) => {

      try {

        return new Date(
          date,
        ).toLocaleDateString(
          "en-IN",
          {
            day: "2-digit",
            month: "short",
          },
        );

      } catch {

        return date;
      }
    };

  // ==========================================================
  // FORMAT BLOCK EXPIRATION
  // ==========================================================

  const formatExpiration =
    (
      expiresAt:
        | number
        | null,
    ) => {

      if (
        expiresAt === null
      ) {

        return "Permanent";
      }

      return new Date(
        expiresAt,
      ).toLocaleTimeString(
        "en-IN",
        {
          hour: "2-digit",
          minute: "2-digit",
        },
      );
    };

  // ==========================================================
  // MAX TIMELINE VALUE
  // ==========================================================

  const timeline =
    statistics?.timeline || [];

  const maxTimeline =
    Math.max(
      ...timeline.map(
        (item) =>
          item.events,
      ),
      1,
    );

  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <div className="min-h-screen bg-navy text-white px-6 md:px-12 py-10">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">

        <div>

          <div className="flex items-center gap-3 mb-2">

            <ShieldCheck className="w-8 h-8 text-lime" />

            <h1 className="font-playfair text-3xl md:text-4xl font-black">
              Security Dashboard
            </h1>

          </div>

          <p className="text-muted">
            Monitor traffic anomalies, risk
            levels, and security enforcement.
          </p>

        </div>

        <div className="flex gap-3">

          <button
            onClick={
              fetchDashboard
            }
            disabled={loading}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
          >

            <RefreshCw
              className={`w-4 h-4 ${
                loading
                  ? "animate-spin"
                  : ""
              }`}
            />

            Refresh

          </button>

          <button
            onClick={
              runAnalysis
            }
            disabled={analyzing}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-lime text-navy font-bold hover:bg-lime-2 transition"
          >

            <Activity
              className={`w-4 h-4 ${
                analyzing
                  ? "animate-pulse"
                  : ""
              }`}
            />

            {analyzing
              ? "Analyzing..."
              : "Run Analysis"}

          </button>

        </div>

      </div>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (

        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">

          {error}

        </div>

      )}

      {/* ======================================================
          STATISTICS CARDS
      ====================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">

        <StatCard
          title="Total Events"
          value={
            statistics?.total_events ??
            events.length
          }
          icon={
            <Activity className="w-5 h-5 text-blue-400" />
          }
        />

        <StatCard
          title="Critical Events"
          value={
            statistics?.critical_events ??
            0
          }
          icon={
            <ShieldAlert className="w-5 h-5 text-red-400" />
          }
          valueClass="text-red-400"
        />

        <StatCard
          title="High Risk"
          value={
            statistics?.high_events ??
            0
          }
          icon={
            <AlertTriangle className="w-5 h-5 text-orange-400" />
          }
          valueClass="text-orange-400"
        />

        <StatCard
          title="Blocked IPs"
          value={
            statistics?.currently_blocked_ips ??
            blockedIPs.length
          }
          icon={
            <Ban className="w-5 h-5 text-red-400" />
          }
          valueClass="text-red-400"
        />

      </div>

      {/* ======================================================
          SECONDARY STATISTICS
      ====================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">

        <MiniStat
          title="Blocked Events"
          value={
            statistics?.blocked_events ??
            0
          }
        />

        <MiniStat
          title="Security Alerts"
          value={
            statistics?.alert_events ??
            0
          }
        />

        <MiniStat
          title="Monitoring"
          value={
            statistics?.monitored_events ??
            0
          }
        />

      </div>

      {/* ======================================================
          CHARTS
      ====================================================== */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">

        {/* ====================================================
            EVENTS TIMELINE
        ==================================================== */}

        <div className="bg-navy-2 border border-white/5 rounded-2xl p-6">

          <div className="flex items-center justify-between mb-6">

            <div>

              <h2 className="font-bold text-lg">
                Security Events
              </h2>

              <p className="text-xs text-muted mt-1">
                Events detected during the last 7 days
              </p>

            </div>

            <Activity className="w-5 h-5 text-blue-400" />

          </div>

          {timeline.length === 0 ? (

            <div className="h-52 flex items-center justify-center text-muted">

              No timeline data available.

            </div>

          ) : (

            <div className="h-52 flex items-end gap-3">

              {timeline.map(
                (
                  item,
                  index,
                ) => {

                  const height =
                    Math.max(
                      (
                        item.events /
                        maxTimeline
                      ) * 100,
                      5,
                    );

                  return (

                    <div
                      key={`${item.date}-${index}`}
                      className="flex-1 h-full flex flex-col justify-end items-center gap-2"
                    >

                      <span className="text-xs text-muted">

                        {item.events}

                      </span>

                      <div
                        className="w-full rounded-t-lg bg-lime transition-all"
                        style={{
                          height:
                            `${height}%`,
                        }}
                        title={`${item.events} events`}
                      />

                      <span className="text-[10px] text-muted">

                        {formatDate(
                          item.date,
                        )}

                      </span>

                    </div>

                  );
                },
              )}

            </div>

          )}

        </div>

        {/* ====================================================
            SEVERITY CHART
        ==================================================== */}

        <div className="bg-navy-2 border border-white/5 rounded-2xl p-6">

          <div className="flex items-center justify-between mb-6">

            <div>

              <h2 className="font-bold text-lg">
                Severity Distribution
              </h2>

              <p className="text-xs text-muted mt-1">
                Security event severity levels
              </p>

            </div>

            <ShieldAlert className="w-5 h-5 text-red-400" />

          </div>

          <div className="space-y-5">

            <SeverityBar
              label="CRITICAL"
              value={
                statistics?.severity_distribution
                  ?.CRITICAL ?? 0
              }
              total={
                statistics?.total_events ?? 1
              }
              className="bg-red-500"
              textClass="text-red-400"
            />

            <SeverityBar
              label="HIGH"
              value={
                statistics?.severity_distribution
                  ?.HIGH ?? 0
              }
              total={
                statistics?.total_events ?? 1
              }
              className="bg-orange-500"
              textClass="text-orange-400"
            />

            <SeverityBar
              label="MEDIUM"
              value={
                statistics?.severity_distribution
                  ?.MEDIUM ?? 0
              }
              total={
                statistics?.total_events ?? 1
              }
              className="bg-yellow-500"
              textClass="text-yellow-400"
            />

            <SeverityBar
              label="LOW"
              value={
                statistics?.severity_distribution
                  ?.LOW ?? 0
              }
              total={
                statistics?.total_events ?? 1
              }
              className="bg-green-500"
              textClass="text-green-400"
            />

          </div>

        </div>

      </div>

      {/* ======================================================
          RECENT SECURITY EVENTS
      ====================================================== */}

      <div className="bg-navy-2 border border-white/5 rounded-2xl overflow-hidden mb-10">

        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">

          <div>

            <h2 className="font-bold text-lg">
              Recent Security Events
            </h2>

            <p className="text-xs text-muted mt-1">
              Latest detected traffic activity
            </p>

          </div>

          <div className="flex items-center gap-2 text-xs text-green-400">

            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />

            Monitoring

          </div>

        </div>

        {loading ? (

          <div className="p-10 text-center text-muted">
            Loading security events...
          </div>

        ) : events.length === 0 ? (

          <div className="p-10 text-center">

            <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />

            <p className="text-white font-semibold">
              No security events
            </p>

            <p className="text-muted text-sm mt-1">
              The system has not detected any
              suspicious traffic yet.
            </p>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead>

                <tr className="border-b border-white/5 text-muted text-xs uppercase tracking-wider">

                  <th className="text-left px-6 py-4">
                    ID
                  </th>

                  <th className="text-left px-6 py-4">
                    IP Address
                  </th>

                  <th className="text-left px-6 py-4">
                    Severity
                  </th>

                  <th className="text-left px-6 py-4">
                    Risk
                  </th>

                  <th className="text-left px-6 py-4">
                    Anomaly
                  </th>

                  <th className="text-left px-6 py-4">
                    Action
                  </th>

                  <th className="text-left px-6 py-4">
                    Status
                  </th>

                  <th className="text-left px-6 py-4">
                    Time
                  </th>

                </tr>

              </thead>

              <tbody>

                {events
                  .slice(0, 10)
                  .map(
                    (
                      event,
                    ) => (

                      <tr
                        key={
                          event.id
                        }
                        className="border-b border-white/5 hover:bg-white/[0.02] transition"
                      >

                        <td className="px-6 py-4 text-muted">
                          #{event.id}
                        </td>

                        <td className="px-6 py-4 font-mono text-xs">
                          {event.ip_address}
                        </td>

                        <td className="px-6 py-4">

                          <span
                            className={`inline-flex px-3 py-1 rounded-full border text-xs font-bold ${getSeverityClass(
                              event.severity,
                            )}`}
                          >
                            {event.severity}
                          </span>

                        </td>

                        <td className="px-6 py-4 font-bold">
                          {event.risk_score ??
                            0}
                        </td>

                        <td className="px-6 py-4">
                          {event.anomaly_score ??
                            0}
                        </td>

                        <td
                          className={`px-6 py-4 font-bold ${getActionClass(
                            event.action,
                          )}`}
                        >
                          {event.action}
                        </td>

                        <td className="px-6 py-4">

                          <span className="inline-flex items-center gap-2">

                            {event.action ===
                            "BLOCK" ? (

                              <Ban className="w-4 h-4 text-red-400" />

                            ) : (

                              <CheckCircle2 className="w-4 h-4 text-green-400" />

                            )}

                            {event.status}

                          </span>

                        </td>

                        <td className="px-6 py-4 text-xs text-muted whitespace-nowrap">

                          {new Date(
                            event.created_at,
                          ).toLocaleString()}

                        </td>

                      </tr>

                    ),
                  )}

              </tbody>

            </table>

          </div>

        )}

      </div>

      {/* ======================================================
          BLOCKED IP TABLE
      ====================================================== */}

      <div className="bg-navy-2 border border-white/5 rounded-2xl overflow-hidden mb-10">

        <div className="px-6 py-5 border-b border-white/5">

          <div className="flex items-center gap-3">

            <Ban className="w-5 h-5 text-red-400" />

            <div>

              <h2 className="font-bold text-lg">
                Currently Blocked IPs
              </h2>

              <p className="text-xs text-muted mt-1">
                Active IP enforcement rules
              </p>

            </div>

          </div>

        </div>

        {blockedIPs.length === 0 ? (

          <div className="p-10 text-center">

            <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />

            <p className="font-semibold">
              No IP addresses are currently blocked.
            </p>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead>

                <tr className="border-b border-white/5 text-muted text-xs uppercase tracking-wider">

                  <th className="text-left px-6 py-4">
                    IP Address
                  </th>

                  <th className="text-left px-6 py-4">
                    Reason
                  </th>

                  <th className="text-left px-6 py-4">
                    Blocked At
                  </th>

                  <th className="text-left px-6 py-4">
                    Expires
                  </th>

                </tr>

              </thead>

              <tbody>

                {blockedIPs.map(
                  (
                    blocked,
                  ) => (

                    <tr
                      key={
                        blocked.ip
                      }
                      className="border-b border-white/5 hover:bg-white/[0.02]"
                    >

                      <td className="px-6 py-4 font-mono text-xs text-red-300">

                        {blocked.ip}

                      </td>

                      <td className="px-6 py-4">

                        {blocked.reason}

                      </td>

                      <td className="px-6 py-4 text-xs text-muted">

                        {new Date(
                          blocked.blockedAt,
                        ).toLocaleString()}

                      </td>

                      <td className="px-6 py-4 text-xs">

                        <span className="inline-flex items-center gap-2">

                          <Clock className="w-4 h-4 text-orange-400" />

                          {formatExpiration(
                            blocked.expiresAt,
                          )}

                        </span>

                      </td>

                    </tr>

                  ),
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

      {/* ======================================================
          SECURITY PIPELINE
      ====================================================== */}

      <div className="bg-navy-2 border border-white/5 rounded-2xl p-6">

        <h2 className="font-bold text-lg mb-6">
          Security Pipeline
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

          <PipelineStep
            number="01"
            title="Traffic"
            description="HTTP requests"
          />

          <PipelineStep
            number="02"
            title="Features"
            description="Extract traffic features"
          />

          <PipelineStep
            number="03"
            title="Anomaly"
            description="Detect suspicious behavior"
          />

          <PipelineStep
            number="04"
            title="Risk"
            description="Calculate risk score"
          />

          <PipelineStep
            number="05"
            title="Enforcement"
            description="Monitor / Alert / Block"
          />

        </div>

      </div>

    </div>
  );
}

// ============================================================
// STAT CARD
// ============================================================

interface StatCardProps {

  title: string;

  value: number;

  icon: React.ReactNode;

  valueClass?: string;
}

function StatCard({
  title,
  value,
  icon,
  valueClass = "",
}: StatCardProps) {

  return (

    <div className="bg-navy-2 border border-white/5 rounded-2xl p-6">

      <div className="flex items-center justify-between mb-4">

        <span className="text-muted text-sm">
          {title}
        </span>

        {icon}

      </div>

      <div
        className={`text-3xl font-black ${valueClass}`}
      >
        {value}
      </div>

    </div>
  );
}

// ============================================================
// MINI STAT
// ============================================================

interface MiniStatProps {

  title: string;

  value: number;
}

function MiniStat({
  title,
  value,
}: MiniStatProps) {

  return (

    <div className="bg-white/[0.03] border border-white/5 rounded-xl p-5">

      <div className="text-xs text-muted mb-2">
        {title}
      </div>

      <div className="text-2xl font-black">
        {value}
      </div>

    </div>
  );
}

// ============================================================
// SEVERITY BAR
// ============================================================

interface SeverityBarProps {

  label: string;

  value: number;

  total: number;

  className: string;

  textClass: string;
}

function SeverityBar({
  label,
  value,
  total,
  className,
  textClass,
}: SeverityBarProps) {

  const percentage =
    total > 0
      ? Math.min(
          100,
          (value / total) * 100,
        )
      : 0;

  return (

    <div>

      <div className="flex items-center justify-between mb-2">

        <span
          className={`text-xs font-bold ${textClass}`}
        >
          {label}
        </span>

        <span className="text-xs text-muted">
          {value}
        </span>

      </div>

      <div className="h-2 bg-white/5 rounded-full overflow-hidden">

        <div
          className={`h-full rounded-full ${className}`}
          style={{
            width:
              `${percentage}%`,
          }}
        />

      </div>

    </div>
  );
}

// ============================================================
// PIPELINE STEP
// ============================================================

interface PipelineStepProps {

  number: string;

  title: string;

  description: string;
}

function PipelineStep({
  number,
  title,
  description,
}: PipelineStepProps) {

  return (

    <div className="p-5 rounded-xl bg-white/[0.03] border border-white/5">

      <div className="text-xs text-lime font-bold mb-3">
        {number}
      </div>

      <div className="font-bold mb-1">
        {title}
      </div>

      <div className="text-xs text-muted">
        {description}
      </div>

    </div>
  );
}
