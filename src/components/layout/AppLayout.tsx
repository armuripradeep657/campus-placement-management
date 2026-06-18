import React, { useState } from "react";
import { useAuth } from "../../lib/auth";
import { 
  GraduationCap, 
  Building2, 
  FileCheck2, 
  Settings, 
  BarChart3, 
  UserCircle, 
  LogOut, 
  LayoutDashboard,
  CheckSquare,
  Menu,
  X,
  ShieldCheck
} from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Nav Config for the admin items plus Security Logs
  const menuItems = [
    { id: "dashboard", name: "Dashboard", icon: LayoutDashboard },
    { id: "students", name: "Student Management", icon: GraduationCap },
    { id: "companies", name: "Company Management", icon: Building2 },
    { id: "matching", name: "Resume Matching", icon: FileCheck2 },
    { id: "allocation", name: "Placement Allocation", icon: CheckSquare },
    { id: "analytics", name: "Analytics & Reports", icon: BarChart3 },
    { id: "security-logs", name: "Security Logs", icon: ShieldCheck }
  ];

  return (
    <div id="cpms_root_layout" className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col md:flex-row">
      
      {/* Mobile Header Banner */}
      <div id="mobile_header" className="md:hidden flex items-center justify-between px-4 py-3 bg-indigo-900 text-white shadow-md z-20">
        <div className="flex items-center space-x-2">
          <GraduationCap className="h-6 w-6 text-yellow-400" />
          <span className="font-bold tracking-tight text-sm">SIMATS CPMS</span>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            id="toggle_mobile_btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1 rounded-md text-white hover:bg-indigo-800 focus:outline-none"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside 
        id="sidebar_nav" 
        className={`fixed md:sticky top-0 left-0 bottom-0 w-64 bg-indigo-950 text-slate-100 flex flex-col z-30 transition-transform duration-300 transform md:transform-none shadow-xl border-r border-indigo-900 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Branding Area */}
        <div id="sidebar_branding" className="p-6 border-b border-indigo-900 bg-indigo-950/50 flex flex-col items-center text-center">
          <div className="bg-yellow-400 p-2.5 rounded-2xl text-indigo-950 shadow-inner mb-3">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h2 className="text-md font-extrabold tracking-wider text-yellow-400">SEC CAMPUS</h2>
          <p className="text-[10px] uppercase font-bold text-slate-300 tracking-widest mt-0.5">Placement Center</p>
        </div>

        {/* Menu Items */}
        <nav id="sidebar_menu" className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                id={`nav_btn_${item.id}`}
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium ${
                  isActive 
                    ? "bg-yellow-400 text-indigo-950 shadow-lg font-semibold" 
                    : "text-slate-300 hover:bg-indigo-900/50 hover:text-white"
                }`}
              >
                <Icon className={`h-5 w-5 mr-3 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? "text-indigo-950" : "text-indigo-400 group-hover:text-yellow-400"
                }`} />
                {item.name}
              </button>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div id="sidebar_footer" className="p-4 border-t border-indigo-900/60 bg-indigo-950/70">
          <div className="flex items-center space-x-3 p-2 rounded-xl bg-indigo-900/30 mb-3">
            <div className="bg-yellow-400/20 p-2 rounded-full">
              <UserCircle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">{user?.name || "CHARAN"}</p>
              <p className="text-[10px] text-slate-400 truncate">Admin Profile</p>
            </div>
          </div>
          <button
            id="logout_btn"
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider border border-rose-500/30 text-rose-300 hover:bg-rose-500 hover:text-white transition-all duration-200 bg-rose-500/10"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main id="main_content_pane" className="flex-1 flex flex-col min-w-0">
        
        {/* Top Desktop Navigation Utilities */}
        <header id="desktop_header" className="hidden md:flex items-center justify-between px-8 py-4 bg-white border-b border-slate-200/80 shadow-sm transition-colors duration-300">
          <div className="flex flex-col">
            <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400">Saveetha Engineering College</span>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">SIMATS Campus Placement Portal (CPMS)</h1>
          </div>
          <div className="flex items-center space-x-5">
            <div className="text-right">
              <p className="text-xs font-medium text-slate-500">Welcome Coordinator,</p>
              <p className="text-sm font-bold text-slate-900">Dr. Pradeep Kumar</p>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center font-bold text-sm shadow-md">
              PK
            </div>
          </div>
        </header>

        {/* Scrollable View Area */}
        <div id="scrollable_content_panel" className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        <footer id="app_footer" className="py-4 text-center text-xs text-slate-400 border-t border-slate-200 bg-white">
          <p>© 2026 Saveetha Engineering College (SIMATS). All rights reserved.</p>
        </footer>
      </main>

      {/* Backdrop for mobile navigation menu */}
      {mobileMenuOpen && (
        <div 
          id="mobile_backdrop"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-950/40 z-20 md:hidden animate-fade-in"
        />
      )}
    </div>
  );
};
export default AppLayout;

