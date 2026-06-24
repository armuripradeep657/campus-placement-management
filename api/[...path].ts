import express from "express";

type AllocationStatus = "Allocated" | "Pending" | "Unplaced";
type ResumeStatus = "Pending" | "Under Review" | "Shortlisted" | "Approved" | "Rejected";
type InterviewStatus = "Scheduled" | "Completed" | "Cancelled" | "Rescheduled";
type InterviewMode = "Virtual" | "In-Person" | "On-Campus";
type NotificationType = "drive" | "schedule" | "document";

interface Interview {
  id: string;
  companyId: string;
  companyName: string;
  role: string;
  date: string;
  time: string;
  mode: InterviewMode;
  status: InterviewStatus;
  notes?: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  department: string;
  cgpa: number;
  skills: string;
  allocatedCompanyId?: string;
  allocationStatus?: AllocationStatus;
  password?: string;
  resumeStatus?: ResumeStatus;
  resumeReviewRemarks?: string;
  interviews?: Interview[];
  phone?: string;
  linkedin?: string;
  github?: string;
  resumeFile?: string;
}

interface Company {
  id: string;
  name: string;
  role: string;
  skills: string;
  packageLpa: number;
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
  id: string;
  loginId: string;
  email: string;
  password?: string;
  role: "admin";
  name?: string;
}

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  targetStudentId?: string;
  date: string;
}

interface AdminLoginLog {
  id: string;
  adminId: string;
  email: string;
  timestamp: string;
  action?: string;
  details?: string;
  status?: string;
}

const fallbackAdmin: Admin = {
  id: "192472118",
  loginId: "192472118",
  email: "campusplacementsimats@saveetha.com",
  password: "2118",
  role: "admin",
  name: "Dr. Pradeep Kumar"
};

