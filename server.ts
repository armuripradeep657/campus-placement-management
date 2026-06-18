import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

// Fallback in-memory database in case PostgreSQL/Firebase is not available
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
  allocatedCompanyId?: string;
  allocationStatus?: "Allocated" | "Pending" | "Unplaced";
  password?: string;
  resumeStatus?: "Pending" | "Under Review" | "Shortlisted" | "Approved" | "Rejected";
  resumeReviewRemarks?: string;
  interviews?: Interview[];
  phone?: string;
  linkedin?: string;
  github?: string;
  resumeFile?: string;
}

export function getBackendStudentCompleteness(s: any): number {
  if (!s) return 0;
  
  // Weights:
  // SIMATS Verified Email = 10
  // Academic Department Tag = 10
  // Verified CGPA Score = 10
  // Skills Registered Portfolio = 15
  // Contact Phone Number = 10
  // LinkedIn Professional URL = 10
  // GitHub Portfolio URL = 10
  // Professional Resume Uploaded = 25
  const hasEmail = !!s.email;
  const hasDept = !!s.department;
  const hasCgpa = !!s.cgpa && Number(s.cgpa) > 0;
  const hasSkills = !!s.skills && s.skills.trim().length > 0;
  const hasPhone = !!s.phone && s.phone.trim().length > 0;
  const hasLinkedin = !!s.linkedin && s.linkedin.trim().length > 0;
  const hasGithub = !!s.github && s.github.trim().length > 0;
  const hasResume = !!s.resumeFile && s.resumeFile.trim().length > 0;

  let score = 0;
  if (hasEmail) score += 10;
  if (hasDept) score += 10;
  if (hasCgpa) score += 10;
  if (hasSkills) score += 15;
  if (hasPhone) score += 10;
  if (hasLinkedin) score += 10;
  if (hasGithub) score += 10;
  if (hasResume) score += 25;

  return score;
}

interface Company {
  id: string;
  name: string;
  role: string;
  skills: string; // Comma-separated
  packageLpa: number; // LPA
  capacity: number;
}

interface Allocation {
  studentId: string;
  studentName: string;
  studentCgpa: number;
  studentDepartment: string;
  companyId: string;
  companyName: string;
  packageLpa: number;
  matchScore: number;
}

interface Admin {
  id: string; // admin loginId
  loginId: string;
  email: string;
  password?: string;
  role: "admin";
  name?: string;
}

// Initial Data Seeds (Will be loaded from Firebase Database/Backend dynamically)
let students: Student[] = [];
let admins: Admin[] = [];

let companies: Company[] = [
  { id: "c1", name: "Microsoft", role: "Software Engineering Intern", skills: "React, TypeScript, Java, SQL", packageLpa: 18.5, capacity: 2 },
  { id: "c2", name: "Zoho Corporation", role: "Associate Software Developer", skills: "Java, Spring Boot, PostgreSQL, C", packageLpa: 8.5, capacity: 3 },
  { id: "c3", name: "TCS", role: "Ninja Developer", skills: "Java, Python, HTML, CSS, SQL", packageLpa: 4.0, capacity: 4 },
  { id: "c4", name: "Cognizant (CTS)", role: "GenC Developer", skills: "React, Node.js, Express, SQL, HTML", packageLpa: 4.5, capacity: 4 },
  { id: "c5", name: "Accenture", role: "Application Development Associate", skills: "Python, Java, React, SQL", packageLpa: 5.0, capacity: 4 },
  { id: "c6", name: "Biocon", role: "Research Associate", skills: "Python, R, MATLAB", packageLpa: 6.5, capacity: 2 },
  { id: "c7", name: "Amazon", role: "Systems Development Engineer", skills: "Java, Python, SQL, AWS, Linux", packageLpa: 16.0, capacity: 3 },
  { id: "c8", name: "Infosys", role: "Specialist Programmer", skills: "Java, Spring Boot, SQL, Python, Angular", packageLpa: 6.2, capacity: 5 },
  { id: "c9", name: "Wipro", role: "Project Engineer", skills: "Java, HTML, CSS, SQL, C#", packageLpa: 4.2, capacity: 6 },
  { id: "c10", name: "Google", role: "Associate Software Engineer", skills: "React, TypeScript, Java, Python, Go", packageLpa: 22.0, capacity: 1 },
  { id: "c11", name: "Saveetha Technologies", role: "Fullstack Developer Intern", skills: "React, TypeScript, Node.js, SQL, HTML, CSS", packageLpa: 5.5, capacity: 5 }
];

interface Notification {
  id: string;
  type: "drive" | "schedule" | "document";
  title: string;
  description: string;
  targetStudentId?: string; // If specified, targeted student only, else broadcast to everyone
  date: string;
}

let notifications: Notification[] = [
  {
    id: "n1",
    type: "drive",
    title: "Microsoft Elite Phase-1 Software Engineer Drive Open",
    description: "Microsoft is accepting resumes for Software Intern positions. Preferred skills: React, TypeScript, Java. Target CGPA: 9.0+. Apply before the end of the week.",
    date: new Date(Date.now() - 3600000 * 2).toISOString() // 2 hours ago
  },
  {
    id: "n2",
    type: "schedule",
    title: "Zoho Corp - Aptitude & Written Round Schedule",
    description: "The phase-1 offline screening exam is scheduled for Saturday at 09:30 AM in SEC Block-C Laboratory 4. College dress code and physical Hall-ticket copies are mandatory.",
    date: new Date(Date.now() - 3600000 * 5).toISOString() // 5 hours ago
  },
  {
    id: "n3",
    type: "document",
    title: "Mandatory Consolidated Marksheet Upload (Sem 1-6)",
    description: "All students registered on the CPMS portal must upload or submit hardcopies of their Sem 1 through Sem 6 consolidated marksheets and an updated 2-page Resume PDF to Room 304.",
    date: new Date(Date.now() - 3600000 * 24).toISOString() // 1 day ago
  }
];

let allocations: Allocation[] = [];

interface AdminLoginLog {
  id: string;
  adminId: string;
  email: string;
  timestamp: string;
  action?: string;
  details?: string;
  status?: string;
}

let logRetentionDays: number = 90;

let adminLoginLogs: AdminLoginLog[] = [
  {
    id: "log_mock_1",
    adminId: "192472118",
    email: "campusplacementsimats@saveetha.com",
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    action: "Admin OTP Login",
    details: "Admin ID 192472118 authenticated successfully with 2FA/OTP.",
    status: "Authorized"
  },
  {
    id: "log_mock_2",
    adminId: "student201",
    email: "priya.nair@saveetha.in",
    timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    action: "Student Password Changed",
    details: "Student ID: student201, Name: Priya Nair, New Password: secure_pass_123",
    status: "Success"
  },
  {
    id: "log_mock_3",
    adminId: "ADMIN",
    email: "admin@saveetha.in",
    timestamp: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    action: "Bulk Student Import (CSV)",
    details: "Uploaded and processed spreadsheet. Sparked 12 additions and 4 updates.",
    status: "Success"
  },
  {
    id: "log_mock_4",
    adminId: "ADMIN",
    email: "admin@saveetha.in",
    timestamp: new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString(),
    action: "Placement Auto-Allocation",
    details: "Ran Greedy CGPA matcher. Evaluated 40 candidates. Created 15 matches.",
    status: "Success"
  },
  {
    id: "log_mock_5",
    adminId: "192472118",
    email: "campusplacementsimats@saveetha.com",
    timestamp: new Date(Date.now() - 125 * 24 * 60 * 60 * 1000).toISOString(),
    action: "Admin OTP Login",
    details: "Admin ID 192472118 authenticated successfully with 2FA/OTP.",
    status: "Authorized"
  }
];

const cleanExpiredLogs = () => {
  if (!logRetentionDays || logRetentionDays <= 0) return 0; // Unlimited
  const cutoffTime = Date.now() - (logRetentionDays * 24 * 60 * 60 * 1000);
  const beforeCount = adminLoginLogs.length;
  adminLoginLogs = adminLoginLogs.filter(log => {
    const timestampMs = new Date(log.timestamp).getTime();
    return timestampMs >= cutoffTime;
  });
  const deletedCount = beforeCount - adminLoginLogs.length;
  if (deletedCount > 0) {
    console.log(`[Retention Policy] Auto-deleted ${deletedCount} logs older than ${logRetentionDays} days.`);
  }
  return deletedCount;
};

// Logger to record system and student actions
const recordSecurityLog = (userId: string, email: string, action: string, details: string, status: string = "Success") => {
  const newLog: AdminLoginLog = {
    id: "log_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    adminId: String(userId || "SYSTEM").trim(),
    email: String(email || "system@saveetha.in").trim(),
    timestamp: new Date().toISOString(),
    action,
    details,
    status
  };
  adminLoginLogs.unshift(newLog);
  console.log(`[Security Log] ${action}: ${details}`);
  cleanExpiredLogs(); // Run log pruning after recording new logs
};

