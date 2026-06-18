import React, { useState } from "react";
import { AuthProvider, useAuth } from "./lib/auth";
import Login from "./pages/Login";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import StudentManagement from "./pages/StudentManagement";
import CompanyManagement from "./pages/CompanyManagement";
import ResumeMatching from "./pages/ResumeMatching";
import PlacementAllocation from "./pages/PlacementAllocation";
import Analytics from "./pages/Analytics";
import StudentPortal from "./pages/StudentPortal";
import SecurityLogs from "./pages/SecurityLogs";
import { ThemeProvider } from "./lib/theme";
import { motion, AnimatePresence } from "motion/react";
import { Clock, AlertTriangle } from "lucide-react";

export function CPMSAppRouter() {
  const { user, isLoading, secondsLeft, extendSession, logout } = useAuth();
  
  // Admin module selected tab identifier
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  if (isLoading) {
    return (
      <div id="cpms_loading_mask" className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-2 animate-pulse">
          <div className="mx-auto h-8 w-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">SIMATS Placements Online...</p>
        </div>
      </div>
    );
  }

  // Not authenticated? Show the glassmorphic login card covering simats-bg
  if (!user) {
    return <Login />;
  }

  // Decide user module view
  let mainContent;
  if (user.role === "student") {
    mainContent = <StudentPortal />;
  } else {
    mainContent = (
      <AppLayout activeTab={activeTab} setActiveTab={setActiveTab}>
        {activeTab === "dashboard" && <Dashboard setActiveTab={setActiveTab} />}
        {activeTab === "students" && <StudentManagement />}
        {activeTab === "companies" && <CompanyManagement />}
        {activeTab === "matching" && <ResumeMatching />}
        {activeTab === "allocation" && <PlacementAllocation />}
        {activeTab === "analytics" && <Analytics />}
        {activeTab === "security-logs" && <SecurityLogs />}
      </AppLayout>
    );
  }

  const showWarning = secondsLeft !== null && secondsLeft <= 60 && secondsLeft > 0;

  return (
    <>
      {mainContent}

      {/* Dynamic Session Expiry Warning Toast Overlay */}
      <AnimatePresence>
        {showWarning && secondsLeft !== null && (
          <motion.div
            id="session_warning_toast"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed bottom-6 right-6 z-[9999] w-96 bg-white border border-rose-100 hover:border-amber-300 shadow-2xl rounded-3xl p-5 transition-colors duration-300"
          >
            <div className="flex items-start gap-3.5">
              <div className="bg-amber-100 text-amber-700 p-2.5 rounded-2xl animate-bounce shrink-0 mt-0.5">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-grow space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600 font-mono">
                    Session Timeout
                  </span>
                  <span className="font-mono text-xs font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 border border-amber-200/60 rounded-lg">
                    {secondsLeft}s left
                  </span>
                </div>
                <h3 className="text-xs font-black text-slate-800 tracking-tight leading-normal uppercase">
                  Portal Session Expiring
                </h3>
                <p className="text-[11px] text-slate-450 leading-relaxed font-semibold">
                  Due to system inactivity requirements, your secure SIMATS session will expire in 1 minute.
                </p>
              </div>
            </div>

            {/* Linear Progress Countdown bar */}
            <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-500 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${(secondsLeft / 60) * 100}%` }}
              />
            </div>

            {/* Quick Extension Buttons */}
            <div className="mt-4 flex gap-2 w-full select-none">
              <button
                id="extend_session_btn"
                onClick={extendSession}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 hover:shadow text-white font-extrabold rounded-xl text-[10px] uppercase tracking-wider transition cursor-pointer"
              >
                Keep Me Signed In
              </button>
              <button
                id="logout_session_now_btn"
                onClick={logout}
                className="px-4.5 py-2 border border-slate-200 hover:bg-slate-55 text-slate-500 hover:text-slate-700 font-bold rounded-xl text-[10px] uppercase tracking-wider transition cursor-pointer"
              >
                Log Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <CPMSAppRouter />
      </ThemeProvider>
    </AuthProvider>
  );
}
