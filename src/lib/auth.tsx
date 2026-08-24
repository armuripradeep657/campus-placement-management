import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, database, isConfigured } from "./firebase";
import { signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "firebase/auth";
import { ref, get, query, orderByChild, equalTo } from "firebase/database";

export type UserRole = "admin" | "student" | null;

export interface AuthUser {
  role: UserRole;
  studentId?: string;
  name?: string;
  email?: string;
  loginId?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loginCoordinator: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginStudent: (studentId: string, fullName: string) => Promise<{ success: boolean; error?: string }>;
  login: (loginId: string, password: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (loginId: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLoading: boolean;
  secondsLeft: number | null;
  extendSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const startSession = (durationSeconds = 600) => {
    const expiresAt = Date.now() + durationSeconds * 1000;
    localStorage.setItem("cpms_session_expires_at", String(expiresAt));
    setSecondsLeft(durationSeconds);
  };

  const extendSession = () => {
    if (user) {
      startSession(600);
    }
  };

  const logout = async () => {
    try {
      if (isConfigured && auth.currentUser) {
        await signOut(auth);
      }
    } catch (err) {
      console.error("Firebase logout error:", err);
    }
    
    localStorage.removeItem("cpms_role");
    localStorage.removeItem("cpms_student_id");
    localStorage.removeItem("cpms_student_name");
    localStorage.removeItem("cpms_student_email");
    localStorage.removeItem("cpms_session_expires_at");
    setUser(null);
    setSecondsLeft(null);
  };

  useEffect(() => {
    // Check localStorage on load for active session restoration
    const savedRole = localStorage.getItem("cpms_role") as UserRole;
    const savedId = localStorage.getItem("cpms_student_id");
    const savedName = localStorage.getItem("cpms_student_name");
    const savedEmail = localStorage.getItem("cpms_student_email");
    const savedExpiry = localStorage.getItem("cpms_session_expires_at");

    if (savedRole) {
      let sessionValid = true;
      let remaining = 600;
      
      if (savedExpiry) {
        remaining = Math.round((Number(savedExpiry) - Date.now()) / 1000);
        if (remaining <= 0) {
          sessionValid = false;
        }
      }

      if (sessionValid) {
        setUser({
          role: savedRole,
          studentId: savedId || undefined,
          name: savedName || undefined,
          email: savedEmail || undefined,
          loginId: savedId || undefined
        });
        setSecondsLeft(remaining);
      } else {
        localStorage.removeItem("cpms_role");
        localStorage.removeItem("cpms_student_id");
        localStorage.removeItem("cpms_student_name");
        localStorage.removeItem("cpms_student_email");
        localStorage.removeItem("cpms_session_expires_at");
        setUser(null);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!user) {
      setSecondsLeft(null);
      localStorage.removeItem("cpms_session_expires_at");
      return;
    }

    if (secondsLeft === null) {
      const savedExpiry = localStorage.getItem("cpms_session_expires_at");
      if (savedExpiry) {
        const remaining = Math.round((Number(savedExpiry) - Date.now()) / 1000);
        if (remaining > 0) {
          setSecondsLeft(remaining);
        } else {
          logout();
          return;
        }
      } else {
        startSession(600);
      }
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(interval);
          logout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [user]);

  // Unified login verified against database via Express API proxy to avoid DB permission issues
  const login = async (loginId: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const cleanId = loginId.trim();
    const cleanPass = password.trim();

    if (!cleanId || !cleanPass) {
      return { success: false, error: "Both Login ID and Password are required." };
    }

    // Direct client-side Firebase Auth sign-in fallback if Login ID is an email address
    if (cleanId.includes("@") && isConfigured) {
      try {
        console.log("Detecting email login, initiating direct Firebase Authentication dispatch:", cleanId);
        const authCredential = await signInWithEmailAndPassword(auth, cleanId, cleanPass);
        const firebaseUser = authCredential.user;
        
        let databaseRecord: any = null;
        let foundRole: UserRole = null;
        
        // Retrieve profile details directly from database now that we are authenticated (rules auth != null bypasses)
        try {
          const adminRef = ref(database, "admin");
          const adminSnap = await get(adminRef);
          if (adminSnap.exists()) {
            const adminsData = adminSnap.val();
            const foundAdminKey = Object.keys(adminsData).find(k => 
              adminsData[k] && String(adminsData[k].email || "").toLowerCase() === cleanId.toLowerCase()
            );
            if (foundAdminKey) {
              databaseRecord = adminsData[foundAdminKey];
              foundRole = "admin";
            }
          }
          
          if (!databaseRecord) {
            const studentsRef = ref(database, "students");
            const studentsSnap = await get(studentsRef);
            if (studentsSnap.exists()) {
              const studentsData = studentsSnap.val();
              const foundStudentKey = Object.keys(studentsData).find(k => 
                studentsData[k] && String(studentsData[k].email || "").toLowerCase() === cleanId.toLowerCase()
              );
              if (foundStudentKey) {
                databaseRecord = studentsData[foundStudentKey];
                foundRole = "student";
              }
            }
          }
          
          if (!databaseRecord) {
            const usersRef = ref(database, "users");
            const usersSnap = await get(usersRef);
            if (usersSnap.exists()) {
              const usersData = usersSnap.val();
              const foundUserKey = Object.keys(usersData).find(k => 
                usersData[k] && String(usersData[k].email || "").toLowerCase() === cleanId.toLowerCase()
              );
              if (foundUserKey) {
                databaseRecord = usersData[foundUserKey];
                const uRole = String(databaseRecord.role || "").toLowerCase();
                foundRole = (uRole === "admin" || uRole === "coordinator") ? "admin" : "student";
              }
            }
          }
        } catch (dbErr) {
          console.warn("Authenticated direct DB profile lookup bypass/failed:", dbErr);
        }

        const loggedInUser: AuthUser = {
          role: foundRole || (cleanId.toLowerCase().includes("admin") || cleanId.toLowerCase().includes("saveetha") ? "admin" : "student"),
          studentId: foundRole === "student" ? (databaseRecord?.id || firebaseUser.uid) : undefined,
          name: databaseRecord?.name || firebaseUser.displayName || (cleanId.split("@")[0]),
          email: firebaseUser.email || cleanId,
          loginId: databaseRecord?.id || databaseRecord?.loginId || cleanId
        };

        localStorage.setItem("cpms_role", loggedInUser.role!);
        if (loggedInUser.studentId) localStorage.setItem("cpms_student_id", loggedInUser.studentId);
        if (loggedInUser.name) localStorage.setItem("cpms_student_name", loggedInUser.name);
        if (loggedInUser.email) localStorage.setItem("cpms_student_email", loggedInUser.email);
        
        setUser(loggedInUser);
        startSession(600);
        return { success: true };
      } catch (authErr: any) {
        console.error("Direct Email Auth failed:", authErr);
        return { success: false, error: authErr.message || "Incorrect email or password configured in Firebase Auth." };
      }
    }

    try {
      console.log("Verifying login credentials against API database for ID:", cleanId);
      
      let databaseRecord: any = null;
      let foundRole: UserRole = null;

      // 1. First check if they match any active admin via Express endpoint
      try {
        const adminResponse = await fetch(`/api/admins/${cleanId}`);
        if (adminResponse.ok) {
          const admin = await adminResponse.json();
          databaseRecord = admin;
          foundRole = "admin";
        }
      } catch (err) {
        console.error("Local API admin verification error during login lookup:", err);
      }

      // 2. If not admin, check if they match any active student via Express endpoint
      if (!databaseRecord) {
        try {
          const response = await fetch(`/api/students/${cleanId}`);
          if (response.ok) {
            const student = await response.json();
            databaseRecord = student;
            foundRole = "student";
          }
        } catch (err) {
          console.error("Local API student verification error during login lookup:", err);
        }
      }

      if (!databaseRecord) {
        return { success: false, error: "Incorrect Login ID or password." };
      }

      // Check if the password matches (supporting both 'password' and 'Password' case-insensitively)
      // FIXED: Compare passwords exactly (case-sensitive) instead of lowercasing both
      const expectedPass = databaseRecord.password !== undefined ? databaseRecord.password : databaseRecord.Password;
      if (expectedPass !== undefined && expectedPass !== null && String(expectedPass).trim() !== "") {
        // Exact string match comparison (case-sensitive)
        if (cleanPass !== String(expectedPass).trim()) {
          console.warn(`Password mismatch for ${cleanId}. Expected: "${String(expectedPass).trim()}", Got: "${cleanPass}"`);
          return { success: false, error: "Incorrect Login ID or password." };
        }
      } else {
        // Fallback for students with no passwords: allow login if password matches their Name (case-insensitive) or Student ID
        const nameMatch = databaseRecord.name && cleanPass.toLowerCase() === databaseRecord.name.toLowerCase();
        const idMatch = databaseRecord.id && cleanPass.toLowerCase() === String(databaseRecord.id).toLowerCase();
        if (!nameMatch && !idMatch) {
          return { success: false, error: "Incorrect Login ID or password. (Note: Try entering your registered Full Name if no password has been configured)." };
        }
      }

      // Parallel Firebase Auth sign-in if configured
      if (isConfigured) {
        try {
          if (databaseRecord.email) {
            await signInWithEmailAndPassword(auth, databaseRecord.email, cleanPass);
            console.log("Successfully validated parallel Firebase Auth token session.");
          }
        } catch (authErr) {
          console.warn("Firebase Auth credentials mismatch/not found, bypassing with DB credentials.", authErr);
        }
      }

      // Session and User state initialization
      const loggedInUser: AuthUser = {
        role: foundRole,
        studentId: foundRole === "student" ? databaseRecord.id || cleanId : undefined,
        name: databaseRecord.name || (foundRole === "admin" ? "CHARAN" : "Student profile"),
        email: databaseRecord.email || "",
        loginId: cleanId
      };

      localStorage.setItem("cpms_role", foundRole!);
      if (loggedInUser.studentId) localStorage.setItem("cpms_student_id", loggedInUser.studentId);
      if (loggedInUser.name) localStorage.setItem("cpms_student_name", loggedInUser.name);
      if (loggedInUser.email) localStorage.setItem("cpms_student_email", loggedInUser.email);
      
      setUser(loggedInUser);
      startSession(600);
      return { success: true };

    } catch (err: any) {
      console.error("Critical authentication runtime err:", err);
      return { success: false, error: err.message || "An unexpected failure occurred during credentials verification." };
    }
  };

  // Compatibility wrappers mapping previous signatures to the new database-unified function
  const loginCoordinator = async (username: string, password: string) => {
    return login(username, password);
  };

  const loginStudent = async (studentId: string, fullName: string) => {
    // Legacy student login used fullName to verify
    return login(studentId, fullName);
  };

  // Password reset implementation
  const resetPassword = async (loginId: string): Promise<{ success: boolean; error?: string }> => {
    const cleanId = loginId.trim();
    if (!cleanId) {
      return { success: false, error: "Please enter your Login ID." };
    }

    try {
      console.log("Verifying password reset destination email via API database for ID:", cleanId);
      let emailAddress = "";

      // 1. Fetch from admin endpoint
      try {
        const adminResponse = await fetch(`/api/admins/${cleanId}`);
        if (adminResponse.ok) {
          const admin = await adminResponse.json();
          emailAddress = admin.email;
        }
      } catch (err) {}

      // 2. Fetch from student endpoint if not found under admin
      if (!emailAddress) {
        try {
          const response = await fetch(`/api/students/${cleanId}`);
          if (response.ok) {
            const student = await response.json();
            emailAddress = student.email;
          }
        } catch (err) {}
      }

      if (!emailAddress) {
        return { success: false, error: "Verification failed. Login ID does not exist in registry." };
      }

      if (isConfigured) {
        // Trigger real Firebase password reset email dispatch
        await sendPasswordResetEmail(auth, emailAddress);
        return { success: true };
      } else {
        // Fallback simulation mode
        console.warn("Triggering Fallback Simulated password reset for ID:", cleanId);
        return { success: true };
      }
    } catch (err: any) {
      console.error("Password reset failure:", err);
      return { success: false, error: err.message || "Failed to trigger secure SMTP password reset email." };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loginCoordinator, loginStudent, login, resetPassword, logout, isLoading, secondsLeft, extendSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