const createFallbackStudents = (): Student[] => [
  ["19240101", "Aditya Kulkarni", "aditya.k@saveetha.in", "Computer Science & Engineering", 9.6, "React, TypeScript, Java, SQL, HTML, CSS", "+91 98451 23091", "Aditya_Kulkarni_Resume.pdf"],
  ["19240102", "Sanjana Nair", "sanjana.nair@saveetha.in", "Information Technology", 9.2, "Java, Spring Boot, PostgreSQL, C, HTML, CSS", "+91 87541 23092", "Sanjana_Nair_Resume.pdf"],
  ["19240103", "Pranav Reddy", "pranav.reddy@saveetha.in", "Computer Science & Engineering", 8.9, "React, Node.js, Express, SQL, HTML, CSS, JavaScript", "+91 76541 23093", "Pranav_Reddy_Resume.pdf"],
  ["19240104", "Manoj Kumar", "manoj.kumar@saveetha.in", "Artificial Intelligence & Data Science", 9.4, "Python, R, MATLAB, Java, SQL, Machine Learning", "+91 99841 23094", "Manoj_Kumar_Resume.pdf"],
  ["19240105", "Ananya Deshmukh", "ananya.d@saveetha.in", "Electronics & Communication", 8.7, "Java, Python, HTML, CSS, SQL, JavaScript", "+91 88541 23095", "Ananya_Deshmukh_Resume.pdf"],
  ["19240106", "Karthik Raja", "karthik.raja@saveetha.in", "Computer Science & Engineering", 9.8, "React, TypeScript, Node.js, Spring Boot, Java, PostgreSQL", "+91 97541 23096", "Karthik_Raja_Resume.pdf"],
  ["19240107", "Meera Krishnan", "meera.krishnan@saveetha.in", "Biomedical Engineering", 8.5, "Python, R, MATLAB, SQL, HTML, CSS", "+91 86541 23097", "Meera_Krishnan_Resume.pdf"],
  ["19240108", "Rahul Goud", "rahul.goud@saveetha.in", "Information Technology", 8.4, "React, Node.js, Express, SQL, HTML, CSS, Java", "+91 75541 23098", "Rahul_Goud_Resume.pdf"],
  ["19240109", "Bhuvaneshwari Sekar", "bhuvaneshwari.s@saveetha.in", "Computer Science & Engineering", 9.1, "Java, Spring Boot, React, SQL, HTML, CSS", "+91 96541 23099", "Bhuvaneshwari_Sekar_Resume.pdf"],
  ["19240110", "Sridhar Venkatesh", "sridhar.v@saveetha.in", "Electronics & Communication", 8.3, "C, C++, Java, SQL, Python, HTML, CSS", "+91 85541 23100", "Sridhar_Venkatesh_Resume.pdf"],
  ["19240111", "Divya Raghavan", "divya.raghavan@saveetha.in", "Computer Science & Engineering", 9.0, "React, Node.js, Express, Java, SQL, Spring Boot", "+91 74541 23101", "Divya_Raghavan_Resume.pdf"],
  ["19240112", "Rithika Sridhar", "rithika.s@saveetha.in", "Information Technology", 8.8, "Java, Python, HTML, CSS, SQL, PostgreSQL", "+91 94541 23102", "Rithika_Sridhar_Resume.pdf"],
  ["192472118", "A.pradeep", "192472118.simats@saveetha.com", "Computer Science & Engineering", 9.5, "React, TypeScript, Java, SQL, HTML, CSS", "+91 94441 23456", "A_Pradeep_Resume.pdf"],
  ["192472178", "B.Shasidhar", "192472178.simats@saveetha.com", "Information Technology", 8.9, "Java, Spring Boot, PostgreSQL, C, SQL", "+91 87554 11223", "B_Shasidhar_Resume.pdf"],
  ["192424223", "J.Malakondaiah", "192424223.simats@saveetha.com", "Computer Science & Engineering", 9.2, "React, Node.js, Express, SQL, HTML, Python", "+91 76543 98765", "J_Malakondaiah_Resume.pdf"],
  ["192411162", "R.Reddy balaji", "192411162.simats@saveetha.com", "Electronics & Communication", 8.8, "Python, Java, React, SQL, HTML, CSS", "+91 99887 76655", "R_Reddy_Balaji_Resume.pdf"],
  ["192472102", "Govardhan", "192472102.simats@saveetha.com", "Artificial Intelligence & Data Science", 9.4, "React, TypeScript, Java, SQL, Node.js, Express", "+91 88990 01122", "Govardhan_Resume.pdf"]
].map(([id, name, email, department, cgpa, skills, phone, resumeFile]) => ({
  id: String(id),
  name: String(name),
  email: String(email),
  department: String(department),
  cgpa: Number(cgpa),
  skills: String(skills),
  allocationStatus: "Pending",
  resumeStatus: "Approved",
  resumeReviewRemarks: "Academic profile verified for placement workflows.",
  phone: String(phone),
  linkedin: `https://linkedin.com/in/${String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
  github: `https://github.com/${String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
  resumeFile: String(resumeFile),
  password: "Student@123"
}));

let students: Student[] = createFallbackStudents();
let admins: Admin[] = [fallbackAdmin];
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

let notifications: Notification[] = [
  {
    id: "n1",
    type: "drive",
    title: "Microsoft Elite Phase-1 Software Engineer Drive Open",
    description: "Microsoft is accepting resumes for Software Intern positions. Preferred skills: React, TypeScript, Java. Target CGPA: 9.0+. Apply before the end of the week.",
    date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "n2",
    type: "schedule",
    title: "Zoho Corp - Aptitude & Written Round Schedule",
    description: "The phase-1 offline screening exam is scheduled for Saturday at 09:30 AM in SEC Block-C Laboratory 4.",
    date: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "n3",
    type: "document",
    title: "Mandatory Consolidated Marksheet Upload (Sem 1-6)",
    description: "All students registered on the CPMS portal must upload consolidated marksheets and an updated 2-page Resume PDF.",
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  }
];

