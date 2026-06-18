import React, { useState, useMemo } from "react";
import { 
  ShieldCheck, 
  Search, 
  Clock, 
  Mail, 
  User, 
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Database,
  Building2,
  Filter,
  RefreshCw,
  Sparkles,
  Info,
  Calendar,
  Layers,
  Activity,
  Trash2,
  Edit,
  ArrowRight
} from "lucide-react";

export interface SystemLog {
  id: string;
  adminId: string;
  email: string;
  timestamp: string;
  action?: string;
  details?: string;
  status?: string;
}

interface SystemLogsProps {
  logs: SystemLog[];
  loading: boolean;
  onRefresh: () => void;
}

export const SystemLogs: React.FC<SystemLogsProps> = ({ logs, loading, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [categoryTab, setCategoryTab] = useState<"all" | "logins" | "admin">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "rejected">("all");
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);

  // Categorize log entry helper
  const isLoginRelated = (action: string = "") => {
    const act = action.toLowerCase();
    return act.includes("login") || act.includes("auth") || act.includes("password");
  };

  // Process logs based on selected tabs/searches
  const filteredAndCategorizedLogs = useMemo(() => {
    return logs.filter(log => {
      const action = log.action || "";
      const details = log.details || "";
      const status = log.status || "";
      const email = log.email || "";
      const adminId = log.adminId || "";
      
      // Category Tab filter
      if (categoryTab === "logins" && !isLoginRelated(action)) return false;
      if (categoryTab === "admin" && isLoginRelated(action)) return false;

      // Status Filter
      const isSuccess = status.toLowerCase() === "authorized" || status.toLowerCase() === "success";
      if (statusFilter === "success" && !isSuccess) return false;
      if (statusFilter === "rejected" && isSuccess) return false;

      // Search text filter
      if (searchTerm.trim() !== "") {
        const query = searchTerm.toLowerCase();
        return (
          action.toLowerCase().includes(query) ||
          details.toLowerCase().includes(query) ||
          status.toLowerCase().includes(query) ||
          email.toLowerCase().includes(query) ||
          adminId.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [logs, categoryTab, statusFilter, searchTerm]);

  // Compute stats metrics
  const stats = useMemo(() => {
    let totalLogins = 0;
    let failedLogins = 0;
    let adminOps = 0;
    let criticalWarnings = 0;

    logs.forEach(log => {
      const action = log.action || "";
      const status = log.status || "";
      const isSuccess = status.toLowerCase() === "authorized" || status.toLowerCase() === "success";

      if (isLoginRelated(action)) {
        totalLogins++;
        if (!isSuccess) {
          failedLogins++;
        }
      } else {
        adminOps++;
      }

      if (status.toLowerCase() === "rejected" || status.toLowerCase() === "error" || action.toLowerCase().includes("delete")) {
        criticalWarnings++;
      }
    });

    const successRate = totalLogins > 0 
      ? Math.round(((totalLogins - failedLogins) / totalLogins) * 100) 
      : 100;

    return {
      totalLogs: logs.length,
      totalLogins,
      failedLogins,
      adminOps,
      criticalWarnings,
      successRate
    };
  }, [logs]);

  // Style helper depending on log category/action
  const getLogStyle = (log: SystemLog) => {
    const action = (log.action || "").toLowerCase();
    const status = (log.status || "").toLowerCase();
    const isSuccess = status === "authorized" || status === "success";

    if (!isSuccess) {
      return {
        bg: "bg-rose-50 border-rose-100",
        tag: "bg-rose-100 text-rose-800 border-rose-200",
        iconBg: "bg-rose-100 text-rose-600",
        icon: AlertTriangle
      };
    }

    if (action.includes("delete")) {
      return {
        bg: "bg-amber-50 border-amber-100",
        tag: "bg-amber-100 text-amber-800 border-amber-200",
        iconBg: "bg-amber-100 text-amber-600",
        icon: Trash2
      };
    }

    if (action.includes("update") || action.includes("edit")) {
      return {
        bg: "bg-blue-50 border-blue-100",
        tag: "bg-blue-100 text-blue-805 border-blue-200",
        iconBg: "bg-blue-100 text-blue-600",
        icon: Edit
      };
    }

    if (action.includes("create") || action.includes("add") || action.includes("import")) {
      return {
        bg: "bg-emerald-50 border-emerald-100",
        tag: "bg-emerald-100 text-emerald-805 border-emerald-200",
        iconBg: "bg-emerald-100 text-emerald-600",
        icon: Database
      };
    }

    if (isLoginRelated(log.action)) {
      return {
        bg: "bg-indigo-50/50 border-indigo-100/60",
        tag: "bg-indigo-50 text-indigo-700 border-indigo-100",
        iconBg: "bg-indigo-100 text-indigo-600",
        icon: User
      };
    }

    return {
      bg: "bg-slate-50 border-slate-100",
      tag: "bg-slate-100 text-slate-800 border-slate-200",
      iconBg: "bg-slate-150 text-slate-650",
      icon: FileText
    };
  };

  return (
    <div id="system_logs_tab_wrapper" className="space-y-6">
      
      {/* Expanded Metrics Widget */}
      <div id="system_logs_metrics_panel" className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Metric 1 */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-850 p-4.5 rounded-2xl border border-slate-800 shadow-md text-white flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Security Audit Logs</span>
            <Activity className="h-4.5 w-4.5 text-indigo-400 animate-pulse" />
          </div>
          <div className="mt-4">
            <p className="text-2xl font-black tracking-tight">{stats.totalLogs}</p>
            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Total registered chronological actions</p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-440">Authentication Success Rate</span>
            <ShieldCheck className="h-4.5 w-4.5 text-emerald-500" />
          </div>
          <div className="mt-4">
            <p className="text-2xl font-black text-slate-800 tracking-tight">{stats.successRate}%</p>
            <p className="text-[10px] text-emerald-600 font-bold mt-0.5 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>{stats.totalLogins - stats.failedLogins} / {stats.totalLogins} Successful Logins</span>
            </p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-440">Admin Database Operations</span>
            <Database className="h-4.5 w-4.5 text-blue-500" />
          </div>
          <div className="mt-4">
            <p className="text-2xl font-black text-slate-800 tracking-tight">{stats.adminOps}</p>
            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Student & Partner Modifications</p>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-440">Blocked Intrusions / Rejected</span>
            <AlertTriangle className={`h-4.5 w-4.5 ${stats.failedLogins > 0 ? "text-rose-500 animate-bounce" : "text-slate-400"}`} />
          </div>
          <div className="mt-4">
            <p className={`text-2xl font-black tracking-tight ${stats.failedLogins > 0 ? "text-rose-650" : "text-slate-800"}`}>
              {stats.failedLogins}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Invalid credentials blocked</p>
          </div>
        </div>
      </div>

      {/* Main Filter and Timeline Section */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        
        {/* Controls Bar */}
        <div className="p-5 border-b border-slate-100 space-y-4 bg-slate-50/50">
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Category selection */}
            <div className="flex bg-slate-100 p-1 rounded-xl self-start">
              <button
                onClick={() => setCategoryTab("all")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  categoryTab === "all" 
                    ? "bg-white text-slate-900 shadow-xs" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                All Event Types
              </button>
              <button
                onClick={() => setCategoryTab("logins")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  categoryTab === "logins" 
                    ? "bg-white text-slate-900 shadow-xs" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Login attempts ({stats.totalLogins})
              </button>
              <button
                onClick={() => setCategoryTab("admin")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  categoryTab === "admin" 
                    ? "bg-white text-slate-900 shadow-xs" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Administrative Changes ({stats.adminOps})
              </button>
            </div>

            {/* Sub-Filters / Status and search */}
            <div className="flex flex-wrap items-center gap-3">
              
              {/* Status Select */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5">
                <Filter className="h-3.5 w-3.5 text-slate-450" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="text-xs font-bold text-slate-650 focus:outline-none bg-transparent cursor-pointer"
                >
                  <option value="all">Any Status</option>
                  <option value="success">Authorized / Success</option>
                  <option value="rejected">Rejected / Blocked</option>
                </select>
              </div>

              {/* Refresh */}
              <button
                onClick={onRefresh}
                disabled={loading}
                className="p-2 hover:bg-slate-200 border border-slate-200 text-slate-500 rounded-xl hover:text-slate-800 transition cursor-pointer"
                title="Synchronize audit timeline"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Expanded text Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filter live event channel by username, email, ID or descriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 text-xs text-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-405 font-medium"
            />
          </div>
        </div>

        {/* Visual Timeline Stream list or Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 min-h-[400px]">
          
          {/* TIMELINE LIST PANELS */}
          <div className="lg:col-span-7 p-6 overflow-y-auto max-h-[600px] space-y-4">
            
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-450 text-uppercase tracking-wider pb-1">
              <span>Timeline Feed Stream</span>
              <span>Showing {filteredAndCategorizedLogs.length} entries</span>
            </div>

            {loading && logs.length === 0 ? (
              <div className="py-16 text-center space-y-2.5 text-slate-400">
                <RefreshCw className="h-7 w-7 text-indigo-500 animate-spin mx-auto" />
                <p className="text-xs font-semibold tracking-wide uppercase">Parsing unified security ledger...</p>
              </div>
            ) : filteredAndCategorizedLogs.length === 0 ? (
              <div className="py-20 text-center space-y-3 max-w-sm mx-auto p-4">
                <div className="bg-slate-50 text-slate-400 p-4 rounded-full h-12 w-12 flex items-center justify-center mx-auto">
                  <Info className="h-6 w-6" />
                </div>
                <p className="text-xs font-bold text-slate-700">No Auditable Events Found</p>
                <p className="text-[10px] text-slate-400">No security metrics match your selected criteria. Try resetting categories or adjusting your keywords query.</p>
                <button
                  onClick={() => {
                    setCategoryTab("all");
                    setSearchTerm("");
                    setStatusFilter("all");
                  }}
                  className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-extrabold uppercase hover:bg-slate-800 transition cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="space-y-3 relative border-l-2 border-slate-100 pl-4.5 ml-2.5">
                {filteredAndCategorizedLogs.map((log) => {
                  const logStyle = getLogStyle(log);
                  const LogIcon = logStyle.icon;
                  const isSelected = selectedLog?.id === log.id;
                  
                  return (
                    <div 
                      key={log.id} 
                      onClick={() => setSelectedLog(log)}
                      className={`group relative p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                        isSelected 
                          ? "bg-indigo-50/40 border-indigo-200 outline-none ring-2 ring-indigo-500/10"
                          : "bg-white hover:bg-slate-50/70 border-slate-150/60 hover:border-slate-300"
                      }`}
                    >
                      {/* Timeline dot */}
                      <div className={`absolute -left-[27px] top-[14px] h-3.5 w-3.5 rounded-full border-2 border-white ring-2 ring-slate-100 flex items-center justify-center ${
                        log.status?.toLowerCase() === "rejected" || log.status?.toLowerCase() === "error"
                          ? "bg-rose-500 ring-rose-100"
                          : log.action?.toLowerCase().includes("delete")
                            ? "bg-amber-500 ring-amber-100"
                            : "bg-indigo-500 ring-indigo-100"
                      }`} />

                      <div className="flex items-start justify-between gap-3">
                        <div className="flex gap-3">
                          <div className={`p-2 rounded-xl h-8 w-8 flex items-center justify-center ${logStyle.iconBg}`}>
                            <LogIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs font-black text-slate-800">{log.action || "Auth Event"}</h4>
                              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${logStyle.tag}`}>
                                {log.status || "Completed"}
                              </span>
                            </div>
                            
                            <p className="text-[10px] text-slate-500 font-medium mt-1 line-clamp-1 group-hover:line-clamp-none transition-all">
                              {log.details || "Details not specified."}
                            </p>
                            
                            <div className="flex items-center gap-3.5 text-[9px] text-slate-400 font-mono mt-2">
                              <span className="flex items-center gap-0.5 font-bold text-slate-800">
                                <User className="h-2.5 w-2.5 text-slate-400" />
                                {log.adminId || "SYSTEM"}
                              </span>
                              <span className="flex items-center gap-0.5">
                                <Mail className="h-2.5 w-2.5 text-slate-400" />
                                {log.email}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-[9px] font-mono text-slate-400 flex items-center justify-end gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <p className="text-[8px] font-mono text-slate-400 mt-0.5">
                            {new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </p>
                          
                          <ArrowRight className="h-3 w-3 text-indigo-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition ml-auto mt-2.5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* LOGS DETAIL INSPECTION PANEL */}
          <div className="lg:col-span-5 p-6 bg-slate-50/50 flex flex-col justify-between">
            {selectedLog ? (
              <div className="space-y-5 animate-fade-in text-left">
                
                {/* Header */}
                <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                  <ShieldCheck className="h-5 w-5 text-indigo-600" />
                  <div>
                    <h3 className="text-xs font-black text-slate-850 uppercase tracking-tight">Audit Inspection</h3>
                    <p className="text-[9px] font-mono text-slate-400 mt-0.5">LOG-ID: {selectedLog.id}</p>
                  </div>
                </div>

                {/* Event Details Card */}
                <div className="bg-white p-4.5 rounded-2xl border border-slate-150/70 shadow-2xs space-y-4">
                  
                  <div>
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Audit Category / Action</span>
                    <p className="text-xs font-extrabold text-slate-800 mt-0.5">{selectedLog.action}</p>
                  </div>

                  <div>
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Operator / Target Email</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-6 w-6 rounded-full bg-indigo-50 flex items-center justify-center font-bold text-[10px] text-indigo-700">
                        {String(selectedLog.adminId || "S").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-slate-800">{selectedLog.adminId}</p>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">{selectedLog.email}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Status Code</span>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase mt-1 border ${
                      selectedLog.status?.toLowerCase() === "authorized" || selectedLog.status?.toLowerCase() === "success"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-100/70"
                        : "bg-rose-50 text-rose-800 border-rose-100/70"
                    }`}>
                      {selectedLog.status?.toLowerCase() === "authorized" || selectedLog.status?.toLowerCase() === "success"
                        ? <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
                        : <XCircle className="h-2.5 w-2.5 text-rose-500" />
                      }
                      {selectedLog.status}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Payload Log Message</span>
                    <p className="text-[10px] text-slate-650 font-medium leading-relaxed mt-1.5 p-3 bg-slate-50 rounded-xl border border-slate-100 font-mono break-words">
                      {selectedLog.details}
                    </p>
                  </div>

                  <div>
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Precise Timestamp</span>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 mt-1 font-mono">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      <span>{new Date(selectedLog.timestamp).toUTCString()}</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-100/40 flex items-start gap-2.5 text-[10px] text-indigo-700 leading-relaxed font-semibold">
                  <ShieldCheck className="h-4.5 w-4.5 text-indigo-600 shrink-0 mt-0.5" />
                  <p>
                    This security record is compiled locally with cryptographically timestamped hashes during session events and cannot be manually modified or pruned outside retention policy rules.
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-slate-400 space-y-3 flex flex-col justify-center items-center flex-1">
                <div className="bg-slate-100 p-4.5 rounded-full text-slate-400 w-12 h-12 flex items-center justify-center">
                  <FileText className="h-5.5 w-5.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-tight">Audit Dossier Active</h4>
                  <p className="text-[10px] text-slate-400 max-w-xs mt-1">Select any event log inside the chronological feed to view full payload analysis and operator credential verification metadata immediately.</p>
                </div>
              </div>
            )}

            {selectedLog && (
              <button
                onClick={() => setSelectedLog(null)}
                className="mt-4 w-full py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Close Audit Inspection
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemLogs;