// Helper to compute skill match percentage
const getSkillMatchScore = (studentSkillsStr: string, companySkillsStr: string): number => {
  const sSkills = studentSkillsStr.toLowerCase().split(",").map(s => s.trim()).filter(s => s.length > 0);
  const cSkills = companySkillsStr.toLowerCase().split(",").map(c => c.trim()).filter(c => c.length > 0);
  
  if (cSkills.length === 0) return 0;
  
  let matches = 0;
  cSkills.forEach(cSkill => {
    // Check if student has exact or partial match of company skill
    const found = sSkills.some(sSkill => sSkill.includes(cSkill) || cSkill.includes(sSkill));
    if (found) matches++;
  });
  
  return Math.round((matches / cSkills.length) * 100);
};

// PostgreSQL setup (Optional)
let usePg = false;
let pool: pg.Pool | null = null;
if (process.env.DATABASE_URL) {
  try {
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    console.log("PostgreSQL configuration detected.");
  } catch (error) {
    console.error("Failed to initialize PostgreSQL pool:", error);
  }
}

// =================================================================
//        FIREBASE REALTIME DATABASE SYNC ACTIONS & REST HELPERS
// =================================================================

const getDbUrl = () => {
  return process.env.VITE_FIREBASE_DATABASE_URL || "";
};

const fallbackAdmin: Admin = {
  id: "192472118",
  loginId: "192472118",
  email: "campusplacementsimats@saveetha.com",
  password: "2118",
  role: "admin",
  name: "Dr. Pradeep Kumar"
};

const createFallbackStudents = (): Student[] => [
  {
    id: "19240101",
    name: "Aditya Kulkarni",
    email: "aditya.k@saveetha.in",
    department: "Computer Science & Engineering",
    cgpa: 9.6,
    skills: "React, TypeScript, Java, SQL, HTML, CSS",
    allocationStatus: "Pending",
    resumeStatus: "Approved",
    resumeReviewRemarks: "Exceptional profile, perfect for Software Intern role. Strong React and Java skills.",
    phone: "+91 98451 23091",
    linkedin: "https://linkedin.com/in/adityak",
    github: "https://github.com/adityak",
    resumeFile: "Aditya_Kulkarni_Resume.pdf",
    password: "Student@123"
  },
  {
    id: "19240102",
    name: "Sanjana Nair",
    email: "sanjana.nair@saveetha.in",
    department: "Information Technology",
    cgpa: 9.2,
    skills: "Java, Spring Boot, PostgreSQL, C, HTML, CSS",
    allocationStatus: "Pending",
    resumeStatus: "Approved",
    resumeReviewRemarks: "Solid back-end foundation with Spring Boot and SQL experience.",
    phone: "+91 87541 23092",
    linkedin: "https://linkedin.com/in/sanjananair",
    github: "https://github.com/sanjananair",
    resumeFile: "Sanjana_Nair_Resume.pdf",
    password: "Student@123"
  },
  {
    id: "19240103",
    name: "Pranav Reddy",
    email: "pranav.reddy@saveetha.in",
    department: "Computer Science & Engineering",
    cgpa: 8.9,
    skills: "React, Node.js, Express, SQL, HTML, CSS, JavaScript",
    allocationStatus: "Pending",
    resumeStatus: "Approved",
    resumeReviewRemarks: "Good full-stack skill set. Handled deployment on Render/AWS.",
    phone: "+91 76541 23093",
    linkedin: "https://linkedin.com/in/pranavreddy",
    github: "https://github.com/pranavreddy",
    resumeFile: "Pranav_Reddy_Resume.pdf",
    password: "Student@123"
  },
  {
    id: "19240104",
    name: "Manoj Kumar",
    email: "manoj.kumar@saveetha.in",
    department: "Artificial Intelligence & Data Science",
    cgpa: 9.4,
    skills: "Python, R, MATLAB, Java, SQL, Machine Learning",
    allocationStatus: "Pending",
    resumeStatus: "Approved",
    resumeReviewRemarks: "Excellent machine learning portfolio and Python background.",
    phone: "+91 99841 23094",
    linkedin: "https://linkedin.com/in/manojkumar",
    github: "https://github.com/manojkumar",
    resumeFile: "Manoj_Kumar_Resume.pdf",
    password: "Student@123"
  },
  {
    id: "19240105",
    name: "Ananya Deshmukh",
    email: "ananya.d@saveetha.in",
    department: "Electronics & Communication",
    cgpa: 8.7,
    skills: "Java, Python, HTML, CSS, SQL, JavaScript",
    allocationStatus: "Pending",
    resumeStatus: "Approved",
    resumeReviewRemarks: "Well-rounded software enthusiast. Strong analytical skills.",
    phone: "+91 88541 23095",
    linkedin: "https://linkedin.com/in/ananyad",
    github: "https://github.com/ananyad",
    resumeFile: "Ananya_Deshmukh_Resume.pdf",
    password: "Student@123"
  },
  {
    id: "19240106",
    name: "Karthik Raja",
    email: "karthik.raja@saveetha.in",
    department: "Computer Science & Engineering",
    cgpa: 9.8,
    skills: "React, TypeScript, Node.js, Spring Boot, Java, PostgreSQL",
    allocationStatus: "Pending",
    resumeStatus: "Approved",
    resumeReviewRemarks: "Outstanding academic performer and competitive hacker.",
    phone: "+91 97541 23096",
    linkedin: "https://linkedin.com/in/karthikraja",
    github: "https://github.com/karthikraja",
    resumeFile: "Karthik_Raja_Resume.pdf",
    password: "Student@123"
  },
  {
    id: "19240107",
    name: "Meera Krishnan",
    email: "meera.krishnan@saveetha.in",
    department: "Biomedical Engineering",
    cgpa: 8.5,
    skills: "Python, R, MATLAB, SQL, HTML, CSS",
    allocationStatus: "Pending",
    resumeStatus: "Approved",
    resumeReviewRemarks: "Adept at medical signal datasets and MATLAB analytical graphing.",
    phone: "+91 86541 23097",
    linkedin: "https://linkedin.com/in/meerakrishnan",
    github: "https://github.com/meerakrishnan",
    resumeFile: "Meera_Krishnan_Resume.pdf",
    password: "Student@123"
  },
  {
    id: "19240108",
    name: "Rahul Goud",
    email: "rahul.goud@saveetha.in",
    department: "Information Technology",
    cgpa: 8.4,
    skills: "React, Node.js, Express, SQL, HTML, CSS, Java",
    allocationStatus: "Pending",
    resumeStatus: "Approved",
    resumeReviewRemarks: "Reliable developer with robust knowledge of React hooks and state.",
    phone: "+91 75541 23098",
    linkedin: "https://linkedin.com/in/rahulgoud",
    github: "https://github.com/rahulgoud",
    resumeFile: "Rahul_Goud_Resume.pdf",
    password: "Student@123"
  },
  {
    id: "19240109",
    name: "Bhuvaneshwari Sekar",
    email: "bhuvaneshwari.s@saveetha.in",
    department: "Computer Science & Engineering",
    cgpa: 9.1,
    skills: "Java, Spring Boot, React, SQL, HTML, CSS",
    allocationStatus: "Pending",
    resumeStatus: "Approved",
    resumeReviewRemarks: "Exceptional skill set. Solid Java Spring and React web foundation.",
    phone: "+91 96541 23099",
    linkedin: "https://linkedin.com/in/bhuvaneshwaris",
    github: "https://github.com/bhuvaneshwaris",
    resumeFile: "Bhuvaneshwari_Sekar_Resume.pdf",
    password: "Student@123"
  },
  {
    id: "19240110",
    name: "Sridhar Venkatesh",
    email: "sridhar.v@saveetha.in",
    department: "Electronics & Communication",
    cgpa: 8.3,
    skills: "C, C++, Java, SQL, Python, HTML, CSS",
    allocationStatus: "Pending",
    resumeStatus: "Approved",
    resumeReviewRemarks: "Embedded software skills and robust understanding of OS concepts.",
    phone: "+91 85541 23100",
    linkedin: "https://linkedin.com/in/sridharv",
    github: "https://github.com/sridharv",
    resumeFile: "Sridhar_Venkatesh_Resume.pdf",
    password: "Student@123"
  },
  {
    id: "19240111",
    name: "Divya Raghavan",
    email: "divya.raghavan@saveetha.in",
    department: "Computer Science & Engineering",
    cgpa: 9.0,
    skills: "React, Node.js, Express, Java, SQL, Spring Boot",
    allocationStatus: "Pending",
    resumeStatus: "Approved",
    resumeReviewRemarks: "Outstanding project implementation records and communication skills.",
    phone: "+91 74541 23101",
    linkedin: "https://linkedin.com/in/divyaraghavan",
    github: "https://github.com/divyaraghavan",
    resumeFile: "Divya_Raghavan_Resume.pdf",
    password: "Student@123"
  },
  {
    id: "19240112",
    name: "Rithika Sridhar",
    email: "rithika.s@saveetha.in",
    department: "Information Technology",
    cgpa: 8.8,
    skills: "Java, Python, HTML, CSS, SQL, PostgreSQL",
    allocationStatus: "Pending",
    resumeStatus: "Approved",
    resumeReviewRemarks: "Proven database skills and outstanding critical thinking abilities.",
    phone: "+91 94541 23102",
    linkedin: "https://linkedin.com/in/rithikasridhar",
    github: "https://github.com/rithikasridhar",
    resumeFile: "Rithika_Sridhar_Resume.pdf",
    password: "Student@123"
  },
  {
    id: "192472118",
    name: "A.pradeep",
    email: "192472118.simats@saveetha.com",
    department: "Computer Science & Engineering",
    cgpa: 9.5,
    skills: "React, TypeScript, Java, SQL, HTML, CSS",
    allocationStatus: "Pending",
    resumeStatus: "Approved",
    resumeReviewRemarks: "Excellent resume. Good hands-on experience in full-stack engineering.",
    phone: "+91 94441 23456",
    linkedin: "https://linkedin.com/in/apradeep-192472118",
    github: "https://github.com/apradeep-192472118",
    resumeFile: "A_Pradeep_Resume.pdf",
    password: "Student@123"
  },
  {
    id: "192472178",
    name: "B.Shasidhar",
    email: "192472178.simats@saveetha.com",
    department: "Information Technology",
    cgpa: 8.9,
    skills: "Java, Spring Boot, PostgreSQL, C, SQL",
    allocationStatus: "Pending",
    resumeStatus: "Approved",
    resumeReviewRemarks: "Strong core back-end foundations. Familiar with database pooling.",
    phone: "+91 87554 11223",
    linkedin: "https://linkedin.com/in/bshasidhar-192472178",
    github: "https://github.com/bshasidhar-192472178",
    resumeFile: "B_Shasidhar_Resume.pdf",
    password: "Student@123"
  },
  {
    id: "192424223",
    name: "J.Malakondaiah",
    email: "192424223.simats@saveetha.com",
    department: "Computer Science & Engineering",
    cgpa: 9.2,
    skills: "React, Node.js, Express, SQL, HTML, Python",
    allocationStatus: "Pending",
    resumeStatus: "Approved",
    resumeReviewRemarks: "Highly proficient in fullstack javascript projects.",
    phone: "+91 76543 98765",
    linkedin: "https://linkedin.com/in/jmalakondaiah-192424223",
    github: "https://github.com/jmalakondaiah-192424223",
    resumeFile: "J_Malakondaiah_Resume.pdf",
    password: "Student@123"
  },
  {
    id: "192411162",
    name: "R.Reddy balaji",
    email: "192411162.simats@saveetha.com",
    department: "Electronics & Communication",
    cgpa: 8.8,
    skills: "Python, Java, React, SQL, HTML, CSS",
    allocationStatus: "Pending",
    resumeStatus: "Approved",
    resumeReviewRemarks: "Great analytical skills. Well suited for Python/Java associate engineers.",
    phone: "+91 99887 76655",
    linkedin: "https://linkedin.com/in/rreddybalaji-192411162",
    github: "https://github.com/rreddybalaji-192411162",
    resumeFile: "R_Reddy_Balaji_Resume.pdf",
    password: "Student@123"
  },
  {
    id: "192472102",
    name: "Govardhan",
    email: "192472102.simats@saveetha.com",
    department: "Artificial Intelligence & Data Science",
    cgpa: 9.4,
    skills: "React, TypeScript, Java, SQL, Node.js, Express",
    allocationStatus: "Pending",
    resumeStatus: "Approved",
    resumeReviewRemarks: "Top-notch technical problem solver. Great coding credentials.",
    phone: "+91 88990 01122",
    linkedin: "https://linkedin.com/in/govardhan-192472102",
    github: "https://github.com/govardhan-192472102",
    resumeFile: "Govardhan_Resume.pdf",
    password: "Student@123"
  }
];