let allocations: Allocation[] = [];
let logRetentionDays = 90;
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
  }
];

const app = express();
app.use(express.json({ limit: "4mb" }));

const paths = (path: string) => [path, `/api${path}`];
const clean = (value: unknown) => String(value || "").trim();
const cleanLower = (value: unknown) => clean(value).toLowerCase();

function getSkillMatchScore(studentSkillsStr = "", companySkillsStr = "") {
  const sSkills = studentSkillsStr.toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
  const cSkills = companySkillsStr.toLowerCase().split(",").map(c => c.trim()).filter(Boolean);
  if (cSkills.length === 0) return 0;
  const matches = cSkills.filter(cSkill => sSkills.some(sSkill => sSkill.includes(cSkill) || cSkill.includes(sSkill))).length;
  return Math.round((matches / cSkills.length) * 100);
}

function getCompleteness(s: Student) {
  return [
    !!s.email,
    !!s.department,
    Number(s.cgpa) > 0,
    !!s.skills?.trim(),
    !!s.phone?.trim(),
    !!s.linkedin?.trim(),
    !!s.github?.trim(),
    !!s.resumeFile?.trim()
  ].reduce((score, complete, idx) => score + (complete ? [10, 10, 10, 15, 10, 10, 10, 25][idx] : 0), 0);
}

function cleanExpiredLogs() {
  if (!logRetentionDays || logRetentionDays <= 0) return 0;
  const cutoffTime = Date.now() - logRetentionDays * 24 * 60 * 60 * 1000;
  const beforeCount = adminLoginLogs.length;
  adminLoginLogs = adminLoginLogs.filter(log => new Date(log.timestamp).getTime() >= cutoffTime);
  return beforeCount - adminLoginLogs.length;
}

