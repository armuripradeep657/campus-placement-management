import React, { useState, useEffect } from "react";
import { 
  FileCheck2, 
  Search, 
  Cpu, 
  Building2, 
  CheckCircle, 
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Sparkles,
  Users
} from "lucide-react";

interface Student {
  id: string; // studentId
  name: string;
  skills: string; // Comma-separated
  department: string;
}

interface Company {
  id: string;
  name: string;
  role: string;
  skills: string; // Comma-separated
  packageLpa: number;
}

interface MatchResult {
  company: Company;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
}

export const ResumeMatching: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  // Selector
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [customSkillsInput, setCustomSkillsInput] = useState("");
  const [results, setResults] = useState<MatchResult[]>([]);

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
        
        // Default to first student if available to prefill
        if (dataS.length > 0) {
          setSelectedStudentId(dataS[0].id);
          setCustomSkillsInput(dataS[0].skills);
        }
      } catch (err) {
        console.error("Failed fetching matching dependencies:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Autofill custom input when dropdown selector shifts
  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
    setResults([]); // Clear results on new selection until manual Sync
    if (!studentId) {
      setCustomSkillsInput("");
      return;
    }
    const student = students.find(s => s.id === studentId);
    if (student) {
      setCustomSkillsInput(student.skills);
    }
  };

  // Live Skill Matching core client calculator
  const handleCalculateMatch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const candidateSkillsString = customSkillsInput.trim();
    if (!candidateSkillsString) {
      setResults([]);
      return;
    }

    const sSkills = candidateSkillsString.toLowerCase()
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const matchCalculated: MatchResult[] = companies.map(company => {
      const cSkills = company.skills.toLowerCase()
        .split(",")
        .map(c => c.trim())
        .filter(c => c.length > 0);

      if (cSkills.length === 0) {
        return { company, matchScore: 0, matchedSkills: [], missingSkills: [] };
      }

      const matchedSkills: string[] = [];
      const missingSkills: string[] = [];

      // Calculate matching / missing Venn overlap
      company.skills.split(",").map(c => c.trim()).forEach(rawCSkill => {
        const cSkillLower = rawCSkill.toLowerCase();
        // Overlap match checks
        const matches = sSkills.some(sSkill => sSkill.includes(cSkillLower) || cSkillLower.includes(sSkill));
        if (matches) {
          matchedSkills.push(rawCSkill);
        } else {
          missingSkills.push(rawCSkill);
        }
      });

      const matchScore = Math.round((matchedSkills.length / cSkills.length) * 100);

      return {
        company,
        matchScore,
        matchedSkills,
        missingSkills
      };
    }).sort((a, b) => b.matchScore - a.matchScore);

    setResults(matchCalculated);
  };

  // Skill Score Circle visual color coding
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500 border-emerald-500 bg-emerald-50/50";
    if (score >= 50) return "text-blue-500 border-blue-500 bg-blue-50/50";
    if (score >= 20) return "text-amber-500 border-amber-500 bg-amber-50/50";
    return "text-rose-500 border-rose-500 bg-rose-50/30";
  };

  return (
    <div id="resume_matching_page" className="space-y-6 animate-fade-in text-slate-800">
      
      {/* Page Title Card */}
      <div id="matching_header" className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white p-3 rounded-2xl shadow-sm">
            <CcIcon />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-850">Resume Matching</h2>
            <p className="text-xs text-slate-400">Map technical skills onto company requirements to compute real-time fit matrices.</p>
          </div>
        </div>
      </div>

      {/* Inputs panels Split-Grid */}
      <div id="inputs_split_grid" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1 — Selection Deck & Inputs */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-5 lg:col-span-1 h-fit">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center">
            <Cpu className="h-4 w-4 mr-2 text-indigo-505" />
            Skills Analyzer
          </h3>

          <div className="space-y-4">
            
            {/* Quick Prefill selector */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Prefill from Student Profile
              </label>
              {loading ? (
                <div className="text-xs text-slate-400">Syncing profiles database...</div>
              ) : (
                <select
                  id="student_match_selector"
                  value={selectedStudentId}
                  onChange={(e) => handleStudentSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-indigo-400"
                >
                  <option value="">-- Direct Manual Input --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.id})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Custom Input Skills Form */}
            <form id="calculate_matches_form" onSubmit={handleCalculateMatch} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                  <span>List Skills (comma separated)</span>
                  {selectedStudentId && (
                    <span className="text-[9px] text-indigo-600 font-semibold uppercase">Loaded Portfolio</span>
                  )}
                </label>
                <textarea
                  id="skills_match_input"
                  rows={5}
                  required
                  placeholder="Java, React, Node.js, Spring Boot"
                  value={customSkillsInput}
                  onChange={(e) => {
                    setSelectedStudentId(""); // Clear student indicator as input custom edits
                    setCustomSkillsInput(e.target.value);
                    setResults([]); // Reset scores until synchronized manually
                  }}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 rounded-xl text-xs font-mono placeholder-slate-400 focus:outline-none transition leading-relaxed"
                />
              </div>

              <button
                id="calculate_matrix_submit_btn"
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 font-bold rounded-xl text-xs uppercase tracking-wider text-white transition active:scale-[0.98] shadow cursor-pointer text-center"
              >
                Sync Match Matrices
              </button>
            </form>

          </div>
        </div>

        {/* Column 2 — Analysis Results Deck Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
              Requirement Alignment Scorecards
            </h3>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
              {results.length} Corporate Partners Ranked
            </span>
          </div>

          {results.length === 0 ? (
            <div className="bg-white py-16 border-2 border-dashed border-slate-100 rounded-3xl p-6 flex flex-col items-center justify-center text-center">
              <FileCheck2 className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-400">Match score logs are inactive</p>
              <p className="text-[10px] text-slate-400 max-w-xs mt-1">Specify technical skills in the left side analyzer panel to calculate overlapping recruiter alignment.</p>
            </div>
          ) : (
            <div id="results_deck_wrapper" className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {results.map(res => (
                <div 
                  key={res.company.id}
                  id={`match_card_${res.company.id}`}
                  className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-200 grid grid-cols-1 md:grid-cols-12 gap-4 items-center"
                >
                  
                  {/* Gauge score visual */}
                  <div className="md:col-span-2 flex flex-col items-center justify-center shrink-0">
                    <div className={`h-16 w-16 rounded-full border-4 flex flex-col items-center justify-center text-xs font-extrabold shadow-inner ${getScoreColor(res.matchScore)}`}>
                      <span>{res.matchScore}%</span>
                      <span className="text-[8px] uppercase text-slate-400 font-bold block mt-0.5 scale-90">Match</span>
                    </div>
                  </div>

                  {/* Company role indicators info */}
                  <div className="md:col-span-5 space-y-1.5 min-w-0">
                    <h4 className="text-sm font-extrabold text-slate-850 truncate">{res.company.name}</h4>
                    <p className="text-xs text-slate-400 font-semibold truncate flex items-center bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                      <Building2 className="h-3.5 w-3.5 mr-1 text-slate-400 shrink-0" />
                      Role: <span className="font-extrabold ml-1 text-slate-650">{res.company.role}</span>
                    </p>
                    <p className="text-[10px] font-extrabold text-emerald-600 block pl-2">Offered package: {res.company.packageLpa.toFixed(1)} LPA</p>
                  </div>

                  {/* Skills intersect highlights */}
                  <div className="md:col-span-5 space-y-3 pl-2 border-l border-slate-50">
                    
                    {/* Perfect overlapping matches */}
                    {res.matchedSkills.length > 0 && (
                      <div className="space-y-1 text-left">
                        <span className="text-[8px] font-bold uppercase tracking-widest text-emerald-500 block">Matched Core Overlap:</span>
                        <div className="flex flex-wrap gap-1">
                          {res.matchedSkills.map((s, idx) => (
                            <span 
                              key={idx} 
                              className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md uppercase"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Leftovers / Absent candidates demands */}
                    {res.missingSkills.length > 0 ? (
                      <div className="space-y-1 text-left">
                        <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400 block">Remaining demands:</span>
                        <div className="flex flex-wrap gap-1">
                          {res.missingSkills.map((s, idx) => (
                            <span 
                              key={idx} 
                              className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md uppercase"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1 py-1 text-emerald-600 text-[10px] font-extrabold uppercase">
                        <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>100% Alignment of Required Portfolio!</span>
                      </div>
                    )}

                  </div>

                </div>
              ))}
            </div>
          )}

        </div>

      </div>

    </div>
  );
};

// Simple Icon
const CcIcon = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className="lucide lucide-file-check-2"
  >
    <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"/>
    <polyline points="14 2 14 8 20 8"/>
    <path d="m3 15 2 2 4-4"/>
  </svg>
);

export default ResumeMatching;