function seedInMemoryFallbackData(reason: string) {
  if (students.length === 0) {
    students = createFallbackStudents();
  }

  if (!admins.some(a => a.loginId === fallbackAdmin.loginId)) {
    admins = [fallbackAdmin, ...admins];
  }

  console.log(`${reason} Loaded ${students.length} local students, ${companies.length} recruiters and ${admins.length} admin account(s).`);
}

async function syncWithFirebase() {
  const dbUrl = getDbUrl();
  if (!dbUrl) {
    seedInMemoryFallbackData("No Firebase Database URL detected.");
    return;
  }
  
  try {
    console.log("Establishing synchronization with Firebase Realtime Database:", dbUrl);
    
    const loadedStudents: Student[] = [];
    const loadedAdmins: Admin[] = [];

    // Helper to extract keys case-insensitively
    const getVal = (obj: any, keys: string[], fallback: any = "") => {
      if (!obj) return fallback;
      for (const key of keys) {
        if (obj[key] !== undefined) return obj[key];
        const lowerKey = key.toLowerCase();
        for (const [k, v] of Object.entries(obj)) {
          if (k.toLowerCase() === lowerKey) return v;
        }
      }
      return fallback;
    };

    // 1. Sync from users.json node
    try {
      const resUsers = await fetch(`${dbUrl}/users.json`);
      if (resUsers.ok) {
        const usersData = await resUsers.json();
        if (usersData && typeof usersData === "object" && Object.keys(usersData).length > 0) {
          console.log(`Fetched ${Object.keys(usersData).length} records from /users.json`);
          Object.entries(usersData).forEach(([key, u]: [string, any]) => {
            if (u && typeof u === "object") {
              const uRole = String(getVal(u, ["role", "Role"], "")).toLowerCase();
              if (uRole === "admin" || uRole === "coordinator") {
                loadedAdmins.push({
                  id: getVal(u, ["id", "loginId", "LoginId"], key),
                  loginId: getVal(u, ["loginId", "LoginId", "id"], key),
                  email: getVal(u, ["email", "Email"], ""),
                  password: getVal(u, ["password", "Password"], undefined),
                  role: "admin",
                  name: getVal(u, ["name", "Name"], "CHARAN")
                });
              } else {
                loadedStudents.push({
                  id: getVal(u, ["id", "loginId", "LoginId"], key),
                  name: getVal(u, ["name", "Name"], "Student Name"),
                  email: getVal(u, ["email", "Email"], ""),
                  department: getVal(u, ["department", "Department"], "Computer Science"),
                  cgpa: Number(getVal(u, ["cgpa", "CGPA"], 8.5)),
                  skills: getVal(u, ["skills", "Skills"], ""),
                  allocationStatus: getVal(u, ["allocationStatus", "AllocationStatus"], "Pending"),
                  allocatedCompanyId: getVal(u, ["allocatedCompanyId", "AllocatedCompanyId"], undefined),
                  password: getVal(u, ["password", "Password"], undefined)
                });
              }
            }
          });
        }
      }
    } catch (err) {
      console.error("Failed to read from users.json node:", err);
    }

    // 2. Sync from students.json node
    try {
      const resStudents = await fetch(`${dbUrl}/students.json`);
      if (resStudents.ok) {
        const studentsData = await resStudents.json();
        if (studentsData && typeof studentsData === "object" && Object.keys(studentsData).length > 0) {
          console.log(`Fetched ${Object.keys(studentsData).length} records from /students.json`);
          Object.entries(studentsData).forEach(([key, u]: [string, any]) => {
            if (u && typeof u === "object") {
              const studentId = getVal(u, ["id", "loginId", "LoginId"], key);
              if (!loadedStudents.some(s => s.id === studentId)) {
                loadedStudents.push({
                  id: studentId,
                  name: getVal(u, ["name", "Name"], "Student Name"),
                  email: getVal(u, ["email", "Email"], ""),
                  department: getVal(u, ["department", "Department"], "Computer Science"),
                  cgpa: Number(getVal(u, ["cgpa", "CGPA"], 8.5)),
                  skills: getVal(u, ["skills", "Skills"], ""),
                  allocationStatus: getVal(u, ["allocationStatus", "AllocationStatus"], "Pending"),
                  allocatedCompanyId: getVal(u, ["allocatedCompanyId", "AllocatedCompanyId"], undefined),
                  password: getVal(u, ["password", "Password"], undefined),
                  phone: getVal(u, ["phone", "Phone"], ""),
                  linkedin: getVal(u, ["linkedin", "Linkedin"], ""),
                  github: getVal(u, ["github", "Github"], ""),
                  resumeFile: getVal(u, ["resumeFile", "ResumeFile"], "")
                });
              }
            }
          });
        }
      }
    } catch (err) {
      console.error("Failed to read from students.json node:", err);
    }

    // 3. Sync from admin.json node
    try {
      const resAdmins = await fetch(`${dbUrl}/admin.json`);
      if (resAdmins.ok) {
        const adminsData = await resAdmins.json();
        if (adminsData && typeof adminsData === "object" && Object.keys(adminsData).length > 0) {
          console.log(`Fetched ${Object.keys(adminsData).length} records from /admin.json`);
          Object.entries(adminsData).forEach(([key, a]: [string, any]) => {
            if (a && typeof a === "object") {
              const adminId = getVal(a, ["id", "loginId", "LoginId"], key);
              if (!loadedAdmins.some(ad => ad.loginId === adminId)) {
                loadedAdmins.push({
                  id: adminId,
                  loginId: getVal(a, ["loginId", "LoginId", "id"], key),
                  email: getVal(a, ["email", "Email"], ""),
                  password: getVal(a, ["password", "Password"], undefined),
                  role: "admin",
                  name: getVal(a, ["name", "Name"], "CHARAN")
                });
              }
            }
          });
        }
      }
    } catch (err) {
      console.error("Failed to read from admin.json node:", err);
    }

    if (loadedStudents.length === 0) {
      console.log("No student records found in Firebase Database. Seeding academic registers...");
      const initialStudents: Student[] = [
        {
          id: "19240101",
          name: "Aditya Kulkarni",
          email: "aditya.k@saveetha.in",
          department: "Computer Science & Engineering",
          cgpa: 9.6,
          skills: "React, TypeScript, Java, SQL, HTML, CSS",
          allocationStatus: "Pending",
          resumeStatus: "Approved",
          resumeReviewRemarks: "Exceptional profile, perfect for Software Intern role. Strong React and Java skills.",
          phone: "+91 98451 23091",
          linkedin: "https://linkedin.com/in/adityak",
          github: "https://github.com/adityak",
          resumeFile: "Aditya_Kulkarni_Resume.pdf"
        },
        {
          id: "19240102",
          name: "Sanjana Nair",
          email: "sanjana.nair@saveetha.in",
          department: "Information Technology",
          cgpa: 9.2,
          skills: "Java, Spring Boot, PostgreSQL, C, HTML, CSS",
          allocationStatus: "Pending",
          resumeStatus: "Approved",
          resumeReviewRemarks: "Solid back-end foundation with Spring Boot and SQL experience.",
          phone: "+91 87541 23092",
          linkedin: "https://linkedin.com/in/sanjananair",
          github: "https://github.com/sanjananair",
          resumeFile: "Sanjana_Nair_Resume.pdf"
        },
        {
          id: "19240103",
          name: "Pranav Reddy",
          email: "pranav.reddy@saveetha.in",
          department: "Computer Science & Engineering",
          cgpa: 8.9,
          skills: "React, Node.js, Express, SQL, HTML, CSS, JavaScript",
          allocationStatus: "Pending",
          resumeStatus: "Approved",
          resumeReviewRemarks: "Good full-stack skill set. Handled deployment on Render/AWS.",
          phone: "+91 76541 23093",
          linkedin: "https://linkedin.com/in/pranavreddy",
          github: "https://github.com/pranavreddy",
          resumeFile: "Pranav_Reddy_Resume.pdf"
        },
        {
          id: "19240104",
          name: "Manoj Kumar",
          email: "manoj.kumar@saveetha.in",
          department: "Artificial Intelligence & Data Science",
          cgpa: 9.4,
          skills: "Python, R, MATLAB, Java, SQL, Machine Learning",
          allocationStatus: "Pending",
          resumeStatus: "Approved",
          resumeReviewRemarks: "Excellent machine learning portfolio and Python background.",
          phone: "+91 99841 23094",
          linkedin: "https://linkedin.com/in/manojkumar",
          github: "https://github.com/manojkumar",
          resumeFile: "Manoj_Kumar_Resume.pdf"
        },
        {
          id: "19240105",
          name: "Ananya Deshmukh",
          email: "ananya.d@saveetha.in",
          department: "Electronics & Communication",
          cgpa: 8.7,
          skills: "Java, Python, HTML, CSS, SQL, JavaScript",
          allocationStatus: "Pending",
          resumeStatus: "Approved",
          resumeReviewRemarks: "Well-rounded software enthusiast. Strong analytical skills.",
          phone: "+91 88541 23095",
          linkedin: "https://linkedin.com/in/ananyad",
          github: "https://github.com/ananyad",
          resumeFile: "Ananya_Deshmukh_Resume.pdf"
        },
        {
          id: "19240106",
          name: "Karthik Raja",
          email: "karthik.raja@saveetha.in",
          department: "Computer Science & Engineering",
          cgpa: 9.8,
          skills: "React, TypeScript, Node.js, Spring Boot, Java, PostgreSQL",
          allocationStatus: "Pending",
          resumeStatus: "Approved",
          resumeReviewRemarks: "Outstanding academic performer and competitive hacker.",
          phone: "+91 97541 23096",
          linkedin: "https://linkedin.com/in/karthikraja",
          github: "https://github.com/karthikraja",
          resumeFile: "Karthik_Raja_Resume.pdf"
        },
        {
          id: "19240107",
          name: "Meera Krishnan",
          email: "meera.krishnan@saveetha.in",
          department: "Biomedical Engineering",
          cgpa: 8.5,
          skills: "Python, R, MATLAB, SQL, HTML, CSS",
          allocationStatus: "Pending",
          resumeStatus: "Approved",
          resumeReviewRemarks: "Adept at medical signal datasets and MATLAB analytical graphing.",
          phone: "+91 86541 23097",
          linkedin: "https://linkedin.com/in/meerakrishnan",
          github: "https://github.com/meerakrishnan",
          resumeFile: "Meera_Krishnan_Resume.pdf"
        },
        {
          id: "19240108",
          name: "Rahul Goud",
          email: "rahul.goud@saveetha.in",
          department: "Information Technology",
          cgpa: 8.4,
          skills: "React, Node.js, Express, SQL, HTML, CSS, Java",
          allocationStatus: "Pending",
          resumeStatus: "Approved",
          resumeReviewRemarks: "Reliable developer with robust knowledge of React hooks and state.",
          phone: "+91 75541 23098",
          linkedin: "https://linkedin.com/in/rahulgoud",
          github: "https://github.com/rahulgoud",
          resumeFile: "Rahul_Goud_Resume.pdf"
        },
        {
          id: "19240109",
          name: "Bhuvaneshwari Sekar",
          email: "bhuvaneshwari.s@saveetha.in",
          department: "Computer Science & Engineering",
          cgpa: 9.1,
          skills: "Java, Spring Boot, React, SQL, HTML, CSS",
          allocationStatus: "Pending",
          resumeStatus: "Approved",
          resumeReviewRemarks: "Exceptional skill set. Solid Java Spring and React web foundation.",
          phone: "+91 96541 23099",
          linkedin: "https://linkedin.com/in/bhuvaneshwaris",
          github: "https://github.com/bhuvaneshwaris",
          resumeFile: "Bhuvaneshwari_Sekar_Resume.pdf"
        },
        {
          id: "19240110",
          name: "Sridhar Venkatesh",
          email: "sridhar.v@saveetha.in",
          department: "Electronics & Communication",
          cgpa: 8.3,
          skills: "C, C++, Java, SQL, Python, HTML, CSS",
          allocationStatus: "Pending",
          resumeStatus: "Approved",
          resumeReviewRemarks: "Embedded software skills and robust understanding of OS concepts.",
          phone: "+91 85541 23100",
          linkedin: "https://linkedin.com/in/sridharv",
          github: "https://github.com/sridharv",
          resumeFile: "Sridhar_Venkatesh_Resume.pdf"
        },
        {
          id: "19240111",
          name: "Divya Raghavan",
          email: "divya.raghavan@saveetha.in",
          department: "Computer Science & Engineering",
          cgpa: 9.0,
          skills: "React, Node.js, Express, Java, SQL, Spring Boot",
          allocationStatus: "Pending",
          resumeStatus: "Approved",
          resumeReviewRemarks: "Outstanding project implementation records and communication skills.",
          phone: "+91 74541 23101",
          linkedin: "https://linkedin.com/in/divyaraghavan",
          github: "https://github.com/divyaraghavan",
          resumeFile: "Divya_Raghavan_Resume.pdf"
        },
        {
          id: "19240112",
          name: "Rithika Sridhar",
          email: "rithika.s@saveetha.in",
          department: "Information Technology",
          cgpa: 8.8,
          skills: "Java, Python, HTML, CSS, SQL, PostgreSQL",
          allocationStatus: "Pending",
          resumeStatus: "Approved",
          resumeReviewRemarks: "Proven database skills and outstanding critical thinking abilities.",
          phone: "+91 94541 23102",
          linkedin: "https://linkedin.com/in/rithikasridhar",
          github: "https://github.com/rithikasridhar",
          resumeFile: "Rithika_Sridhar_Resume.pdf"
        }
      ];

      for (const s of initialStudents) {
        loadedStudents.push(s);
        await persistStudentToFirebase(s.id, s);
      }

      recordSecurityLog(
        "SYSTEM",
        "system@saveetha.in",
        "Student Database Seeded",
        "Populated the database with 12 complete student profiles on first startup initialization.",
        "Success"
      );
    }

    students = loadedStudents;

    const requestedStudents: Student[] = [
      {
        id: "192472118",
        name: "A.pradeep",
        email: "192472118.simats@saveetha.com",
        department: "Computer Science & Engineering",
        cgpa: 9.5,
        skills: "React, TypeScript, Java, SQL, HTML, CSS",
        allocationStatus: "Pending",
        resumeStatus: "Approved",
        resumeReviewRemarks: "Excellent resume. Good hands-on experience in full-stack engineering.",
        phone: "+91 94441 23456",
        linkedin: "https://linkedin.com/in/apradeep-192472118",
        github: "https://github.com/apradeep-192472118",
        resumeFile: "A_Pradeep_Resume.pdf"
      },
      {
        id: "192472178",
        name: "B.Shasidhar",
        email: "192472178.simats@saveetha.com",
        department: "Information Technology",
        cgpa: 8.9,
        skills: "Java, Spring Boot, PostgreSQL, C, SQL",
        allocationStatus: "Pending",
        resumeStatus: "Approved",
        resumeReviewRemarks: "Strong core back-end foundations. Familiar with database pooling.",
        phone: "+91 87554 11223",
        linkedin: "https://linkedin.com/in/bshasidhar-192472178",
        github: "https://github.com/bshasidhar-192472178",
        resumeFile: "B_Shasidhar_Resume.pdf"
      },
      {
        id: "192424223",
        name: "J.Malakondaiah",
        email: "192424223.simats@saveetha.com",
        department: "Computer Science & Engineering",
        cgpa: 9.2,
        skills: "React, Node.js, Express, SQL, HTML, Python",
        allocationStatus: "Pending",
        resumeStatus: "Approved",
        resumeReviewRemarks: "Highly proficient in fullstack javascript projects.",
        phone: "+91 76543 98765",
        linkedin: "https://linkedin.com/in/jmalakondaiah-192424223",
        github: "https://github.com/jmalakondaiah-192424223",
        resumeFile: "J_Malakondaiah_Resume.pdf"
      },
      {
        id: "192411162",
        name: "R.Reddy balaji",
        email: "192411162.simats@saveetha.com",
        department: "Electronics & Communication",
        cgpa: 8.8,
        skills: "Python, Java, React, SQL, HTML, CSS",
        allocationStatus: "Pending",
        resumeStatus: "Approved",
        resumeReviewRemarks: "Great analytical skills. Well suited for Python/Java associate engineers.",
        phone: "+91 99887 76655",
        linkedin: "https://linkedin.com/in/rreddybalaji-192411162",
        github: "https://github.com/rreddybalaji-192411162",
        resumeFile: "R_Reddy_Balaji_Resume.pdf"
      },
      {
        id: "192472102",
        name: "Govardhan",
        email: "192472102.simats@saveetha.com",
        department: "Artificial Intelligence & Data Science",
        cgpa: 9.4,
        skills: "React, TypeScript, Java, SQL, Node.js, Express",
        allocationStatus: "Pending",
        resumeStatus: "Approved",
        resumeReviewRemarks: "Top-notch technical problem solver. Great coding credentials.",
        phone: "+91 88990 01122",
        linkedin: "https://linkedin.com/in/govardhan-192472102",
        github: "https://github.com/govardhan-192472102",
        resumeFile: "Govardhan_Resume.pdf"
      }
    ];

    let newlyAddedCount = 0;
    for (const rs of requestedStudents) {
      const idx = students.findIndex(s => s.id === rs.id);
      if (idx === -1) {
        students.push(rs);
        await persistStudentToFirebase(rs.id, rs);
        newlyAddedCount++;
      } else {
        students[idx] = { ...students[idx], ...rs };
        await persistStudentToFirebase(rs.id, students[idx]);
      }
    }

    if (newlyAddedCount > 0) {
      recordSecurityLog(
        "SYSTEM",
        "system@saveetha.in",
        "Requested Students Seeded",
        `Successfully integrated ${newlyAddedCount} custom students into active SIMATS accounts list.`,
        "Success"
      );
    }

    admins = loadedAdmins.length > 0 ? loadedAdmins : [fallbackAdmin];
    console.log(`Synchronization completed. Active cache has ${students.length} students and ${admins.length} admins loaded.`);

    // Sync Companies
    const resComs = await fetch(`${dbUrl}/companies.json`);
    if (resComs.ok) {
      const coData = await resComs.json();
      if (coData && Object.keys(coData).length > 0) {
        companies = Object.values(coData);
        console.log(`Successfully synced ${companies.length} Companies from Realtime Database.`);
      } else {
        const seedComs: { [key: string]: Company } = {};
        companies.forEach(c => { seedComs[c.id] = c; });
        await fetch(`${dbUrl}/companies.json`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(seedComs)
        });
      }
    }

    // Sync Notifications
    const resNotif = await fetch(`${dbUrl}/notifications.json`);
    if (resNotif.ok) {
      const notifData = await resNotif.json();
      if (notifData && Array.isArray(notifData)) {
        notifications = notifData;
        console.log(`Successfully synced ${notifications.length} Notifications from Realtime Database.`);
      } else {
        await fetch(`${dbUrl}/notifications.json`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(notifications)
        });
      }
    }

    // Sync Allocations
    const resAlloc = await fetch(`${dbUrl}/allocations.json`);
    if (resAlloc.ok) {
      const allocData = await resAlloc.json();
      if (allocData && Array.isArray(allocData)) {
        allocations = allocData;
        console.log(`Successfully synced ${allocations.length} Allocations from Realtime Database.`);
      }
    }
  } catch (err) {
    console.error("Failed to perform start-up Firebase Realtime Database synchronization:", err);
    seedInMemoryFallbackData("Firebase synchronization failed.");
  }
}

