import React, { useState, useEffect } from "react";
import { 
  BarChart3, 
  Download, 
  TrendingUp, 
  Building2, 
  GraduationCap, 
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import * as XLSX from "xlsx";

interface Student {
  id: string;
  name: string;
  department: string;
  cgpa: number;
  skills: string;
  allocationStatus?: "Allocated" | "Pending" | "Unplaced";
}

interface Company {
  id: string;
  name: string;
  role: string;
  skills: string;
  packageLpa: number;
}

export const Analytics: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resS, resC] = await Promise.all([
          fetch("/api/students"),
          fetch("/api/companies")
        ]);
        const dataS = await resS.json();
        const dataC = await resC.json();
        setStudents(dataS);
        setCompanies(dataC);
      } catch (err) {
        console.error("Failed fetching analytics datasets:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Compute Placed vs Unplaced metrics per Department
  const departmentsList = Array.from(new Set(students.map(s => s.department)));
  
  const deptChartData = departmentsList.map(dept => {
    const deptStudents = students.filter(s => s.department === dept);
    const placedCount = deptStudents.filter(s => s.allocationStatus === "Allocated").length;
    const pendingCount = deptStudents.filter(s => s.allocationStatus === "Pending" || !s.allocationStatus).length;
    const unplacedCount = deptStudents.filter(s => s.allocationStatus === "Unplaced").length;

    return {
      department: dept,
      Placed: placedCount,
      Pending: pendingCount + unplacedCount, // Group standby as pending
    };
  });

  // Compute Stipend Package segments data (ex: > 10 LPA super dream, 5-10 LPA dream, < 5 LPA tier 1)
  const superDream = companies.filter(c => c.packageLpa >= 10.0).length;
  const dream = companies.filter(c => c.packageLpa >= 5.0 && c.packageLpa < 10.0).length;
  const standard = companies.filter(c => c.packageLpa < 5.0).length;

  const stipendSegmentData = [
    { name: "Super Dream (>10 LPA)", value: superDream, color: "#6366f1" },
    { name: "Dream (5-10 LPA)", value: dream, color: "#10b981" },
    { name: "Standard (<5 LPA)", value: standard, color: "#f59e0b" }
  ].filter(seg => seg.value > 0);

  // General KPIs metrics
  const totalStudents = students.length;
  const fullyPlaced = students.filter(s => s.allocationStatus === "Allocated").length;
  const placementRateStr = totalStudents > 0 ? ((fullyPlaced / totalStudents) * 100).toFixed(1) : "0.0";
  const averageLpa = companies.length > 0 
    ? (companies.reduce((acc, c) => acc + c.packageLpa, 0) / companies.length).toFixed(1)
    : "0.0";

  // Excel workbook generator (explicitly 4 sheets!)
  const handleExport4Sheets = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: All Students
    const sData = students.map((s, idx) => ({
      "Sr. No": idx + 1,
      "Student ID": s.id,
      "Name": s.name,
      "Department": s.department,
      "CGPA": s.cgpa,
      "Skills": s.skills,
      "Placement Status": s.allocationStatus || "Pending"
    }));
    const ws1 = XLSX.utils.json_to_sheet(sData);
    XLSX.utils.book_append_sheet(wb, ws1, "All Students");

    // Sheet 2: CGPA Ranking
    const rankData = [...students]
      .sort((a, b) => b.cgpa - a.cgpa)
      .map((s, idx) => ({
        "Rank Merit": idx + 1,
        "Student ID": s.id,
        "Full Name": s.name,
        "Department": s.department,
        "CGPA Score": s.cgpa,
        "Status": s.allocationStatus || "Pending"
      }));
    const ws2 = XLSX.utils.json_to_sheet(rankData);
    XLSX.utils.book_append_sheet(wb, ws2, "CGPA Ranking");

    // Sheet 3: Company Requirements
    const cData = companies.map((c, idx) => ({
      "Serial": idx + 1,
      "Company Name": c.name,
      "Target Role": c.role,
      "Demanded Skills": c.skills,
      "Offering CTC (LPA)": c.packageLpa
    }));
    const ws3 = XLSX.utils.json_to_sheet(cData);
    XLSX.utils.book_append_sheet(wb, ws3, "Company Requirements");

    // Sheet 4: Analytics Summary (Module 6 SPECIFIC!)
    const deptSummary = departmentsList.map(dept => {
      const deptStudents = students.filter(s => s.department === dept);
      const placed = deptStudents.filter(s => s.allocationStatus === "Allocated").length;
      return {
        "Department Name": dept,
        "Total Candidates": deptStudents.length,
        "Offers Received": placed,
        "Department Placement Rate (%)": deptStudents.length > 0 
          ? Math.round((placed / deptStudents.length) * 100) 
          : 0
      };
    });

    const metricsSummary = [
      { "Metric KPI": "Total Students Registry Pool", "Calculated Value": totalStudents },
      { "Metric KPI": "Total Confirmed Placement Offers", "Calculated Value": fullyPlaced },
      { "Metric KPI": "Campus Placement Success Rate (%)", "Calculated Value": parseFloat(placementRateStr) },
      { "Metric KPI": "Average Partner Salary CTC (LPA)", "Calculated Value": parseFloat(averageLpa) },
      { "Metric KPI": "Super Dream Openings (>=10 LPA)", "Calculated Value": superDream },
      { "Metric KPI": "Dream Placement Openings (5-10 LPA)", "Calculated Value": dream }
    ];

    const ws4 = XLSX.utils.json_to_sheet(metricsSummary);
    XLSX.utils.sheet_add_json(ws4, [{}], { origin: "A8" });
    XLSX.utils.sheet_add_json(ws4, deptSummary, { origin: "A10" });
    
    XLSX.utils.book_append_sheet(wb, ws4, "Analytics Summary");

    // Export Trigger
    XLSX.writeFile(wb, "SIMATS_Campus_Placement_Analytics.xlsx");
  };

  return (
    <div id="analytics_metrics_page" className="space-y-6 animate-fade-in text-slate-800">
      
      {/* Page Header card with Excel 4 Sheet download button */}
      <div id="analytics_header_banner" className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="bg-gradient-to-tr from-amber-500 to-amber-400 text-white p-3 rounded-2xl shadow-sm">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-850">Placement Analytics Center</h2>
            <p className="text-xs text-slate-400">Review department-wise allocation trends, corporate stipend segments and download the executive master log sheets.</p>
          </div>
        </div>

        <button
          id="export_4_sheets_xlsx_btn"
          onClick={handleExport4Sheets}
          className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 shadow shadow-indigo-600/10 font-bold rounded-xl text-xs uppercase tracking-wider text-white transition flex-row cursor-pointer"
        >
          <Download className="h-4 w-4 animate-pulse" />
          <span>Excel Master Log (4 Sheets)</span>
        </button>
      </div>

      {/* Row 1 — General Analytics KPIs */}
      <section id="metrics_cards_row" className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm text-center flex flex-col items-center justify-center space-y-1">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Placement Rate</span>
          <span className="text-3xl font-extrabold text-indigo-650 tracking-tight">{placementRateStr}%</span>
          <span className="text-[9px] font-bold text-slate-400 text-slate-500 bg-indigo-50 px-2 py-0.5 rounded-full mt-1 inline-block">Active Progress</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm text-center flex flex-col items-center justify-center space-y-1">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Total Hired Pool</span>
          <span className="text-3xl font-extrabold text-emerald-600 tracking-tight">{fullyPlaced} offers</span>
          <span className="text-[9px] font-bold text-slate-400 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mt-1 inline-block">Allocated State</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm text-center flex flex-col items-center justify-center space-y-1">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Average Partner LPA</span>
          <span className="text-3xl font-extrabold text-slate-800 tracking-tight">{averageLpa} LPA</span>
          <span className="text-[9px] font-bold text-slate-400 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full mt-1 inline-block">Stipend Avg</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm text-center flex flex-col items-center justify-center space-y-1">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Recruiters Registry</span>
          <span className="text-3xl font-extrabold text-slate-800 tracking-tight">{companies.length} firms</span>
          <span className="text-[9px] font-bold text-slate-400 text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full mt-1 inline-block">Corporates</span>
        </div>

      </section>

      {/* Row 2 — Double Chart Split Grid */}
      <section id="charts_split_grid" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Chart 1 of Recharts: Department breakdown */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm lg:col-span-7 flex flex-col h-[400px]">
          <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest mb-4 flex items-center shrink-0">
            <TrendingUp className="h-4 w-4 mr-2 text-indigo-500" />
            Placed VS Standby Candidates per Department
          </h3>

          <div className="flex-1 min-h-0 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">Compiling dept chart metrics...</div>
            ) : (
              <ResponsiveContainer width="100%" height="95%">
                <BarChart data={deptChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="department" stroke="#94a3b8" fontSize={9} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                  <Tooltip wrapperStyle={{ outline: "none" }} contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }} />
                  <Legend wrapperStyle={{ fontSize: 10, padding: 5 }} />
                  <Bar dataKey="Placed" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={24} />
                  <Bar dataKey="Pending" fill="#cbd5e1" radius={[6, 6, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2 of Recharts: Budget Packages segments */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm lg:col-span-5 flex flex-col h-[400px]">
          <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest mb-4 flex items-center shrink-0">
            <Building2 className="h-4 w-4 mr-2 text-emerald-500" />
            Hiring Package Segments Distributions
          </h3>

          <div className="flex-1 min-h-0 w-full relative flex items-center justify-center">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">Compiling segment metrics...</div>
            ) : stipendSegmentData.length === 0 ? (
              <div className="text-center font-bold text-xs text-slate-400">Hiring Partners data is empty.</div>
            ) : (
              <div className="w-full h-full flex flex-col md:flex-row items-center gap-2">
                <div className="flex-1 min-h-0 w-full h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stipendSegmentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stipendSegmentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2 select-none md:w-44 text-left shrink-0">
                  {stipendSegmentData.map((seg, idx) => (
                    <div key={idx} className="flex items-start space-x-2">
                      <div className="h-3 w-3 rounded-full mt-1 shrink-0" style={{ backgroundColor: seg.color }} />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-700 leading-tight">{seg.name}</p>
                        <p className="text-[10px] font-bold text-slate-400">{seg.value} Companies registered</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </section>

    </div>
  );
};
export default Analytics;
