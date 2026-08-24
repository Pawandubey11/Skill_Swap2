import React, { useEffect, useState, useMemo } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Ban,
  Activity,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Unlock,
  Search,
  Filter,
  ArrowUpRight,
  Zap,
  Server,
  Layers,
  Radio,
  SlidersHorizontal,
  XCircle,
  Eye,
  Check,
  Info
} from "lucide-react";

// ============================================================
// TYPES
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
  risk_reasons: string[] | string;
  message: string;
  created_at: string;
}

interface BlockedIP {
  ip: string;
  blockedAt: number;
  expiresAt: number | null;
  reason: string;
}

interface TimelineItem {
  date: string;
  events: number;
}

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

export default function SecurityDashboard() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [statistics, setStatistics] = useState<SecurityStatistics | null>(null);
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [unblockingIp, setUnblockingIp] = useState<string | null>(null);
  const [updatingEventId, setUpdatingEventId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [actionFilter, setActionFilter] = useState<string>("ALL");

  // ==========================================================
  // API FETCHERS
  // ==========================================================

  const fetchEvents = async () => {
    try {
      const response = await fetch("/api/security-events");
      if (!response.ok) throw new Error("Failed to fetch security events");
      const data = await response.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching events:", err);
      setError("Unable to load security events.");
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await fetch("/api/security/statistics");
      if (!response.ok) throw new Error("Failed to fetch security statistics");
      const data = await response.json();
      setStatistics(data);
    } catch (err) {
      console.error("Error fetching statistics:", err);
      setError("Unable to load security statistics.");
    }
  };

  const fetchBlockedIPs = async () => {
    try {
      const response = await fetch("/api/security/blocked-ips");
      if (!response.ok) throw new Error("Failed to fetch blocked IPs");
      const data = await response.json();
      setBlockedIPs(Array.isArray(data.blocked_ips) ? data.blocked_ips : []);
    } catch (err) {
      console.error("Error fetching blocked IPs:", err);
      setError("Unable to load blocked IPs.");
    }
  };

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError("");
      await Promise.all([fetchEvents(), fetchStatistics(), fetchBlockedIPs()]);
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    try {
      setAnalyzing(true);
      setError("");
      setSuccessMessage("");
      const response = await fetch("/api/security/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) throw new Error("Security analysis failed");
      await response.json();
      setSuccessMessage("Security analysis completed successfully!");
      await fetchDashboard();
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      console.error(err);
      setError("Security analysis could not be completed.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleUnblockIP = async (ipAddress: string) => {
    try {
      setUnblockingIp(ipAddress);
      setError("");
      setSuccessMessage("");
      const response = await fetch("/api/security/unblock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip_address: ipAddress })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.message || "Failed to unblock IP");

      setSuccessMessage(`IP address ${ipAddress} unblocked successfully.`);
      await fetchDashboard();
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err: any) {
      console.error("Error unblocking IP:", err);
      setError(err.message || "Failed to unblock IP address.");
    } finally {
      setUnblockingIp(null);
    }
  };

  const handleUpdateStatus = async (eventId: number, newStatus: string) => {
    try {
      setUpdatingEventId(eventId);
      const response = await fetch(`/api/security-events/${eventId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (!response.ok) throw new Error("Failed to update status");

      setEvents((prev) =>
        prev.map((evt) => (evt.id === eventId ? { ...evt, status: newStatus } : evt))
      );
    } catch (err) {
      console.error("Failed to update status:", err);
      setError("Unable to update security event status.");
    } finally {
      setUpdatingEventId(null);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(() => {
      fetchDashboard();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // ==========================================================
  // FILTERED EVENTS
  // ==========================================================

  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      const matchesSearch =
        evt.ip_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evt.event_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (evt.message && evt.message.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesSeverity =
        severityFilter === "ALL" || evt.severity.toUpperCase() === severityFilter.toUpperCase();

      const matchesAction =
        actionFilter === "ALL" || evt.action.toUpperCase() === actionFilter.toUpperCase();

      return matchesSearch && matchesSeverity && matchesAction;
    });
  }, [events, searchQuery, severityFilter, actionFilter]);

  // Max Timeline Value
  const timeline = statistics?.timeline || [];
  const maxTimeline = Math.max(...timeline.map((item) => item.events), 1);

  return (
    <div className="min-h-screen bg-[#0A0D14] text-slate-100 px-4 md:px-8 py-8 selection:bg-lime selection:text-navy">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ======================================================
            HEADER & SYSTEM STATUS
        ====================================================== */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-navy-2/60 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-lime/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          <div className="space-y-2 relative z-10">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="p-2.5 rounded-2xl bg-lime/10 border border-lime/30 text-lime shadow-inner">
                <ShieldCheck className="w-7 h-7" />
              </span>
              <h1 className="font-playfair text-3xl md:text-4xl font-black tracking-tight text-white">
                Security Operations Center
              </h1>

              {/* Status Badge */}
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Real-Time Protection Active
              </div>
            </div>
            <p className="text-slate-400 text-sm md:text-base max-w-2xl">
              Continuous threat detection, automated IP enforcement, anomaly analytics, and real-time security event auditing.
            </p>
          </div>

          <div className="flex items-center gap-3 relative z-10 flex-wrap">
            <button
              onClick={fetchDashboard}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-sm font-semibold transition-all duration-200 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-lime" : ""}`} />
              Refresh Data
            </button>

            <button
              onClick={runAnalysis}
              disabled={analyzing}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-lime to-lime-2 text-navy text-sm font-bold shadow-lg shadow-lime/20 hover:shadow-lime/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
            >
              <Zap className={`w-4 h-4 ${analyzing ? "animate-bounce" : ""}`} />
              {analyzing ? "Analyzing Traffic..." : "Run Security Scan"}
            </button>
          </div>
        </div>

        {/* ======================================================
            NOTIFICATIONS / MESSAGES
        ====================================================== */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm animate-fade-in">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm animate-fade-in">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ======================================================
            PRIMARY STAT CARDS
        ====================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            title="Total Events Recorded"
            value={statistics?.total_events ?? events.length}
            subtitle="Processed traffic logs"
            icon={<Activity className="w-5 h-5 text-blue-400" />}
            badgeColor="bg-blue-500/10 border-blue-500/20 text-blue-400"
          />

          <StatCard
            title="Critical Threats"
            value={statistics?.critical_events ?? 0}
            subtitle="Immediate action required"
            icon={<ShieldAlert className="w-5 h-5 text-rose-400" />}
            valueColor="text-rose-400"
            badgeColor="bg-rose-500/10 border-rose-500/20 text-rose-400"
          />

          <StatCard
            title="High Risk Incidents"
            value={statistics?.high_events ?? 0}
            subtitle="Elevated threat level"
            icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}
            valueColor="text-amber-400"
            badgeColor="bg-amber-500/10 border-amber-500/20 text-amber-400"
          />

          <StatCard
            title="Active Blocked IPs"
            value={statistics?.currently_blocked_ips ?? blockedIPs.length}
            subtitle="Enforced IP isolation"
            icon={<Ban className="w-5 h-5 text-red-400" />}
            valueColor="text-red-400"
            badgeColor="bg-red-500/10 border-red-500/20 text-red-400"
          />
        </div>

        {/* Secondary Stats Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MiniStatCard
            label="Blocked Traffic Events"
            value={statistics?.blocked_events ?? 0}
            icon={<Ban className="w-4 h-4 text-red-400" />}
          />
          <MiniStatCard
            label="Security Alerts Issued"
            value={statistics?.alert_events ?? 0}
            icon={<AlertTriangle className="w-4 h-4 text-amber-400" />}
          />
          <MiniStatCard
            label="Monitored Normal Traffic"
            value={statistics?.monitored_events ?? 0}
            icon={<Eye className="w-4 h-4 text-blue-400" />}
          />
        </div>

        {/* ======================================================
            ANALYTICS & CHARTS
        ====================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* 7-Day Timeline Chart */}
          <div className="lg:col-span-7 bg-navy-2/60 border border-white/10 rounded-3xl p-6 md:p-7 backdrop-blur-md flex flex-col justify-between">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-lime" />
                  Security Event Timeline
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Detected security events over the last 7 days</p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 font-mono">
                7 Days Window
              </span>
            </div>

            {timeline.length === 0 ? (
              <div className="h-56 flex flex-col items-center justify-center text-slate-500 border border-dashed border-white/10 rounded-2xl">
                <Info className="w-8 h-8 mb-2 text-slate-600" />
                <p className="text-sm">No security timeline data recorded yet.</p>
              </div>
            ) : (
              <div className="h-56 flex items-end justify-between gap-3 pt-6 pb-2 px-2">
                {timeline.map((item, index) => {
                  const heightPercentage = Math.max((item.events / maxTimeline) * 100, 8);
                  return (
                    <div key={`${item.date}-${index}`} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                      <span className="text-xs font-semibold text-slate-300 opacity-80 group-hover:opacity-100 transition-opacity">
                        {item.events}
                      </span>
                      <div className="w-full max-w-[42px] bg-white/5 rounded-xl p-1 h-full flex items-end">
                        <div
                          className="w-full bg-gradient-to-t from-lime/60 to-lime rounded-lg transition-all duration-500 group-hover:from-lime group-hover:to-lime-2 shadow-lg shadow-lime/10"
                          style={{ height: `${heightPercentage}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono whitespace-nowrap mt-1">
                        {formatDateLabel(item.date)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Severity Distribution */}
          <div className="lg:col-span-5 bg-navy-2/60 border border-white/10 rounded-3xl p-6 md:p-7 backdrop-blur-md flex flex-col justify-between">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                  Severity Distribution
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Classification by severity threat level</p>
              </div>
            </div>

            <div className="space-y-4">
              <SeverityRow
                label="CRITICAL"
                value={statistics?.severity_distribution?.CRITICAL ?? 0}
                total={statistics?.total_events ?? 1}
                barColor="bg-rose-500"
                textColor="text-rose-400"
              />

              <SeverityRow
                label="HIGH"
                value={statistics?.severity_distribution?.HIGH ?? 0}
                total={statistics?.total_events ?? 1}
                barColor="bg-amber-500"
                textColor="text-amber-400"
              />

              <SeverityRow
                label="MEDIUM"
                value={statistics?.severity_distribution?.MEDIUM ?? 0}
                total={statistics?.total_events ?? 1}
                barColor="bg-yellow-500"
                textColor="text-yellow-400"
              />

              <SeverityRow
                label="LOW"
                value={statistics?.severity_distribution?.LOW ?? 0}
                total={statistics?.total_events ?? 1}
                barColor="bg-emerald-500"
                textColor="text-emerald-400"
              />
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
              <span>Risk Aggregation Policy: v2.4</span>
              <span className="text-lime font-mono">100% Parameterized</span>
            </div>
          </div>
        </div>

        {/* ======================================================
            RECENT EVENTS TABLE
        ====================================================== */}
        <div className="bg-navy-2/60 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-md">
          
          {/* Table Controls Header */}
          <div className="p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              {/* Recent Events & BarChart / LineChart visualizers */}
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-lime" />
                Recent Events Log
              </h2>
              <p className="text-xs text-slate-400 mt-1">Audit log of recent security triggers and automated responses</p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search IP / event..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 outline-none focus:border-lime/50 transition-all w-44 md:w-56"
                />
              </div>

              {/* Severity Filter */}
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-lime/50 cursor-pointer"
              >
                <option value="ALL" className="bg-navy text-slate-200">Severity: All</option>
                <option value="CRITICAL" className="bg-navy text-slate-200">Critical</option>
                <option value="HIGH" className="bg-navy text-slate-200">High</option>
                <option value="MEDIUM" className="bg-navy text-slate-200">Medium</option>
                <option value="LOW" className="bg-navy text-slate-200">Low</option>
              </select>

              {/* Action Filter */}
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-lime/50 cursor-pointer"
              >
                <option value="ALL" className="bg-navy text-slate-200">Action: All</option>
                <option value="BLOCK" className="bg-navy text-slate-200">Block</option>
                <option value="ALERT" className="bg-navy text-slate-200">Alert</option>
                <option value="MONITOR" className="bg-navy text-slate-200">Monitor</option>
              </select>
            </div>
          </div>

          {/* Table Content */}
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-lime mx-auto mb-3" />
              <p className="text-sm">Loading security events...</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto opacity-80" />
              <p className="text-white font-semibold text-base">No matching security events found</p>
              <p className="text-slate-400 text-xs max-w-md mx-auto">
                No events match your current search or filter criteria. Run a security scan to evaluate incoming traffic.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 text-xs uppercase tracking-wider bg-white/[0.02]">
                    <th className="px-6 py-4 font-semibold">ID</th>
                    <th className="px-6 py-4 font-semibold">Target IP</th>
                    <th className="px-6 py-4 font-semibold">Event Type</th>
                    <th className="px-6 py-4 font-semibold">Severity</th>
                    <th className="px-6 py-4 font-semibold">Risk Score</th>
                    <th className="px-6 py-4 font-semibold">Action</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredEvents.slice(0, 20).map((evt) => (
                    <tr key={evt.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 text-xs font-mono text-slate-400">#{evt.id}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-200 font-semibold">{evt.ip_address}</td>
                      <td className="px-6 py-4 text-xs text-slate-300">{evt.event_type}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${getSeverityBadgeStyle(evt.severity)}`}>
                          {evt.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-xs">
                        <span className={evt.risk_score >= 60 ? "text-rose-400" : evt.risk_score >= 30 ? "text-amber-400" : "text-slate-300"}>
                          {evt.risk_score ?? 0}/100
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-xs">
                        <span className={getActionStyle(evt.action)}>{evt.action}</span>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={evt.status || "OPEN"}
                          disabled={updatingEventId === evt.id}
                          onChange={(e) => handleUpdateStatus(evt.id, e.target.value)}
                          className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-200 outline-none focus:border-lime/50 cursor-pointer disabled:opacity-50 font-semibold"
                        >
                          <option value="OPEN" className="bg-navy text-slate-200">OPEN</option>
                          <option value="INVESTIGATING" className="bg-navy text-slate-200">INVESTIGATING</option>
                          <option value="RESOLVED" className="bg-navy text-slate-200">RESOLVED</option>
                          <option value="BLOCKED" className="bg-navy text-slate-200">BLOCKED</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400 whitespace-nowrap font-mono">
                        {new Date(evt.created_at).toLocaleString("en-IN", {
                          month: "short",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit"
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ======================================================
            CURRENTLY BLOCKED IPS TABLE
        ====================================================== */}
        <div className="bg-navy-2/60 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-md">
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
                <Ban className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-white">Currently Blocked IP Addresses</h2>
                <p className="text-xs text-slate-400 mt-0.5">Active IP isolation rules enforced by the firewall engine</p>
              </div>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-mono font-bold">
              {blockedIPs.length} Blocked
            </span>
          </div>

          {blockedIPs.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <p className="text-white font-semibold">No IP addresses are currently blocked.</p>
              <p className="text-xs text-slate-400">All client connections are operating under normal security conditions.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 text-xs uppercase tracking-wider bg-white/[0.02]">
                    <th className="px-6 py-4 font-semibold">Blocked IP</th>
                    <th className="px-6 py-4 font-semibold">Violation Reason</th>
                    <th className="px-6 py-4 font-semibold">Blocked At</th>
                    <th className="px-6 py-4 font-semibold">Expiration Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {blockedIPs.map((blocked) => (
                    <tr key={blocked.ip} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-rose-300 font-bold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        {blocked.ip}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-300">{blocked.reason}</td>
                      <td className="px-6 py-4 text-xs text-slate-400 font-mono">
                        {new Date(blocked.blockedAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono">
                        <span className="inline-flex items-center gap-1.5 text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                          <Clock className="w-3.5 h-3.5" />
                          {formatBlockExpiration(blocked.expiresAt)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleUnblockIP(blocked.ip)}
                          disabled={unblockingIp === blocked.ip}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold transition-all disabled:opacity-50"
                        >
                          <Unlock className={`w-3.5 h-3.5 ${unblockingIp === blocked.ip ? "animate-spin" : ""}`} />
                          {unblockingIp === blocked.ip ? "Unblocking..." : "Unblock IP"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ======================================================
            SECURITY DETECTION PIPELINE
        ====================================================== */}
        <div className="bg-navy-2/60 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-md">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Radio className="w-5 h-5 text-lime" />
            Automated Security Detection Pipeline
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <PipelineStepCard
              number="01"
              title="Traffic Logger"
              description="Capture all HTTP requests, IPs, methods & status codes in MySQL"
            />
            <PipelineStepCard
              number="02"
              title="Feature Extraction"
              description="Aggregate traffic volume, error rates, and endpoint diversity per IP"
            />
            <PipelineStepCard
              number="03"
              title="Anomaly Detection"
              description="Identify suspicious volume spikes and error anomalies"
            />
            <PipelineStepCard
              number="04"
              title="Risk Scoring"
              description="Calculate 0-100 risk score and assign threat level (CRITICAL/HIGH/MEDIUM)"
            />
            <PipelineStepCard
              number="05"
              title="IP Enforcement"
              description="Apply active IP blocking, issue security alerts, and log events"
            />
          </div>
        </div>

      </div>
    </div>
  );
}

// ============================================================
// HELPER COMPONENTS & STYLES
// ============================================================

interface StatCardProps {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
  valueColor?: string;
  badgeColor?: string;
}

function StatCard({ title, value, subtitle, icon, valueColor = "text-white", badgeColor = "bg-white/5 border-white/10" }: StatCardProps) {
  return (
    <div className="bg-navy-2/60 border border-white/10 rounded-3xl p-6 backdrop-blur-md flex flex-col justify-between hover:border-white/20 transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-400">{title}</span>
        <span className={`p-2 rounded-xl border ${badgeColor}`}>{icon}</span>
      </div>
      <div>
        <div className={`text-3xl font-black font-mono tracking-tight ${valueColor}`}>{value}</div>
        <p className="text-[11px] text-slate-400 mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

interface MiniStatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
}

function MiniStatCard({ label, value, icon }: MiniStatCardProps) {
  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
      <div>
        <div className="text-xs text-slate-400 font-medium">{label}</div>
        <div className="text-xl font-bold text-white font-mono mt-0.5">{value}</div>
      </div>
      <div className="p-2 rounded-xl bg-white/5 border border-white/10">{icon}</div>
    </div>
  );
}

interface SeverityRowProps {
  label: string;
  value: number;
  total: number;
  barColor: string;
  textColor: string;
}

function SeverityRow({ label, value, total, barColor, textColor }: SeverityRowProps) {
  const percentage = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className={`font-bold font-mono ${textColor}`}>{label}</span>
        <span className="text-slate-400 font-mono">{value} ({percentage}%)</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
        <div className={`h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

interface PipelineStepCardProps {
  number: string;
  title: string;
  description: string;
}

function PipelineStepCard({ number, title, description }: PipelineStepCardProps) {
  return (
    <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-lime/30 transition-all group">
      <span className="text-xs font-mono font-bold text-lime bg-lime/10 px-2 py-0.5 rounded border border-lime/20">{number}</span>
      <h3 className="font-bold text-white text-sm mt-3 group-hover:text-lime transition-colors">{title}</h3>
      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{description}</p>
    </div>
  );
}

// Helpers
function getSeverityBadgeStyle(severity: string) {
  switch (severity?.toUpperCase()) {
    case "CRITICAL":
      return "bg-rose-500/10 text-rose-400 border-rose-500/30";
    case "HIGH":
      return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    case "MEDIUM":
      return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
    case "LOW":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    default:
      return "bg-white/5 text-slate-400 border-white/10";
  }
}

function getActionStyle(action: string) {
  switch (action?.toUpperCase()) {
    case "BLOCK":
      return "text-rose-400";
    case "ALERT":
      return "text-amber-400";
    case "MONITOR":
      return "text-blue-400";
    default:
      return "text-slate-400";
  }
}

function formatDateLabel(dateStr: string) {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", { month: "short", day: "2-digit" });
  } catch {
    return dateStr;
  }
}

function formatBlockExpiration(expiresAt: number | null) {
  if (expiresAt === null) return "Permanent Block";
  const now = Date.now();
  if (expiresAt <= now) return "Expired";
  const diffMinutes = Math.ceil((expiresAt - now) / 60000);
  return `${diffMinutes}m remaining`;
}
