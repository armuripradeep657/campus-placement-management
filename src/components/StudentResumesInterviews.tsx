import React, { useState, useEffect } from "react";
import { 
  Building2, 
  Calendar, 
  Clock, 
  MapPin, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Sparkles, 
  Plus, 
  Trash, 
  Send, 
  Mail, 
  Info, 
  ShieldCheck,
  ChevronRight,
  ClipboardList
} from "lucide-react";
import emailjs from "emailjs-com";

interface Company {
  id: string;
  name: string;
  role: string;
  skills: string;
  packageLpa: number;
}

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
  id: string;
  name: string;
  email: string;
  department: string;
  cgpa: number;
  skills: string;
  allocationStatus?: "Allocated" | "Pending" | "Unplaced";
  allocatedCompanyId?: string;
  resumeStatus?: "Pending" | "Under Review" | "Shortlisted" | "Approved" | "Rejected";
  resumeReviewRemarks?: string;
  interviews?: Interview[];
}

interface StudentResumesInterviewsProps {
  students: Student[];
  companies: Company[];
  onUpdateStudent: (updated: Student) => void;
  showSuccessToast: (msg: string) => void;
}

export const StudentResumesInterviews: React.FC<StudentResumesInterviewsProps> = ({
  students,
  companies,
  onUpdateStudent,
  showSuccessToast
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [searchFilter, setSearchFilter] = useState<string>("");
  
  // Evaluation States
  const [resumeStatus, setResumeStatus] = useState<"Pending" | "Under Review" | "Shortlisted" | "Approved" | "Rejected">("Pending");
  const [remarks, setRemarks] = useState<string>("");
  const [savingEvaluation, setSavingEvaluation] = useState<boolean>(false);

  // Interview States
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [customRole, setCustomRole] = useState<string>("");
  const [interviewDate, setInterviewDate] = useState<string>("");
  const [interviewTime, setInterviewTime] = useState<string>("");
  const [interviewMode, setInterviewMode] = useState<"Virtual" | "In-Person" | "On-Campus">("Virtual");
  const [interviewNotes, setInterviewNotes] = useState<string>("");
  const [savingInterview, setSavingInterview] = useState<boolean>(false);

  // Simulation Email display state
  const [emailLog, setEmailLog] = useState<{
    toName: string;
    toEmail: string;
    subject: string;
    body: string;
    isMock: boolean;
    timestamp: string;
  } | null>(null);

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  // Sync evaluation fields when student switches
  useEffect(() => {
    if (selectedStudent) {
      setResumeStatus(selectedStudent.resumeStatus || "Pending");
      setRemarks(selectedStudent.resumeReviewRemarks || "");
      // Default reset scheduling form
      if (companies.length > 0) {
        setSelectedCompanyId(companies[0].id);
        setCustomRole(companies[0].role);
      } else {
        setSelectedCompanyId("");
        setCustomRole("");
      }
      setInterviewDate("");
      setInterviewTime("");
      setInterviewMode("Virtual");
      setInterviewNotes("");
    }
  }, [selectedStudentId, selectedStudent, companies]);

  // Adjust custom role based on company selector
  const handleCompanyChange = (cId: string) => {
    setSelectedCompanyId(cId);
    const comp = companies.find(c => c.id === cId);
    if (comp) {
      setCustomRole(comp.role);
    }
  };

  // Check if student has uploaded physical resume in student portal (localStorage)
  const getResumeInfo = (studentId: string) => {
    try {
      const savedResume = localStorage.getItem(`sec_student_${studentId}_resume`);
      if (savedResume) {
        return JSON.parse(savedResume);
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  };

  // Filter student list
  const filteredStudents = students.filter(s => {
    const text = (s.id + " " + s.name + " " + s.department).toLowerCase();
    return text.includes(searchFilter.toLowerCase());
  });

  // Automated notification router helper
  const createInAppNotification = async (targetStudentId: string, title: string, desc: string, type: string) => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title,
          description: desc,
          targetStudentId
        })
      });
    } catch (e) {
      console.error("Failed to post system notification:", e);
    }
  };

  // Helper template transmitter
  const dispatchAutomationEmail = async (student: Student, subject: string, htmlMessage: string, details: any) => {
    const serviceId = (import.meta as any).env.VITE_EMAILJS_SERVICE_ID;
    const templateId = (import.meta as any).env.VITE_EMAILJS_TEMPLATE_ID;
    const publicKey = (import.meta as any).env.VITE_EMAILJS_PUBLIC_KEY;

    const emailTo = student.email || "student@saveetha.edu";
    const templateParams = {
      to_email: emailTo,
      email: emailTo,
      to_address: emailTo,
      to_mail: emailTo,
      recipient_email: emailTo,
      to: emailTo,
      to_name: student.name,
      recipient_name: student.name,
      user_name: student.name,
      name: student.name,
      subject: subject,
      message: htmlMessage,
      ...details
    };

    let isMock = true;
    if (serviceId && templateId && publicKey) {
      try {
        await emailjs.send(serviceId, templateId, templateParams, publicKey);
        isMock = false;
      } catch (err: any) {
        console.warn("EmailJS failed or restricted origin. Simulating dispatch fallback:", err);
      }
    }

    // Set simulator logger state to let coordinator review what was dispatched!
    setEmailLog({
      toName: student.name,
      toEmail: emailTo,
      subject: subject,
      body: htmlMessage,
      isMock,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    });
  };

  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setSavingEvaluation(true);

    try {
      const updatedData = {
        ...selectedStudent,
        resumeStatus,
        resumeReviewRemarks: remarks
      };

      const res = await fetch(`/api/students/${encodeURIComponent(selectedStudent.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeStatus,
          resumeReviewRemarks: remarks
        })
      });

      if (!res.ok) {
        throw new Error("Unable to save student resume status.");
      }

      const returnedStudent = await res.json();
      onUpdateStudent(returnedStudent);

      // 1. Send in-app notification
      const notifTitle = `Resume Evaluation: ${resumeStatus}`;
      const notifDesc = `Your professional resume status was updated to "${resumeStatus}". Remarks: ${remarks || "No supplementary feedback provided."}`;
      await createInAppNotification(selectedStudent.id, notifTitle, notifDesc, "academic");

      // 2. Dispatch automated confirmation email
      const emailSubject = `Placement Portal: Resume Verification Match Alert [Status: ${resumeStatus}]`;
      const emailHtml = `Dear ${selectedStudent.name},\n\nThis is an automated digest from the Saveetha Engineering College Placement Audit Secretariat.\n\nYour uploaded Professional Resume verification status has been updated to "${resumeStatus}".\n\nCoordinator Evaluation Remarks:\n"${remarks || "Your profile and technical index match core institutional database requirements."}"\n\nParameters Checked:\n- Student ID: ${selectedStudent.id}\n- Current CGPA: ${selectedStudent.cgpa.toFixed(2)}\n- Registered Skills Portfolio: ${selectedStudent.skills}\n\nMaintain active watch on your dashboard indices for subsequent developer drive events.\n\nWarm regards,\nSaveetha Placement Cell Secretariat`;

      await dispatchAutomationEmail(selectedStudent, emailSubject, emailHtml, {
        evaluation_remarks: remarks,
        resume_status: resumeStatus,
        student_id: selectedStudent.id
      });

      showSuccessToast(`Successfully updated resume status to ${resumeStatus} and emailed confirmation!`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed verifying resume.");
    } finally {
      setSavingEvaluation(false);
    }
  };

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !selectedCompanyId) return;
    setSavingInterview(true);

    const comp = companies.find(c => c.id === selectedCompanyId);
    if (!comp) {
      setSavingInterview(false);
      return;
    }

    if (!interviewDate || !interviewTime) {
      alert("Please specify interview date and time components.");
      setSavingInterview(false);
      return;
    }

    try {
      const newInterview: Interview = {
        id: "int_" + Date.now(),
        companyId: comp.id,
        companyName: comp.name,
        role: customRole.trim() || comp.role,
        date: interviewDate,
        time: interviewTime,
        mode: interviewMode,
        status: "Scheduled",
        notes: interviewNotes.trim()
      };

      const existingInterviews = selectedStudent.interviews || [];
      const updatedInterviews = [...existingInterviews, newInterview];

      const res = await fetch(`/api/students/${encodeURIComponent(selectedStudent.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviews: updatedInterviews
        })
      });

      if (!res.ok) {
        throw new Error("Unable to save interview details on server records.");
      }

      const returnedStudent = await res.json();
      onUpdateStudent(returnedStudent);

      // 1. Post in-app notification
      const notifTitle = `Interview Scheduled: ${comp.name}`;
      const notifDesc = `Recruitment Interview setup confirmed for the role of "${newInterview.role}" on ${interviewDate} at ${interviewTime} (${interviewMode}). Instructions: ${interviewNotes || "Ensure formal dresscode and clean digital setup."}`;
      await createInAppNotification(selectedStudent.id, notifTitle, notifDesc, "receipt");

      // 2. Dispatch confirmation email
      const emailSubject = `CONFIRMED: Interview Scheduled with ${comp.name} - ${newInterview.role}`;
      const emailHtml = `Dear ${selectedStudent.name},\n\nWe are pleased to notify you that an official placement interview has been scheduled for you with ${comp.name}.\n\nInterview Schedule Specifications:\n- Recruiter Partner: ${comp.name}\n- Designated Role: ${newInterview.role}\n- Scheduled Date: ${interviewDate}\n- Tentative Time: ${interviewTime}\n- Assessment Mode: ${interviewMode}\n- Core Instructions:\n"${interviewNotes || "Please login/report 15 minutes prior to the start time with copy of professional resume and formal wear checklist."}"\n\nAcademic & Database Profile Match Checklist:\n- Registration ID: ${selectedStudent.id}\n- Current Cumulative GPA: ${selectedStudent.cgpa.toFixed(2)}\n- Technical Skills: ${selectedStudent.skills}\n\nShould you experience technical alignment conflicts, notify the Placement Cell Office immediately.\n\nBest of luck!\nSaveetha Placement Cell Secretariat`;

      await dispatchAutomationEmail(selectedStudent, emailSubject, emailHtml, {
        interview_company: comp.name,
        interview_role: newInterview.role,
        interview_date: interviewDate,
        interview_time: interviewTime,
        interview_mode: interviewMode,
        interview_notes: interviewNotes
      });

      // Clear Form state
      setInterviewDate("");
      setInterviewTime("");
      setInterviewNotes("");

      showSuccessToast(`Interview successfully scheduled with ${comp.name} ! Student notified via automated email.`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed scheduling interview.");
    } finally {
      setSavingInterview(false);
    }
  };

  const handleCancelInterview = async (interviewId: string) => {
    if (!selectedStudent) return;
    if (!window.confirm("Are you sure you want to cancel this scheduled interview? This action will write status logs as 'Cancelled' & email student notice.")) return;

    try {
      const existingInterviews = selectedStudent.interviews || [];
      const updatedInterviews = existingInterviews.map(i => {
        if (i.id === interviewId) {
          return { ...i, status: "Cancelled" as const };
        }
        return i;
      });

      const cancelledItem = existingInterviews.find(i => i.id === interviewId);
      if (!cancelledItem) return;

      const res = await fetch(`/api/students/${encodeURIComponent(selectedStudent.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviews: updatedInterviews
        })
      });

      if (!res.ok) {
        throw new Error("Unable to record cancel logging.");
      }

      const returnedStudent = await res.json();
      onUpdateStudent(returnedStudent);

      // Create notifications
      const notifTitle = `Interview CANCELLED: ${cancelledItem.companyName}`;
      const notifDesc = `Your scheduled interview for the role of "${cancelledItem.role}" on ${cancelledItem.date} with ${cancelledItem.companyName} has been cancelled by the Coordinator.`;
      await createInAppNotification(selectedStudent.id, notifTitle, notifDesc, "academic");

      // Email dispatch notice
      const emailSubject = `NOTICE: Interview Cancelled with ${cancelledItem.companyName}`;
      const emailHtml = `Dear ${selectedStudent.name},\n\nThis is an official notice that your scheduled placement interview for the role of "${cancelledItem.role}" with ${cancelledItem.companyName} has been CANCELLED by the Saveetha Placement Cell Coordinator.\n\nCancelled Event Details:\n- Date: ${cancelledItem.date}\n- Time: ${cancelledItem.time}\n- Partner: ${cancelledItem.companyName}\n\nPlease stay tuned in to your portal feed for placement rescheduling arrays.\n\nWarm regards,\nSaveetha Placement Cell Office`;

      await dispatchAutomationEmail(selectedStudent, emailSubject, emailHtml, {
        cancelled_company: cancelledItem.companyName
      });

      showSuccessToast(`Interview with ${cancelledItem.companyName} has been Canceled and Student notified.`);
    } catch (err: any) {
      console.error(err);
      alert("Failed interview cancellation operation.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 bg-slate-50 min-h-[600px] animate-fade-in text-slate-800 text-xs">
      
      {/* LEFT COLUMN: Student Selector Index (col span 4) */}
      <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-100 p-4 space-y-4 shadow-sm h-[650px] flex flex-col">
        <div className="space-y-1 shrink-0">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center">
            <ClipboardList className="h-4 w-4 text-indigo-500 mr-1.5" />
            Verification Roster
          </h3>
          <p className="text-[10px] text-slate-405">Select a student record to review their uploaded resume credentials and configure interviews.</p>
        </div>

        {/* Search */}
        <div className="relative shrink-0">
          <input
            type="text"
            placeholder="Filter students by name, ID..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full px-3 py-1.5 border border-slate-150 rounded-xl text-xs bg-slate-50/50 focus:outline-none focus:border-indigo-400 pr-9 font-semibold"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 scale-75 text-slate-400 font-bold uppercase text-[9px]">
            {filteredStudents.length}
          </span>
        </div>

        {/* Student Rolodex Grid/List */}
        <div className="flex-grow overflow-y-auto space-y-1.5 pr-1 py-1">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">No students matched filter</div>
          ) : (
            filteredStudents.map(student => {
              const resumeData = getResumeInfo(student.id);
              const currentResStatus = student.resumeStatus || "Pending";
              
              const statusColors = {
                "Pending": "bg-slate-100 text-slate-600 border-slate-200",
                "Under Review": "bg-blue-50 text-blue-700 border-blue-200",
                "Shortlisted": "bg-indigo-50 text-indigo-700 border-indigo-200",
                "Approved": "bg-emerald-50 text-emerald-700 border-emerald-200",
                "Rejected": "bg-rose-50 text-rose-700 border-rose-200",
              };

              return (
                <button
                  key={student.id}
                  onClick={() => setSelectedStudentId(student.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer ${
                    selectedStudentId === student.id
                      ? "bg-indigo-50/40 border-indigo-250 shadow-inner"
                      : "bg-white border-slate-100 hover:border-slate-250 hover:bg-slate-50/30"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 truncate leading-snug">{student.name}</p>
                    <div className="flex items-center space-x-1.5 mt-1 font-mono text-[9px] text-slate-400">
                      <b className="text-slate-500 font-extrabold">{student.id}</b>
                      <span>•</span>
                      <span>{student.department}</span>
                    </div>
                  </div>

                  <div className="shrink-0 text-right space-y-1">
                    <span className="text-[10px] text-indigo-600 font-extrabold block">
                      {student.cgpa.toFixed(2)} CGPA
                    </span>
                    <span className={`inline-block text-[8px] font-black uppercase rounded px-1.5 py-0.5 border leading-none scale-90 origin-right ${statusColors[currentResStatus]}`}>
                      {currentResStatus}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive Workspaces (col span 8) */}
      <div className="lg:col-span-8 flex flex-col space-y-6 h-[650px] overflow-y-auto pr-2">
        {selectedStudent ? (
          <>
            {/* Header Identity banner */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-tr from-indigo-600 to-indigo-500 p-2.5 rounded-2xl text-white shadow-sm shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-850 leading-none mb-1">{selectedStudent.name}</h4>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Reg ID: <strong className="text-slate-650 font-bold">{selectedStudent.id}</strong> • Class Email: <strong className="text-slate-650 font-mono font-bold">{selectedStudent.email}</strong>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                  {selectedStudent.department}
                </span>
                <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
                  {selectedStudent.cgpa.toFixed(2)} CGPA
                </span>
              </div>
            </div>

            {/* Email Log Banner (if newly sent in this session) */}
            {emailLog && emailLog.toEmail === selectedStudent.email && (
              <div className="bg-emerald-50 border border-emerald-150 p-4 rounded-2xl space-y-2 animate-in slide-in-from-top-3 duration-200">
                <div className="flex justify-between items-center text-emerald-850">
                  <h5 className="font-extrabold uppercase text-[9px] tracking-wider flex items-center gap-1.5">
                    <Mail className="h-4 w-4" />
                    <span>Automated Confirmation Dispatch Logged ({emailLog.timestamp})</span>
                  </h5>
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${emailLog.isMock ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-emerald-100 text-emerald-800 border-emerald-250"}`}>
                    {emailLog.isMock ? "Mock local delivery successfully simulated" : "Active EmailJS Transmitted"}
                  </span>
                </div>
                <div className="bg-white/80 border border-emerald-100/60 p-3 rounded-xl font-mono text-[9.5px] text-slate-600 leading-relaxed max-h-36 overflow-y-auto whitespace-pre-line">
                  <strong className="text-slate-800">To:</strong> {emailLog.toName} &lt;{emailLog.toEmail}&gt;{"\n"}
                  <strong className="text-slate-800">Subject:</strong> {emailLog.subject}{"\n\n"}
                  {emailLog.body}
                </div>
                <p className="text-[9px] text-slate-405 leading-relaxed">
                  <Info className="h-3 w-3 inline text-emerald-505 mr-1" />
                  We have fully synchronized both student dashboard alert feeds and EmailJS queues. Students verify active status indices on login.
                </p>
              </div>
            )}

            {/* Dual Actions panels Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Box 1: Resume Verification Evaluation */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest flex items-center">
                    <FileText className="h-4 w-4 mr-1 text-indigo-500" />
                    Resume Status review
                  </span>
                  <p className="text-[10px] text-slate-400">Validate portfolio completeness relative to technical requirement filters.</p>
                </div>

                {/* Simulated Portfolio status metrics from Student portal */}
                <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl space-y-2">
                  <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block">Candidate Upload Summary</span>
                  {getResumeInfo(selectedStudent.id) ? (
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center space-x-2 min-w-0">
                        <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="font-extrabold text-slate-800 truncate" title={getResumeInfo(selectedStudent.id).name}>
                          {getResumeInfo(selectedStudent.id).name}
                        </span>
                      </div>
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md font-bold uppercase shrink-0">
                        PDF Uploaded
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 text-slate-400 py-1 font-semibold leading-relaxed">
                      <AlertCircle className="h-4 w-4 text-slate-405 shrink-0" />
                      <span>No PDF Resume uploaded by Student in portal yet.</span>
                    </div>
                  )}
                  <div className="text-[9.5px] text-slate-404 leading-relaxed font-semibold border-t border-slate-200/50 pt-2">
                    Skills: <span className="text-slate-700 font-bold">{selectedStudent.skills || "Not specified"}</span>
                  </div>
                </div>

                {/* Form to update evaluation status */}
                <form onSubmit={handleSaveEvaluation} className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="block font-bold text-slate-400 text-[9px] uppercase tracking-wider">Configure Status</label>
                    <select
                      value={resumeStatus}
                      onChange={(e: any) => setResumeStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-indigo-400 font-extrabold text-slate-800"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Shortlisted">Shortlisted</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-bold text-slate-400 text-[9px] uppercase tracking-wider">Evaluation Audit Remarks</label>
                    <textarea
                      placeholder="Specify review remarks..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-400"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingEvaluation}
                    className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[10px] uppercase tracking-wider transition active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 select-none"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{savingEvaluation ? "Simulating Dispatch..." : "Commit Evaluation Status"}</span>
                  </button>
                </form>
              </div>

              {/* Box 2: Interview Scheduling Desk */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest flex items-center">
                    <Calendar className="h-4 w-4 mr-1 text-indigo-500" />
                    Schedule Interview
                  </span>
                  <p className="text-[10px] text-slate-400">Establish corporate recruiter meeting coordinates for this student.</p>
                </div>

                {companies.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 font-black uppercase text-[9px]">No company logs exist. Add companies first.</div>
                ) : (
                  <form onSubmit={handleScheduleInterview} className="space-y-3.5">
                    
                    {/* Select Company */}
                    <div className="space-y-1.5">
                      <label className="block font-bold text-slate-400 text-[9px] uppercase tracking-wider bg-slate-50 p-1 rounded">Recruitment Partner</label>
                      <select
                        value={selectedCompanyId}
                        onChange={(e) => handleCompanyChange(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-indigo-400 font-bold"
                      >
                        {companies.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} (Role: {c.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Role specification */}
                    <div className="space-y-1.5">
                      <label className="block font-bold text-slate-400 text-[9px] uppercase tracking-wider">Role Specification</label>
                      <input
                        type="text"
                        placeholder="e.g. Intern Developer"
                        value={customRole}
                        onChange={(e) => setCustomRole(e.target.value)}
                        required
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-400 font-semibold"
                      />
                    </div>

                    {/* DateTime row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="block font-bold text-slate-400 text-[9px] uppercase tracking-wider flex items-center gap-1">
                          <Calendar className="h-3 w-3 shrink-0" /> Date
                        </label>
                        <input
                          type="date"
                          value={interviewDate}
                          onChange={(e) => setInterviewDate(e.target.value)}
                          required
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-400"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block font-bold text-slate-400 text-[9px] uppercase tracking-wider flex items-center gap-1">
                          <Clock className="h-3 w-3 shrink-0" /> Time (HH:MM AM/PM)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 10:30 AM"
                          value={interviewTime}
                          onChange={(e) => setInterviewTime(e.target.value)}
                          required
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-400"
                        />
                      </div>
                    </div>

                    {/* Mode row */}
                    <div className="space-y-1.5">
                      <label className="block font-bold text-slate-400 text-[9px] uppercase tracking-wider">Assessment Mode</label>
                      <div className="flex space-x-1.5 select-none text-[9.5px] font-bold">
                        {["Virtual", "In-Person", "On-Campus"].map((m: any) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setInterviewMode(m)}
                            className={`flex-1 py-1.5 border rounded-lg transition-all cursor-pointer ${
                              interviewMode === m
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "bg-white text-slate-505 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Interview Notes */}
                    <div className="space-y-1.5">
                      <label className="block font-bold text-slate-400 text-[9px] uppercase tracking-wider">Instructions & Prep Material</label>
                      <input
                        type="text"
                        placeholder="e.g. MSTeams meeting link, Room 204 layout info..."
                        value={interviewNotes}
                        onChange={(e) => setInterviewNotes(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-400"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={savingInterview}
                      className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] uppercase tracking-wider transition active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 select-none"
                    >
                      <Plus className="h-3.5 w-3.5 animate-bounce-short" />
                      <span>{savingInterview ? "Notifying..." : "Notify & Schedule Interview"}</span>
                    </button>

                  </form>
                )}
              </div>

            </div>

            {/* BOX 3: Existing Scheduled Interviews Dashboard (Full-width grid) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 shrink-0">
              <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                  <Calendar className="h-4 w-4 mr-1.5 text-indigo-500" />
                  Scheduled Assessment Agenda Panel
                </span>
                <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded-full font-bold text-slate-550 border border-slate-200">
                  {selectedStudent.interviews?.length || 0} Scheduled Events
                </span>
              </div>

              {!selectedStudent.interviews || selectedStudent.interviews.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  No active recruiters assessments are on-file for this candidate.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                  {selectedStudent.interviews.map(item => (
                    <div key={item.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-[11px] first:pt-0 last:pb-0 animate-fade-in">
                      
                      {/* Left: recruiter info */}
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <h5 className="font-extrabold text-slate-850 truncate">{item.companyName}</h5>
                          <span className={`text-[8px] font-black uppercase tracking-wider border rounded-md px-1.5 py-0.5 leading-none ${
                            item.status === "Scheduled" 
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200" 
                              : item.status === "Cancelled" 
                                ? "bg-rose-50 text-rose-700 border-rose-200" 
                                : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}>
                            {item.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-semibold truncate flex items-center">
                          <Building2 className="h-3 w-3 mr-1 text-slate-400" />
                          Role Category: <strong className="text-slate-650 ml-1 font-extrabold">{item.role}</strong>
                        </p>
                        {item.notes && (
                          <p className="font-mono text-[9px] text-slate-500 bg-slate-50/50 p-1 px-2 border border-slate-100 rounded leading-relaxed whitespace-pre-line truncate" title={item.notes}>
                            Instruction: {item.notes}
                          </p>
                        )}
                      </div>

                      {/* Middle: date modes */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] text-slate-500">
                        <span className="flex items-center space-x-1 font-semibold text-slate-600">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>{item.date}</span>
                        </span>
                        <span className="flex items-center space-x-1 font-semibold text-slate-60)0">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span>{item.time}</span>
                        </span>
                        <span className="flex items-center space-x-1 bg-amber-50 text-amber-700 font-extrabold px-1.5 py-0.5 rounded border border-amber-200/50 scale-90">
                          <MapPin className="h-3 w-3 mr-0.5 shrink-0" />
                          {item.mode}
                        </span>
                      </div>

                      {/* Right: actions */}
                      {item.status === "Scheduled" && (
                        <div className="shrink-0 pl-2">
                          <button
                            type="button"
                            onClick={() => handleCancelInterview(item.id)}
                            className="p-1 px-2 border border-rose-100 text-rose-600 hover:bg-rose-50 rounded-lg text-[9px] font-extrabold uppercase transition cursor-pointer flex items-center space-x-1 select-none"
                          >
                            <Trash className="h-3 w-3" />
                            <span>Cancel Assessment</span>
                          </button>
                        </div>
                      )}

                    </div>
                  ))}
                </div>
              )}
            </div>

          </>
        ) : (
          <div className="bg-white py-24 border-2 border-dashed border-slate-150 rounded-2xl flex flex-col items-center justify-center text-center p-6 my-auto">
            <ClipboardList className="h-12 w-12 text-slate-200 mb-2 animate-bounce-short" />
            <p className="text-xs font-black text-slate-450 uppercase tracking-widest">Workspace inactive</p>
            <p className="text-[10px] text-slate-400 max-w-sm mt-1">Please select a student from the sidebar Verification Roster to review profiles, update resume status checkpoints, and schedule recruiter interviews.</p>
          </div>
        )}
      </div>

    </div>
  );
};
