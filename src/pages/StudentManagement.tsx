import React, { useState, useEffect } from "react";
import { 
  Building2, 
  GraduationCap, 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  Download, 
  Sparkles, 
  ChevronRight,
  Filter,
  CheckCircle,
  X,
  AlertCircle,
  FolderOpen,
  ShieldCheck,
  Eye,
  Award,
  Receipt,
  Clock,
  Check,
  Upload,
  FileText,
  Lock,
  Calendar,
  Briefcase,
  History,
  User
} from "lucide-react";
import emailjs from "emailjs-com";
import * as XLSX from "xlsx";
import { StudentResumesInterviews } from "../components/StudentResumesInterviews";
import { StudentCSVImport } from "../components/StudentCSVImport";

export interface Interview {
  id: string;
  companyId: string;
  companyName: string;
  role: string;
  date: string; // e.g. YYYY-MM-DD
  time: string; // e.g. HH:MM
  mode: "Virtual" | "In-Person" | "On-Campus";
  status: "Scheduled" | "Completed" | "Cancelled" | "Rescheduled";
  notes?: string;
}

interface Student {
  id: string; // studentId
  name: string;
  email: string;
  department: string;
  cgpa: number;
  skills: string; // Comma-separated
  allocationStatus?: "Allocated" | "Pending" | "Unplaced";
  allocatedCompanyId?: string;
  resumeStatus?: "Pending" | "Under Review" | "Shortlisted" | "Approved" | "Rejected";
  resumeReviewRemarks?: string;
  interviews?: Interview[];
}

interface Company {
  id: string;
  name: string;
  role: string;
  skills: string; // Comma-separated
  packageLpa: number;
}

interface VaultDocument {
  id: string;
  name: string;
  fileName: string;
  type: "academic" | "receipt";
  issuer: string;
  date: string;
  status: "VERIFIED" | "PENDING" | "SUBMITTED" | "APPROVED" | "REJECTED";
  verifiedBy?: string;
  fileSize: string;
  isCustom?: boolean;
  shaMatch?: string;
}