// Persist a single student profile directly into student path as requested
async function persistStudentToFirebase(id: string, sData: any) {
  const dbUrl = getDbUrl();
  if (!dbUrl) return;
  try {
    const existingRes = await fetch(`${dbUrl}/students/${id}.json`);
    let password = sData.password || "Student@123";
    let role = "student";
    if (existingRes.ok) {
      const existing = await existingRes.json();
      if (existing) {
        password = sData.password || existing.password || "Student@123";
        role = existing.role || "student";
      }
    }
    
    const payload = {
      ...sData,
      id,
      loginId: id,
      role,
      password
    };
    
    await fetch(`${dbUrl}/students/${id}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error(`Failed to push student details for ${id}:`, err);
  }
}

async function removeStudentFromFirebase(id: string) {
  const dbUrl = getDbUrl();
  if (!dbUrl) return;
  try {
    const cleanId = String(id).trim().toLowerCase();
    
    // 1. Delete from students node directly
    await fetch(`${dbUrl}/students/${id}.json`, {
      method: "DELETE"
    });
    
    // 2. Delete from users node directly
    await fetch(`${dbUrl}/users/${id}.json`, {
      method: "DELETE"
    });

    // 3. Scan for and purge any keys in /students node case-insensitively
    const resStudents = await fetch(`${dbUrl}/students.json`);
    if (resStudents.ok) {
      const studentsData = await resStudents.json();
      if (studentsData && typeof studentsData === "object" && Object.keys(studentsData).length > 0) {
        for (const [key, val] of Object.entries(studentsData)) {
          if (String(key).trim().toLowerCase() === cleanId) {
            await fetch(`${dbUrl}/students/${key}.json`, {
              method: "DELETE"
            });
          } else if (val && typeof val === "object") {
            const sId = (val as any).id || key;
            if (String(sId).trim().toLowerCase() === cleanId) {
              await fetch(`${dbUrl}/students/${key}.json`, {
                method: "DELETE"
              });
            }
          }
        }
      }
    }

    // 4. Scan for and purge any credentials in /users node case-insensitively
    const resUsers = await fetch(`${dbUrl}/users.json`);
    if (resUsers.ok) {
      const usersData = await resUsers.json();
      if (usersData && typeof usersData === "object" && Object.keys(usersData).length > 0) {
        for (const [key, val] of Object.entries(usersData)) {
          if (String(key).trim().toLowerCase() === cleanId) {
            await fetch(`${dbUrl}/users/${key}.json`, {
              method: "DELETE"
            });
          } else if (val && typeof val === "object") {
            const uId = (val as any).id || (val as any).loginId || key;
            if (String(uId).trim().toLowerCase() === cleanId) {
              await fetch(`${dbUrl}/users/${key}.json`, {
                method: "DELETE"
              });
            }
          }
        }
      }
    }
  } catch (err) {
    console.error(`Failed to remove student mapping for ${id}:`, err);
  }
}

async function persistCompanyToFirebase(id: string, cData: any) {
  const dbUrl = getDbUrl();
  if (!dbUrl) return;
  try {
    await fetch(`${dbUrl}/companies/${id}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...cData, id })
    });
  } catch (err) {
    console.error(`Failed to push company details for ${id}:`, err);
  }
}

