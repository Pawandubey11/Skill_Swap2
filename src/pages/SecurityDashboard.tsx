import React, { useEffect, useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Ban,
  Activity,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

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

export default function SecurityDashboard() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/security-events");

      if (!response.ok) {
        throw new Error("Failed to fetch security events");
      }

      const data = await response.json();

      setEvents(data);
    } catch (err) {
      console.error(err);
      setError("Unable to load security events.");
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    try {
      setAnalyzing(true);
      setError("");

      const response = await fetch(
        "/api/security/analyze",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(
          "Security analysis failed",
        );
      }

      await response.json();

      await fetchEvents();
    } catch (err) {
      console.error(err);
      setError(
        "Security analysis could not be completed.",
      );
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    fetchEvents();

    const interval = setInterval(() => {
      fetchEvents();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const totalEvents = events.length;

  const criticalEvents = events.filter(
    (event) =>
      event.severity === "CRITICAL",
  ).length;

  const highEvents = events.filter(
    (event) =>
      event.severity === "HIGH",
  ).length;

  const blockedEvents = events.filter(
    (event) =>
      event.action === "BLOCK",
  ).length;

  const getSeverityClass = (
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
        return "bg-white/10 text-white border-white/10";
    }
  };

  const getActionClass = (
    action: string,
  ) => {
    switch (action) {
      case "BLOCK":
        return "text-red-400";

      case "ALERT":
        return "text-yellow-400";

      case "MONITOR":
        return "text-blue-400";

      case "NORMAL":
        return "text-green-400";

      default:
        return "text-muted";
    }
  };

  return (
    <div className="min-h-screen bg-navy text-white px-6 md:px-12 py-10">

      {/* HEADER */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">

        <div>
          <div className="flex items-center gap-3 mb-2">

            <ShieldCheck className="w-8 h-8 text-lime" />

            <h1 className="font-playfair text-3xl md:text-4xl font-black">
              Security Dashboard
            </h1>

          </div>

          <p className="text-muted">
            Monitor traffic anomalies, risk levels,
            and security enforcement.
          </p>
        </div>

        <div className="flex gap-3">

          <button
            onClick={fetchEvents}
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
            onClick={runAnalysis}
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

      {/* ERROR */}

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      )}

      {/* STATISTICS */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">

        <div className="bg-navy-2 border border-white/5 rounded-2xl p-6">

          <div className="flex items-center justify-between mb-4">

            <span className="text-muted text-sm">
              Total Events
            </span>

            <Activity className="w-5 h-5 text-blue-400" />

          </div>

          <div className="text-3xl font-black">
            {totalEvents}
          </div>

        </div>

        <div className="bg-navy-2 border border-white/5 rounded-2xl p-6">

          <div className="flex items-center justify-between mb-4">

            <span className="text-muted text-sm">
              Critical
            </span>

            <ShieldAlert className="w-5 h-5 text-red-400" />

          </div>

          <div className="text-3xl font-black text-red-400">
            {criticalEvents}
          </div>

        </div>

        <div className="bg-navy-2 border border-white/5 rounded-2xl p-6">

          <div className="flex items-center justify-between mb-4">

            <span className="text-muted text-sm">
              High Risk
            </span>

            <AlertTriangle className="w-5 h-5 text-orange-400" />

          </div>

          <div className="text-3xl font-black text-orange-400">
            {highEvents}
          </div>

        </div>

        <div className="bg-navy-2 border border-white/5 rounded-2xl p-6">

          <div className="flex items-center justify-between mb-4">

            <span className="text-muted text-sm">
              Blocked
            </span>

            <Ban className="w-5 h-5 text-red-400" />

          </div>

          <div className="text-3xl font-black text-red-400">
            {blockedEvents}
          </div>

        </div>

      </div>

      {/* SECURITY EVENTS */}

      <div className="bg-navy-2 border border-white/5 rounded-2xl overflow-hidden">

        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">

          <div>

            <h2 className="font-bold text-lg">
              Security Events
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

                {events.map((event) => (

                  <tr
                    key={event.id}
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
                      {event.risk_score ?? 0}
                    </td>

                    <td className="px-6 py-4">
                      {event.anomaly_score ?? 0}
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

                        {event.status ===
                        "BLOCKED" ? (
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

                ))}

              </tbody>

            </table>

          </div>

        )}

      </div>

      {/* SECURITY ARCHITECTURE */}

      <div className="mt-10 bg-navy-2 border border-white/5 rounded-2xl p-6">

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
