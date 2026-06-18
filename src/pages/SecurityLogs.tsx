import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  RefreshCw, 
  Settings,
  AlertCircle 
} from "lucide-react";
import { SystemLogs, SystemLog } from "../components/SystemLogs";

export const SecurityLogs: React.FC = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [retentionDays, setRetentionDays] = useState<number>(90);
  const [selectedPolicyDays, setSelectedPolicyDays] = useState<number>(90);
  const [updatingRetention, setUpdatingRetention] = useState<boolean>(false);
  const [retentionSuccessMsg, setRetentionSuccessMsg] = useState<string>("");

  const fetchLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login-log");
      if (!response.ok) {
        throw new Error("Server responded with error code " + response.status);
      }
      const data = await response.json();
      setLogs(data);
    } catch (err: any) {
      console.error("Failed to fetch login logs:", err);
      setError("Unable to synchronize logs. Please verify connection to the admin portal.");
    } finally {
      setLoading(false);
    }
  };

  const fetchRetentionPolicy = async () => {
    try {
      const response = await fetch("/api/admin/log-retention");
      if (response.ok) {
        const data = await response.json();
        setRetentionDays(data.days);
        setSelectedPolicyDays(data.days);
      }
    } catch (err) {
      console.error("Failed to fetch retention policy:", err);
    }
  };

  const updateRetentionPolicy = async (days: number) => {
    setUpdatingRetention(true);
    setRetentionSuccessMsg("");
    try {
      const response = await fetch("/api/admin/log-retention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days })
      });
      if (!response.ok) {
        throw new Error("Failed to save settings");
      }
      const data = await response.json();
      setRetentionDays(data.days);
      setSelectedPolicyDays(data.days);
      
      if (data.deletedCount > 0) {
        setRetentionSuccessMsg(`Policy saved! Pruned ${data.deletedCount} logs older than ${days === 0 ? "Unlimited" : days + " days"} instantly.`);
      } else {
        setRetentionSuccessMsg(`Policy updated successfully to ${days === 0 ? "Unlimited" : days + " Days"}.`);
      }
      
      setTimeout(() => setRetentionSuccessMsg(""), 4500);
      fetchLogs(); // refresh lists immediately
    } catch (err: any) {
      console.error("Failed to update retention policy:", err);
      setError("Unable to update log pruning guidelines.");
    } finally {
      setUpdatingRetention(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchRetentionPolicy();
  }, []);

  return (
    <div id="security_logs_page" className="space-y-6">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-indigo-600 shrink-0" />
            Security & System Audit Trails
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Browse and inspect user login attempts and administrative actions recorded across CPMS nodes.
          </p>
        </div>
        
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold shadow-sm transition-all duration-200 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 text-slate-500 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh All Logs</span>
        </button>
      </div>

      {/* Retention Policy Configuration Panel */}
      <div id="retention_policy_config_panel" className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="bg-indigo-50 text-indigo-650 p-3 rounded-2xl shrink-0 mt-0.5">
              <Settings className="h-5 w-5 text-indigo-600 animate-spin-hover" />
            </div>
            <div className="space-y-1 text-left font-sans">
              <h3 className="text-sm font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                Log Retention & Pruning Policy
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100/60 lowercase first-letter:uppercase">
                  {retentionDays === 0 ? "Unlimited Keep" : `Prune after ${retentionDays} days`}
                </span>
              </h3>
              <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                Automate the secure deletion of historical CPMS access sessions and audit tracks. Select a policy delay after which entries are permanently wiped.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="relative">
              <select
                id="retention_policy_days_selector"
                value={selectedPolicyDays}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSelectedPolicyDays(val);
                  updateRetentionPolicy(val);
                }}
                disabled={updatingRetention}
                className="w-full sm:w-48 px-4 py-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 focus:bg-white focus:border-indigo-500 text-xs font-bold text-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer appearance-none pr-10"
              >
                <option value={30}>30 Days (1 Month)</option>
                <option value={60}>60 Days (2 Months)</option>
                <option value={90}>90 Days (3 Months)</option>
                <option value={180}>180 Days (Half Year)</option>
                <option value={365}>365 Days (1 Year)</option>
                <option value={0}>Unlimited (Keep All)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                <svg className="fill-current h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>

            {updatingRetention && (
              <span className="flex items-center justify-center gap-1.5 text-slate-400 font-mono text-[10px] uppercase font-bold tracking-wider px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
                <RefreshCw className="h-3 w-3.5 animate-spin text-indigo-500" />
                <span>Saving...</span>
              </span>
            )}
          </div>
        </div>

        {/* Success / Pruned Toast Alert bar */}
        {retentionSuccessMsg && (
          <div id="retention_success_toast" className="mt-4 p-3.5 bg-emerald-50 border border-emerald-100/80 text-emerald-800 rounded-2xl text-[11px] font-bold flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <span>{retentionSuccessMsg}</span>
            </div>
            <button 
              onClick={() => setRetentionSuccessMsg("")} 
              className="text-emerald-600 hover:text-emerald-850 font-bold uppercase text-[9px] tracking-wider px-1.5 py-0.5 whitespace-nowrap cursor-pointer hover:bg-emerald-100/50 rounded-lg transition"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Error notification */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-center gap-2.5 text-left font-sans">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Upgraded SystemLogs Sub-Component */}
      <SystemLogs 
        logs={logs} 
        loading={loading} 
        onRefresh={fetchLogs} 
      />

    </div>
  );
};

export default SecurityLogs;