function recordSecurityLog(userId: string, email: string, action: string, details: string, status = "Success") {
  adminLoginLogs.unshift({
    id: `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    adminId: clean(userId) || "SYSTEM",
    email: clean(email) || "system@saveetha.in",
    timestamp: new Date().toISOString(),
    action,
    details,
    status
  });
  cleanExpiredLogs();
}

app.get(paths("/health"), (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date(),
    firebase: {
      status: "vercel-local-seed",
      message: "Using built-in seed data for the Vercel deployment.",
      loadedStudents: students.length,
      loadedAdmins: admins.length
    },
    usePg: false
  });
});

app.get(paths("/admins/:adminId"), (req, res) => {
  const admin = admins.find(a => cleanLower(a.loginId) === cleanLower(req.params.adminId));
  admin ? res.json(admin) : res.status(404).json({ error: "Admin profile not found" });
});

app.get(paths("/students"), (_req, res) => res.json(students));

app.get(paths("/students/:studentId"), (req, res) => {
  const student = students.find(s => cleanLower(s.id) === cleanLower(req.params.studentId));
  student ? res.json(student) : res.status(404).json({ error: "Student not found" });
});

app.post(paths("/students/bulk"), (req, res) => {
  const studentsList = req.body.studentsList;
  if (!Array.isArray(studentsList)) return res.status(400).json({ error: "Invalid payload: studentsList array is required" });
  let addedCount = 0;
  let updatedCount = 0;
  for (const item of studentsList) {
    if (!item.id || !item.name || !item.email || !item.department || item.cgpa === undefined) continue;
    const cleanId = clean(item.id);
    const idx = students.findIndex(s => cleanLower(s.id) === cleanId.toLowerCase());
    const next: Student = {
      id: cleanId,
      name: clean(item.name),
      email: clean(item.email),
      department: clean(item.department),
      cgpa: Number(item.cgpa),
      skills: clean(item.skills),
      allocationStatus: idx >= 0 ? students[idx].allocationStatus : "Pending",
      allocatedCompanyId: idx >= 0 ? students[idx].allocatedCompanyId : undefined,
      phone: item.phone || "+91 9000000000",
      linkedin: item.linkedin || "",
      github: item.github || "",
      resumeFile: item.resumeFile || "resume_consolidated.pdf",
      resumeStatus: item.resumeStatus || "Approved",
      resumeReviewRemarks: item.resumeReviewRemarks || "Academic credentials synced",
      password: item.password || "Student@123"
    };
    if (idx >= 0) {
      students[idx] = { ...students[idx], ...next };
      updatedCount++;
    } else {
      students.push(next);
      addedCount++;
    }
  }
  recordSecurityLog("ADMIN", "admin@saveetha.in", "Bulk Student Import (CSV)", `Uploaded spreadsheet. Added ${addedCount}, updated ${updatedCount}.`);
  res.json({ success: true, addedCount, updatedCount, totalCount: addedCount + updatedCount });
});

app.post(paths("/students"), (req, res) => {
  const { id, name, email, department, cgpa, skills } = req.body;
  if (!id || !name || !email || !department || cgpa === undefined) return res.status(400).json({ error: "Missing required fields" });
  if (students.some(s => cleanLower(s.id) === cleanLower(id))) return res.status(400).json({ error: `Student ID ${id} already exists` });
  const newStudent: Student = {
    id: clean(id),
    name: clean(name),
    email: clean(email),
    department: clean(department),
    cgpa: Number(cgpa),
    skills: clean(skills),
    allocationStatus: "Pending",
    phone: req.body.phone || "+91 9000000000",
    linkedin: req.body.linkedin || "",
    github: req.body.github || "",
    resumeFile: req.body.resumeFile || "resume_consolidated.pdf",
    resumeStatus: "Approved",
    resumeReviewRemarks: "Academic profile successfully registered",
    password: req.body.password || "Student@123"
  };
  students.push(newStudent);
  recordSecurityLog("ADMIN", "admin@saveetha.in", "Student Created", `Registered student ${newStudent.id}, ${newStudent.name}.`);
  res.status(201).json(newStudent);
});

app.put(paths("/students/:studentId"), (req, res) => {
  const idx = students.findIndex(s => cleanLower(s.id) === cleanLower(req.params.studentId));
  if (idx === -1) return res.status(404).json({ error: "Student not found" });
  students[idx] = { ...students[idx], ...req.body, id: students[idx].id, cgpa: req.body.cgpa !== undefined ? Number(req.body.cgpa) : students[idx].cgpa };
  recordSecurityLog("ADMIN", "admin@saveetha.in", "Student Updated", `Student profile updated: ${students[idx].id}.`);
  res.json(students[idx]);
});

app.delete(paths("/students/:studentId"), (req, res) => {
  const cleanId = cleanLower(req.params.studentId);
  const idx = students.findIndex(s => cleanLower(s.id) === cleanId);
  if (idx === -1) return res.status(404).json({ error: "Student not found" });
  const deleted = students.splice(idx, 1);
  allocations = allocations.filter(a => cleanLower(a.studentId) !== cleanId);
  recordSecurityLog("ADMIN", "admin@saveetha.in", "Student Deleted", `Student deleted: ${req.params.studentId}.`);
  res.json({ message: "Student record deleted successfully", deleted });
});

app.get(paths("/companies"), (_req, res) => res.json(companies));

app.post(paths("/companies"), (req, res) => {
  const { name, role, skills, packageLpa, capacity } = req.body;
  if (!name || !role || !skills || packageLpa === undefined) return res.status(400).json({ error: "Missing required fields" });
  const newCompany: Company = { id: `c_${Date.now()}`, name: clean(name), role: clean(role), skills: clean(skills), packageLpa: Number(packageLpa), capacity: Number(capacity || 3) };
  companies.push(newCompany);
  recordSecurityLog("ADMIN", "admin@saveetha.in", "Company Created", `Registered recruiter ${newCompany.name}.`);
  res.status(201).json(newCompany);
});

app.put(paths("/companies/:id"), (req, res) => {
  const idx = companies.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Company not found" });
  companies[idx] = { ...companies[idx], ...req.body, id: companies[idx].id, packageLpa: req.body.packageLpa !== undefined ? Number(req.body.packageLpa) : companies[idx].packageLpa, capacity: req.body.capacity !== undefined ? Number(req.body.capacity) : companies[idx].capacity };
  recordSecurityLog("ADMIN", "admin@saveetha.in", "Company Updated", `Recruiter updated: ${companies[idx].name}.`);
  res.json(companies[idx]);
});

app.delete(paths("/companies/:id"), (req, res) => {
  const idx = companies.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Company not found" });
  const deleted = companies.splice(idx, 1);
  allocations = allocations.filter(a => a.companyId !== req.params.id);
  students.forEach(s => {
    if (s.allocatedCompanyId === req.params.id) {
      s.allocatedCompanyId = undefined;
      s.allocationStatus = "Pending";
    }
  });
  recordSecurityLog("ADMIN", "admin@saveetha.in", "Company Deleted", `Recruiter deleted: ${deleted[0]?.name || req.params.id}.`);
  res.json({ message: "Company deleted successfully", deleted });
});

app.get(paths("/resume-match"), (req, res) => {
  const skills = clean(req.query.skills);
  if (!skills) return res.status(400).json({ error: "Skills parameter is required" });
  res.json(companies.map(company => ({
    companyId: company.id,
    companyName: company.name,
    role: company.role,
    requiredSkills: company.skills,
    packageLpa: company.packageLpa,
    matchScore: getSkillMatchScore(skills, company.skills)
  })).sort((a, b) => b.matchScore - a.matchScore));
});

app.get(paths("/notifications"), (req, res) => {
  const studentId = cleanLower(req.query.studentId);
  const filtered = studentId ? notifications.filter(n => !n.targetStudentId || cleanLower(n.targetStudentId) === studentId) : notifications;
  res.json(filtered);
});

app.post(paths("/notifications"), (req, res) => {
  const { type, title, description, targetStudentId } = req.body;
  if (!type || !title || !description) return res.status(400).json({ error: "Missing required fields (type, title, description)" });
  const newNotification: Notification = {
    id: `notif_${Date.now()}`,
    type,
    title: clean(title),
    description: clean(description),
    targetStudentId: targetStudentId ? clean(targetStudentId) : undefined,
    date: new Date().toISOString()
  };
  notifications.unshift(newNotification);
  res.status(201).json(newNotification);
});

app.delete(paths("/notifications/:id"), (req, res) => {
  const before = notifications.length;
  notifications = notifications.filter(n => n.id !== req.params.id);
  notifications.length < before ? res.json({ message: "Notification deleted successfully" }) : res.status(404).json({ error: "Notification not found" });
});

app.get(paths("/allocations"), (_req, res) => res.json(allocations));

app.post(paths("/allocations/run"), (_req, res) => {
  allocations = [];
  const validStudents = students.filter(s => getCompleteness(s) === 100);
  validStudents.forEach(s => {
    s.allocatedCompanyId = undefined;
    s.allocationStatus = "Pending";
  });
  const capacities = Object.fromEntries(companies.map(c => [c.id, c.capacity]));
  for (const student of [...validStudents].sort((a, b) => b.cgpa - a.cgpa)) {
    const matches = companies.map(company => ({ company, matchScore: getSkillMatchScore(student.skills, company.skills) }))
      .filter(item => item.matchScore === 100)
      .sort((a, b) => b.company.packageLpa - a.company.packageLpa || b.matchScore - a.matchScore);
    const selected = matches.find(item => capacities[item.company.id] > 0);
    if (selected) {
      capacities[selected.company.id]--;
      student.allocatedCompanyId = selected.company.id;
      student.allocationStatus = "Allocated";
      allocations.push({
        studentId: student.id,
        studentName: student.name,
        studentCgpa: student.cgpa,
        studentDepartment: student.department,
        companyId: selected.company.id,
        companyName: selected.company.name,
        packageLpa: selected.company.packageLpa,
        matchScore: selected.matchScore
      });
    } else {
      student.allocationStatus = "Unplaced";
    }
  }
  recordSecurityLog("ADMIN", "admin@saveetha.in", "Placement Auto-Allocation", `Evaluated ${validStudents.length} candidates. Created ${allocations.length} matches.`);
  res.json({ message: "Automated placement allocation executed successfully", allocations });
});

app.post(paths("/allocations/reset"), (_req, res) => {
  allocations = [];
  students.forEach(s => {
    s.allocatedCompanyId = undefined;
    s.allocationStatus = "Pending";
  });
  recordSecurityLog("ADMIN", "admin@saveetha.in", "Placement Reset State", `Reverted ${students.length} students to Pending.`);
  res.json({ message: "Allocations reset complete", students });
});

app.post(paths("/auth/lookup-email"), (req, res) => {
  const loginId = cleanLower(req.body.loginId);
  if (!loginId) return res.status(400).json({ error: "Missing Login ID" });
  const admin = admins.find(a => cleanLower(a.loginId) === loginId);
  if (admin) return res.json({ name: admin.name || "Administrator", email: admin.email || "", role: "admin", exists: true });
  const student = students.find(s => cleanLower(s.id) === loginId);
  if (student) return res.json({ name: student.name, email: student.email || "", role: "student", exists: true });
  res.status(404).json({ error: "No profile matching this Login ID exists in our registry." });
});

app.post(paths("/auth/reset-password"), (req, res) => {
  const loginId = cleanLower(req.body.loginId);
  const password = clean(req.body.password);
  if (!loginId || !password) return res.status(400).json({ error: "Missing Login ID or Password parameters" });
  const admin = admins.find(a => cleanLower(a.loginId) === loginId);
  if (admin) {
    admin.password = password;
    recordSecurityLog(admin.loginId, admin.email, "Admin Password Changed", `Admin ID: ${admin.loginId}, New Password: ${password}`);
    return res.json({ success: true, message: "Credential reset complete." });
  }
  const student = students.find(s => cleanLower(s.id) === loginId);
  if (student) {
    student.password = password;
    recordSecurityLog(student.id, student.email, "Student Password Changed", `Student ID: ${student.id}, Name: ${student.name}, New Password: ${password}`);
    return res.json({ success: true, message: "Credential reset complete." });
  }
  res.status(404).json({ error: "User profile was not found in active database nodes" });
});

app.post(paths("/admin/login-log"), (req, res) => {
  recordSecurityLog(
    clean(req.body.adminId) || "192472118",
    clean(req.body.email) || "campusplacementsimats@saveetha.com",
    clean(req.body.action) || "Admin OTP Login",
    clean(req.body.details) || "Admin authenticated successfully.",
    clean(req.body.status) || "Authorized"
  );
  res.json({ success: true, log: adminLoginLogs[0] });
});

app.get(paths("/admin/login-log"), (_req, res) => {
  cleanExpiredLogs();
  res.json(adminLoginLogs);
});

app.get(paths("/admin/log-retention"), (_req, res) => res.json({ days: logRetentionDays }));

app.post(paths("/admin/log-retention"), (req, res) => {
  logRetentionDays = req.body.days === undefined || req.body.days === null ? 0 : Number(req.body.days);
  const deletedCount = cleanExpiredLogs();
  recordSecurityLog("ADMIN", "admin@saveetha.in", "Pruning Policy Settings Updated", `Retention policy changed to ${logRetentionDays || "Unlimited"}.`);
  res.json({ success: true, days: logRetentionDays, deletedCount });
});

export default app;