async function removeCompanyFromFirebase(id: string) {
  const dbUrl = getDbUrl();
  if (!dbUrl) return;
  try {
    await fetch(`${dbUrl}/companies/${id}.json`, {
      method: "DELETE"
    });
  } catch (err) {
    console.error(`Failed to remove company record for ${id}:`, err);
  }
}

async function persistAllocationsToFirebase(allocsList: any[]) {
  const dbUrl = getDbUrl();
  if (!dbUrl) return;
  try {
    await fetch(`${dbUrl}/allocations.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(allocsList)
    });
  } catch (err) {
    console.error("Failed to push batch allocations to database:", err);
  }
}

async function persistNotificationsToFirebase(notifList: any[]) {
  const dbUrl = getDbUrl();
  if (!dbUrl) return;
  try {
    await fetch(`${dbUrl}/notifications.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notifList)
    });
  } catch (err) {
    console.error("Failed to push batch notifications to database:", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Sync initial dataset with Firebase Realtime Database on startup
  await syncWithFirebase();

  app.use(express.json());

  // CORS Headers
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // API base route diagnostics
  app.get("/api/health", async (req, res) => {
    const dbUrl = getDbUrl();
    let dbStatus = "unconfigured";
    let dbMessage = "";
    if (dbUrl) {
      try {
        const testRes = await fetch(`${dbUrl}/.json?shallow=true`);
        if (testRes.ok) {
          dbStatus = "connected";
        } else {
          dbStatus = "permission_denied";
          dbMessage = `${testRes.status} ${testRes.statusText}`;
        }
      } catch (err: any) {
        dbStatus = "connection_failed";
        dbMessage = err.message || "Failed to reach Firebase URL";
      }
    }
    res.json({
      status: "ok",
      timestamp: new Date(),
      firebase: {
        status: dbStatus,
        message: dbMessage,
        url: dbUrl ? `${dbUrl.substring(0, 30)}...` : undefined,
        loadedStudents: students.length,
        loadedAdmins: admins.length
      },
      usePg
    });
  });

  // Admin Security OTP Login Logs
  app.post("/api/admin/login-log", (req, res) => {
    const { adminId, email, action, details, status } = req.body;
    const cleanId = String(adminId || "192472118").trim();
    const cleanEmail = String(email || "campusplacementsimats@saveetha.com").trim();
    const cleanAction = String(action || "Admin OTP Login").trim();
    const cleanDetails = String(details || `Admin ID ${cleanId} authenticated successfully with 2FA/OTP.`).trim();
    const cleanStatus = String(status || "Authorized").trim();
    
    recordSecurityLog(
      cleanId, 
      cleanEmail, 
      cleanAction, 
      cleanDetails, 
      cleanStatus
    );
    
    res.json({ success: true, log: adminLoginLogs[0] });
  });

  app.get("/api/admin/login-log", (req, res) => {
    cleanExpiredLogs();
    res.json(adminLoginLogs);
  });

  app.get("/api/admin/log-retention", (req, res) => {
    res.json({ days: logRetentionDays });
  });

  app.post("/api/admin/log-retention", (req, res) => {
    const { days } = req.body;
    const previousDays = logRetentionDays;
    
    // Ensure numeric input, <= 0 means Unlimited
    const newDays = days === null || days === undefined ? 0 : Number(days);
    logRetentionDays = newDays;
    
    // Clean up immediately and count pruned entries
    const deletedCount = cleanExpiredLogs();
    
    recordSecurityLog(
      "ADMIN",
      "admin@saveetha.in",
      "Pruning Policy Settings Updated",
      `Altered retention policy from ${previousDays === 0 ? "Unlimited" : previousDays + " days"} to ${logRetentionDays === 0 ? "Unlimited" : logRetentionDays + " days"}. Pruned ${deletedCount} items.`,
      "Success"
    );
    
    res.json({ success: true, days: logRetentionDays, deletedCount });
  });

  // Admin Profile Endpoint
  app.get("/api/admins/:adminId", (req, res) => {
    const { adminId } = req.params;
    const admin = admins.find(a => String(a.loginId).toLowerCase() === adminId.trim().toLowerCase());
    if (admin) {
      res.json(admin);
    } else {
      res.status(404).json({ error: "Admin profile not found" });
    }
  });

  // Student Endpoints
  app.get("/api/students", (req, res) => {
    res.json(students || []);
  });

  app.get("/api/students/:studentId", (req, res) => {
    const { studentId } = req.params;
    const student = students.find(s => String(s.id).toLowerCase() === studentId.trim().toLowerCase());
    if (student) {
      res.json(student);
    } else {
      res.status(404).json({ error: "Student not found" });
    }
  });


  app.post("/api/students/bulk", async (req, res) => {
    const { studentsList } = req.body;
    if (!studentsList || !Array.isArray(studentsList)) {
      return res.status(400).json({ error: "Invalid payload: studentsList array is required" });
    }

    const added: Student[] = [];
    const updated: Student[] = [];

    for (const item of studentsList) {
      const { id, name, email, department, cgpa, skills } = item;
      if (!id || !name || !email || !department || cgpa === undefined) {
        continue; // skip malformed entries
      }

      const cleanId = String(id).trim();
      const cleanName = String(name).trim();
      const cleanEmail = String(email).trim();
      const cleanDept = String(department).trim();
      const cleanGpa = Number(cgpa);
      const cleanSkills = String(skills || "").trim();

      const existingIdx = students.findIndex(s => String(s.id).trim().toLowerCase() === cleanId.toLowerCase());
      
      const updatedStudent: Student = {
        id: cleanId,
        name: cleanName,
        email: cleanEmail,
        department: cleanDept,
        cgpa: cleanGpa,
        skills: cleanSkills,
        allocationStatus: "Pending",
        phone: item.phone || `+91 9${Math.floor(100000000 + Math.random() * 900000000)}`,
        linkedin: item.linkedin || `https://linkedin.com/in/${cleanName.toLowerCase().replace(/\s+/g, '-')}`,
        github: item.github || `https://github.com/in/${cleanName.toLowerCase().replace(/\s+/g, '-')}`,
        resumeFile: item.resumeFile || "resume_consolidated.pdf",
        resumeStatus: item.resumeStatus || "Approved",
        resumeReviewRemarks: item.resumeReviewRemarks || "Academic credentials synced"
      };

      if (existingIdx !== -1) {
        // preserve existing status metrics
        updatedStudent.allocationStatus = students[existingIdx].allocationStatus || "Pending";
        updatedStudent.allocatedCompanyId = students[existingIdx].allocatedCompanyId;
        updatedStudent.resumeStatus = students[existingIdx].resumeStatus;
        updatedStudent.resumeReviewRemarks = students[existingIdx].resumeReviewRemarks;
        updatedStudent.interviews = students[existingIdx].interviews;
        
        students[existingIdx] = updatedStudent;
        updated.push(updatedStudent);
      } else {
        students.push(updatedStudent);
        added.push(updatedStudent);
      }

      await persistStudentToFirebase(cleanId, updatedStudent);
    }

    recordSecurityLog(
      "ADMIN",
      "admin@saveetha.in",
      "Bulk Student Import (CSV)",
      `Uploaded and processed spreadsheet. Sparked ${added.length} additions and ${updated.length} updates.`,
      "Success"
    );

    res.json({ success: true, addedCount: added.length, updatedCount: updated.length, totalCount: added.length + updated.length });
  });

  app.post("/api/students", async (req, res) => {
    const { id, name, email, department, cgpa, skills } = req.body;
    if (!id || !name || !email || !department || cgpa === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const duplicate = students.find(s => String(s.id).trim().toLowerCase() === String(id).trim().toLowerCase());
    if (duplicate) {
      return res.status(400).json({ error: `Student ID ${id} already exists` });
    }

    const newStudent: Student = {
      id: String(id).trim(),
      name: String(name).trim(),
      email: String(email).trim(),
      department: String(department).trim(),
      cgpa: Number(cgpa),
      skills: String(skills || "").trim(),
      allocationStatus: "Pending",
      phone: req.body.phone || `+91 9${Math.floor(100000000 + Math.random() * 900000000)}`,
      linkedin: req.body.linkedin || `https://linkedin.com/in/${String(name).toLowerCase().replace(/\s+/g, '-')}`,
      github: req.body.github || `https://github.com/in/${String(name).toLowerCase().replace(/\s+/g, '-')}`,
      resumeFile: req.body.resumeFile || "resume_consolidated.pdf",
      resumeStatus: "Approved",
      resumeReviewRemarks: "Academic profile successfully registered"
    };

    students.push(newStudent);
    await persistStudentToFirebase(newStudent.id, newStudent);

    recordSecurityLog(
      "ADMIN",
      "admin@saveetha.in",
      "Student Created",
      `Registered new candidate profile: Student ID: ${newStudent.id}, Name: ${newStudent.name}, Dept: ${newStudent.department}, CGPA: ${newStudent.cgpa}`,
      "Success"
    );

    res.status(211).json(newStudent);
  });

  app.put("/api/students/:studentId", async (req, res) => {
    const { studentId } = req.params;
    const { name, email, department, cgpa, skills, resumeStatus, resumeReviewRemarks, interviews, allocationStatus, allocatedCompanyId, phone, linkedin, github, resumeFile } = req.body;

    const studentIdx = students.findIndex(s => String(s.id).toLowerCase() === studentId.trim().toLowerCase());
    if (studentIdx === -1) {
      return res.status(404).json({ error: "Student not found" });
    }

    students[studentIdx] = {
      ...students[studentIdx],
      name: name !== undefined ? String(name).trim() : students[studentIdx].name,
      email: email !== undefined ? String(email).trim() : students[studentIdx].email,
      department: department !== undefined ? String(department).trim() : students[studentIdx].department,
      cgpa: cgpa !== undefined ? Number(cgpa) : students[studentIdx].cgpa,
      skills: skills !== undefined ? String(skills).trim() : students[studentIdx].skills,
      resumeStatus: resumeStatus !== undefined ? resumeStatus : students[studentIdx].resumeStatus,
      resumeReviewRemarks: resumeReviewRemarks !== undefined ? resumeReviewRemarks : students[studentIdx].resumeReviewRemarks,
      interviews: interviews !== undefined ? interviews : students[studentIdx].interviews,
      allocationStatus: allocationStatus !== undefined ? allocationStatus : students[studentIdx].allocationStatus,
      allocatedCompanyId: allocatedCompanyId !== undefined ? allocatedCompanyId : students[studentIdx].allocatedCompanyId,
      phone: phone !== undefined ? String(phone).trim() : students[studentIdx].phone,
      linkedin: linkedin !== undefined ? String(linkedin).trim() : students[studentIdx].linkedin,
      github: github !== undefined ? String(github).trim() : students[studentIdx].github,
      resumeFile: resumeFile !== undefined ? String(resumeFile).trim() : students[studentIdx].resumeFile
    };

    await persistStudentToFirebase(students[studentIdx].id, students[studentIdx]);

    recordSecurityLog(
      "ADMIN",
      "admin@saveetha.in",
      "Student Updated",
      `Student profile updated: ID ${studentId}, Name: ${students[studentIdx].name}, CGPA: ${students[studentIdx].cgpa}`,
      "Success"
    );

    res.json(students[studentIdx]);
  });

  app.delete("/api/students/:studentId", async (req, res) => {
    const { studentId } = req.params;
    if (!studentId) {
      return res.status(400).json({ error: "Student ID parameter is required" });
    }
    const cleanId = String(studentId).trim().toLowerCase();
    const studentIdx = students.findIndex(s => String(s.id).trim().toLowerCase() === cleanId);
    if (studentIdx === -1) {
      return res.status(404).json({ error: "Student not found" });
    }

    const deleted = students.splice(studentIdx, 1);
    // Remove individual allocations if present
    allocations = allocations.filter(a => String(a.studentId).trim().toLowerCase() !== cleanId);
    await removeStudentFromFirebase(studentId);
    await persistAllocationsToFirebase(allocations);

    recordSecurityLog(
      "ADMIN",
      "admin@saveetha.in",
      "Student Deleted",
      `Student profile deleted: ID ${studentId}, Name: ${deleted[0]?.name || "Unknown"}`,
      "Success"
    );

    res.json({ message: "Student record deleted successfully", deleted });
  });

  // Company Endpoints
  app.get("/api/companies", (req, res) => {
    res.json(companies);
  });

  app.post("/api/companies", async (req, res) => {
    const { name, role, skills, packageLpa, capacity } = req.body;
    if (!name || !role || !skills || packageLpa === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newCompany: Company = {
      id: "c_" + Date.now(),
      name: String(name).trim(),
      role: String(role).trim(),
      skills: String(skills || "").trim(),
      packageLpa: Number(packageLpa),
      capacity: Number(capacity || 3)
    };

    companies.push(newCompany);
    await persistCompanyToFirebase(newCompany.id, newCompany);

    recordSecurityLog(
      "ADMIN",
      "admin@saveetha.in",
      "Company Created",
      `Registered new recruiting partner: Name: ${newCompany.name}, Role: ${newCompany.role}, Package: ${newCompany.packageLpa} LPA`,
      "Success"
    );

    res.status(211).json(newCompany);
  });

  app.put("/api/companies/:id", async (req, res) => {
    const { id } = req.params;
    const { name, role, skills, packageLpa, capacity } = req.body;

    const companyIdx = companies.findIndex(c => c.id === id);
    if (companyIdx === -1) {
      return res.status(404).json({ error: "Company not found" });
    }

    companies[companyIdx] = {
      ...companies[companyIdx],
      name: name !== undefined ? String(name).trim() : companies[companyIdx].name,
      role: role !== undefined ? String(role).trim() : companies[companyIdx].role,
      skills: skills !== undefined ? String(skills).trim() : companies[companyIdx].skills,
      packageLpa: packageLpa !== undefined ? Number(packageLpa) : companies[companyIdx].packageLpa,
      capacity: capacity !== undefined ? Number(capacity) : companies[companyIdx].capacity
    };

    await persistCompanyToFirebase(id, companies[companyIdx]);

    recordSecurityLog(
      "ADMIN",
      "admin@saveetha.in",
      "Company Updated",
      `Recruiting partner profile updated: ID ${id}, Name: ${companies[companyIdx].name}, Role: ${companies[companyIdx].role}`,
      "Success"
    );

    res.json(companies[companyIdx]);
  });

  app.delete("/api/companies/:id", async (req, res) => {
    const { id } = req.params;
    const companyIdx = companies.findIndex(c => c.id === id);
    if (companyIdx === -1) {
      return res.status(404).json({ error: "Company not found" });
    }

    const deleted = companies.splice(companyIdx, 1);
    // Cleanup allocation referencing deleted company
    allocations = allocations.filter(a => a.companyId !== id);
    
    // Save modified student records
    const updatedStudentPromises = students.map(async (s) => {
      if (s.allocatedCompanyId === id) {
        s.allocatedCompanyId = undefined;
        s.allocationStatus = "Pending";
        await persistStudentToFirebase(s.id, s);
      }
    });
    
    await Promise.all(updatedStudentPromises);
    await removeCompanyFromFirebase(id);
    await persistAllocationsToFirebase(allocations);

    recordSecurityLog(
      "ADMIN",
      "admin@saveetha.in",
      "Company Deleted",
      `Recruiting partner profile deleted: ID ${id}, Name: ${deleted[0]?.name || "Unknown"}`,
      "Success"
    );

    res.json({ message: "Company deleted successfully", deleted });
  });

  // Resume Matching Algorithm
  app.get("/api/resume-match", (req, res) => {
    const { skills } = req.query;
    if (!skills) {
      return res.status(400).json({ error: "Skills parameter is required" });
    }

    const studentSkills = String(skills);
    const matches = companies.map(company => {
      const matchScore = getSkillMatchScore(studentSkills, company.skills);
      return {
        companyId: company.id,
        companyName: company.name,
        role: company.role,
        requiredSkills: company.skills,
        packageLpa: company.packageLpa,
        matchScore
      };
    }).sort((a, b) => b.matchScore - a.matchScore);

    res.json(matches);
  });

  // Notification Endpoints
  app.get("/api/notifications", (req, res) => {
    const { studentId } = req.query;
    if (studentId) {
      // Filter notifications that are either general broadcast (no targetStudentId) OR match studentId
      const filtered = notifications.filter(n => !n.targetStudentId || String(n.targetStudentId).toLowerCase() === String(studentId).trim().toLowerCase());
      return res.json(filtered);
    }
    res.json(notifications);
  });

  app.post("/api/notifications", async (req, res) => {
    const { type, title, description, targetStudentId } = req.body;
    if (!type || !title || !description) {
      return res.status(400).json({ error: "Missing required fields (type, title, description)" });
    }

    const newNotification: Notification = {
      id: "notif_" + Date.now(),
      type,
      title: String(title).trim(),
      description: String(description).trim(),
      targetStudentId: targetStudentId ? String(targetStudentId).trim() : undefined,
      date: new Date().toISOString()
    };

    notifications.unshift(newNotification); // insert at start in-memory
    await persistNotificationsToFirebase(notifications);
    res.status(211).json(newNotification);
  });

  app.delete("/api/notifications/:id", async (req, res) => {
    const { id } = req.params;
    const initialLength = notifications.length;
    notifications = notifications.filter(n => n.id !== id);
    if (notifications.length < initialLength) {
      await persistNotificationsToFirebase(notifications);
      res.json({ message: "Notification deleted successfully" });
    } else {
      res.status(404).json({ error: "Notification not found" });
    }
  });

  // Allocation Endpoints
  app.get("/api/allocations", (req, res) => {
    res.json(allocations);
  });

  // Runs the greedy stable matching/allocation engine
  // Sorts students by CGPA desc (priority), then attempts matching with companies sorted by LPA desc, matching score desc
  app.post("/api/allocations/run", async (req, res) => {
    try {
      // Reset any previous allocations
      allocations = [];
      const validStudents = (students || []).filter(s => s && s.id && getBackendStudentCompleteness(s) === 100);
      validStudents.forEach(s => {
        s.allocatedCompanyId = undefined;
        s.allocationStatus = "Pending";
      });

      const validCompanies = (companies || []).filter(c => c && c.id);
      const companyCapacities: { [key: string]: number } = {};
      validCompanies.forEach(c => {
        companyCapacities[c.id] = c.capacity;
      });

      // 1. Sort students by CGPA descending
      const sortedStudents = [...validStudents].sort((a, b) => b.cgpa - a.cgpa);

      sortedStudents.forEach(student => {
        // Find all companies with overlapping skills (matchScore === 100, meaning all requirements met)
        const possibleCompanies = validCompanies.map(company => {
          const score = getSkillMatchScore(student.skills || "", company.skills || "");
          return {
            company,
            matchScore: score
          };
        })
        .filter(item => item.matchScore === 100)
        // Sort by package size first (student preference), then by skill match score, descending
        .sort((a, b) => {
          if (b.company.packageLpa !== a.company.packageLpa) {
            return b.company.packageLpa - a.company.packageLpa;
          }
          return b.matchScore - a.matchScore;
        });

        // Try to assign the student to the highest preferred company that has slot capacity
        let assigned = false;
        for (const trial of possibleCompanies) {
          const cId = trial.company.id;
          if (companyCapacities[cId] > 0) {
            companyCapacities[cId]--;
            student.allocatedCompanyId = cId;
            student.allocationStatus = "Allocated";
            
            allocations.push({
              studentId: student.id,
              studentName: student.name,
              studentCgpa: student.cgpa,
              studentDepartment: student.department,
              companyId: cId,
              companyName: trial.company.name,
              packageLpa: trial.company.packageLpa,
              matchScore: trial.matchScore
            });

            // Sync in main students list
            const sIdx = students.findIndex(s => s && s.id === student.id);
            if (sIdx !== -1) {
              students[sIdx].allocatedCompanyId = cId;
              students[sIdx].allocationStatus = "Allocated";
            }
            assigned = true;
            break;
          }
        }

        if (!assigned) {
          const sIdx = students.findIndex(s => s && s.id === student.id);
          if (sIdx !== -1) {
            students[sIdx].allocationStatus = "Unplaced";
          }
        }
      });

      // Sync all modified student records and allocations list to Firebase Realtime Database
      const syncPromises = validStudents.map(s => persistStudentToFirebase(s.id, s));
      await Promise.all(syncPromises);
      await persistAllocationsToFirebase(allocations);

      recordSecurityLog(
        "ADMIN",
        "admin@saveetha.in",
        "Placement Auto-Allocation",
        `Ran Greedy CGPA matcher. Evaluated ${validStudents.length} candidates. Created ${allocations.length} corporate matches.`,
        "Success"
      );

      res.json({ message: "Automated placement allocation executed successfully", allocations });
    } catch (err: any) {
      console.error("Critical error during allocation execution:", err);
      res.status(500).json({ error: err.message || "An unexpected error occurred during allocation algorithm execution." });
    }
  });

  app.post("/api/allocations/reset", async (req, res) => {
    try {
      allocations = [];
      const validStudents = (students || []).filter(s => s && s.id);
      validStudents.forEach(s => {
        s.allocatedCompanyId = undefined;
        s.allocationStatus = "Pending";
      });

      // Reset student profiles and write allocations list empty on Firebase
      const syncPromises = validStudents.map(s => persistStudentToFirebase(s.id, s));
      await Promise.all(syncPromises);
      await persistAllocationsToFirebase([]);

      recordSecurityLog(
        "ADMIN",
        "admin@saveetha.in",
        "Placement Reset State",
        `Cleared all student placements and deleted all corporate allocations. Reverted ${validStudents.length} status to Pending.`,
        "Success"
      );

      res.json({ message: "Allocations reset complete", students });
    } catch (err: any) {
      console.error("Critical error during allocations reset:", err);
      res.status(500).json({ error: err.message || "An unexpected error occurred while resetting allocation tables." });
    }
  });

  // Lookup email for password reset verification
  app.post("/api/auth/lookup-email", (req, res) => {
    const { loginId } = req.body;
    if (!loginId) {
      return res.status(400).json({ error: "Missing Login ID" });
    }
    const cleanId = String(loginId).trim().toLowerCase();
    
    // Check admin
    const admin = admins.find(a => String(a.loginId).toLowerCase() === cleanId);
    if (admin) {
      return res.json({ name: admin.name || "Administrator", email: admin.email || "", role: "admin", exists: true });
    }
    
    // Check student
    const student = students.find(s => String(s.id).toLowerCase() === cleanId);
    if (student) {
      return res.json({ name: student.name || "Student", email: student.email || "", role: "student", exists: true });
    }
    
    res.status(404).json({ error: "No profile matching this Login ID exists in our registry." });
  });

  // Securely update password after OTP validation has completed in client browser
  app.post("/api/auth/reset-password", async (req, res) => {
    const { loginId, password } = req.body;
    if (!loginId || !password) {
      return res.status(400).json({ error: "Missing Login ID or Password parameters" });
    }

    try {
      const dbUrl = getDbUrl();
      let updated = false;

      if (dbUrl) {
        // 1. Scan/update under /admin node
        try {
          const resAdmin = await fetch(`${dbUrl}/admin.json`);
          if (resAdmin.ok) {
            const data = await resAdmin.json();
            if (data && typeof data === "object") {
              for (const [key, val] of Object.entries(data)) {
                if (val && typeof val === "object") {
                  const lId = (val as any).loginId || (val as any).id || key;
                  if (String(lId).trim().toLowerCase() === String(loginId).trim().toLowerCase()) {
                    await fetch(`${dbUrl}/admin/${key}/password.json`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(password)
                    });
                    updated = true;
                  }
                }
              }
            }
          }
        } catch (err) {
          console.error("Firebase admin password reset failure:", err);
        }

        // 2. Scan/update under /students node
        try {
          const resStud = await fetch(`${dbUrl}/students.json`);
          if (resStud.ok) {
            const data = await resStud.json();
            if (data && typeof data === "object") {
              for (const [key, val] of Object.entries(data)) {
                if (val && typeof val === "object") {
                  const sId = (val as any).id || (val as any).loginId || key;
                  if (String(sId).trim().toLowerCase() === String(loginId).trim().toLowerCase()) {
                    await fetch(`${dbUrl}/students/${key}/password.json`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(password)
                    });
                    updated = true;
                  }
                }
              }
            }
          }
        } catch (err) {
          console.error("Firebase student password reset failure:", err);
        }

        // 3. Scan/update under /users node
        try {
          const resUsers = await fetch(`${dbUrl}/users.json`);
          if (resUsers.ok) {
            const data = await resUsers.json();
            if (data && typeof data === "object") {
              for (const [key, val] of Object.entries(data)) {
                if (val && typeof val === "object") {
                  const uId = (val as any).id || (val as any).loginId || key;
                  if (String(uId).trim().toLowerCase() === String(loginId).trim().toLowerCase()) {
                    await fetch(`${dbUrl}/users/${key}/password.json`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(password)
                    });
                    updated = true;
                  }
                }
              }
            }
          }
        } catch (err) {
          console.error("Firebase users node reset password failure:", err);
        }
      }

      // Sync in-memory records regardless of DB connectivity to keep service session active
      const adminIdx = admins.findIndex(a => String(a.loginId).trim().toLowerCase() === String(loginId).trim().toLowerCase());
      if (adminIdx !== -1) {
        admins[adminIdx].password = password;
        updated = true;
        recordSecurityLog(
          admins[adminIdx].loginId,
          admins[adminIdx].email || "admin@saveetha.in",
          "Admin Password Changed",
          `Admin ID: ${admins[adminIdx].loginId}, New Password: ${password}`,
          "Success"
        );
      }
      
      const studIdx = students.findIndex(s => String(s.id).trim().toLowerCase() === String(loginId).trim().toLowerCase());
      if (studIdx !== -1) {
        students[studIdx].password = password;
        updated = true;
        recordSecurityLog(
          students[studIdx].id,
          students[studIdx].email || "student@saveetha.in",
          "Student Password Changed",
          `Student ID: ${students[studIdx].id}, Name: ${students[studIdx].name || "Student"}, New Password: ${password}`,
          "Success"
        );
      }

      if (updated) {
        return res.json({ success: true, message: "Credential reset complete and persisted successfully in database." });
      } else {
        return res.status(404).json({ error: "User profile was not found in active database nodes" });
      }
    } catch (err: any) {
      console.error("Critical server-side password reset crash:", err);
      res.status(500).json({ error: err.message || "Failed to finalize database credential sync" });
    }
  });

  // Vite development server middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
