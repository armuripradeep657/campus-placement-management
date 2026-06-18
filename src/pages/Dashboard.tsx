import React, { useEffect, useState } from "react";
import { 
  Users, 
  Building2, 
  Briefcase, 
  TrendingUp, 
  Play, 
  RotateCcw, 
  CheckCircle,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Bell,
  Trash2,
  Megaphone,
  Send,
  Calendar,
  FileText,
  AlertCircle
} from "lucide-react";

interface DBStudent {
  id: string;
  name: string;
  department: string;
  cgpa: number;
  skills: string;
  allocationStatus?: string;
}

interface DBCompany {
  id: string;
  name: string;
  role: string;
  packageLpa: number;
}

interface DBAllocation {
  studentId: string;
  studentName: string;
  companyName: string;
  packageLpa: number;
}

interface DBBulletin {
  id: string;
  type: "drive" | "schedule" | "document";
  title: string;
  description: string;
  targetStudentId?: string;
  date: string;
}

export const Dashboard: React.FC<{ setActiveTab: (tab: string) => void }> = ({ setActiveTab }) => {
  const [students, setStudents] = useState<DBStudent[]>([]);
  const [companies, setCompanies] = useState<DBCompany[]>([]);
  const [allocations, setAllocations] = useState<DBAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [allocationLoading, setAllocationLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Bulletins & Alert Center States for Coordinators
  const [bulletins, setBulletins] = useState<DBBulletin[]>([]);
  const [newType, setNewType] = useState<"drive" | "schedule" | "document">("drive");
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState<string | null>(null);
  const [notifError, setNotifError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      const [resStu, resCom, resAll] = await Promise.all([
        fetch("/api/students"),
        fetch("/api/companies"),
        fetch("/api/allocations")
      ]);
      const dataStu = await resStu.json();
      const dataCom = await resCom.json();
      const dataAll = await resAll.json();

      setStudents(dataStu);
      setCompanies(dataCom);
      setAllocations(dataAll);
    } catch (err) {
      console.error("Error reading dashboard metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBulletins = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setBulletins(data);
      }
    } catch (err) {
      console.error("Error loading bulletins:", err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchBulletins();
  }, []);

  const handleRunAllocation = async () => {
    setAllocationLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/allocations/run", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to execute automated placement allocation.");
      }
      setSuccessMessage("Success! Fully automated greedy-priority placement matching complete.");
      await fetchDashboardData();
    } catch (err: any) {
      console.error("Allocation engine failure:", err);
      setErrorMessage(err.message || "Allocation engine failure.");
    } finally {
      setAllocationLoading(false);
    }
  };

  const handleResetAllocation = async () => {
    setAllocationLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/allocations/reset", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset allocation tables.");
      }
      setSuccessMessage("Placement database state restored to pending. Ready to match.");
      await fetchDashboardData();
    } catch (err: any) {
      console.error("Allocation reset failure:", err);
      setErrorMessage(err.message || "Allocation reset failure.");
    } finally {
      setAllocationLoading(false);
    }
  };

  const handlePublishBulletin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) {
      setNotifError("Bulletin Title and Description are required.");
      return;
    }

    setPublishing(true);
    setNotifSuccess(null);
    setNotifError(null);

    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newType,
          title: newTitle,
          description: newDesc,
          targetStudentId: newTarget ? newTarget.trim() : undefined
        })
      });

      if (res.ok) {
        setNotifSuccess("Student Alert Bulletin published successfully!");
        setNewTitle("");
        setNewDesc("");
        setNewTarget("");
        await fetchBulletins();
      } else {
        const errData = await res.json();
        setNotifError(errData.error || "Failed to post dispatch notice.");
      }
    } catch (err) {
      console.error("Error posting bulletin:", err);
      setNotifError("Server connection issue. Verification log failed.");
    } finally {
      setPublishing(false);
    }
  };

  const handleDeleteBulletin = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchBulletins();
      }
    } catch (err) {
      console.error("Failed to delete bulletin:", err);
    }
  };

  // Metrics
  const totalStudentsCount = students.length;
  const placedStudentsCount = students.filter(s => s.allocationStatus === "Allocated").length;
  const placementRate = totalStudentsCount > 0 ? Math.round((placedStudentsCount / totalStudentsCount) * 100) : 0;
  const companiesCount = companies.length;
  
  // Avg Package
  const avgPackage = companies.length > 0 
    ? (companies.reduce((sum, c) => sum + c.packageLpa, 0) / companies.length).toFixed(1) 
    : "0.0";
  
  // Highest Package
  const maxPackage = companies.length > 0
    ? Math.max(...companies.map(c => c.packageLpa)).toFixed(1)
    : "0.0";

  return (
    <div id="dashboard_page" className="space-y-8 animate-fade-in">
      
      {/* Dynamic Header Badge / Notifications */}
      {successMessage && (
        <div id="notif_success_banner" className="flex items-center space-x-3 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl shadow-sm animate-bounce-subtle">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <p className="text-sm font-semibold">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div id="notif_error_banner" className="flex items-center space-x-3 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl shadow-sm">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 animate-pulse" />
          <p className="text-sm font-semibold">{errorMessage}</p>
        </div>
      )}

      {/* Overview Intro Banner */}
      <section id="hero_intro" className="relative overflow-hidden rounded-3xl bg-indigo-900 text-white p-6 shadow-md">
        <div className="absolute top-0 right-0 bg-indigo-800 h-48 w-48 rounded-full blur-2xl opacity-40" />
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Sparkles className="h-5 w-5 text-yellow-400 animate-pulse shrink-0" />
            <h3 className="text-sm font-extrabold tracking-tight">Placement Matching System</h3>
          </div>
          <button
            id="dashboard_run_alloc_btn"
            onClick={handleRunAllocation}
            disabled={allocationLoading}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-indigo-950 font-extrabold rounded-xl text-xs uppercase tracking-wider cursor-pointer active:scale-[0.98] transition-all duration-200 disabled:opacity-50 text-center shadow-md shadow-indigo-950/20"
          >
            <Play className="h-4 w-4" />
            <span>{allocationLoading ? "Processing Match..." : "Run Auto-Allocation"}</span>
          </button>
        </div>
      </section>

      {/* Grid of 4 KPIs */}
      <section id="kpi_grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* KPI 1 - Students */}
        <div id="kpi_total_students" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest block">Total Students</span>
            <span className="text-3xl font-extrabold text-slate-800 tracking-tight block">
              {loading ? "..." : totalStudentsCount}
            </span>
            <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider block">Eligible Batches</span>
          </div>
          <div className="bg-indigo-50 p-4 rounded-xl text-indigo-600">
            <Users className="h-6 w-6" />
          </div>
        </div>

        {/* KPI 2 - Companies */}
        <div id="kpi_companies" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest block">Recruiters</span>
            <span className="text-3xl font-extrabold text-slate-800 tracking-tight block">
              {loading ? "..." : companiesCount}
            </span>
            <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider block">Partner Corporates</span>
          </div>
          <div className="bg-emerald-50 p-4 rounded-xl text-emerald-600">
            <Building2 className="h-6 w-6" />
          </div>
        </div>

        {/* KPI 3 - Placement Rate */}
        <div id="kpi_placement_rate" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest block">Placement Rate</span>
            <span className="text-3xl font-extrabold text-slate-850 tracking-tight block">
              {loading ? "..." : `${placementRate}%`}
            </span>
            <div className="w-24 bg-slate-100 h-1.5 rounded-full mt-2">
              <div 
                className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500" 
                style={{ width: `${placementRate}%` }}
              />
            </div>
          </div>
          <div className="bg-amber-50 p-4 rounded-xl text-amber-600">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>

        {/* KPI 4 - Average LPA */}
        <div id="kpi_avg_ctc" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest block">Average Package</span>
            <span className="text-3xl font-extrabold text-slate-800 tracking-tight block">
              {loading ? "..." : `${avgPackage} LPA`}
            </span>
            <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider block">Max LPA: {maxPackage}</span>
          </div>
          <div className="bg-rose-50 p-4 rounded-xl text-rose-600">
            <Briefcase className="h-6 w-6" />
          </div>
        </div>

      </section>

      {/* Lower Dashboard Grid (Actions & Live Feed) */}
      <section id="dashboard_split_view" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Navigation Shortcuts */}
        <div id="module_shortcut_card" className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col space-y-4 lg:col-span-1">
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider">Quick Navigation</h3>
          <div className="space-y-2 flex-1">
            
            <button 
              id="shortcut_student_mgmt"
              onClick={() => setActiveTab("students")}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-indigo-150 hover:bg-slate-50 transition-all text-left text-xs font-semibold"
            >
              <span className="flex items-center"><GraduationCap className="h-4 w-4 mr-2 text-indigo-500" />Student Database</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            </button>

            <button 
              id="shortcut_company_mgmt"
              onClick={() => setActiveTab("companies")}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-indigo-150 hover:bg-slate-50 transition-all text-left text-xs font-semibold"
            >
              <span className="flex items-center"><Building2 className="h-4 w-4 mr-2 text-emerald-500" />Register Hiring Partners</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            </button>

            <button 
              id="shortcut_resume_matching"
              onClick={() => setActiveTab("matching")}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-indigo-150 hover:bg-slate-50 transition-all text-left text-xs font-semibold"
            >
              <span className="flex items-center"><Briefcase className="h-4 w-4 mr-2 text-indigo-500" />Resume Matching (Score)</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            </button>

            <button 
              id="shortcut_placement_allocation"
              onClick={() => setActiveTab("allocation")}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-indigo-150 hover:bg-slate-50 transition-all text-left text-xs font-semibold"
            >
              <span className="flex items-center"><CheckCircle className="h-4 w-4 mr-2 text-indigo-500" />Allocation Engine</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            </button>

            <button 
              id="shortcut_analytics_reporting"
              onClick={() => setActiveTab("analytics")}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-indigo-150 hover:bg-slate-50 transition-all text-left text-xs font-semibold"
            >
              <span className="flex items-center"><TrendingUp className="h-4 w-4 mr-2 text-amber-500" />Charts & Excel Exports</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            </button>

          </div>
        </div>

        {/* Live Allocation Feed Box */}
        <div id="live_allocation_feed" className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Matched & Placed Records Feed</h3>
            <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
              {allocations.length} Assigned
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-64 space-y-3 pr-2 scrollbar-thin">
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading placement logs...</div>
            ) : allocations.length === 0 ? (
              <div className="py-12 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-center p-4">
                <Users className="h-8 w-8 text-slate-300 mb-2" />
                <span className="text-xs font-bold text-slate-400">Database Empty / No allocations made</span>
                <span className="text-[10px] text-slate-400 mt-1 max-w-sm">
                  Click "Run Auto-Allocation" above to execute the greedy CGPA placement priority engine and assign students.
                </span>
              </div>
            ) : (
              allocations.map((alloc, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-100">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="bg-indigo-100 text-indigo-700 font-bold text-xs p-2.5 rounded-xl shrink-0">
                      GP
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{alloc.studentName}</p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {alloc.studentDepartment} • CGPA: {alloc.studentCgpa.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-indigo-600">{alloc.companyName}</p>
                    <p className="text-[10px] font-semibold text-emerald-600">Offer: {alloc.packageLpa.toFixed(1)} LPA</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </section>

      {/* ========================================================= */}
      {/*        POST & MANAGE STUDENT ANNOUNCEMENTS bulletins       */}
      {/* ========================================================= */}
      <section id="coordinator_bulletin_control" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Col 1-2: Post bulletin form */}
        <div id="publish_bulletin_card" className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 lg:col-span-1 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <div className="bg-indigo-50 p-2 rounded-xl text-indigo-650">
                <Megaphone className="h-4.5 w-4.5" />
              </div>
              <h3 className="font-extrabold text-slate-850 text-sm uppercase tracking-wider">Publish Alert Bulletin</h3>
            </div>

            {notifSuccess && (
              <div id="publish_notif_success" className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-semibold">
                {notifSuccess}
              </div>
            )}
            {notifError && (
              <div id="publish_notif_error" className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-semibold flex items-center gap-1">
                <AlertCircle className="h-4 w-4" /> {notifError}
              </div>
            )}

            <form onSubmit={handlePublishBulletin} className="space-y-4 text-xs font-semibold text-slate-500">
              
              {/* Type selector */}
              <div>
                <label className="block text-slate-400 uppercase text-[10px] font-bold tracking-wider mb-1">Bulletin Category</label>
                <div className="grid grid-cols-3 gap-1.5 select-none font-bold">
                  <button
                    type="button"
                    onClick={() => setNewType("drive")}
                    className={`p-2 rounded-xl border text-center transition ${
                      newType === "drive"
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100"
                    }`}
                  >
                    Drive
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewType("schedule")}
                    className={`p-2 rounded-xl border text-center transition ${
                      newType === "schedule"
                        ? "bg-amber-600 text-white border-amber-600"
                        : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100"
                    }`}
                  >
                    Schedule
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewType("document")}
                    className={`p-2 rounded-xl border text-center transition ${
                      newType === "document"
                        ? "bg-rose-600 text-white border-rose-600"
                        : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100"
                    }`}
                  >
                    Doc Rule
                  </button>
                </div>
              </div>

              {/* Title input */}
              <div>
                <label className="block text-slate-400 uppercase text-[10px] font-bold tracking-wider mb-1">Headline Title</label>
                <input
                  id="notif_title_input"
                  type="text"
                  placeholder="e.g. Zoho Interview Phase 1 Schedule"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-55 bg-slate-50 border border-slate-200 focus:border-indigo-400 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none"
                />
              </div>

              {/* Description input */}
              <div>
                <label className="block text-slate-400 uppercase text-[10px] font-bold tracking-wider mb-1">Detailed Description Body</label>
                <textarea
                  id="notif_desc_input"
                  placeholder="Provide timing, eligibility, requirements, location details, etc."
                  value={newDesc}
                  rows={4}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none resize-none"
                />
              </div>

              {/* Target specific student (optional) */}
              <div>
                <label className="block text-slate-400 uppercase text-[10px] font-bold tracking-wider mb-1">Target Student Register ID (Optional)</label>
                <input
                  id="notif_target_input"
                  type="text"
                  placeholder="e.g. student001 (Leave blank for ALL)"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none placeholder-slate-350"
                />
              </div>

              <button
                id="btn_post_announcement"
                type="submit"
                disabled={publishing}
                className="w-full flex items-center justify-center space-x-2 px-5 py-3 bg-indigo-650 hover:bg-indigo-750 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider cursor-pointer transition disabled:opacity-50 mt-2"
              >
                <Send className="h-4 w-4" />
                <span>{publishing ? "Posting bulletin..." : "Post Announcement"}</span>
              </button>

            </form>
          </div>
        </div>

        {/* Col 3: Active student alerts manager */}
        <div id="live_bulletins_card" className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center space-x-2">
              <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600">
                <Bell className="h-4.5 w-4.5" />
              </div>
              <h3 className="font-extrabold text-slate-850 text-sm uppercase tracking-wider">Active Campus Bulletins</h3>
            </div>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-extrabold px-2.5 py-0.5 rounded-full border border-indigo-100">
              {bulletins.length} Active
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[420px] space-y-3 pr-2 scrollbar-thin">
            {bulletins.length === 0 ? (
              <div className="py-12 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-center p-4">
                <Bell className="h-8 w-8 text-slate-300 mb-2" />
                <span className="text-xs font-bold text-slate-400">No active bulletins posted</span>
                <span className="text-[10px] text-slate-400 mt-1 max-w-sm">
                  Publish a placement drive notice, screening schedules, or document requirement alert to synchronize automatically.
                </span>
              </div>
            ) : (
              bulletins.map((notif) => {
                let badgeStyle = "bg-teal-50 border-teal-200 text-teal-700";
                let label = "Hiring drive";
                if (notif.type === "schedule") {
                  badgeStyle = "bg-amber-50 border-amber-200 text-amber-700";
                  label = "Schedule";
                } else if (notif.type === "document") {
                  badgeStyle = "bg-rose-50 border-rose-200 text-rose-700";
                  label = "Doc Action";
                }

                return (
                  <div key={notif.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-100 flex items-start justify-between gap-4 transition">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${badgeStyle}`}>
                          {label}
                        </span>
                        {notif.targetStudentId && (
                          <span className="text-[9px] font-bold uppercase bg-slate-200 border border-slate-300 text-slate-600 px-1.5 py-0.5 rounded">
                            Target Cadet: {notif.targetStudentId}
                          </span>
                        )}
                        <span className="text-[9px] text-slate-400 font-semibold font-mono">
                          {new Date(notif.date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      
                      <h4 className="text-xs font-bold text-slate-800 leading-snug">{notif.title}</h4>
                      <p className="text-[11px] text-slate-500 font-medium line-clamp-2 leading-relaxed">{notif.description}</p>
                    </div>

                    <button
                      id={`btn_delete_bulletin_${notif.id}`}
                      onClick={() => handleDeleteBulletin(notif.id)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 bg-white border border-slate-150 hover:bg-rose-50 hover:border-rose-100 rounded-lg shrink-0 transition shadow-sm cursor-pointer"
                      title="Withdraw announcement"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </section>

    </div>
  );
};
export default Dashboard;