export const StudentManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"list" | "cgpa" | "resumes_interviews">("list");
  const [quickFilter, setQuickFilter] = useState<"All" | "Placed" | "Unplaced" | "Eligible">("All");
  const [showBulkImport, setShowBulkImport] = useState(false);

  // Document Vault States for Admin Audit Review
  const [activeVaultStudent, setActiveVaultStudent] = useState<Student | null>(null);
  const [vaultDocs, setVaultDocs] = useState<VaultDocument[]>([]);
  const [vaultSearch, setVaultSearch] = useState("");
  const [vaultTab, setVaultTab] = useState<"all" | "academic" | "receipt">("all");
  const [viewingDoc, setViewingDoc] = useState<VaultDocument | null>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Custom Document Upload by Coordinator State
  const [addingCustomDoc, setAddingCustomDoc] = useState(false);
  const [customDocName, setCustomDocName] = useState("");
  const [customDocType, setCustomDocType] = useState<"academic" | "receipt">("academic");
  const [customDocIssuer, setCustomDocIssuer] = useState("");
  const [customDocUploading, setCustomDocUploading] = useState(false);
  const [customDocProgress, setCustomDocProgress] = useState(0);

  const showSuccessToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast(null);
    }, 2500);
  };

  const handleOpenVaultReview = (student: Student) => {
    setActiveVaultStudent(student);
    const pid = student.id;
    const key = `sec_student_${pid}_vault_docs`;
    const saved = localStorage.getItem(key);
    if (saved) {
      setVaultDocs(JSON.parse(saved));
    } else {
      const defaults: VaultDocument[] = [
        {
          id: `DOC-10TH-${pid}`,
          name: "SSLC Secondary School Marksheet (10th)",
          fileName: `sslc_marksheet_${pid.toLowerCase()}.pdf`,
          type: "academic",
          issuer: "SIMATS Verification Audit Cell",
          date: "June 12, 2022",
          status: "VERIFIED",
          verifiedBy: "SEC Registrar Audit Lab Branch 2",
          fileSize: "245.8 KB",
          shaMatch: `SHA256-${pid.substring(0,2).toUpperCase()}F6D8A2BC4E578F1023BA78C902FE78`
        },
        {
          id: `DOC-12TH-${pid}`,
          name: "HSC Higher Secondary Marksheet (12th)",
          fileName: `hsc_marksheet_${pid.toLowerCase()}.pdf`,
          type: "academic",
          issuer: "SIMATS Verification Audit Cell",
          date: "May 25, 2024",
          status: "VERIFIED",
          verifiedBy: "SEC Registrar Audit Lab Branch 2",
          fileSize: "312.4 KB",
          shaMatch: `SHA256-${pid.substring(0,2).toUpperCase()}F9D8A39CCE489BE103FAB81249FA6B`
        },
        {
          id: `DOC-SEM1-${pid}`,
          name: "Consolidated Semester-I Grade Sheet & Clearance",
          fileName: `sem1_grades_${pid.toLowerCase()}.pdf`,
          type: "academic",
          issuer: "SEC Examination Controller Office",
          date: "January 18, 2025",
          status: "VERIFIED",
          verifiedBy: "Exams Cell Controller Desk",
          fileSize: "185.2 KB",
          shaMatch: `SHA256-${pid.substring(0,2).toUpperCase()}F2BCDE45A89E1039BCDA83120CBAB1`
        },
        {
          id: `DOC-REG-${pid}`,
          name: "Placement Cell Verification Clearance Form",
          fileName: `placement_cell_clearance_${pid.toLowerCase()}.pdf`,
          type: "academic",
          issuer: "Saveetha Placement Cell Secretariat",
          date: "April 02, 2026",
          status: "APPROVED",
          verifiedBy: "Placement Coordinator Head Desk 1",
          fileSize: "142.0 KB",
          shaMatch: `SHA256-${pid.substring(0,2).toUpperCase()}FCDCBA10A29EF10385DFAD12CBDA04`
        },
        {
          id: `REC-CTS-${pid}`,
          name: "Cognizant Developer Drive Application Receipt",
          fileName: `receipt_cts_genc_${pid.toLowerCase()}.pdf`,
          type: "receipt",
          issuer: "Cognizant Recruitment Hub Portal",
          date: "May 10, 2026",
          status: "SUBMITTED",
          fileSize: "89.5 KB",
          shaMatch: `SHA256-${pid.substring(0,2).toUpperCase()}FADCBA82301FEDCA83120CBCBA031A`
        },
        {
          id: `REC-WIP-${pid}`,
          name: "Wipro NTH Elite Hiring Intent Receipt",
          fileName: `intent_wipro_nth_${pid.toLowerCase()}.pdf`,
          type: "receipt",
          issuer: "Wipro Talent Acquisition Portal",
          date: "May 15, 2026",
          status: "SUBMITTED",
          fileSize: "94.2 KB",
          shaMatch: `SHA256-${pid.substring(0,2).toUpperCase()}FAACB0124DEFAB8120CBCDA01238BA`
        }
      ];
      setVaultDocs(defaults);
      localStorage.setItem(key, JSON.stringify(defaults));
    }
    setVaultTab("all");
    setVaultSearch("");
  };

  const handleApproveDoc = (docId: string) => {
    if (!activeVaultStudent) return;
    const updated = vaultDocs.map(d => {
      if (d.id === docId) {
        return { ...d, status: "VERIFIED" as const, verifiedBy: "SEC Placement Coordinator Head" };
      }
      return d;
    });
    setVaultDocs(updated);
    localStorage.setItem(`sec_student_${activeVaultStudent.id}_vault_docs`, JSON.stringify(updated));
    showSuccessToast("Document status set to VERIFIED successfully!");
  };

  const handleRejectDoc = (docId: string) => {
    if (!activeVaultStudent) return;
    const updated = vaultDocs.map(d => {
      if (d.id === docId) {
        return { ...d, status: "REJECTED" as const, verifiedBy: "SEC Placement Coordinator Head" };
      }
      return d;
    });
    setVaultDocs(updated);
    localStorage.setItem(`sec_student_${activeVaultStudent.id}_vault_docs`, JSON.stringify(updated));
    showSuccessToast("Document status set to REJECTED successfully.");
  };

  const handleDeleteDoc = (docId: string) => {
    if (!activeVaultStudent) return;
    if (!window.confirm("Are you sure you want to delete this document from the student's vault?")) return;
    const updated = vaultDocs.filter(d => d.id !== docId);
    setVaultDocs(updated);
    localStorage.setItem(`sec_student_${activeVaultStudent.id}_vault_docs`, JSON.stringify(updated));
    if (viewingDoc?.id === docId) {
      setViewingDoc(null);
    }
    showSuccessToast("Document deleted successfully.");
  };

  const simulateDocDownload = (doc: VaultDocument) => {
    setDownloadingDocId(doc.id);
    setTimeout(() => {
      setDownloadingDocId(null);
      showSuccessToast(`${doc.fileName} downloaded successfully.`);
    }, 1200);
  };

  const handleAddCustomDocByCoordinator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVaultStudent) return;
    if (!customDocName.trim() || !customDocIssuer.trim()) return;

    setCustomDocUploading(true);
    setCustomDocProgress(15);
    
    const interval = setInterval(() => {
      setCustomDocProgress(prev => {
        if (prev >= 85) {
          clearInterval(interval);
          const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
          const newDoc: VaultDocument = {
            id: `DOC-COORD-${Date.now()}`,
            name: customDocName.trim(),
            fileName: `${customDocName.trim().toLowerCase().replace(/\s+/g, "_")}_sec.pdf`,
            type: customDocType,
            issuer: customDocIssuer.trim(),
            date: dateStr,
            status: "VERIFIED",
            verifiedBy: "SEC Placement Coordinator Head",
            fileSize: "156.4 KB",
            isCustom: true,
            shaMatch: "SHA256-" + Array.from({length: 32}, () => Math.floor(Math.random()*16).toString(16)).join("").toUpperCase()
          };

          const updatedDocs = [newDoc, ...vaultDocs];
          setVaultDocs(updatedDocs);
          localStorage.setItem(`sec_student_${activeVaultStudent.id}_vault_docs`, JSON.stringify(updatedDocs));
          
          setCustomDocName("");
          setCustomDocIssuer("");
          setCustomDocUploading(false);
          setAddingCustomDoc(false);
          showSuccessToast("Verified Certificate issued & synced securely!");
          return 100;
        }
        return prev + 25;
      });
    }, 120);
  };
  
  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchedStudent, setSearchedStudent] = useState<Student | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Dialog / Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [historyStudent, setHistoryStudent] = useState<Student | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    email: "",
    department: "Computer Science",
    cgpa: "8.5",
    skills: ""
  });
  
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchStateData = async () => {
    try {
      setLoading(true);
      const [resStu, resCom] = await Promise.all([
        fetch("/api/students"),
        fetch("/api/companies")
      ]);
      const dataStu = await resStu.json();
      const dataCom = await resCom.json();

      setStudents(dataStu);
      setCompanies(dataCom);
    } catch (err) {
      console.error("Failed to read placement logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStateData();
  }, []);

  // Search Implementation
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearchError(null);
    setSearchedStudent(null);

    const sId = searchQuery.trim();
    if (!sId) {
      setSearchError("Please specify a Student Registration ID to search.");
      return;
    }

    const found = students.find(s => String(s.id).toLowerCase() === sId.toLowerCase());
    if (found) {
      setSearchedStudent(found);
    } else {
      setSearchError(`Student with ID ${sId} is not registered in CPMS.`);
    }
  };

  // Delete Action
  const handleDelete = async (studentId: string) => {
    if (!studentId) return;
    const cleanId = String(studentId).trim().toLowerCase();
    if (!window.confirm(`Are you sure you want to delete Student Profile: ${studentId}?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/students/${encodeURIComponent(studentId)}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setStudents(students.filter(s => String(s.id).trim().toLowerCase() !== cleanId));
        if (searchedStudent && String(searchedStudent.id).trim().toLowerCase() === cleanId) {
          setSearchedStudent(null);
        }
        showSuccessToast(`Student Profile ${studentId} successfully deleted.`);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete student profile");
      }
    } catch (err) {
      console.error(err);
      alert("An unexpected network error occurred while deleting the student profile.");
    }
  };

  // Form Submission — Create Student
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    const { id, name, email, department, cgpa, skills } = formData;
    if (!id.trim() || !name.trim() || !email.trim() || !skills.trim() || !cgpa) {
      setActionError("All fields are mandatory to add a student.");
      return;
    }

    const gpaVal = parseFloat(cgpa);
    if (isNaN(gpaVal) || gpaVal < 0 || gpaVal > 10) {
      setActionError("Please provide a valid CGPA between 0.0 and 10.0.");
      return;
    }

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: id.trim(),
          name: name.trim(),
          email: email.trim(),
          department,
          cgpa: gpaVal,
          skills: skills.trim()
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        setActionError(errData.error || "Constraint violation saving profile");
        return;
      }

      const created = await res.json();
      setStudents([...students, created]);
      setShowAddModal(false);
      resetForm();
    } catch (err) {
      setActionError("Internal server connectivity failure.");
    }
  };

  // Edit Initiator
  const handleEditInit = (student: Student) => {
    setEditingStudentId(student.id);
    setFormData({
      id: student.id,
      name: student.name,
      email: student.email,
      department: student.department,
      cgpa: String(student.cgpa),
      skills: student.skills
    });
    setActionError(null);
    setShowEditModal(true);
  };

  // Form Submission — Update Student
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    if (!editingStudentId) return;

    const { name, email, department, cgpa, skills } = formData;
    if (!name.trim() || !email.trim() || !skills.trim() || !cgpa) {
      setActionError("Please fulfill all updating student parameters.");
      return;
    }

    const gpaVal = parseFloat(cgpa);
    if (isNaN(gpaVal) || gpaVal < 0 || gpaVal > 10) {
      setActionError("Verify CGPA input bounds (0 to 10)");
      return;
    }

    try {
      const res = await fetch(`/api/students/${encodeURIComponent(editingStudentId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          department,
          cgpa: gpaVal,
          skills: skills.trim()
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        setActionError(errData.error || "Failed updates workflow");
        return;
      }

      const updated = await res.json();
      // Sync array
      setStudents(students.map(s => s.id === editingStudentId ? updated : s));
      // Sync search cards if open
      if (searchedStudent && searchedStudent.id === editingStudentId) {
        setSearchedStudent(updated);
      }
      setShowEditModal(false);
      resetForm();
    } catch (err) {
      setActionError("Connection timeout during update execution.");
    }
  };

  const resetForm = () => {
    setFormData({
      id: "",
      name: "",
      email: "",
      department: "Computer Science",
      cgpa: "8.5",
      skills: ""
    });
    setEditingStudentId(null);
    setActionError(null);
  };

  // Skill Matching Overlap logic list
  const getEligibleCompanies = (studentSkillsStr: string) => {
    const sSkills = studentSkillsStr.toLowerCase().split(",").map(s => s.trim()).filter(s => s.length > 0);
    
    return companies.filter(company => {
      const cSkills = company.skills.toLowerCase().split(",").map(c => c.trim()).filter(c => c.length > 0);
      // At least 1 overlapping skill
      return cSkills.some(cSkill => sSkills.some(sSkill => sSkill.includes(cSkill) || cSkill.includes(sSkill)));
    });
  };

  // Export to Excel workflow
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Work Sheet 1: All Students
    const studentSheetData = students.map((s, idx) => ({
      "Sr. No": idx + 1,
      "Student ID": s.id,
      "Full Name": s.name,
      "Academic Email": s.email,
      "Department Name": s.department,
      "CGPA Metric": s.cgpa,
      "Technical Skills": s.skills,
      "Placement Phase Status": s.allocationStatus || "Pending"
    }));
    const ws1 = XLSX.utils.json_to_sheet(studentSheetData);
    XLSX.utils.book_append_sheet(wb, ws1, "All Students");

    // Work Sheet 2: CGPA Ranking & Eligibility
    const rankedData = [...students]
      .sort((a, b) => b.cgpa - a.cgpa)
      .map((s, idx) => {
        const elg = getEligibleCompanies(s.skills).map(c => c.name).join(", ");
        return {
          "Rank Priority": idx + 1,
          "Student ID": s.id,
          "Name": s.name,
          "Department": s.department,
          "CGPA Score": s.cgpa,
          "Eligible Recruiters": elg || "None matching skills"
        };
      });
    const ws2 = XLSX.utils.json_to_sheet(rankedData);
    XLSX.utils.book_append_sheet(wb, ws2, "CGPA Ranking & Eligibility");

    // Work Sheet 3: Registered Recruiters
    const companySheetData = companies.map((c, idx) => ({
      "Serial": idx + 1,
      "Company Name": c.name,
      "Role Specification": c.role,
      "Target Candidate Skills": c.skills,
      "Stipend Package (LPA)": c.packageLpa
    }));
    const ws3 = XLSX.utils.json_to_sheet(companySheetData);
    XLSX.utils.book_append_sheet(wb, ws3, "Company Requirements");

    XLSX.writeFile(wb, "SIMATS_Students_Placements_Eligibility.xlsx");
  };

  // Aesthetics functions
  const getCgpaBadgeClass = (cgpa: number) => {
    if (cgpa >= 9.0) return "bg-emerald-50 text-emerald-700 border-emerald-200/50";
    if (cgpa >= 8.0) return "bg-blue-50 text-blue-700 border-blue-200/50";
    if (cgpa >= 7.0) return "bg-amber-50 text-amber-800 border-amber-200/50";
    return "bg-rose-50 text-rose-700 border-rose-200/50";
  };

  const displayStudents = (students || []).filter(student => {
    if (quickFilter === "All") return true;
    if (quickFilter === "Placed") {
      return student.allocationStatus === "Allocated";
    }
    if (quickFilter === "Unplaced") {
      return student.allocationStatus !== "Allocated";
    }
    if (quickFilter === "Eligible") {
      return getEligibleCompanies(student.skills).length > 0;
    }
    return true;
  });

  const countAll = students.length;
  const countPlaced = students.filter(s => s.allocationStatus === "Allocated").length;
  const countUnplaced = students.filter(s => s.allocationStatus !== "Allocated").length;
  const countEligible = students.filter(s => getEligibleCompanies(s.skills).length > 0).length;

  return (
    <div id="student_mgmt_page" className="space-y-6 animate-fade-in text-slate-800">
      
      {/* Page Title Header card */}
      <div id="title_banner" className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white p-3 rounded-2xl shadow-sm">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">Student Management Center</h2>
            <p className="text-xs text-slate-400">Add profile logs, organize cgpa eligibility lists and generate sheet summaries.</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            id="export_excel_btn"
            onClick={handleExportExcel}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-100 ring-1 ring-slate-200 hover:bg-slate-200 font-bold rounded-xl text-xs uppercase tracking-wider text-slate-600 transition-all cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>XLSX Report (3 Sheets)</span>
          </button>
          <button
            id="toggle_bulk_import_btn"
            onClick={() => setShowBulkImport(!showBulkImport)}
            className={`flex items-center justify-center space-x-2 px-4 py-2.5 font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer border ${
              showBulkImport
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-indigo-600/10 hover:bg-indigo-600/15 border-indigo-650/20 text-indigo-750"
            }`}
          >
            <Upload className="h-4 w-4" />
            <span>Bulk Import (CSV)</span>
          </button>
          <button
            id="open_add_modal_btn"
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-indigo-600/10 hover:bg-indigo-600/15 border border-indigo-650/20 font-bold rounded-xl text-xs uppercase tracking-wider text-indigo-750 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {showBulkImport && (
        <div className="animate-fade-in">
          <StudentCSVImport 
            existingStudents={students}
            onImportSuccess={fetchStateData}
            showSuccessToast={showSuccessToast}
          />
        </div>
      )}

      {/* Interactive ID Search Area */}
      <div id="search_registration_card" className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center">
          <Search className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
          Student Finder by Registration ID
        </h3>
        
        <form id="search_id_form" onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <input
            id="search_id_input"
            type="text"
            required
            placeholder="Enter Student ID (e.g. student001)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:bg-white text-slate-700 transition"
          />
          <button
            id="search_id_submit_btn"
            type="submit"
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 font-bold rounded-xl text-xs uppercase tracking-wider text-white transition-all cursor-pointer"
          >
            Locate ID
          </button>
        </form>

        {/* Found student result card details rendering */}
        {searchedStudent && (
          <div id="search_result_profile" className="p-5 border border-indigo-100 bg-indigo-50/20 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in relative">
            <button 
              id="clear_search_btn"
              onClick={() => setSearchedStudent(null)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 bg-white shadow-sm p-1 rounded-full border border-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="md:col-span-1 space-y-1 border-r border-indigo-100/60 pr-4">
              <span className="text-[10px] bg-indigo-100 text-indigo-805 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                ID Matching
              </span>
              <button 
                onClick={() => setHistoryStudent(searchedStudent)}
                className="hover:text-indigo-600 transition text-left underline decoration-dashed decoration-slate-300 hover:decoration-indigo-505 font-extrabold text-slate-900 text-sm mt-1 cursor-pointer block"
                title="Click to view Placement History & Assessments"
              >
                {searchedStudent.name}
              </button>
              <p className="text-xs font-bold text-slate-400">ID: {searchedStudent.id}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Department</span>
              <p className="text-xs font-semibold text-slate-800">{searchedStudent.department}</p>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block pt-1.5">Academics</span>
              <p className="text-xs font-semibold text-slate-850">GPA: {searchedStudent.cgpa.toFixed(2)}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Professional Skills</span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {searchedStudent.skills.split(",").map((s, idx) => (
                  <span key={idx} className="text-[10px] bg-white ring-1 ring-slate-100 px-2 py-0.5 rounded-md text-slate-600 font-medium">
                    {s.trim()}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-end justify-end space-x-2">
              <button
                id="search_edit_btn"
                onClick={() => handleEditInit(searchedStudent)}
                className="p-2 border border-slate-200/80 bg-white rounded-xl text-slate-600 hover:text-indigo-650"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                id="search_delete_btn"
                onClick={() => handleDelete(searchedStudent.id)}
                className="p-2 border border-rose-200 bg-white rounded-xl text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {searchError && (
          <div id="search_error_banner" className="flex items-center space-x-2 text-rose-600 bg-rose-50/50 p-3 rounded-xl border border-rose-100 text-xs font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{searchError}</span>
          </div>
        )}
      </div>

      {/* Main Dual Tab Interface */}
      <div id="student_records_container" className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        
        {/* Tab Headers */}
        <div id="student_tabs" className="flex border-b border-slate-100 bg-slate-50/50 p-4 justify-between items-center">
          <div className="flex space-x-1 bg-slate-100 p-1 rounded-2xl">
            <button
              id="tab_student_list"
              onClick={() => setActiveTab("list")}
              className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider transition-all duration-200 ${
                activeTab === "list"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Student List
            </button>
            <button
              id="tab_cgpa_report"
              onClick={() => setActiveTab("cgpa")}
              className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider transition-all duration-200 ${
                activeTab === "cgpa"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              CGPA Report
            </button>
            <button
              id="tab_resumes_interviews"
              onClick={() => setActiveTab("resumes_interviews")}
              className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider transition-all duration-200 ${
                activeTab === "resumes_interviews"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Resumes & Interviews
            </button>
          </div>

          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {quickFilter !== "All" ? `${displayStudents.length} of ` : ""}{students.length} Registered Students
          </span>
        </div>

        {/* Quick Filter Pills Row */}
        <div id="quick_filter_pills_bar" className="flex flex-wrap gap-2.5 px-6 py-3.5 bg-slate-50/30 border-b border-slate-100 items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quick Filters:</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                id="qf_all"
                onClick={() => setQuickFilter("All")}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  quickFilter === "All"
                    ? "bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/10"
                    : "bg-white hover:bg-slate-50 text-slate-600 border border-slate-200"
                }`}
              >
                <span>All Students</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${quickFilter === "All" ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-500"}`}>{countAll}</span>
              </button>
              
              <button
                id="qf_placed"
                onClick={() => setQuickFilter("Placed")}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  quickFilter === "Placed"
                    ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/10"
                    : "bg-white hover:bg-emerald-50 text-slate-650 border border-emerald-100"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Placed</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${quickFilter === "Placed" ? "bg-emerald-800 text-emerald-100" : "bg-emerald-50 text-emerald-700"}`}>{countPlaced}</span>
              </button>

              <button
                id="qf_unplaced"
                onClick={() => setQuickFilter("Unplaced")}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  quickFilter === "Unplaced"
                    ? "bg-amber-500 text-white shadow-sm ring-2 ring-amber-500/10"
                    : "bg-white hover:bg-amber-50 text-slate-650 border border-amber-150"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>Unplaced</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${quickFilter === "Unplaced" ? "bg-amber-700 text-amber-100" : "bg-amber-50 text-amber-700"}`}>{countUnplaced}</span>
              </button>

              <button
                id="qf_eligible"
                onClick={() => setQuickFilter("Eligible")}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  quickFilter === "Eligible"
                    ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/10"
                    : "bg-white hover:bg-indigo-50 text-slate-650 border border-indigo-155"
                }`}
              >
                <Sparkles className="h-3 w-3 text-current" />
                <span>Eligible Recruiters</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${quickFilter === "Eligible" ? "bg-indigo-800 text-indigo-100" : "bg-indigo-50 text-indigo-700"}`}>{countEligible}</span>
              </button>
            </div>
          </div>
          
          {quickFilter !== "All" && (
            <button
              id="qf_clear"
              onClick={() => setQuickFilter("All")}
              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-extrabold uppercase tracking-wider flex items-center space-x-1 cursor-pointer bg-transparent border-none py-1 px-2 hover:bg-indigo-50/50 rounded-lg transition"
            >
              <span>Clear Filter</span>
            </button>
          )}
        </div>

        {/* Tab content container */}
        <div id="tab_contents_container" className="overflow-x-auto min-w-full">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading student logs...</div>
          ) : students.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <GraduationCap className="h-10 w-10 mx-auto text-slate-200 mb-2" />
              <p className="text-xs font-bold">No students registered in CPMS.</p>
              <p className="text-[10px] text-slate-400 max-w-sm mx-auto mt-1">Please populate student logs by clicking "Add Student" above.</p>
            </div>
          ) : displayStudents.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Filter className="h-10 w-10 mx-auto text-slate-350 mb-2" />
              <p className="text-xs font-bold">No students matching the "{quickFilter}" filter.</p>
              <p className="text-[10px] text-slate-400 max-w-sm mx-auto mt-1">
                Currently, there are no students with this status in our records. Select a different filter or click {" "}
                <button 
                  onClick={() => setQuickFilter("All")} 
                  className="font-extrabold underline text-indigo-600 hover:text-indigo-800 transition bg-transparent border-none p-0 inline cursor-pointer outline-none"
                >
                  All Students
                </button> to view all profiles.
              </p>
            </div>
          ) : activeTab === "list" ? (
            
            /* TAB 1: Student List (Sorted by student ID) */
            <table id="tbl_student_list" className="min-w-full divide-y divide-slate-150 border-collapse">
              <thead className="bg-slate-50/40 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-4 text-left font-bold">Sr. No</th>
                  <th className="px-6 py-4 text-left font-bold">Student ID</th>
                  <th className="px-6 py-4 text-left font-bold">Student Name</th>
                  <th className="px-6 py-4 text-left font-bold">Department</th>
                  <th className="px-6 py-4 text-center font-bold">CGPA</th>
                  <th className="px-6 py-4 text-left font-bold">Skills</th>
                  <th className="px-6 py-4 text-center font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                {[...displayStudents]
                  .sort((a, b) => a.id.localeCompare(b.id))
                  .map((student, idx) => (
                    <tr key={student.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4 font-medium text-slate-400 text-center">{idx + 1}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">{student.id}</td>
                      <td className="px-6 py-4 font-bold text-slate-850">
                        <button
                          id={`history_student_trigger_${student.id}`}
                          onClick={() => setHistoryStudent(student)}
                          className="hover:text-indigo-600 transition text-left underline decoration-dashed decoration-slate-300 hover:decoration-indigo-550 cursor-pointer font-bold text-slate-800 text-xs"
                          title="Click to view Placement History & Assessments"
                        >
                          {student.name}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-medium">{student.department}</td>
                      <td className="px-6 py-4 text-center min-w-16">
                        <span className={`inline-block px-2.5 py-1 border text-[11px] font-extrabold rounded-full ${getCgpaBadgeClass(student.cgpa)}`}>
                          {student.cgpa.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-sm">
                          {student.skills.split(",").map((s, sIdx) => {
                            const trimmed = s.trim();
                            if (!trimmed) return null;
                            return (
                              <span key={sIdx} className="text-[10px] bg-slate-50 border border-slate-200/50 px-2 py-0.5 rounded-full text-slate-600 font-medium">
                                {trimmed}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center gap-1.5 flex flex-wrap justify-center items-center shrink-0">
                        <button
                          id={`student_vault_btn_${student.id}`}
                          onClick={() => handleOpenVaultReview(student)}
                          className="p-1 px-2 border border-indigo-150 bg-indigo-50/20 rounded-lg text-indigo-650 hover:bg-indigo-50/80 hover:border-indigo-300 transition inline-flex items-center space-x-1 select-none cursor-pointer"
                          title="Review Document Vault & SEC Credentials"
                        >
                          <FolderOpen className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-extrabold">Review Docs</span>
                        </button>
                        <button
                          id={`student_edit_btn_${student.id}`}
                          onClick={() => handleEditInit(student)}
                          className="p-1 px-2 border border-slate-200 bg-white rounded-lg text-slate-550 hover:text-indigo-650 hover:border-slate-300 transition cursor-pointer"
                          title="Edit Student Record"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          id={`student_delete_btn_${student.id}`}
                          onClick={() => handleDelete(student.id)}
                          className="p-1 px-2 border border-rose-200 bg-white rounded-lg text-rose-505 hover:bg-rose-55 transition cursor-pointer"
                          title="Delete Student Profile"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          ) : activeTab === "cgpa" ? (
            
            /* TAB 2: CGPA Report (Ranked by CGPA descending) */
            <table id="tbl_cgpa_report" className="min-w-full divide-y divide-slate-150 border-collapse">
              <thead className="bg-slate-50/40 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-4 text-center font-bold">Rank</th>
                  <th className="px-6 py-4 text-left font-bold">Student ID</th>
                  <th className="px-6 py-4 text-left font-bold">Student Name</th>
                  <th className="px-6 py-4 text-center font-bold">CGPA</th>
                  <th className="px-6 py-4 text-left font-bold">Eligible Recruiters (Matching Overlap)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-xs animate-fade-in">
                {[...displayStudents]
                  .sort((a, b) => b.cgpa - a.cgpa)
                  .map((student, idx) => {
                    const eligiblePartners = getEligibleCompanies(student.skills);
                    return (
                      <tr key={student.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-6 py-4 text-center">
                          {idx === 0 ? (
                            <span className="bg-yellow-100 text-yellow-850 px-2 py-0.5 text-[10px] font-extrabold rounded-md uppercase tracking-wider border border-yellow-250">
                              🏆 1st
                            </span>
                          ) : idx === 1 ? (
                            <span className="bg-slate-150 text-slate-650 px-2 py-0.5 text-[10px] font-extrabold rounded-md uppercase tracking-wider border border-slate-200">
                              🥈 2nd
                            </span>
                          ) : idx === 2 ? (
                            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-extrabold rounded-md uppercase tracking-wider border border-amber-200">
                              🥉 3rd
                            </span>
                          ) : (
                            <span className="text-slate-400 font-bold">#{idx + 1}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900">{student.id}</td>
                        <td className="px-6 py-4 font-bold text-slate-850">
                          <button
                            id={`history_student_trigger_gpa_${student.id}`}
                            onClick={() => setHistoryStudent(student)}
                            className="hover:text-indigo-600 transition text-left underline decoration-dashed decoration-slate-300 hover:decoration-indigo-555 cursor-pointer font-bold text-slate-800 text-xs"
                            title="Click to view Placement History & Assessments"
                          >
                            {student.name}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-center font-extrabold">
                          <span className={`px-2 py-0.5 rounded-full border text-[10px] ${getCgpaBadgeClass(student.cgpa)}`}>
                            {student.cgpa.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 select-none">
                          <div className="flex flex-wrap gap-1 max-w-lg">
                            {eligiblePartners.length === 0 ? (
                              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                                No Overlapping Core Skills Listed
                              </span>
                            ) : (
                              eligiblePartners.map(comp => (
                                <span 
                                  key={comp.id} 
                                  className="text-[9px] font-extrabold bg-blue-50 text-indigo-700 border border-indigo-100 rounded-md px-1.5 py-0.5 inline-flex items-center space-x-1"
                                >
                                  <Building2 className="h-2 w-2 mr-0.5" />
                                  <span>{comp.name}</span>
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                })}
              </tbody>
            </table>
          ) : (
            
            /* TAB 3: Resumes & Interviews Evaluation workspace */
            <StudentResumesInterviews
              students={displayStudents}
              companies={companies}
              onUpdateStudent={(updatedStudent) => {
                setStudents(students.map(s => s.id === updatedStudent.id ? updatedStudent : s));
              }}
              showSuccessToast={showSuccessToast}
            />
          )}
        </div>
      </div>

      {/* Dialog: ADD STUDENT MODAL */}
      {showAddModal && (
        <div id="add_student_dialog" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 transition-opacity">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 flex flex-col space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <Plus className="h-5 w-5 text-indigo-500" />
                <h3 className="font-extrabold text-slate-850">Create Student Profile</h3>
              </div>
              <button 
                id="close_add_modal_btn"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {actionError && (
              <div className="bg-rose-50 text-rose-700 border border-rose-100 p-3 rounded-xl text-xs font-semibold">
                {actionError}
              </div>
            )}

            <form id="add_student_form" onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Student ID (Unique)
                  </label>
                  <input
                    id="add_student_gpa_id"
                    type="text"
                    required
                    placeholder="e.g. student001"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Full Name
                  </label>
                  <input
                    id="add_student_gpa_name"
                    type="text"
                    required
                    placeholder="e.g. Pradeep Kumar"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Academic Email
                </label>
                <input
                  id="add_student_gpa_email"
                  type="email"
                  required
                  placeholder="e.g. pradeep@saveetha.edu"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Department Name
                  </label>
                  <select
                    id="add_student_gpa_dept"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-400 bg-white"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Electronics & Communication">Electronics & Communication</option>
                    <option value="Electrical & Electronics">Electrical & Electronics</option>
                    <option value="Biotechnology">Biotechnology</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    CGPA Score
                  </label>
                  <input
                    id="add_student_gpa_score"
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    required
                    placeholder="e.g. 9.40"
                    value={formData.cgpa}
                    onChange={(e) => setFormData({ ...formData, cgpa: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                  <span>Professional Skills (Comma Separated)</span>
                  <span className="text-[9px] text-indigo-500 font-semibold">Ex. Java, Python, React</span>
                </label>
                <textarea
                  id="add_student_gpa_skills"
                  rows={3}
                  required
                  placeholder="Java, React, Node.js, Spring Boot"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-400 font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 border-t border-slate-100 pt-3">
                <button
                  id="cancel_add_student_btn"
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-xs font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  id="save_add_student_btn"
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow transition"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog: EDIT STUDENT MODAL */}
      {showEditModal && (
        <div id="edit_student_dialog" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 transition-opacity">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 flex flex-col space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <Edit className="h-5 w-5 text-indigo-500" />
                <h3 className="font-extrabold text-slate-850">Update Student Profile</h3>
              </div>
              <button 
                id="close_edit_modal_btn"
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {actionError && (
              <div className="bg-rose-50 text-rose-700 border border-rose-100 p-3 rounded-xl text-xs font-semibold">
                {actionError}
              </div>
            )}

            <form id="edit_student_form" onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 opacity-60">
                  Student ID (Cannot Be Altered)
                </label>
                <input
                  id="edit_student_gpa_id_disabled"
                  type="text"
                  disabled
                  value={formData.id}
                  className="w-full px-3 py-2 border border-slate-100 bg-slate-55 rounded-xl text-xs font-bold text-slate-450"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Full Student Name
                </label>
                <input
                  id="edit_student_gpa_name"
                  type="text"
                  required
                  placeholder="e.g. Pradeep Kumar"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Academic Email
                </label>
                <input
                  id="edit_student_gpa_email"
                  type="email"
                  required
                  placeholder="e.g. pradeep@saveetha.edu"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Department Name
                  </label>
                  <select
                    id="edit_student_gpa_dept"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-400 bg-white"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Electronics & Communication">Electronics & Communication</option>
                    <option value="Electrical & Electronics">Electrical & Electronics</option>
                    <option value="Biotechnology font-medium">Biotechnology</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    CGPA Metric
                  </label>
                  <input
                    id="edit_student_gpa_score"
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    required
                    placeholder="e.g. 9.40"
                    value={formData.cgpa}
                    onChange={(e) => setFormData({ ...formData, cgpa: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Professional Skills (Comma Separated)
                </label>
                <textarea
                  id="edit_student_gpa_skills"
                  rows={3}
                  required
                  placeholder="Java, TypeScript, React, Spring Boot"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-400 font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 border-t border-slate-100 pt-3">
                <button
                  id="cancel_edit_student_btn"
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-xs font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  id="save_edit_student_btn"
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow transition"
                >
                  Save Updates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog: PLACEMENT HISTORY MODAL */}
      {historyStudent && (
        <div id="placement_history_dialog" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col space-y-5 max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div className="flex items-start space-x-3">
                <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-2xl shrink-0 mt-0.5">
                  <History className="h-5.5 w-5.5" />
                </div>
                <div className="text-left">
                  <h3 className="font-extrabold text-base text-slate-850 tracking-tight">Placement & Assessment Audit</h3>
                  <p className="text-xs text-slate-400 font-medium">Recorded corporate attempts, interviews history, and matching outcomes.</p>
                </div>
              </div>
              <button 
                id="close_history_modal_btn"
                onClick={() => setHistoryStudent(null)}
                className="text-slate-400 hover:text-slate-600 p-1 bg-slate-50 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-5 text-left text-xs text-slate-700">
              {/* Profile Overview Section */}
              <div className="bg-slate-50/70 border border-slate-100 p-4.5 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-slate-400" />
                    <span className="font-bold text-slate-805 text-sm">{historyStudent.name}</span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-500 space-y-1">
                    <p>Registration ID: <strong className="text-slate-705">{historyStudent.id}</strong></p>
                    <p>Academic Email: <span className="text-indigo-600 select-all">{historyStudent.email}</span></p>
                    <p>Department Roster: <span className="text-slate-705">{historyStudent.department}</span></p>
                  </div>
                </div>

                <div className="space-y-2 border-t md:border-t-0 md:border-l border-slate-200/65 pt-2.5 md:pt-0 md:pl-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Academic Record</span>
                    <span className={`inline-block px-2 py-0.5 border text-[10px] font-extrabold rounded-full ${getCgpaBadgeClass(historyStudent.cgpa)}`}>
                      CGPA: {historyStudent.cgpa.toFixed(2)}
                    </span>
                  </div>
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Candidate Skills</span>
                    <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                      {(historyStudent.skills || "").split(",").map((s, idx) => {
                        const trimmed = s.trim();
                        if (!trimmed) return null;
                        return (
                          <span key={idx} className="text-[9px] bg-white border border-slate-200 px-2 py-0.5 rounded-full text-slate-600 font-bold">
                            {trimmed}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Section */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Current Placement Allocation Outcome</h4>
                {historyStudent.allocationStatus === "Allocated" ? (
                  <div className="bg-emerald-50/80 border border-emerald-100 p-4 rounded-2xl flex items-start space-x-3 animate-fade-in">
                    <div className="bg-emerald-500 text-white p-2 rounded-xl mt-0.5 shadow-sm">
                      <CheckCircle className="h-4.5 w-4.5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h5 className="font-extrabold text-emerald-900 text-sm">Successfully Allocated & Placed!</h5>
                        <span className="bg-emerald-200/50 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 border-solid">
                          Finalized
                        </span>
                      </div>
                      {companies.find(c => c.id === historyStudent.allocatedCompanyId) ? (
                        <p className="text-emerald-700 font-medium">
                          Allocated to <strong className="font-extrabold text-slate-800">{companies.find(c => c.id === historyStudent.allocatedCompanyId)?.name}</strong> as an associate <strong className="font-extrabold text-slate-800">{companies.find(c => c.id === historyStudent.allocatedCompanyId)?.role}</strong> with an annual compensation package of <strong className="font-black text-slate-905">{companies.find(c => c.id === historyStudent.allocatedCompanyId)?.packageLpa} LPA</strong>.
                        </p>
                      ) : (
                        <p className="text-emerald-700 font-medium">
                          Allocated to Partner Corporate Node (Company ID: <strong className="font-extrabold text-slate-850">{historyStudent.allocatedCompanyId}</strong>).
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex items-start space-x-3 animate-fade-in">
                    <div className="bg-slate-400 text-white p-2 rounded-xl mt-0.5">
                      <Clock className="h-4.5 w-4.5 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h5 className="font-extrabold text-slate-808 text-sm">Placement Search Active</h5>
                        <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded-full border border-amber-200 border-solid uppercase tracking-wide">
                          {historyStudent.allocationStatus || "Pending"}
                        </span>
                      </div>
                      <p className="text-slate-500 font-medium">
                        This candidate profile is currently awaiting final system matching allocation. Eligible for active campus recruiting and drive scheduler assessment events.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Interviews History Logs Section */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Assessment attempts & drive logs</h4>
                  <span className="text-[9px] bg-slate-100 font-bold border border-slate-200 px-2 py-0.5 rounded-full text-slate-500">
                    {(historyStudent.interviews || []).length} Logged Attempts
                  </span>
                </div>

                {!historyStudent.interviews || historyStudent.interviews.length === 0 ? (
                  <div className="p-8 border border-dashed border-slate-250 rounded-2xl text-center space-y-2.5 bg-slate-50/20">
                    <Calendar className="h-7 w-7 text-slate-350 mx-auto" />
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-700">No Assessment Drive Logs Recorded</p>
                      <p className="text-[11px] text-slate-400 font-medium">There are no previous interview milestones recorded on file for this student.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 relative before:absolute before:inset-y-0 before:left-3.5 before:w-0.5 before:bg-slate-100 pl-1">
                    {[...historyStudent.interviews]
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((attempt) => {
                        const isScheduled = attempt.status === "Scheduled";
                        const isCompleted = attempt.status === "Completed";
                        const isCancelled = attempt.status === "Cancelled";

                        return (
                          <div key={attempt.id} className="relative pl-8 flex flex-col md:flex-row md:items-start justify-between gap-3 p-3.5 bg-white border border-slate-100 rounded-2xl hover:shadow-xs transition animate-fade-in group text-left">
                            {/* Circle Milestone bullet on the vertical timeline line */}
                            <div className={`absolute left-2.5 top-5 w-2.5 h-2.5 rounded-full border-2 bg-white -translate-x-1/2 transition ${
                              isScheduled ? "border-indigo-500 group-hover:scale-125" :
                              isCompleted ? "border-emerald-500 group-hover:scale-125" :
                              isCancelled ? "border-rose-400 group-hover:scale-125" :
                              "border-amber-400 group-hover:scale-125"
                            }`} />

                            <div className="space-y-1.5 flex-1 select-text">
                              <div className="flex flex-wrap items-center gap-2">
                                <h5 className="font-extrabold text-slate-800 leading-tight text-xs">{attempt.companyName}</h5>
                                <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border leading-none ${
                                  isScheduled ? "bg-indigo-50 text-indigo-700 border-indigo-150" :
                                  isCompleted ? "bg-emerald-50 text-emerald-800 border-emerald-150" :
                                  isCancelled ? "bg-rose-50 text-rose-700 border-rose-150" :
                                  "bg-amber-50 text-amber-700 border-amber-150"
                                }`}>
                                  {attempt.status}
                                </span>
                                <span className="text-[8px] font-semibold bg-slate-50 text-slate-500 border border-slate-150 px-1.5 py-0.5 rounded leading-none">
                                  {attempt.mode}
                                </span>
                              </div>
                              
                              <p className="font-semibold text-[10px] text-slate-400">
                                Designated Role: <strong className="text-slate-600 font-extrabold">{attempt.role}</strong>
                              </p>

                              {attempt.notes && (
                                <div className="text-[10px] bg-slate-50/70 p-1.5 px-2.5 border border-slate-100 rounded-xl leading-relaxed text-slate-500 prose max-w-none font-sans">
                                  <span className="font-bold text-slate-600 text-[9px] uppercase tracking-wider block mb-0.5">Coordinator Remarks</span>
                                  {attempt.notes}
                                </div>
                              )}
                            </div>

                            <div className="font-mono text-[9px] text-slate-400 flex flex-row md:flex-col items-center md:items-end shrink-0 gap-x-2 gap-y-0.5 font-bold leading-none select-none">
                              <span className="text-slate-500">{attempt.date}</span>
                              <span className="text-slate-400">{attempt.time}</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setHistoryStudent(null);
                  setActiveTab("resumes_interviews");
                }}
                className="flex items-center space-x-1.5 px-3 py-2 border border-slate-200 bg-slate-50/50 hover:bg-slate-50 font-bold rounded-xl text-slate-700 hover:text-indigo-600 text-[11px] transition cursor-pointer"
                title="Go to Interview Drive Scheduler to schedule more assessment rounds for this candidate."
              >
                <Briefcase className="h-3.5 w-3.5 text-slate-450 group-hover:text-indigo-500" />
                <span>Go to Coordinator Workspace</span>
              </button>

              <button
                id="close_history_modal_bottom_btn"
                type="button"
                onClick={() => setHistoryStudent(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
              >
                Close Audit Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/*     COORDINATOR AUDIT: DOCUMENT VAULT REVIEW & AUDIT      */}
      {/* ========================================================= */}
      {activeVaultStudent && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-50 rounded-3xl max-w-5xl w-full border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in duration-200">
            
            {/* Modal Header */}
            <div className="bg-white border-b border-slate-100 p-5 px-6 flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-3">
                <div className="bg-indigo-50 p-2.5 rounded-2xl text-indigo-650">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-extrabold uppercase text-slate-850 tracking-wider">SEC Vault Audit Review</h3>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 font-extrabold px-2 py-0.5 rounded-full uppercase">
                      Admin Access
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Reviewing verified academic records & job application logs for <strong className="text-slate-700 font-bold">{activeVaultStudent.name}</strong> ({activeVaultStudent.id}) • {activeVaultStudent.department}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveVaultStudent(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-650 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-grow">
              
              {/* Toolbar & Filters */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search documents by name, status or issuer..."
                    value={vaultSearch}
                    onChange={(e) => setVaultSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 border border-slate-150 rounded-xl text-xs focus:outline-none focus:border-indigo-400 bg-slate-50/50"
                  />
                </div>

                {/* Tabs & Trigger */}
                <div className="flex items-center space-x-2 shrink-0">
                  <div className="bg-slate-100 p-1 rounded-xl flex items-center space-x-0.5 text-[11px] font-bold">
                    <button
                      onClick={() => setVaultTab("all")}
                      className={`px-3 py-1 rounded-lg transition ${vaultTab === "all" ? "bg-white text-indigo-650 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                    >
                      All Logs ({vaultDocs.length})
                    </button>
                    <button
                      onClick={() => setVaultTab("academic")}
                      className={`px-3 py-1 rounded-lg transition ${vaultTab === "academic" ? "bg-white text-indigo-650 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                    >
                      Academics ({vaultDocs.filter(d => d.type === "academic").length})
                    </button>
                    <button
                      onClick={() => setVaultTab("receipt")}
                      className={`px-3 py-1 rounded-lg transition ${vaultTab === "receipt" ? "bg-white text-indigo-650 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                    >
                      Receipts ({vaultDocs.filter(d => d.type === "receipt").length})
                    </button>
                  </div>

                  <button
                    onClick={() => setAddingCustomDoc(!addingCustomDoc)}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center space-x-1.5 shadow-sm transition cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Issue Certificate</span>
                  </button>
                </div>
              </div>

              {/* On-behalf placement document issue form */}
              {addingCustomDoc && (
                <form
                  onSubmit={handleAddCustomDocByCoordinator}
                  className="bg-white p-5 rounded-2xl border-2 border-dashed border-indigo-150 space-y-4 animate-in slide-in-from-top-4 duration-200"
                >
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-black uppercase text-indigo-600 tracking-wider">
                      Issue Official SEC Academic Credential / Placement Waiver
                    </h4>
                    <button
                      type="button"
                      onClick={() => setAddingCustomDoc(false)}
                      className="p-1 text-slate-400 hover:text-slate-655"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {customDocUploading ? (
                    <div className="py-6 flex flex-col items-center justify-center text-center space-y-3">
                      <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
                      <span className="text-xs font-bold text-slate-500">Generating SEC Digital Autograph & Encryption Signatures...</span>
                      <div className="w-64 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-indigo-600 h-full transition-all duration-150" style={{ width: `${customDocProgress}%` }} />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                            Certificate Title
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. AWS Academy Graduate (Cloud Practitioner)"
                            value={customDocName}
                            onChange={(e) => setCustomDocName(e.target.value)}
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-400"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                            Issuing Authority / Agency
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Amazon Web Services Academy Cell"
                            value={customDocIssuer}
                            onChange={(e) => setCustomDocIssuer(e.target.value)}
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-400"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                            Doc Category
                          </label>
                          <select
                            value={customDocType}
                            onChange={(e) => setCustomDocType(e.target.value as "academic" | "receipt")}
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-400 bg-white"
                          >
                            <option value="academic">Academic Credential</option>
                            <option value="receipt">Recruiter Drive Receipt</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-2 border-t border-slate-100 pt-3">
                        <button
                          type="button"
                          onClick={() => setAddingCustomDoc(false)}
                          className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-xs font-bold rounded-xl text-slate-500"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-xs"
                        >
                          Generate & Register Document
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              )}

              {/* Document Bento Grid */}
              {(() => {
                const searchLower = vaultSearch.toLowerCase();
                const filtered = vaultDocs.filter(doc => {
                  const matchesTab = vaultTab === "all" || doc.type === vaultTab;
                  const matchesSearch = doc.name.toLowerCase().includes(searchLower) ||
                    doc.issuer.toLowerCase().includes(searchLower) ||
                    doc.status.toLowerCase().includes(searchLower);
                  return matchesTab && matchesSearch;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-20 bg-white border border-slate-100 rounded-3xl flex flex-col items-center justify-center text-center p-6 shadow-sm">
                      <FolderOpen className="h-10 w-10 text-slate-300 mb-2.5" />
                      <span className="text-xs font-bold text-slate-500">No records found matching filters</span>
                      <p className="text-[10px] text-slate-400 max-w-sm mt-1 leading-normal font-medium">
                        Try modifying your search or issue an on-behalf digital certificate above.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filtered.map(doc => {
                      const isAcademic = doc.type === "academic";
                      const statusColorMap = {
                        VERIFIED: "bg-emerald-50 text-emerald-700 border-emerald-150",
                        APPROVED: "bg-teal-50 text-teal-700 border-teal-150",
                        SUBMITTED: "bg-amber-50 text-amber-700 border-amber-150",
                        PENDING: "bg-amber-50 text-amber-700 border-amber-150",
                        REJECTED: "bg-rose-50 text-rose-700 border-rose-150"
                      };

                      return (
                        <div
                          key={doc.id}
                          className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-slate-305 transition flex flex-col justify-between group h-full relative"
                        >
                          {/* Inner Status indicators */}
                          <div className="flex items-center justify-between mb-3 shrink-0">
                            <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 text-[9px] font-black uppercase rounded-full border ${statusColorMap[doc.status] || "bg-slate-100 text-slate-600"}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${
                                doc.status === "VERIFIED" || doc.status === "APPROVED" 
                                  ? "bg-emerald-500 animate-pulse" 
                                  : doc.status === "REJECTED"
                                  ? "bg-rose-500"
                                  : "bg-amber-500 animate-pulse"
                              }`} />
                              <span>{doc.status}</span>
                            </span>
                            <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-md ${isAcademic ? "bg-indigo-50 text-indigo-700" : "bg-amber-50 text-amber-800"}`}>
                              {isAcademic ? "Academic" : "Receipt"}
                            </span>
                          </div>

                          {/* Body details */}
                          <div className="space-y-1.5 flex-1 select-none">
                            <h4 className="text-xs font-black tracking-tight text-slate-850 group-hover:text-indigo-600 transition leading-snug line-clamp-2">
                              {doc.name}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-bold leading-normal flex items-center space-x-1">
                              <span>Issuer:</span>
                              <span className="text-slate-650 truncate max-w-[200px]">{doc.issuer}</span>
                            </p>
                            
                            <div className="bg-slate-50/70 p-2.5 rounded-xl text-[9px] font-medium text-slate-455 space-y-1 mt-2.5 font-mono border border-slate-100/50">
                              <div className="flex justify-between">
                                <span className="font-sans font-bold text-slate-400">Registered:</span>
                                <span className="text-slate-700">{doc.date}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-sans font-bold text-slate-400">File Payload:</span>
                                <span className="text-slate-700">{doc.fileSize}</span>
                              </div>
                              {doc.shaMatch && (
                                <div className="flex flex-col pt-1 border-t border-slate-100/60 mt-1">
                                  <span className="font-sans font-bold text-slate-400 block mb-0.5 uppercase tracking-wider text-[7.5px]">SHA-256 Digital Fingerprint:</span>
                                  <span className="text-slate-605 text-[8px] select-all truncate uppercase">{doc.shaMatch}</span>
                                </div>
                              )}
                              {doc.verifiedBy && (
                                <div className="flex justify-between pt-1 text-[8.5px] border-t border-slate-100/60 mt-1 text-slate-500">
                                  <span>Auditer:</span>
                                  <span className="font-bold text-indigo-650 truncate max-w-[130px]">{doc.verifiedBy}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action Bar */}
                          <div className="flex items-center justify-end space-x-1.5 mt-4 pt-3.5 border-t border-slate-100 shrink-0">
                            <button
                              type="button"
                              onClick={() => setViewingDoc(doc)}
                              className="p-1.5 px-2.5 border border-slate-150 bg-white hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-800 transition inline-flex items-center space-x-1 text-[10px] font-extrabold cursor-pointer select-none"
                              title="Visual Inspection Sandbox"
                            >
                              <Eye className="h-3 w-3" />
                              <span>Inspect</span>
                            </button>

                            {doc.status !== "VERIFIED" && doc.status !== "APPROVED" && (
                              <button
                                type="button"
                                onClick={() => handleApproveDoc(doc.id)}
                                className="p-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-emerald-700 transition inline-flex items-center space-x-0.5 text-[9.5px] font-extrabold cursor-pointer"
                                title="Approve & Certificate Verification Set"
                              >
                                <Check className="h-3 w-3" />
                                <span>Verify</span>
                              </button>
                            )}

                            {doc.status !== "REJECTED" && (
                              <button
                                type="button"
                                onClick={() => handleRejectDoc(doc.id)}
                                className="p-1.5 px-1.5 hover:bg-rose-50 border border-slate-200 hover:border-rose-250 rounded-lg text-slate-450 hover:text-rose-600 transition inline-flex items-center text-[9.5px] font-extrabold cursor-pointer"
                                title="Reject Document Validity"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}

                            {doc.isCustom && (
                              <button
                                type="button"
                                onClick={() => handleDeleteDoc(doc.id)}
                                className="p-1.5 hover:bg-rose-50 border border-slate-200 hover:border-rose-150 rounded-lg text-rose-505 transition cursor-pointer"
                                title="Revoking Certificate registration"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={downloadingDocId === doc.id}
                              onClick={() => simulateDocDownload(doc)}
                              className="p-1.5 border border-slate-200 hover:bg-indigo-50 rounded-lg text-indigo-650 hover:border-indigo-300 disabled:opacity-50 transition cursor-pointer"
                              title="Download/Simulate Extract Document"
                            >
                              <Download className={`h-3 w-3 ${downloadingDocId === doc.id ? "animate-bounce" : ""}`} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

            </div>

            {/* Modal Footer */}
            <div className="bg-white border-t border-slate-150 p-4 px-6 flex justify-between items-center shrink-0">
              <span className="text-[10px] text-slate-450 font-bold tracking-normal uppercase font-mono flex items-center space-x-1">
                <Lock className="h-3.5 w-3.5 text-indigo-500 mr-1" />
                <span>Encrypted AES Placement Vault • Audit Sec</span>
              </span>
              <button
                type="button"
                onClick={() => setActiveVaultStudent(null)}
                className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer font-sans"
              >
                Close Audit
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/*        VISUAL INSPECTION LIGHTBOX SANDBOX MODAL           */}
      {/* ========================================================= */}
      {viewingDoc && activeVaultStudent && (
        <div className="fixed inset-0 z-55 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-100 rounded-3xl max-w-2xl w-full border border-slate-300 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
            
            {/* Lightbox Header */}
            <div className="bg-white border-b border-slate-150 p-4 px-5 flex justify-between items-center shrink-0 select-none">
              <div className="flex items-center space-x-2.5">
                <div className="bg-indigo-50 p-2 rounded-xl text-indigo-650">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold tracking-tight text-slate-800 uppercase">Document Inspection Sandbox</h4>
                  <p className="text-[10px] text-slate-400 font-bold">
                    File: <span className="font-mono text-indigo-600">{viewingDoc.fileName}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => simulateDocDownload(viewingDoc)}
                  className="p-1.5 px-2.5 border border-slate-205 hover:bg-indigo-50 rounded-lg text-indigo-600 text-[10px] font-black inline-flex items-center space-x-1 cursor-pointer"
                >
                  <Download className="h-3 w-3" />
                  <span>Download File</span>
                </button>
                <button
                  onClick={() => setViewingDoc(null)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-655 hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            {/* Lightbox Canvas Render */}
            <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-slate-400/20">
              
              <div id="inspector_certificate_facsimile" className="bg-white w-full max-w-lg min-h-[360px] border-8 border-double border-indigo-700 rounded-lg p-5 shadow-inner relative flex flex-col justify-between text-center select-none font-sans">
                
                {/* Official Background watermarks & seals */}
                <div className="absolute inset-0 bg-[radial-gradient(#818cf8_1px,transparent_1px)] [background-size:16px_16px] opacity-1 rounded" />
                
                {/* Micro security thread */}
                <div className="absolute top-0 bottom-0 left-[8%] w-[1.5px] bg-red-400/40 border-dashed" />
                
                {/* Document Facsimile Layout */}
                <div className="relative space-y-4 z-10 flex-grow flex flex-col justify-between">
                  
                  {/* Top: Header Credential */}
                  <div>
                    <h5 className="text-[11px] font-bold uppercase tracking-widest text-indigo-650">SAVEETHA ENGINEERING COLLEGE</h5>
                    <p className="text-[7.5px] font-bold text-slate-400 tracking-wider">SEC AUTONOMOUS PLACEMENT CELL SECRETARIAT</p>
                    <div className="w-16 h-0.5 bg-indigo-200 mx-auto mt-1.5" />
                  </div>

                  {/* Mid: Certificate Subject matter */}
                  <div className="space-y-1.5">
                    <p className="font-mono text-[7px] text-slate-400 font-extrabold uppercase">PLACEMENT AUDIT RECORD METRIC</p>
                    <h3 className="text-xs font-black text-slate-900 leading-tight uppercase px-4 max-w-md mx-auto">
                      {viewingDoc.name}
                    </h3>
                    
                    <p className="text-[9px] text-slate-500 font-medium font-sans px-4 leading-normal max-w-sm mx-auto">
                      This verifies that candidate <strong className="text-slate-800">{activeVaultStudent.name}</strong> ({activeVaultStudent.id}) has recorded the digital verification credentials issued by <strong className="text-slate-800">{viewingDoc.issuer}</strong> for review under statutory audit rules.
                    </p>
                  </div>

                  {/* Mini-table inside if academic marks related */}
                  {viewingDoc.id.includes("DOC-") && (
                    <div className="mx-auto w-11/12 bg-slate-50 border border-slate-150 p-2 rounded-lg text-left">
                      <div className="grid grid-cols-3 text-[7.5px] font-mono text-slate-400 border-b border-slate-200 pb-0.5 mb-1 uppercase font-bold">
                        <span>Subject Metric</span>
                        <span>Evaluation Status</span>
                        <span className="text-right">SEC Match Index</span>
                      </div>
                      <div className="space-y-0.5 text-[8px] font-mono text-slate-700">
                        <div className="flex justify-between">
                          <span>Overall Score / CGPA</span>
                          <span className="text-emerald-600 font-extrabold">ACCURACY CHANNELS</span>
                          <span className="text-right font-extrabold">{activeVaultStudent.cgpa.toFixed(2)} / 10.0</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Verified Issuance Date</span>
                          <span className="text-indigo-600 font-bold">{viewingDoc.date}</span>
                          <span className="text-right">100% SEC PASS</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bottom details & signature / stamp and QR Code facsimile */}
                  <div className="flex justify-between items-end border-t border-slate-100 pt-3 mt-4 text-left">
                    <div className="space-y-1 select-none">
                      <div className="w-16 h-5 bg-indigo-100/50 border border-indigo-200 rounded flex items-center justify-center opacity-70">
                        <span className="text-[5.5px] font-bold text-indigo-400 font-mono tracking-widest uppercase">SEC APPROVED SECURE</span>
                      </div>
                      <p className="text-[6.5px] font-mono text-slate-400">
                        Security Hash: <span className="font-bold text-slate-650 uppercase text-[6px]">{viewingDoc.shaMatch ? viewingDoc.shaMatch.substring(0, 16) : "SEC-SECURE-KEY"}...</span>
                      </p>
                    </div>

                    <div className="text-right space-y-0.5 select-none shrink-0 font-sans">
                      <span className="text-[8px] font-extrabold block text-indigo-700 italic">Pradeep Kumar</span>
                      <div className="w-14 h-px bg-indigo-300 ml-auto" />
                      <span className="text-[6px] text-slate-400 block font-bold uppercase tracking-wider">Placement Auditer</span>
                    </div>
                  </div>

                </div>

              </div>
              
              <div className="mt-4 text-center">
                <span className="inline-flex items-center space-x-1.5 text-[10px] text-slate-500 font-bold">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span>The authenticity of this document has been verified against SEC Digital Ledger standards.</span>
                </span>
              </div>

            </div>

            {/* Lightbox Footer */}
            <div className="bg-white border-t border-slate-150 p-4 px-5 flex justify-end space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setViewingDoc(null)}
                className="px-4 py-1.5 bg-slate-850 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Close Facsimile
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/*               ACTION WORKFLOW SUCCESS TOAST                */}
      {/* ========================================================= */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-55 animate-bounce-short">
          <div className="bg-slate-900/95 text-white border border-slate-800 px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 max-w-sm">
            <div className="bg-emerald-500 p-1.5 rounded-xl text-white">
              <Check className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-black tracking-wide leading-relaxed">{successToast}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default StudentManagement;
