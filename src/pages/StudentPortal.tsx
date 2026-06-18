import React, { useState, useEffect } from "react";
import { useAuth } from "../lib/auth";
import { 
  UserCircle, 
  GraduationCap, 
  Code2, 
  Building2, 
  LogOut, 
  Sparkles, 
  CheckCircle, 
  Loader2, 
  AlertCircle,
  HelpCircle,
  Briefcase,
  Bell,
  Calendar,
  FileText,
  ChevronDown,
  ChevronUp,
  MailOpen,
  Mail,
  Check,
  Clock,
  Search,
  Filter,
  TrendingUp,
  Target,
  Award,
  Phone,
  Linkedin,
  Github,
  Upload,
  Trash2,
  Paperclip,
  Edit2,
  Save,
  CheckCircle2,
  X,
  FolderOpen,
  FileCheck,
  Receipt,
  ShieldCheck,
  Eye,
  Download,
  Plus,
  MapPin
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import emailjs from "emailjs-com";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from "recharts";

interface Interview {
  id: string;
  companyId: string;
  companyName: string;
  role: string;
  date: string;
  time: string;
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
  skills: string;
  packageLpa: number;
}

interface DBNotification {
  id: string;
  type: "drive" | "schedule" | "document";
  title: string;
  description: string;
  targetStudentId?: string;
  date: string;
}

export const StudentPortal: React.FC = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<Student | null>(null);
  const [companyDetails, setCompanyDetails] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  // Corporate Match analysis lists
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // Notification States
  const [notifications, setNotifications] = useState<DBNotification[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<"all" | "drive" | "schedule" | "document">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedNotifId, setExpandedNotifId] = useState<string | null>(null);
  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("sec_read_notif_ids") || "[]");
    } catch {
      return [];
    }
  });

  // Action status mock for documents
  const [completedDocs, setCompletedDocs] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("sec_completed_docs") || "[]");
    } catch {
      return [];
    }
  });

  // Portfolio Completeness & Resume states
  const [phone, setPhone] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [github, setGithub] = useState("");
  const [resumeFile, setResumeFile] = useState<{ name: string; size: string; uploadedAt: string } | null>(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isEditingSkills, setIsEditingSkills] = useState(false);
  const [tempSkills, setTempSkills] = useState("");
  const [vaultSuccessMessage, setVaultSuccessMessage] = useState<string | null>(null);
  
  // Temp state for editing
  const [tempPhone, setTempPhone] = useState("");
  const [tempLinkedin, setTempLinkedin] = useState("");
  const [tempGithub, setTempGithub] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // Document Vault State Declarations
  interface VaultDocument {
    id: string;
    name: string;
    fileName: string;
    type: "academic" | "receipt";
    issuer: string;
    date: string;
    status: "VERIFIED" | "PENDING" | "SUBMITTED" | "APPROVED";
    verifiedBy?: string;
    fileSize: string;
    isCustom?: boolean;
    shaMatch?: string;
  }

  const [vaultDocs, setVaultDocs] = useState<VaultDocument[]>([]);
  const [vaultSearch, setVaultSearch] = useState("");
  const [vaultTab, setVaultTab] = useState<"all" | "academic" | "receipt">("all");
  const [viewingDoc, setViewingDoc] = useState<VaultDocument | null>(null);
  
  // Custom Doc Upload State
  const [addingCustomDoc, setAddingCustomDoc] = useState(false);
  const [customDocName, setCustomDocName] = useState("");
  const [customDocType, setCustomDocType] = useState<"academic" | "receipt">("academic");
  const [customDocIssuer, setCustomDocIssuer] = useState("");
  const [customDocFile, setCustomDocFile] = useState<File | null>(null);
  const [customDocUploading, setCustomDocUploading] = useState(false);
  const [customDocProgress, setCustomDocProgress] = useState(0);

  // Simulated download state
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const [downloadSuccessMsg, setDownloadSuccessMsg] = useState<string | null>(null);

  // EmailJS Alert Transmission states
  const [emailAlertSendingId, setEmailAlertSendingId] = useState<string | null>(null);
  const [emailAlertStatus, setEmailAlertStatus] = useState<{ success: boolean; message: string } | null>(null);

  const handleSendDriveMatchAlert = async (company: Company, score: number) => {
    if (!profile) return;
    setEmailAlertSendingId(`drive-${company.id}`);
    setEmailAlertStatus(null);

    const serviceId = (import.meta as any).env.VITE_EMAILJS_SERVICE_ID;
    const templateId = (import.meta as any).env.VITE_EMAILJS_TEMPLATE_ID || "template_shortlist";
    const publicKey = (import.meta as any).env.VITE_EMAILJS_PUBLIC_KEY;

    const emailSubject = `Drive Eligibility Alert: Profile Fit secured for ${company.name}!`;
    const emailBody = `Dear ${profile.name},\n\nWe are pleased to inform you that your profile has matched with ${company.name} for the ${company.role} position!\n\nMatching Analytics:\n- Match Rating: ${score}%\n- Base Stipend offered: ${company.packageLpa.toFixed(1)} LPA\n- Required Skills: ${company.skills}\n- Your Certified Skills: ${profile.skills}\n\nPlease prepare well for the recruitment drive schedules on the Campus Placement Portal.\n\nWarm regards,\nSaveetha Placement Coordination Office`;

    const templateParams = {
      to_email: profile.email || "student@saveetha.edu",
      to_name: profile.name,
      recipient_name: profile.name,
      to_address: profile.email || "student@saveetha.edu",
      subject: emailSubject,
      message: emailBody,
      company_name: company.name,
      role_specification: company.role,
      student_id: profile.id,
      stipend_package: `${company.packageLpa.toFixed(1)} LPA`,
      matching_score: `${score}%`,
      student_cgpa: profile.cgpa.toFixed(2),
    };

    let isMock = true;
    let notifTitle = `Matched Drive Alert: Registered for ${company.name}`;
    let notifDesc = `Your credentials match ${company.name}'s active recruitment drive (${score}% overlap for ${company.role} role). Email report dispatched successfully to ${profile.email}.`;

    if (serviceId && templateId && publicKey) {
      try {
        await emailjs.send(serviceId, templateId, templateParams, publicKey);
        isMock = false;
      } catch (err: any) {
        console.warn("Origin block or missing credentials for EmailJS. Simulation triggered:", err);
      }
    }

    // 1. Post in-app notification securely to backend
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "drive",
          title: notifTitle,
          description: notifDesc,
          targetStudentId: profile.id
        })
      });

      // Reload notifications in-app to display instantly in feed
      const resNotif = await fetch(`/api/notifications?studentId=${encodeURIComponent(profile.id)}`);
      if (resNotif.ok) {
        setNotifications(await resNotif.json());
      }
    } catch (e) {
      console.error("Failed to sync in-app notification:", e);
    }

    setEmailAlertSendingId(null);
    setEmailAlertStatus({
      success: true,
      message: isMock 
        ? `Simulation Active: Dispatched professional match report to ${profile.email}! Added an active item in your Notification Feed.`
        : `Drive Match Alert dispatched via EmailJS safely to ${profile.email}! Check your mailbox and in-app feed.`
    });
    setTimeout(() => setEmailAlertStatus(null), 8000);
  };

  const handleSendShortlistAlert = async () => {
    if (!profile) return;
    setEmailAlertSendingId("shortlist");
    setEmailAlertStatus(null);

    const serviceId = (import.meta as any).env.VITE_EMAILJS_SERVICE_ID;
    const templateId = (import.meta as any).env.VITE_EMAILJS_TEMPLATE_ID || "template_shortlist";
    const publicKey = (import.meta as any).env.VITE_EMAILJS_PUBLIC_KEY;

    const emailSubject = `Official Shortlist Notice: Profile verified at Saveetha SEC!`;
    const emailBody = `Dear ${profile.name},\n\nOutstanding news! Your professional candidature has been officially Shortlisted by Saveetha Engineering College Placement Coordination Cell for our premium active recruiter drives.\n\nEvaluation Details:\n- Status: SHORTLISTED\n- Registered CGPA: ${profile.cgpa.toFixed(2)}\n- Academic Department: ${profile.department}\n- Coordinator Remarks: ${profile.resumeReviewRemarks || "Your portfolio aligns with elite tier-1 core parameters."}\n\nPlease proceed to active assessment sessions promptly and bring copies of your verified credentials vault documents.\n\nWarm regards,\nSaveetha Placement Coordination Office`;

    const templateParams = {
      to_email: profile.email || "student@saveetha.edu",
      to_name: profile.name,
      recipient_name: profile.name,
      to_address: profile.email || "student@saveetha.edu",
      subject: emailSubject,
      message: emailBody,
      evaluation_remarks: profile.resumeReviewRemarks || "Verified credentials overlap",
      resume_status: "Shortlisted",
      student_id: profile.id,
      student_cgpa: profile.cgpa.toFixed(2),
    };

    let isMock = true;
    let notifTitle = "Shortlist Alert Dispatched";
    let notifDesc = `Official Shortlist Alert confirmation copy dispatched via EmailJS to ${profile.email}. Remarks: ${profile.resumeReviewRemarks || "Verified candidate metadata."}`;

    if (serviceId && templateId && publicKey) {
      try {
        await emailjs.send(serviceId, templateId, templateParams, publicKey);
        isMock = false;
      } catch (err: any) {
        console.warn("EmailJS transaction bypassed to simulation container:", err);
      }
    }

    // 1. Post in-app notification
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "schedule",
          title: notifTitle,
          description: notifDesc,
          targetStudentId: profile.id
        })
      });

      // Reload notifications
      const resNotif = await fetch(`/api/notifications?studentId=${encodeURIComponent(profile.id)}`);
      if (resNotif.ok) {
        setNotifications(await resNotif.json());
      }
    } catch (e) {
      console.error("Failed to sync shortlist notification:", e);
    }

    setEmailAlertSendingId(null);
    setEmailAlertStatus({
      success: true,
      message: isMock
        ? `Simulation Active: Dispatched official shortlist alert report to ${profile.email}! Notification logged.`
        : `Verified Shortlist Alert copy successfully sent via EmailJS to ${profile.email}! Check your inbox.`
    });
    setTimeout(() => setEmailAlertStatus(null), 8000);
  };

  useEffect(() => {
    if (profile) {
      const pid = profile.id;
      setPhone(localStorage.getItem(`sec_student_${pid}_phone`) || profile.phone || "");
      setLinkedin(localStorage.getItem(`sec_student_${pid}_linkedin`) || profile.linkedin || "");
      setGithub(localStorage.getItem(`sec_student_${pid}_github`) || profile.github || "");
      try {
        const savedResume = localStorage.getItem(`sec_student_${pid}_resume`);
        if (savedResume) {
          setResumeFile(JSON.parse(savedResume));
        } else if (profile.resumeFile) {
          setResumeFile(JSON.parse(profile.resumeFile));
        } else {
          setResumeFile(null);
        }
      } catch {
        setResumeFile(null);
      }

      // Initialize Document Vault State with realistic default credentials and receipts
      try {
        const savedVault = localStorage.getItem(`sec_student_${pid}_vault_docs`);
        if (savedVault) {
          setVaultDocs(JSON.parse(savedVault));
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
              shaMatch: `SHA256-${pid.substring(0,2)}f6d8a2bc4e578f1023ba78c902fe78`
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
              shaMatch: `SHA256-${pid.substring(0,2)}f9d8a39cce489be103fab81249fa6b`
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
              shaMatch: `SHA256-${pid.substring(0,2)}f2bcde45a89e1039bcda83120cbab1`
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
              shaMatch: `SHA256-${pid.substring(0,2)}fcdcba10a29ef10385dfad12cbda04`
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
              shaMatch: `SHA256-${pid.substring(0,2)}fadcba82301fedca83120cbcba031a`
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
              shaMatch: `SHA256-${pid.substring(0,2)}faacb0124defab8120cbcda01238ba`
            }
          ];
          setVaultDocs(defaults);
          localStorage.setItem(`sec_student_${pid}_vault_docs`, JSON.stringify(defaults));
        }
      } catch (err) {
        console.error("Failed to initialize Document Vault:", err);
      }
    }
  }, [profile]);

  const handleCustomDocUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!customDocName.trim() || !customDocIssuer.trim() || !customDocFile) return;

    setCustomDocUploading(true);
    setCustomDocProgress(0);

    const file = customDocFile;
    const interval = setInterval(() => {
      setCustomDocProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            const sizeStr = (file.size / 1024).toFixed(1) + " KB";
            const dateStr = new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric"
            });
            
            const newDoc: VaultDocument = {
              id: `DOC-CUSTOM-${Date.now()}`,
              name: customDocName.trim(),
              fileName: file.name,
              type: customDocType,
              issuer: customDocIssuer.trim(),
              date: dateStr,
              status: "SUBMITTED",
              fileSize: sizeStr,
              isCustom: true,
              shaMatch: "SHA256-" + Array.from({length: 32}, () => Math.floor(Math.random()*16).toString(16)).join("")
            };

            const updatedDocs = [newDoc, ...vaultDocs];
            setVaultDocs(updatedDocs);
            localStorage.setItem(`sec_student_${profile.id}_vault_docs`, JSON.stringify(updatedDocs));
            
            // Reset fields
            setCustomDocName("");
            setCustomDocIssuer("");
            setCustomDocFile(null);
            setCustomDocUploading(false);
            setAddingCustomDoc(false);
          }, 300);
          return 100;
        }
        return prev + 25;
      });
    }, 100);
  };

  const handleCustomDocDelete = (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!profile) return;
    const filtered = vaultDocs.filter(d => d.id !== docId);
    setVaultDocs(filtered);
    localStorage.setItem(`sec_student_${profile.id}_vault_docs`, JSON.stringify(filtered));
    if (viewingDoc?.id === docId) {
      setViewingDoc(null);
    }
  };

  const simulateDocDownload = (doc: VaultDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloadingDocId(doc.id);
    setTimeout(() => {
      setDownloadingDocId(null);
      setDownloadSuccessMsg(`Downloaded file: ${doc.fileName}`);
      setTimeout(() => {
        setDownloadSuccessMsg(null);
      }, 3500);
    }, 1500);
  };

  const handleStartEditing = () => {
    setTempPhone(phone);
    setTempLinkedin(linkedin);
    setTempGithub(github);
    setIsEditingDetails(true);
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const pid = profile.id;
    const cleanedPhone = tempPhone.trim();
    const cleanedLinkedin = tempLinkedin.trim();
    const cleanedGithub = tempGithub.trim();
    setPhone(cleanedPhone);
    setLinkedin(cleanedLinkedin);
    setGithub(cleanedGithub);
    localStorage.setItem(`sec_student_${pid}_phone`, cleanedPhone);
    localStorage.setItem(`sec_student_${pid}_linkedin`, cleanedLinkedin);
    localStorage.setItem(`sec_student_${pid}_github`, cleanedGithub);
    setIsEditingDetails(false);

    try {
      const res = await fetch(`/api/students/${encodeURIComponent(pid)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanedPhone,
          linkedin: cleanedLinkedin,
          github: cleanedGithub
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
      }
    } catch (err) {
      console.error("Error updating details on server:", err);
    }
  };

  const handleSaveSkills = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      const res = await fetch(`/api/students/${encodeURIComponent(profile.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skills: tempSkills })
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
        setIsEditingSkills(false);
        setVaultSuccessMessage("Technical skills portfolio successfully synchronized with database!");
        setTimeout(() => setVaultSuccessMessage(null), 3500);
      } else {
        alert("Failed to sync skills database credentials. Please try again.");
      }
    } catch (err) {
      console.error("Error saving student skills:", err);
    }
  };

  const simulateResumeUpload = (file: File) => {
    setResumeUploading(true);
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            const sizeStr = (file.size / 1024).toFixed(1) + " KB";
            const dateStr = new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            });
            const data = {
              name: file.name,
              size: sizeStr,
              uploadedAt: dateStr
            };
            if (profile) {
              localStorage.setItem(`sec_student_${profile.id}_resume`, JSON.stringify(data));
              fetch(`/api/students/${encodeURIComponent(profile.id)}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ resumeFile: JSON.stringify(data) })
              })
              .then(r => r.json())
              .then(updated => setProfile(updated))
              .catch(e => console.error("Error syncing uploaded resume with server:", e));
            }
            setResumeFile(data);
            setResumeUploading(false);
          }, 300);
          return 100;
        }
        return prev + 20;
      });
    }, 100);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (resumeUploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      simulateResumeUpload(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      simulateResumeUpload(file);
    }
  };

  const handleDeleteResume = () => {
    if (!profile) return;
    localStorage.removeItem(`sec_student_${profile.id}_resume`);
    setResumeFile(null);
    setUploadProgress(0);
    fetch(`/api/students/${encodeURIComponent(profile.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeFile: "" })
    })
    .then(r => r.json())
    .then(updated => setProfile(updated))
    .catch(e => console.error("Error clearing resume on server:", e));
  };

  const getProfileCompleteness = () => {
    const breakDownCheck = [
      { name: "SIMATS Verified Email", weight: 10, completed: !!profile?.email },
      { name: "Academic Department Tag", weight: 10, completed: !!profile?.department },
      { name: "Verified CGPA Score", weight: 10, completed: !!profile?.cgpa && profile.cgpa > 0 },
      { name: "Skills Registered Portfolio", weight: 15, completed: !!profile?.skills && profile.skills.trim().length > 0 },
      { name: "Contact Phone Number", weight: 10, completed: !!phone.trim() },
      { name: "LinkedIn Professional URL", weight: 10, completed: !!linkedin.trim() },
      { name: "GitHub Portfolio URL", weight: 10, completed: !!github.trim() },
      { name: "Professional Resume Uploaded", weight: 25, completed: !!resumeFile }
    ];
    const totalPercent = breakDownCheck.reduce((acc, curr) => curr.completed ? acc + curr.weight : acc, 0);
    return { percent: totalPercent, breakDown: breakDownCheck };
  };

  const fetchStudentProfileAndNotifs = async () => {
    if (!user || user.role !== "student" || !user.studentId) return;

    try {
      setLoading(true);
      // GET /api/students/:studentId
      const resStu = await fetch(`/api/students/${encodeURIComponent(user.studentId)}`);
      if (!resStu.ok) {
        throw new Error("Profile not registered");
      }
      const stuData: Student = await resStu.json();
      setProfile(stuData);

      // Fetch notifications
      try {
        const resNotif = await fetch(`/api/notifications?studentId=${encodeURIComponent(user.studentId)}`);
        if (resNotif.ok) {
          const notifData = await resNotif.json();
          setNotifications(notifData);
        }
      } catch (err) {
        console.error("Error loading notifications:", err);
      }

      // Unconditionally fetch and list all active corporate recruitment partners
      try {
        const resCom = await fetch("/api/companies");
        if (resCom.ok) {
          const comData = await resCom.json() as Company[];
          setAllCompanies(comData);
          
          if (comData.length > 0) {
            setSelectedCompany(comData[0]);
          }

          // Fetch allocated company details specifically if allocated
          if (stuData.allocationStatus === "Allocated" && stuData.allocatedCompanyId) {
            const allocatedCom = comData.find(c => c.id === stuData.allocatedCompanyId);
            if (allocatedCom) {
              setCompanyDetails(allocatedCom);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching matching companies list:", err);
      }
    } catch (err) {
      console.error("Error loading student portal metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentProfileAndNotifs();
  }, [user]);

  // Persist read notifications
  const handleMarkAsRead = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (readNotifIds.includes(id)) return;
    const updated = [...readNotifIds, id];
    setReadNotifIds(updated);
    localStorage.setItem("sec_read_notif_ids", JSON.stringify(updated));
  };

  const handleMarkAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadNotifIds(allIds);
    localStorage.setItem("sec_read_notif_ids", JSON.stringify(allIds));
  };

  const toggleExpand = (id: string) => {
    // Mark as read when expanded
    handleMarkAsRead(id);
    setExpandedNotifId(expandedNotifId === id ? null : id);
  };

  const handleMockAction = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (completedDocs.includes(id)) return;
    const updated = [...completedDocs, id];
    setCompletedDocs(updated);
    localStorage.setItem("sec_completed_docs", JSON.stringify(updated));
  };

  if (loading) {
    return (
      <div id="student_portal_loading" className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mx-auto" />
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Syncing candidate record...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div id="student_portal_error" className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-slate-100 max-w-sm w-full text-center shadow animate-fade-in">
          <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
          <h3 className="font-extrabold text-slate-850">Verification Log Missed</h3>
          <p className="text-xs text-slate-400 mt-1 mb-5">Your Student profile is not initialized in the database yet.</p>
          <button onClick={logout} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs uppercase cursor-pointer">
            Return to Log In
          </button>
        </div>
      </div>
    );
  }

  // Determine matching rate if allocated
  const computeMatchRate = (stuSkills: string, comSkills: string) => {
    const s = stuSkills.toLowerCase().split(",").map(i => i.trim()).filter(i => i.length > 0);
    const c = comSkills.toLowerCase().split(",").map(i => i.trim()).filter(i => i.length > 0);
    if (c.length === 0) return 0;
    const matches = c.filter(item => s.some(sSkill => sSkill.includes(item) || item.includes(sSkill))).length;
    return Math.round((matches / c.length) * 100);
  };

  // Perform a case-retained detailed match vs upskill comparison
  const getSkillAnalysis = (stuSkills: string, comSkills: string) => {
    const s = stuSkills.toLowerCase().split(",").map(i => i.trim()).filter(i => i.length > 0);
    const cNoCase = comSkills.split(",").map(i => i.trim()).filter(i => i.length > 0);
    
    const matched: string[] = [];
    const missing: string[] = [];
    
    cNoCase.forEach(compSkill => {
      const lowerCompSkill = compSkill.toLowerCase();
      const isMatch = s.some(sSkill => sSkill.includes(lowerCompSkill) || lowerCompSkill.includes(sSkill));
      if (isMatch) {
         matched.push(compSkill);
      } else {
         missing.push(compSkill);
      }
    });

    return { matched, missing };
  };

  // Transform active companies to formatted chart inputs
  const chartData = allCompanies.map(comp => {
    const matchPercentage = computeMatchRate(profile?.skills || "", comp.skills);
    return {
      name: comp.name,
      match: matchPercentage,
      packageLpa: comp.packageLpa,
      role: comp.role,
      rawCompany: comp
    };
  });

  // Notification categorization logic
  const filteredNotifs = notifications.filter(n => {
    const matchesFilter = selectedFilter === "all" || n.type === selectedFilter;
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          n.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const unreadCount = notifications.filter(n => !readNotifIds.includes(n.id)).length;

  const scoreClass = profile.cgpa >= 9.0 ? "text-emerald-600" : profile.cgpa >= 8.0 ? "text-blue-600" : "text-amber-600";

  // Pretty dates helper
  const formatNotifDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div id="student_portal_container" className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      
      {/* Top Banner with student brand */}
      <header id="student_portal_header" className="bg-indigo-950 text-white px-6 py-4 border-b border-indigo-900 shadow flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-yellow-405 bg-yellow-400 p-2 rounded-xl text-indigo-950 shadow-inner">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-wider uppercase text-yellow-400">Saveetha Engineering College</h1>
            <p className="text-[10px] text-slate-300 uppercase tracking-widest font-semibold mt-0.5">Student Placement Portal</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            id="student_portal_logout_btn"
            onClick={logout}
            className="flex items-center space-x-1.5 px-4 py-2 border border-rose-500/30 text-rose-300 hover:bg-rose-500 hover:text-white bg-rose-500/10 rounded-xl text-xs font-bold uppercase transition"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Exit Portal</span>
          </button>
        </div>
      </header>

      {/* Main Board Panel Split */}
      <main id="student_portal_content" className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8 space-y-6">
        
        {/* Welcome greeting card */}
        <section id="student_portal_greeting" className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-bold text-sm shadow">
              {profile.name.split(" ").map(w => w.charAt(0)).join("").substring(0, 2)}
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Logged Student Portfolio</span>
              <h2 className="text-base font-extrabold text-slate-850 mt-0.5">{profile.name}</h2>
              <p className="text-xs text-slate-400 font-medium">Department of {profile.department} • Reg ID: {profile.id}</p>
            </div>
          </div>
          
          <div className="px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-2xl shrink-0">
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Placement Status</p>
            <p className="text-xs font-bold text-indigo-700 mt-1">
              {profile.allocationStatus === "Allocated" ? "🎉 Allocated & Placed!" : "⏳ In Assessment Review"}
            </p>
          </div>
        </section>

        {/* Dynamic allocation banner block */}
        <section id="student_allocation_banner">
          {profile.allocationStatus === "Allocated" && companyDetails ? (
            
            /* Placed State Banner Card */
            <div id="allocation_placed_banner" className="bg-emerald-500 text-white p-6 rounded-3xl shadow-lg border border-emerald-400 relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-500 opacity-95" />
              <div className="relative z-10 space-y-3">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-600/50 text-white border border-emerald-400">
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  Hired Offer Received
                </span>
                <h3 className="text-xl font-extrabold tracking-tight">Congratulations, {profile.name}!</h3>
                <p className="text-xs text-emerald-100 max-w-xl leading-relaxed">
                  You have been successfully allocated to our elite corporate recruitment partner, <span className="font-bold text-white uppercase">{companyDetails.name}</span>. Technical alignment tests calculated a perfect fit index score of <span className="font-bold text-white">{computeMatchRate(profile.skills, companyDetails.skills)}%</span>.
                </p>
              </div>

              <div id="placed_corporate_stat_box" className="relative z-10 bg-white/10 p-5 rounded-2xl border border-white/15 text-center min-w-[180px] shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 block">Offer Stipend Package</span>
                <span className="text-2xl font-extrabold text-white block mt-1">{companyDetails.packageLpa.toFixed(1)} LPA</span>
                <span className="text-[9px] font-bold text-emerald-100 uppercase tracking-widest block border-t border-white/10 pt-2 mt-2">
                  Role: {companyDetails.role}
                </span>
              </div>
            </div>
          ) : (
            
            /* Standby State Banner Card */
            <div id="allocation_standby_banner" className="bg-indigo-900 border border-indigo-805 text-white p-6 rounded-3xl shadow flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-950/60 text-indigo-200">
                  ⏳ Pending Matching Cycle
                </span>
                <h3 className="text-base font-extrabold">Your Placement Portfolio is in review state</h3>
                <p className="text-xs text-indigo-200 leading-relaxed">
                  The placement coordinators and automated allocation selectors are currently syncing your portfolio against registered recruiters. You are entered into the active matching phases safely. Keep editing your skill arrays with coordinators to maximize your fit index metrics.
                </p>
              </div>
              
              <div className="bg-indigo-950/40 border border-indigo-800 p-4 rounded-2xl shrink-0 text-center text-xs text-indigo-200 font-semibold max-w-[200px]">
                <HelpCircle className="h-6 w-6 mx-auto text-yellow-400 mb-2 animate-bounce-subtle" />
                <span>Need modifications? Meet Placement Desk PK.</span>
              </div>
            </div>
          )}
        </section>

        {/* ========================================================= */}
        {/*           PROFILE COMPLETENESS TRACKER & RESUME HUB        */}
        {/* ========================================================= */}
        <section id="portfolio_completion_hub" className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
            <div className="bg-indigo-50 p-2.5 rounded-2xl text-indigo-650 shrink-0">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold uppercase text-slate-850 tracking-wider">Profile Completeness & Resume Hub</h3>
            </div>
          </div>

          {(() => {
            const { percent, breakDown } = getProfileCompleteness();
            
            // SVG configuration for the circular progress ring
            const size = 135;
            const strokeWidth = 10;
            const radius = (size - strokeWidth) / 2;
            const circumference = 2 * Math.PI * radius;
            const strokeDashoffset = circumference - (percent / 100) * circumference;

            return (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                
                {/* 1. Progress Ring Column */}
                <div id="completeness_progress_card" className="md:col-span-4 bg-slate-50/50 border border-slate-100 p-5 rounded-2xl flex flex-col items-center justify-center text-center space-y-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Completeness Index</span>
                  
                  {/* The SVG progress ring */}
                  <div className="relative flex items-center justify-center w-[135px] h-[135px]">
                    <svg width={size} height={size} className="transform -rotate-90">
                      {/* Trailing thin circle background */}
                      <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="transparent"
                        stroke="#e2e8f0"
                        strokeWidth={strokeWidth}
                      />
                      {/* Active colored path */}
                      <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="transparent"
                        stroke={percent === 100 ? "#10b981" : "#4f46e5"}
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
                      />
                    </svg>
                    {/* Inner percentage text overlay */}
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className={`text-2xl font-black ${percent === 100 ? "text-emerald-600" : "text-indigo-950"}`}>
                        {percent}%
                      </span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                        {percent === 100 ? "Excellent" : "In Progress"}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] leading-relaxed font-semibold text-slate-600 select-none">
                    {percent === 100 
                      ? "🎉 Perfect! Your credential standing is fully loaded and primed for recruiter selection." 
                      : `You are at ${percent}%. Add details and upload your PDF resume to unlock full recruitment matching.`}
                  </p>
                </div>

                {/* 2. Interactive Profile details Checklist form Column */}
                <div id="completeness_details_card" className="md:col-span-4 bg-slate-50/50 border border-slate-100 p-5 rounded-2xl flex flex-col justify-between space-y-4">
                  <div className="w-full">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Digital Coordinates</span>
                      {!isEditingDetails && (
                        <button
                          id="edit_coordinates_toggle"
                          onClick={handleStartEditing}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold uppercase cursor-pointer flex items-center space-x-1"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Edit Details</span>
                        </button>
                      )}
                    </div>

                    {isEditingDetails ? (
                      <form id="portfolio_coordinates_form" onSubmit={handleSaveDetails} className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase text-slate-450 block">Phone Number</label>
                          <div className="relative">
                            <Phone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                            <input
                              type="tel"
                              required
                              placeholder="e.g. +91 98765 43210"
                              value={tempPhone}
                              onChange={(e) => setTempPhone(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl py-1.5 pl-8.5 pr-3 text-xs focus:outline-none focus:border-indigo-500 font-bold"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase text-slate-450 block">LinkedIn Profile Address</label>
                          <div className="relative">
                            <Linkedin className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                            <input
                              type="url"
                              required
                              placeholder="https://linkedin.com/in/username"
                              value={tempLinkedin}
                              onChange={(e) => setTempLinkedin(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl py-1.5 pl-8.5 pr-3 text-xs focus:outline-none focus:border-indigo-500 text-slate-605 font-medium"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase text-slate-455 block">GitHub Portfolio Link</label>
                          <div className="relative">
                            <Github className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                            <input
                              type="url"
                              required
                              placeholder="https://github.com/username"
                              value={tempGithub}
                              onChange={(e) => setTempGithub(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl py-1.5 pl-8.5 pr-3 text-xs focus:outline-none focus:border-indigo-500 text-slate-605 font-medium"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-1.5">
                          <button
                            type="button"
                            onClick={() => setIsEditingDetails(false)}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-705 text-[10px] font-bold uppercase py-2 px-1 rounded-xl tracking-wider transition cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="flex-1 bg-indigo-650 hover:bg-indigo-700 text-white text-[10px] font-bold uppercase py-2 px-1 rounded-xl tracking-wider transition cursor-pointer flex items-center justify-center space-x-1"
                          >
                            <Save className="h-3 w-3" />
                            <span>Save</span>
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="space-y-3 pt-1">
                        <div className="flex items-center space-x-2.5">
                          <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                            <Phone className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Telephone Contact</span>
                            <span className="text-xs font-bold text-slate-800 block truncate">
                              {phone || <span className="text-rose-500 italic font-medium">None added</span>}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2.5">
                          <div className="p-2 bg-blue-50 rounded-xl text-blue-650">
                            <Linkedin className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">LinkedIn Profile</span>
                            <span className="text-xs font-medium text-slate-600 block truncate">
                              {linkedin ? (
                                <a href={linkedin} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-semibold">
                                  {linkedin.replace(/https?:\/\/(www\.)?/, "")}
                                </a>
                              ) : (
                                <span className="text-rose-500 italic font-medium block">Not configured</span>
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2.5">
                          <div className="p-2 bg-slate-100 rounded-xl text-slate-700">
                            <Github className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">GitHub Link</span>
                            <span className="text-xs font-medium text-slate-600 block truncate">
                              {github ? (
                                <a href={github} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-semibold">
                                  {github.replace(/https?:\/\/(www\.)?/, "")}
                                </a>
                              ) : (
                                <span className="text-rose-500 italic font-medium block">Not configured</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>


                </div>

                {/* 3. Resume Hub Drop & Match Column */}
                <div id="completeness_resume_card" className="md:col-span-4 bg-slate-50/50 border border-slate-100 p-5 rounded-2xl flex flex-col justify-between space-y-4">
                  <div className="w-full">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3 border-b border-slate-100 pb-2">Professional Resume</span>
                    
                    {resumeUploading ? (
                      /* Active upload progress template */
                      <div className="py-8 text-center space-y-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mx-auto" />
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Parsing PDF Resume...</span>
                          <p className="text-[9px] text-slate-400">{uploadProgress}% complete</p>
                        </div>
                        <div className="w-24 bg-slate-200 h-1 rounded-full mx-auto overflow-hidden">
                          <div className="bg-indigo-600 h-1" style={{ width: `${uploadProgress}%` }} />
                        </div>
                      </div>
                    ) : resumeFile ? (
                      /* Resume active template */
                      <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-start space-x-3 shadow-2xs relative overflow-hidden group">
                        <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-2xs font-extrabold text-slate-800 block truncate leading-none mb-1 group-hover:text-indigo-700" title={resumeFile.name}>
                            {resumeFile.name}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono font-medium block">
                            Size: {resumeFile.size} • Loaded
                          </span>
                          <span className="text-[8px] text-slate-400 font-medium block mt-1 uppercase text-indigo-600">
                            Ready for matching
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleDeleteResume}
                          className="text-slate-400 hover:text-rose-600 p-1 bg-slate-50 hover:bg-rose-50 rounded-lg shrink-0 transition cursor-pointer"
                          title="Remove Resume"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      /* Standard uploader zone supporting both Drag & Drop AND file picker */
                      <div
                        id="resume_drag_zone"
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleFileDrop}
                        onClick={() => document.getElementById("hidden_resume_picker")?.click()}
                        className={`border-2 border-dashed rounded-2xl p-5 text-center transition cursor-pointer select-none flex flex-col items-center justify-center space-y-2 py-6 ${
                          dragOver 
                            ? "border-indigo-500 bg-indigo-50/40" 
                            : "border-slate-300 hover:border-indigo-400 hover:bg-slate-100/40 bg-white"
                        }`}
                      >
                        <input
                          id="hidden_resume_picker"
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        <Upload className={`h-6 w-6 transition ${dragOver ? "text-indigo-600 scale-110" : "text-slate-405"}`} />
                        <div>
                          <span className="text-2xs font-bold text-slate-850 block">Upload Professional Resume</span>
                          <span className="text-[9px] text-slate-400 mt-1 block leading-relaxed px-1 font-medium">
                            Drag & drop your file here, or <span className="text-indigo-600 font-bold underline">browse local files</span>. (PDF / Word)
                          </span>
                        </div>
                      </div>
                    )}

                    {profile?.resumeStatus && (
                      <div className="mt-3 bg-white border border-slate-150 p-3 rounded-xl space-y-1.5 shadow-2xs">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-extrabold text-slate-400 uppercase tracking-wider">Evaluation Status:</span>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border shrink-0 ${
                            profile.resumeStatus === "Approved"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-250 font-bold"
                              : profile.resumeStatus === "Rejected"
                              ? "bg-rose-50 text-rose-700 border-rose-200 font-bold animate-pulse"
                              : profile.resumeStatus === "Shortlisted"
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200 font-bold"
                              : profile.resumeStatus === "Under Review"
                              ? "bg-blue-50 text-blue-700 border-blue-200 font-bold"
                              : "bg-slate-100 text-slate-600 border-slate-200 font-bold"
                          }`}>
                            {profile.resumeStatus}
                          </span>
                        </div>
                        {profile.resumeReviewRemarks && (
                          <p className="text-[9.5px] text-slate-600 bg-slate-50/50 p-1.5 border border-slate-100 rounded leading-normal italic font-semibold">
                            "{profile.resumeReviewRemarks}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>


                </div>

              </div>
            );
          })()}
        </section>
           {/* ========================================================= */}
        {/*        STUDENT PORTAL: CERTIFICATES & CREDENTIALS VAULT  */}
        {/* ========================================================= */}
        <section id="certificates_credentials_vault" className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-sm shrink-0">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold uppercase text-slate-850 tracking-wider">Certificates & Verified Credentials Vault</h3>
                <p className="text-[11px] text-slate-400 font-medium">Manage, upload, and review your verified course certifications, academic transcripts, and event clearance receipts.</p>
              </div>
            </div>

            <button
              id="toggle_add_custom_doc"
              onClick={() => setAddingCustomDoc(!addingCustomDoc)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold tracking-wider flex items-center justify-center space-x-1 transition cursor-pointer self-start sm:self-auto"
            >
              {addingCustomDoc ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              <span>{addingCustomDoc ? "Close Panel" : "Upload Certificate"}</span>
            </button>
          </div>

          {/* Toast/Success Notification Area */}
          <AnimatePresence>
            {vaultSuccessMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center space-x-2.5 text-emerald-800"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold leading-normal">{vaultSuccessMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Slide open Upload Panel */}
          {addingCustomDoc && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <form onSubmit={handleCustomDocUpload} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <h4 className="text-xs font-black uppercase text-indigo-750 tracking-wider">Official Certificate Registration</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left input fields */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Document Title / Certificate Name</label>
                      <input
                        type="text"
                        required
                        value={customDocName}
                        onChange={(e) => setCustomDocName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-indigo-400"
                        placeholder="e.g. AWS Cloud Practitioner Certificate"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Certifying Authority / Issuer</label>
                      <input
                        type="text"
                        required
                        value={customDocIssuer}
                        onChange={(e) => setCustomDocIssuer(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-indigo-400"
                        placeholder="e.g. Amazon Web Services Inc."
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Category Classification</label>
                      <div className="flex gap-4">
                        <label className="flex items-center space-x-2 text-xs text-slate-700 font-bold cursor-pointer">
                          <input 
                            type="radio" 
                            name="docType" 
                            checked={customDocType === "academic"}
                            onChange={() => setCustomDocType("academic")}
                            className="text-indigo-600 focus:ring-0"
                          />
                          <span>Academic Certificate</span>
                        </label>
                        <label className="flex items-center space-x-2 text-xs text-slate-700 font-bold cursor-pointer">
                          <input 
                            type="radio" 
                            name="docType" 
                            checked={customDocType === "receipt"}
                            onChange={() => setCustomDocType("receipt")}
                            className="text-indigo-600 focus:ring-0"
                          />
                          <span>Receipt / Waiver clearance</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Right File picker and progress */}
                  <div className="flex flex-col justify-between space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 leading-normal">Attachment File Upload (PDF/Cert)</label>
                      {customDocUploading ? (
                        <div className="border border-dashed border-slate-200 rounded-xl p-5 bg-white text-center space-y-2">
                          <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent mx-auto" />
                          <span className="text-[10px] text-slate-500 font-bold block">Uploading certificate files ({customDocProgress}%)</span>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-indigo-601 bg-indigo-600 h-1.5 rounded-full transition-all duration-100" style={{ width: `${customDocProgress}%` }} />
                          </div>
                        </div>
                      ) : (
                        <div
                          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                          onDragLeave={() => setDragOver(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setDragOver(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file) setCustomDocFile(file);
                          }}
                          onClick={() => document.getElementById("hidden_custom_doc_picker")?.click()}
                          className={`border-2 border-dashed rounded-xl p-6 text-center space-y-2 transition cursor-pointer flex flex-col items-center justify-center ${
                            dragOver 
                              ? "border-indigo-500 bg-indigo-50/40" 
                              : "border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/10 bg-white"
                          }`}
                        >
                          <input
                            id="hidden_custom_doc_picker"
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setCustomDocFile(file);
                            }}
                            className="hidden"
                          />
                          <Upload className={`h-6 w-6 ${dragOver ? "text-indigo-600 scale-110" : "text-slate-400"} transition`} />
                          <div>
                            <span className="text-[11px] font-bold text-slate-800 block">
                              {customDocFile ? `Selected: ${customDocFile.name}` : "Click to select certificate file"}
                            </span>
                            <span className="text-[9px] text-slate-400 mt-0.5 block leading-relaxed font-semibold">
                              Drag & drop document PDF/images here (Max 10MB)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={customDocUploading || !customDocFile || !customDocName.trim()}
                      className="w-full py-2 bg-indigo-650 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5"
                    >
                      <Save className="h-4 w-4" />
                      <span>Confirm & Register Certificate</span>
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          )}

          {/* Certificate Filter and Search bar Row */}
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-1 w-full md:w-auto">
              {(["all", "academic", "receipt"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setVaultTab(tab)}
                  className={`px-3 py-1 text-[10px] font-extrabold uppercase rounded-lg tracking-wider border transition cursor-pointer select-none ${
                    vaultTab === tab
                      ? "bg-slate-900 border-slate-900 text-white"
                      : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {tab === "all" ? "All Documents" : tab === "academic" ? "Academic Credentials" : "Receipts & Waivers"}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={vaultSearch}
                onChange={(e) => setVaultSearch(e.target.value)}
                placeholder="Search index metadata..."
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg pl-8.5 pr-3 py-1.5 text-[11px] font-bold text-slate-855 placeholder:text-slate-405 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Vault Document Table Grid */}
          {(() => {
            const filteredDocs = vaultDocs.filter(doc => {
              const matchesTab = vaultTab === "all" || doc.type === vaultTab;
              const matchesSearch = doc.name.toLowerCase().includes(vaultSearch.toLowerCase()) || 
                                    doc.issuer.toLowerCase().includes(vaultSearch.toLowerCase()) ||
                                    doc.fileName.toLowerCase().includes(vaultSearch.toLowerCase());
              return matchesTab && matchesSearch;
            });

            if (filteredDocs.length === 0) {
              return (
                <div className="py-12 border border-dashed border-slate-150 rounded-2xl flex flex-col items-center justify-center text-center p-4">
                  <FolderOpen className="h-8 w-8 text-slate-350 mb-2 font-black" />
                  <span className="text-xs font-black text-slate-500 uppercase tracking-wider">No matching documents found</span>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-sm font-medium leading-relaxed">
                    Refine your searches or select "+ Upload Certificate" above to load documents in your SEC Placement locker file.
                  </p>
                </div>
              );
            }

            return (
              <div id="vault_docs_layout_wrapper" className="space-y-3">
                {filteredDocs.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => setViewingDoc(doc)}
                    className="border border-slate-100 hover:border-indigo-150 hover:shadow-xs rounded-2xl p-4 bg-white hover:bg-slate-50 transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start space-x-3 min-w-0">
                      <div className={`p-2.5 rounded-xl shrink-0 ${
                        doc.type === "academic" ? "bg-indigo-50 text-indigo-700" : "bg-emerald-50 text-emerald-700"
                      }`}>
                        <FileText className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-slate-800 leading-snug truncate">
                          {doc.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[9px] font-bold text-slate-400 select-none">
                          <span className="text-slate-600 block">{doc.issuer}</span>
                          <span>•</span>
                          <span>Size: {doc.fileSize}</span>
                          <span>•</span>
                          <span>Reg Date: {doc.date}</span>
                        </div>
                        {doc.shaMatch && (
                          <p className="text-[7.5px] font-mono font-bold text-indigo-500 tracking-wider truncate mt-1 bg-indigo-50/30 px-1.5 py-0.5 rounded border border-indigo-100/30 max-w-sm block">
                            Ledger Ref: <span className="text-slate-500">{doc.shaMatch}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0 self-end md:self-auto select-none">
                      {/* Status badge */}
                      <span className={`px-2 py-0.5 text-[8.5px] font-black uppercase rounded tracking-wider border ${
                        doc.status === "VERIFIED" || doc.status === "APPROVED"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-250 font-bold"
                          : doc.status === "SUBMITTED"
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200 font-bold"
                          : "bg-amber-50 text-amber-700 border-amber-200 font-bold"
                      }`}>
                        {doc.status}
                      </span>

                      {/* Download Simulated Button */}
                      <button
                        title="Simulate Download"
                        onClick={(e) => simulateDocDownload(doc, e)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition cursor-pointer shrink-0"
                      >
                        {downloadingDocId === doc.id ? (
                          <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-indigo-600 border-t-transparent" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                      </button>

                      {/* Custom Delete button */}
                      {doc.isCustom && (
                        <button
                          title="Delete Certificate"
                          onClick={(e) => {
                            handleCustomDocDelete(doc.id, e);
                            setVaultSuccessMessage("Certificate successfully revoked and deleted from personal repository.");
                            setTimeout(() => setVaultSuccessMessage(null), 3500);
                          }}
                          className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition cursor-pointer shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Certificate Detail Information Modal/Slider */}
          {viewingDoc && (
            <div 
              style={{ contentVisibility: "auto" }}
              className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-3xs flex items-center justify-center p-4"
              onClick={() => setViewingDoc(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-xl space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className={`p-2.5 rounded-2xl ${
                    viewingDoc.type === "academic" ? "bg-indigo-50 text-indigo-700" : "bg-emerald-50 text-emerald-700"
                  }`}>
                    <FileCheck className="h-5 w-5" />
                  </div>
                  <button 
                    onClick={() => setViewingDoc(null)}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-800 transition cursor-pointer"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">SEC Verified Ledger</span>
                  <h3 className="text-sm font-extrabold text-slate-850 leading-tight">{viewingDoc.name}</h3>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 text-2xs space-y-2 text-slate-650">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-400">File Name:</span>
                    <span className="font-bold text-slate-700 text-right truncate max-w-[180px]">{viewingDoc.fileName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-400">Classification:</span>
                    <span className="font-bold text-slate-700 uppercase">{viewingDoc.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-400">Certifying Body:</span>
                    <span className="font-bold text-slate-700 text-right font-mono truncate max-w-[180px]">{viewingDoc.issuer}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-400">Registration Date:</span>
                    <span className="font-bold text-slate-705 text-right">{viewingDoc.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-400">Locker Security status:</span>
                    <span className="font-black text-emerald-600 text-right uppercase">{viewingDoc.status}</span>
                  </div>
                  {viewingDoc.verifiedBy && (
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-400">Verified Signature:</span>
                      <span className="font-bold text-indigo-650 text-right">{viewingDoc.verifiedBy}</span>
                    </div>
                  )}
                  {viewingDoc.shaMatch && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="font-bold text-slate-400 block mb-1 uppercase tracking-widest text-3xs">SHA-256 Ledger Signature</span>
                      <p className="font-mono text-[7px] text-slate-550 break-all select-all font-semibold bg-white p-1.5 border border-slate-150 rounded-xl leading-normal">
                        {viewingDoc.shaMatch}
                      </p>
                    </div>
                  )}
                </div>

                <div className="border border-indigo-50 leading-relaxed font-semibold text-[9.5px] p-2.5 text-indigo-700 bg-indigo-50/20 rounded-xl">
                  🔒 Certified authentic. Credentials synchronized with the central secure corporate placement verification vault.
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setViewingDoc(null)}
                    className="flex-1 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-605 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Done
                  </button>
                  <button
                    onClick={(e) => simulateDocDownload(viewingDoc, e)}
                    className="flex-1 py-1.5 text-xs text-white font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer flex items-center justify-center space-x-1"
                  >
                    {downloadingDocId === viewingDoc.id ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    <span>Download</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {downloadSuccessMsg && (
            <div className="fixed bottom-4 right-4 bg-emerald-50 border border-emerald-200 p-3.5 text-emerald-800 text-xs font-extrabold rounded-2xl shadow-xl flex items-center space-x-2.5 z-50 animate-slide-in-up">
              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
              <span>{downloadSuccessMsg}</span>
            </div>
          )}
        </section>

        {/* ========================================================= */}
        {/*           STUDENT PORTAL: INTERVIEWS BOARD SECTION         */}
        {/* ========================================================= */}
        <section id="interviews_board_section" className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-3">
              <div className="bg-emerald-500 p-2.5 rounded-2xl text-white shadow-sm">
                <Calendar className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold uppercase text-slate-850 tracking-wider">Your Recruiter Assessments</h3>
                <p className="text-[11px] text-slate-400 font-medium">Coordinate your scheduled interviews, venue coordinates and coordinator instructions here.</p>
              </div>
            </div>

            <span className="text-[10px] bg-emerald-55 border border-emerald-250 font-black px-2.5 py-0.5 rounded-full uppercase text-emerald-800">
              {profile?.interviews?.filter(i => i.status === "Scheduled").length || 0} active assessments
            </span>
          </div>

          {!profile?.interviews || profile.interviews.length === 0 ? (
            <div className="py-12 text-center text-slate-400 border border-dashed border-slate-150 rounded-2xl flex flex-col items-center justify-center">
              <Briefcase className="h-10 w-10 text-slate-200 mb-2 font-black" />
              <p className="text-xs font-black uppercase text-slate-450 tracking-widest">Assessment Board Clean</p>
              <p className="text-[10px] text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">You do not have any recruitment interviews scheduled at this time. Complete your professional profile and resume upload to unlock matching indices.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.interviews.map(item => (
                <div 
                  key={item.id} 
                  className={`p-5 rounded-2xl border transition-all duration-150 relative overflow-hidden flex flex-col justify-between space-y-4 shadow-2xs ${
                    item.status === "Cancelled"
                      ? "bg-rose-50/20 border-rose-100 opacity-75"
                      : "bg-white border-slate-200 hover:border-slate-350"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h4 className="text-xs font-black text-slate-800 uppercase leading-snug">{item.companyName}</h4>
                        <p className="text-[10.5px] font-bold text-slate-500 mt-0.5">Role: {item.role}</p>
                      </div>

                      <span className={`text-[8px] font-black uppercase rounded-md px-2 py-0.5 border shrink-0 leading-none ${
                        item.status === "Scheduled"
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse font-black"
                          : item.status === "Cancelled"
                          ? "bg-rose-100 text-rose-800 border-rose-250 font-black animate-none"
                          : "bg-slate-100 text-slate-600 border-slate-200 font-bold"
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    {/* Timeline specifications */}
                    <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100/60 text-[10px] font-mono text-slate-505">
                      <div className="flex items-center space-x-1 font-bold">
                        <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{item.date}</span>
                      </div>
                      <div className="flex items-center space-x-1 font-bold">
                        <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{item.time}</span>
                      </div>
                      <div className="flex items-center space-x-1 bg-amber-50 rounded px-1.5 py-0.5 border border-amber-200/40 text-amber-700 font-extrabold max-w-max justify-self-end origin-right scale-90">
                        <MapPin className="h-3 w-3 mr-0.5 shrink-0" />
                        {item.mode}
                      </div>
                    </div>
                  </div>

                  {item.notes && (
                    <div className="bg-slate-50 border border-slate-150 p-2.5 rounded-xl space-y-1">
                      <span className="text-[8.5px] font-bold text-slate-450 uppercase tracking-wider block">Instructions from Coordinator</span>
                      <p className="text-[9.5px] text-slate-600 leading-relaxed font-semibold italic">
                        "{item.notes}"
                      </p>
                    </div>
                  )}

                  {item.status === "Scheduled" && (
                    <div className="pt-2 border-t border-slate-100/60 flex justify-between items-center text-[9px] font-bold text-slate-400">
                      <span className="flex items-center space-x-1 select-none">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-emerald-750">SEC Verified Agenda</span>
                      </span>
                      <span>Please arrive 15m early</span>
                    </div>
                  )}

                </div>
              ))}
            </div>
          )}
        </section>

        {/* ========================================================= */}
        {/*       PLACEMENT DIVE MATCHING & EMAILJS ALERT HUB         */}
        {/* ========================================================= */}
        <section id="placement_matching_alerts_section" className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-sm shrink-0">
                <Sparkles className="h-5 w-5 text-yellow-300" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold uppercase text-slate-850 tracking-wider">Placement Matches & EmailJS Alerts Cell</h3>
                <p className="text-[11px] text-slate-400 font-semibold text-slate-400">Real-time profile-to-job matching algorithms combined with instant dispatchable EmailJS notification triggers.</p>
              </div>
            </div>

            <span className="text-[10px] bg-indigo-50 border border-indigo-200 font-black px-2.5 py-0.5 rounded-full uppercase text-indigo-755">
              Active matching engine live
            </span>
          </div>

          {/* Alert Status Banners */}
          <AnimatePresence>
            {emailAlertStatus && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`p-4 rounded-2xl flex items-start space-x-3 text-xs font-bold leading-normal border ${
                  emailAlertStatus.success 
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                    : "bg-rose-50 border-rose-200 text-rose-800"
                }`}
              >
                {emailAlertStatus.success ? (
                  <CheckCircle className="h-4.5 w-4.5 text-emerald-605 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4.5 w-4.5 text-rose-500 shrink-0 mt-0.5" />
                )}
                <span>{emailAlertStatus.message}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Shortlisted Highlight Block */}
          {profile?.resumeStatus === "Shortlisted" && (
            <div className="bg-gradient-to-tr from-amber-500 to-yellow-500 text-white rounded-3xl p-5 shadow-md relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1 z-10">
                <div className="flex items-center space-x-1.5 bg-white/15 border border-white/20 rounded-md px-2 py-0.5 max-w-max">
                  <Award className="h-3.5 w-3.5 text-yellow-250 animate-bounce" />
                  <span className="text-[8.5px] font-black uppercase tracking-wider text-yellow-100">Verified Shortlist Secured</span>
                </div>
                <h4 className="text-sm font-black uppercase tracking-tight">Congratulations! You have been shortlisted by a corporate recruiter!</h4>
                <p className="text-[10.5px] text-yellow-50 max-w-2xl leading-relaxed">
                  Saveetha College placement audits have updated your status to <span className="underline font-bold">Shortlisted</span>. Your credentials matched premium active drives successfully. Trigger a copies digest copy straight to your mailbox.
                </p>
                {profile?.resumeReviewRemarks && (
                  <p className="text-[9.5px] text-amber-950 bg-white/60 p-1.5 border border-amber-300/30 rounded-xl leading-normal italic font-semibold max-w-max">
                    Coordinator Feedback: "{profile.resumeReviewRemarks}"
                  </p>
                )}
              </div>

              <button
                onClick={handleSendShortlistAlert}
                disabled={emailAlertSendingId === "shortlist"}
                className="z-10 bg-indigo-950 hover:bg-black font-black text-white hover:text-emerald-350 shrink-0 px-4 py-2.5 rounded-xl text-3xs uppercase tracking-wider transition-all flex items-center space-x-2 border border-indigo-900/40 cursor-pointer disabled:opacity-50"
              >
                {emailAlertSendingId === "shortlist" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Mail className="h-3.5 w-3.5 text-yellow-350" />
                )}
                <span>Send Alert Proof</span>
              </button>
            </div>
          )}

          {/* Drive Matches grid */}
          <div className="space-y-4">
            <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Dynamic Fit Indices on Active Recruiter campaigns ({allCompanies.length})</h4>
            
            {allCompanies.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No active corporate recruitment drives available matching your criteria at this moment.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allCompanies.map((comp) => {
                  const matchPercentage = computeMatchRate(profile?.skills || "", comp.skills);
                  const skillAnalysis = getSkillAnalysis(profile?.skills || "", comp.skills);
                  const isMatching = emailAlertSendingId === `drive-${comp.id}`;
                  
                  // Color codes
                  let scoreBadgeColor = "bg-rose-50 border-rose-200 text-rose-700";
                  if (matchPercentage >= 75) {
                    scoreBadgeColor = "bg-emerald-50 border-emerald-250 text-emerald-805";
                  } else if (matchPercentage >= 40) {
                    scoreBadgeColor = "bg-indigo-50 border-indigo-200 text-indigo-750";
                  } else if (matchPercentage > 0) {
                    scoreBadgeColor = "bg-amber-50 border-amber-200 text-amber-700";
                  }

                  return (
                    <div 
                      key={comp.id}
                      className="border border-slate-150 rounded-2xl p-5 bg-white/50 hover:bg-white transition-all shadow-3xs flex flex-col justify-between space-y-4 relative overflow-hidden"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <span className="text-[8px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 uppercase font-black tracking-widest block max-w-max mb-1">
                              Corporate Partner
                            </span>
                            <h5 className="font-extrabold text-slate-800 uppercase text-xs tracking-tight">{comp.name}</h5>
                            <p className="text-[10.5px] font-bold text-slate-500 mt-0.5 text-indigo-700">{comp.role}</p>
                          </div>

                          <div className={`text-center px-2.5 py-1 border rounded-xl shrink-0 ${scoreBadgeColor}`}>
                            <span className="text-sm font-black block leading-none">{matchPercentage}%</span>
                            <span className="text-[7.5px] font-bold uppercase tracking-widest block mt-1">Match Index</span>
                          </div>
                        </div>

                        {/* Venn Skill details */}
                        <div className="space-y-2 border-t border-dashed border-slate-100 pt-3 text-[10px]">
                          <div>
                            <span className="text-slate-400 font-bold block uppercase tracking-widest text-[8px] mb-1">Overlap Verified Skills ({skillAnalysis.matched.length})</span>
                            {skillAnalysis.matched.length === 0 ? (
                              <span className="text-[9px] text-slate-400 italic font-semibold">None matched yet. Try editing your skill list below!</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {skillAnalysis.matched.map((sk, i) => (
                                  <span key={i} className="bg-emerald-55 bg-emerald-50 border border-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold text-[9px] uppercase">
                                    {sk}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div>
                            <span className="text-slate-400 font-bold block uppercase tracking-widest text-[8px] mb-1">Gap requirements ({skillAnalysis.missing.length})</span>
                            {skillAnalysis.missing.length === 0 ? (
                              <span className="text-[9px] text-emerald-600 font-black">✨ Perfect Match Requirements Met!</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {skillAnalysis.missing.map((sk, i) => (
                                  <span key={i} className="bg-slate-100 border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-bold text-[9px] uppercase">
                                    {sk}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-[10px] gap-2">
                        <span className="text-slate-400 font-bold uppercase text-[9px]">
                          Salary Offer: <span className="text-slate-700 font-black">{comp.packageLpa.toFixed(1)} LPA</span>
                        </span>

                        <button
                          onClick={() => handleSendDriveMatchAlert(comp, matchPercentage)}
                          disabled={isMatching || matchPercentage < 40}
                          className={`px-3 py-1.5 rounded-xl font-bold uppercase text-3xs tracking-wider transition-all flex items-center space-x-1 border cursor-pointer ${
                            matchPercentage >= 40
                              ? "bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-700"
                              : "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                          }`}
                          title={matchPercentage >= 40 ? "Notify yourself matching details" : "Requires at least 40% criteria alignment"}
                        >
                          {isMatching ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Mail className="h-3 w-3 shrink-0" />
                          )}
                          <span>Notify Matches</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ========================================================= */}
        {/*           STUDENT NOTIFICATION CENTER SECTION             */}
        {/* ========================================================= */}
        <section id="notification_center_section" className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 gap-4">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-50 p-2.5 rounded-2xl text-indigo-650 relative">
                <Bell className="h-5 w-5 animate-pulse" />
                {unreadCount > 0 && (
                  <span id="notif_count_badge" className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-extrabold rounded-full px-1.5 py-0.5 border-2 border-white">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-sm font-extrabold uppercase text-slate-850 tracking-wider">SEC Alert & Drive Updates</h3>
                <p className="text-[11px] text-slate-400 font-medium">Verify screening schedules, deadlines, and requirements instantly.</p>
              </div>
            </div>

            {unreadCount > 0 && (
              <button 
                id="btn_mark_all_read"
                onClick={handleMarkAllAsRead}
                className="self-start sm:self-center bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 px-3.5 py-1.5 rounded-xl text-2xs uppercase font-extrabold tracking-wider flex items-center space-x-1.5 transition cursor-pointer"
              >
                <MailOpen className="h-3.5 w-3.5" />
                <span>Mark all as read</span>
              </button>
            )}
          </div>

          {/* Search and Filters Hub */}
          <div className="flex flex-col md:flex-row gap-3">
            {/* Category Filter Tabs */}
            <div className="flex flex-wrap gap-1.5 flex-1 select-none">
              <button
                _id="notif_filter_all"
                onClick={() => setSelectedFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-3xs font-bold uppercase tracking-wider transition-all duration-200 ${
                  selectedFilter === "all"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-50 border border-slate-100 text-slate-500 hover:bg-slate-100"
                }`}
              >
                All bulletins
              </button>
              <button
                _id="notif_filter_drive"
                onClick={() => setSelectedFilter("drive")}
                className={`px-3 py-1.5 rounded-xl text-3xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center space-x-1 ${
                  selectedFilter === "drive"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-50 border border-slate-100 text-slate-500 hover:bg-slate-100"
                }`}
              >
                <Briefcase className="h-3 w-3 shrink-0" />
                <span>Placement Drives</span>
              </button>
              <button
                _id="notif_filter_schedule"
                onClick={() => setSelectedFilter("schedule")}
                className={`px-3 py-1.5 rounded-xl text-3xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center space-x-1 ${
                  selectedFilter === "schedule"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-50 border border-slate-100 text-slate-500 hover:bg-slate-100"
                }`}
              >
                <Calendar className="h-3 w-3 shrink-0" />
                <span>Interview Schedules</span>
              </button>
              <button
                _id="notif_filter_document"
                onClick={() => setSelectedFilter("document")}
                className={`px-3 py-1.5 rounded-xl text-3xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center space-x-1 ${
                  selectedFilter === "document"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-50 border border-slate-100 text-slate-500 hover:bg-slate-100"
                }`}
              >
                <FileText className="h-3 w-3 shrink-0" />
                <span>Document tasks</span>
              </button>
            </div>

            {/* Keyword Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-450" />
              <input
                id="alert_search_input"
                type="text"
                placeholder="Search alerts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-9 pr-4 text-xs font-medium focus:outline-none focus:border-indigo-400 bg-white transition"
              />
            </div>
          </div>

          {/* Bulletin Feed */}
          <div className="space-y-3">
            {filteredNotifs.length === 0 ? (
              <div className="py-12 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-center p-4">
                <Bell className="h-8 w-8 text-slate-300 mb-2" />
                <span className="text-xs font-bold text-slate-400">Zero active bulletins found</span>
                <p className="text-[10px] text-slate-400 mt-1 max-w-xs">
                  There are no updates matching your search or filters at the moment.
                </p>
              </div>
            ) : (
              filteredNotifs.map((notif) => {
                const isRead = readNotifIds.includes(notif.id);
                const isExpanded = expandedNotifId === notif.id;

                // Color themes based on notification types
                let typeStyles = {
                  border: "hover:border-teal-150 border-teal-50 bg-teal-50/10",
                  badge: "bg-teal-50 border-teal-200 text-teal-700",
                  icon: "text-teal-600 bg-teal-100",
                  label: "Hiring drive",
                  actionPanel: null
                };

                if (notif.type === "schedule") {
                  typeStyles = {
                    border: "hover:border-amber-150 border-amber-50 bg-amber-50/10",
                    badge: "bg-amber-50 border-amber-200 text-amber-700",
                    icon: "text-amber-600 bg-amber-100",
                    label: "Schedule",
                    actionPanel: null
                  };
                } else if (notif.type === "document") {
                  const isTaskCompleted = completedDocs.includes(notif.id);
                  typeStyles = {
                    border: "hover:border-rose-150 border-rose-50 bg-rose-50/10",
                    badge: isTaskCompleted ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700",
                    icon: isTaskCompleted ? "text-emerald-600 bg-emerald-100" : "text-rose-600 bg-rose-100",
                    label: "Action Required",
                    actionPanel: (
                      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-2 justify-between items-center bg-slate-50/50 p-2.5 rounded-xl">
                        <span className="text-[10px] text-slate-450 font-bold block uppercase flex items-center">
                          <CheckCircle className={`h-3.5 w-3.5 mr-1 ${isTaskCompleted ? "text-emerald-500" : "text-slate-350"}`} />
                          Task status: <span className={`ml-1 font-extrabold ${isTaskCompleted ? "text-emerald-600" : "text-rose-600"}`}>{isTaskCompleted ? "Marked as Filled/Submitted" : "Pending Document Action"}</span>
                        </span>
                        {!isTaskCompleted ? (
                          <button
                            id={`btn_action_submit_${notif.id}`}
                            onClick={(e) => handleMockAction(notif.id, e)}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold uppercase tracking-wider text-[9px] px-3 py-1 rounded-lg shadow-sm transition-all"
                          >
                            Mark Filed & Delivered
                          </button>
                        ) : (
                          <span className="text-[10px] bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold uppercase rounded-lg px-2.5 py-1 flex items-center gap-1">
                            <Check className="h-3 w-3" /> Received
                          </span>
                        )}
                      </div>
                    )
                  };
                }

                return (
                  <div
                    key={notif.id}
                    id={`notif_card_${notif.id}`}
                    onClick={() => toggleExpand(notif.id)}
                    className={`border rounded-2xl p-4 transition-all duration-200 cursor-pointer ${typeStyles.border} ${
                      !isRead ? "ring-1 ring-indigo-50 border-indigo-100 hover:shadow-sm" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start space-x-3.5 min-w-0">
                        {/* Bullet Icon Badge */}
                        <div className={`p-2.5 rounded-xl shrink-0 ${typeStyles.icon}`}>
                          {notif.type === "drive" && <Briefcase className="h-4.5 w-4.5" />}
                          {notif.type === "schedule" && <Calendar className="h-4.5 w-4.5" />}
                          {notif.type === "document" && <FileText className="h-4.5 w-4.5" />}
                        </div>

                        {/* Title and Summary info */}
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Blue dot indicator for brand new alerts */}
                            {!isRead && (
                              <span className="h-2 w-2 bg-indigo-500 rounded-full shrink-0" title="New message" />
                            )}
                            <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border ${typeStyles.badge}`}>
                              {typeStyles.label}
                            </span>
                          </div>
                          
                          <h4 className={`text-xs md:text-sm font-bold truncate leading-snug ${isRead ? "text-slate-700" : "text-slate-900 font-extrabold"}`}>
                            {notif.title}
                          </h4>
                          
                          <p className="text-[10px] text-slate-400 font-semibold flex items-center">
                            <Clock className="h-3 w-3 mr-1 text-slate-400 shrink-0" />
                            {formatNotifDate(notif.date)}
                          </p>
                        </div>
                      </div>

                      {/* Right Expand & Read Actions */}
                      <div className="flex items-center space-x-2 shrink-0">
                        {!isRead && (
                          <button
                            id={`notif_read_btn_${notif.id}`}
                            onClick={(e) => handleMarkAsRead(notif.id, e)}
                            className="bg-slate-50 hover:bg-slate-100 hover:text-indigo-600 text-slate-400 p-1.5 rounded-lg border border-slate-100 transition hidden sm:inline-flex items-center"
                            title="Mark as Read"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <div className="text-slate-400 p-1 bg-white/50 rounded-lg">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Bullet Details */}
                    {isExpanded && (
                      <div id={`notif_details_${notif.id}`} className="mt-3 pl-0 sm:pl-14 pt-3 border-t border-slate-100 animate-fade-in">
                        <p className="text-xs text-slate-650 leading-relaxed font-medium whitespace-pre-line text-slate-600">
                          {notif.description}
                        </p>
                        
                        {/* Custom actionable module (e.g. file checkins) */}
                        {typeStyles.actionPanel}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Profile Card Breakdown Bento Grid */}
        <section id="student_bento_grid" className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Personal Details info */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center">
              <UserCircle className="h-4 w-4 mr-1.5 text-indigo-500" />
              Information Details
            </h3>
            <div className="space-y-3.5">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Candidate Name</span>
                <span className="text-xs font-bold text-slate-800 block mt-0.5">{profile.name}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Academic Register ID</span>
                <span className="text-xs font-mono font-bold text-slate-800 block mt-0.5">{profile.id}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Saveetha College Email</span>
                <span className="text-xs font-medium text-slate-500 block mt-0.5">{profile.email}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Academic scores CGPA visual gauge */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-4 text-center flex flex-col justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center text-left">
              <GraduationCap className="h-4 w-4 mr-1.5 text-indigo-500" />
              Academics Report
            </h3>
            
            <div className="space-y-2 py-4">
              <span className="text-[9px] font-bold text-slate-400 uppercase block">Current CGPA Score</span>
              <span className={`text-3xl font-extrabold block tracking-tight ${scoreClass}`}>{profile.cgpa.toFixed(2)}</span>
              
              <div className="w-36 bg-slate-100 h-2 rounded-full mx-auto relative overflow-hidden">
                <div 
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${profile.cgpa * 10}%` }}
                />
              </div>
            </div>

            <div className="text-[9px] text-slate-400 uppercase font-bold bg-slate-50 border border-slate-100 p-2 rounded-xl">
              SEC Verification Standing Passed
            </div>
          </div>

          {/* Card 3: Skills list portfolio */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center">
                <Code2 className="h-4 w-4 mr-1.5 text-indigo-550" />
                Skills Registered Portfolio
              </h3>
              {!isEditingSkills && (
                <button
                  id="edit_skills_toggle"
                  onClick={() => {
                    setTempSkills(profile.skills);
                    setIsEditingSkills(true);
                  }}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-extrabold uppercase cursor-pointer flex items-center space-x-1"
                >
                  <Edit2 className="h-3 w-3" />
                  <span>Edit</span>
                </button>
              )}
            </div>

            {isEditingSkills ? (
              <form onSubmit={handleSaveSkills} className="space-y-3">
                <textarea
                  id="student_skills_edit_input"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[80px]"
                  value={tempSkills}
                  onChange={(e) => setTempSkills(e.target.value)}
                  placeholder="e.g. Java, Python, React, SQL"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingSkills(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-705 text-[10px] font-extrabold uppercase py-1.5 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-650 hover:bg-indigo-700 text-white text-[10px] font-extrabold uppercase py-1.5 rounded-xl transition cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex-1 flex flex-wrap gap-1 mt-2 content-start overflow-y-auto max-h-36 pr-1">
                  {profile.skills.split(",").map((s, idx) => {
                    const trimmed = s.trim();
                    if (!trimmed) return null;
                    return (
                      <span 
                        key={idx} 
                        className="text-[10px] font-bold bg-indigo-50 border border-indigo-100 text-indigo-750 px-2.5 py-1 rounded-lg uppercase inline-block"
                      >
                        {trimmed}
                      </span>
                    );
                  })}
                </div>

                <span className="text-[9px] text-slate-400 mt-2 block italic text-center border-t border-slate-50 pt-2">
                  Update your technical portfolio directly for real-time recruiter matching.
                </span>
              </>
            )}
          </div>

        </section>

      </main>

      <footer id="student_portal_footer" className="p-4 border-t border-slate-100 bg-white text-center text-[10px] text-slate-400">
        Saveetha Engineering College (SIMATS) Placement Center
      </footer>
    </div>
  );
};
export default StudentPortal;
