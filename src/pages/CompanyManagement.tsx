import React, { useState, useEffect } from "react";
import { 
  Building2, 
  Plus, 
  Trash2, 
  Edit, 
  Briefcase, 
  Lasso, 
  Search,
  CheckCircle,
  X,
  CreditCard,
  Users
} from "lucide-react";

interface Company {
  id: string;
  name: string;
  role: string;
  skills: string; // Comma-separated
  packageLpa: number;
  capacity: number;
}

export const CompanyManagement: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    skills: "",
    packageLpa: "6.0",
    capacity: "3"
  });

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/companies");
      const data = await res.json();
      setCompanies(data);
    } catch (err) {
      console.error("Failed to fetch companies:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove corporate partner: ${name}?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/companies/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCompanies(companies.filter(c => c.id !== id));
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Failed deletion");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    const { name, role, skills, packageLpa, capacity } = formData;
    if (!name.trim() || !role.trim() || !skills.trim()) {
      setActionError("All fields must be fulfilled to register a recruiter.");
      return;
    }

    const valLpa = parseFloat(packageLpa);
    const valCap = parseInt(capacity);
    if (isNaN(valLpa) || valLpa <= 0) {
      setActionError("Offer Package (LPA) must be positive.");
      return;
    }
    if (isNaN(valCap) || valCap <= 0) {
      setActionError("Select slot capacity limit >= 1.");
      return;
    }

    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          role: role.trim(),
          skills: skills.trim(),
          packageLpa: valLpa,
          capacity: valCap
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        setActionError(errData.error || "Internal insertion violation");
        return;
      }

      const created = await res.json();
      setCompanies([...companies, created]);
      setShowAddModal(false);
      resetForm();
    } catch (err) {
      setActionError("Failed to communicate with recruiting database.");
    }
  };

  const handleEditInit = (company: Company) => {
    setEditingId(company.id);
    setFormData({
      name: company.name,
      role: company.role,
      skills: company.skills,
      packageLpa: String(company.packageLpa),
      capacity: String(company.capacity)
    });
    setActionError(null);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    if (!editingId) return;

    const { name, role, skills, packageLpa, capacity } = formData;
    if (!name.trim() || !role.trim() || !skills.trim()) {
      setActionError("Provide perfect update fields.");
      return;
    }

    const valLpa = parseFloat(packageLpa);
    const valCap = parseInt(capacity);
    if (isNaN(valLpa) || valLpa <= 0) {
      setActionError("Check offering LPA range constraints.");
      return;
    }
    if (isNaN(valCap) || valCap <= 0) {
      setActionError("Check seat capacities limit.");
      return;
    }

    try {
      const res = await fetch(`/api/companies/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          role: role.trim(),
          skills: skills.trim(),
          packageLpa: valLpa,
          capacity: valCap
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        setActionError(errData.error || "Error adjusting details");
        return;
      }

      const updated = await res.json();
      setCompanies(companies.map(c => c.id === editingId ? updated : c));
      setShowEditModal(false);
      resetForm();
    } catch (err) {
      setActionError("Failed server connection saving revisions.");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      role: "",
      skills: "",
      packageLpa: "6.0",
      capacity: "3"
    });
    setEditingId(null);
    setActionError(null);
  };

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="company_management_page" className="space-y-6 animate-fade-in text-slate-800">
      
      {/* Page Title Card */}
      <div id="company_header_card" className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="bg-gradient-to-tr from-emerald-600 to-emerald-500 text-white p-3 rounded-2xl shadow-sm">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-850">Corporate Placement Partners</h2>
            <p className="text-xs text-slate-400">Maintain registered corporate partners, role constraints, average stipends and interview capacities.</p>
          </div>
        </div>

        <button
          id="btn_register_company_modal"
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 font-extrabold rounded-xl text-xs uppercase tracking-wider text-white transition shadow-md cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Register Recruiter</span>
        </button>
      </div>

      {/* Inline Quick Filter bar */}
      <div id="company_filter_bar" className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            id="company_search_input"
            type="text"
            placeholder="Filter companies or active job roles (e.g. Microsoft, Zoho, Developer...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:bg-white text-slate-700 transition"
          />
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
          Showing {filteredCompanies.length} of {companies.length} Entries
        </span>
      </div>

      {/* Recruiter Profiles List */}
      <div id="companies_deck_grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="md:col-span-3 py-16 text-center text-xs font-semibold text-slate-400">
            Consulting hiring database...
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="md:col-span-3 py-16 text-center bg-white border border-dashed border-slate-100 rounded-3xl p-6">
            <Building2 className="h-10 w-10 mx-auto text-slate-200 mb-2" />
            <p className="text-xs font-semibold text-slate-450">No placement partners matching filters.</p>
            <p className="text-[10px] text-slate-400 max-w-sm mx-auto mt-1">Add profiles by clicking "Register Recruiter" above.</p>
          </div>
        ) : (
          filteredCompanies.map(company => (
            <div 
              key={company.id} 
              id={`recruiter_card_${company.id}`}
              className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col flex-1"
            >
              {/* Header section with brand insignia */}
              <div className="p-5 border-b border-slate-50 flex items-start justify-between bg-slate-50/20">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-emerald-500/10 to-teal-500/10 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0 border border-emerald-100/50">
                    {company.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-slate-800 truncate">{company.name}</h3>
                    <p className="text-[10px] text-slate-400 font-medium truncate flex items-center mt-0.5">
                      <Briefcase className="h-3 w-3 mr-1" />
                      {company.role}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    id={`company_card_edit_btn_${company.id}`}
                    onClick={() => handleEditInit(company)}
                    className="p-1 px-1.5 border border-slate-200/80 bg-white hover:border-slate-300 rounded-lg text-slate-500 hover:text-emerald-600 transition"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    id={`company_card_delete_btn_${company.id}`}
                    onClick={() => handleDelete(company.id, company.name)}
                    className="p-1 px-1.5 border border-rose-100 bg-white hover:bg-rose-50 rounded-lg text-rose-550 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Body stats block */}
              <div className="p-5 flex-1 flex flex-col space-y-4">
                <div className="grid grid-cols-2 gap-2 border-b border-slate-50 pb-3 text-center">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-bold text-slate-450 uppercase tracking-widest block">Stipend LPA</span>
                    <span className="text-sm font-extrabold text-emerald-600 block">{company.packageLpa.toFixed(1)} LPA</span>
                  </div>
                  <div className="space-y-0.5 border-l border-slate-100">
                    <span className="text-[9px] font-bold text-slate-450 uppercase tracking-widest block">Assigned Limit</span>
                    <span className="text-sm font-extrabold text-indigo-950 block">{company.capacity} candidates</span>
                  </div>
                </div>

                {/* Tags Skills list for matching */}
                <div className="flex-1 space-y-1.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Must Possess Skills</span>
                  <div className="flex flex-wrap gap-1">
                    {company.skills.split(",").map((s, idx) => {
                      const trimmed = s.trim();
                      if (!trimmed) return null;
                      return (
                        <span 
                          key={idx} 
                          className="text-[9px] font-bold bg-emerald-50/60 border border-emerald-105/40 text-emerald-700 px-2 py-0.5 rounded-md inline-block uppercase"
                        >
                          {trimmed}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* REGISTER COMPANY RECRUITER MODAL */}
      {showAddModal && (
        <div id="add_com_dialog" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 transition-opacity animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <Plus className="h-5 w-5 text-emerald-500" />
                <h3 className="font-extrabold text-slate-850">Register Executive Recruiter</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {actionError && (
              <div className="bg-rose-50 text-rose-700 border border-rose-100 p-3 rounded-xl text-xs font-semibold">
                {actionError}
              </div>
            )}

            <form id="add_com_form" onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Company Name
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    id="add_com_name_input"
                    type="text"
                    required
                    placeholder="e.g. Zoho Corporation"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Hiring Job Role Title
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    id="add_com_role_input"
                    type="text"
                    required
                    placeholder="e.g. Associate Software Architect"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Executive Package (LPA)
                  </label>
                  <input
                    id="add_com_pkg_input"
                    type="number"
                    step="0.1"
                    min="1"
                    required
                    value={formData.packageLpa}
                    onChange={(e) => setFormData({ ...formData, packageLpa: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Hiring Limit Capacity
                  </label>
                  <input
                    id="add_com_cap_input"
                    type="number"
                    min="1"
                    required
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Target Required Core Skills (Comma Separated)
                </label>
                <textarea
                  id="add_com_skills_textarea"
                  rows={3}
                  required
                  placeholder="Java, Spring Boot, React, SQL"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-400 font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 border-t border-slate-100 pt-3">
                <button
                  id="cancel_new_com_btn"
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  id="save_new_com_btn"
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow"
                >
                  Save Partner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT RECRUITER MODAL */}
      {showEditModal && (
        <div id="edit_com_dialog" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 transition-opacity animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <Edit className="h-5 w-5 text-emerald-500" />
                <h3 className="font-extrabold text-slate-850">Update Corporate details</h3>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {actionError && (
              <div className="bg-rose-50 text-rose-700 border border-rose-100 p-3 rounded-xl text-xs font-semibold">
                {actionError}
              </div>
            )}

            <form id="edit_com_form" onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Company Name
                </label>
                <input
                  id="edit_com_name_input"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-400 font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Hiring Job Role Title
                </label>
                <input
                  id="edit_com_role_input"
                  type="text"
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Package (LPA)
                  </label>
                  <input
                    id="edit_com_pkg_input"
                    type="number"
                    step="0.1"
                    min="1"
                    required
                    value={formData.packageLpa}
                    onChange={(e) => setFormData({ ...formData, packageLpa: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Assigned Limit Capacity
                  </label>
                  <input
                    id="edit_com_cap_input"
                    type="number"
                    min="1"
                    required
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                  <span>Target Required Core Skills</span>
                  <span className="text-[9px] text-slate-450 uppercase font-bold text-slate-400">Comma Separated</span>
                </label>
                <textarea
                  id="edit_com_skills_textarea"
                  rows={3}
                  required
                  placeholder="Java, React, SQL"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-400 font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 border-t border-slate-100 pt-3">
                <button
                  id="cancel_edit_com_btn"
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  id="save_edit_com_btn"
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default CompanyManagement;
