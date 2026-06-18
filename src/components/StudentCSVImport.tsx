import React, { useState, useRef } from "react";
import { 
  Upload, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp, 
  Grid, 
  Sparkles, 
  Download, 
  X, 
  Flame, 
  HelpCircle,
  FileText,
  AlertTriangle
} from "lucide-react";

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
}

interface StudentCSVImportProps {
  existingStudents: Student[];
  onImportSuccess: () => void;
  showSuccessToast: (msg: string) => void;
}

interface ParsedRow {
  index: number;
  raw: any;
  id: string;
  name: string;
  email: string;
  department: string;
  cgpa: number;
  skills: string;
  isValid: boolean;
  warnings: string[];
  willOverwrite: boolean;
}

export const StudentCSVImport: React.FC<StudentCSVImportProps> = ({
  existingStudents,
  onImportSuccess,
  showSuccessToast
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadCSVEnergyTemplate = () => {
    const csvContent = "id,name,email,department,cgpa,skills\n" +
                       "student201,Abhishek Verma,abhishek.verma@saveetha.in,Computer Science,9.12,\"React, TypeScript, Java\"\n" +
                       "student202,Priya Nair,priya.nair@saveetha.in,Information Technology,8.45,\"Node.js, C++, Angular, SQL\"\n" +
                       "student203,Karan Malhotra,karan.malhotra@saveetha.in,Electrical Engineering,7.95,\"C, Embedded C, Python\"\n" +
                       "student204,Ananya Sen,ananya.sen@saveetha.in,Biotechnology,8.80,\"R, Bio-Python, Excel, Tableau\"\n" +
                       "student001,Amit Sen,amit.sen@saveetha.in,Computer Science,9.50,\"React, Node.js\""; // student001 is standard default
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.id = "csv_template_downloader_link";
    link.setAttribute("href", url);
    link.setAttribute("download", "sec_student_bulk_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccessToast("Standardized CSV Template downloaded successfully! Complete your edits and import.");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const processCSVFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setErrorMsg("Saveetha Placements Auditor only accepts standardized .csv spreadsheet sheets.");
      return;
    }

    setFileName(file.name);
    setErrorMsg(null);
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) {
          throw new Error("Empty spreadsheet loaded.");
        }
        parseAndValidateCSV(text);
      } catch (err: any) {
        setErrorMsg(`Failed parsing CSV spreadsheet: ${err.message}`);
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      setErrorMsg("Failed reading CSV file from system stream.");
      setIsUploading(false);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processCSVFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processCSVFile(e.target.files[0]);
    }
  };

  const parseAndValidateCSV = (text: string) => {
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) {
      setErrorMsg("Incorrect CSV spreadsheet format: Header line and at least 1 student row is required.");
      setIsUploading(false);
      return;
    }

    // Header extraction
    const rawHeaders = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/['"]/g, ""));
    const requiredFields = ["id", "name", "email", "department", "cgpa"];
    const missingFields = requiredFields.filter(f => !rawHeaders.includes(f));

    if (missingFields.length > 0) {
      setErrorMsg(`Header columns error: Missing critical fields [ ${missingFields.join(", ").toUpperCase()} ]. Download template for structural reference.`);
      setIsUploading(false);
      return;
    }

    const rows: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle quotes with commas appropriately
      const columns: string[] = [];
      let insideQuote = false;
      let buffer = "";

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"' || char === "'") {
          insideQuote = !insideQuote;
        } else if (char === ',' && !insideQuote) {
          columns.push(buffer.trim());
          buffer = "";
        } else {
          buffer += char;
        }
      }
      columns.push(buffer.trim());

      // Create a key-value record maps
      const record: any = {};
      rawHeaders.forEach((header, idx) => {
        let val = columns[idx] || "";
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }
        record[header] = val;
      });

      const studentId = (record.id || "").trim();
      const studentName = (record.name || "").trim();
      const studentEmail = (record.email || "").trim();
      const studentDept = (record.department || "").trim();
      const studentCgpaRaw = record.cgpa;
      const studentSkills = (record.skills || "").trim();

      const warnings: string[] = [];
      let isValid = true;

      if (!studentId) {
        isValid = false;
        warnings.push("Missing ID parameter");
      }
      if (!studentName) {
        isValid = false;
        warnings.push("Missing Name parameter");
      }
      if (!studentEmail) {
        isValid = false;
        warnings.push("Missing Email parameter");
      } else if (!studentEmail.includes("@")) {
        warnings.push("Email address formatting questionable");
      }
      if (!studentDept) {
        isValid = false;
        warnings.push("Missing Department parameter");
      }

      let parsedGpa = parseFloat(studentCgpaRaw);
      if (isNaN(parsedGpa)) {
        isValid = false;
        warnings.push("CGPA is missing or not a numeric value");
        parsedGpa = 0.0;
      } else if (parsedGpa < 0 || parsedGpa > 10.0) {
        isValid = false;
        warnings.push("CGPA bounds violated (Must be 0.0 to 10.0)");
      }

      // Overwrite flags checking against registered students database
      const isAlreadyInDB = existingStudents.some(
        s => String(s.id).toLowerCase().trim() === studentId.toLowerCase().trim()
      );

      rows.push({
        index: i,
        raw: record,
        id: studentId,
        name: studentName,
        email: studentEmail,
        department: studentDept,
        cgpa: parsedGpa,
        skills: studentSkills,
        isValid,
        warnings,
        willOverwrite: isAlreadyInDB
      });
    }

    setParsedRows(rows);
    setIsUploading(false);
    showSuccessToast(`Successfully parsed ${rows.length} records. Review preview list below!`);
  };

  const handleBulkSubmit = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      setErrorMsg("All uploaded rows contain blocking validation errors. Resolve headers or bounds to upload.");
      return;
    }

    setIsUploading(true);

    try {
      const payloadPayload = validRows.map(r => ({
        id: r.id,
        name: r.name,
        email: r.email,
        department: r.department,
        cgpa: r.cgpa,
        skills: r.skills
      }));

      const res = await fetch("/api/students/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentsList: payloadPayload })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Database sync aborted.");
      }

      const outcome = await res.json();
      showSuccessToast(`Placement Hub Roster updated! Success: Added ${outcome.addedCount} new, Updated ${outcome.updatedCount} existing entries.`);
      
      // Cleanup States
      setParsedRows([]);
      setFileName(null);
      setErrorMsg(null);
      
      onImportSuccess(); // Refresh parent roster
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Bulk transmission network issue.");
    } finally {
      setIsUploading(false);
    }
  };

  const clearImportWidget = () => {
    setParsedRows([]);
    setFileName(null);
    setErrorMsg(null);
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const invalidCount = parsedRows.filter(r => !r.isValid).length;
  const overwriteCount = parsedRows.filter(r => r.isValid && r.willOverwrite).length;
  const newCount = parsedRows.filter(r => r.isValid && !r.willOverwrite).length;

  return (
    <div id="csv_import_widget" className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4 text-xs">
      
      {/* Title block */}
      <div className="flex justify-between items-center border-b border-slate-50 pb-3">
        <div className="space-y-1">
          <h4 className="font-extrabold uppercase text-[10px] tracking-widest text-slate-400 flex items-center">
            <Upload className="h-4 w-4 text-indigo-500 mr-2" />
            CSV Bulk Roster Importer
          </h4>
          <p className="text-[10px] text-slate-405">Validate and load hundreds of student profiles dynamically without form-entry fatigue.</p>
        </div>

        <button
          type="button"
          id="btn_download_csv_template"
          onClick={downloadCSVEnergyTemplate}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 font-extrabold text-[10px] text-indigo-700 rounded-xl transition cursor-pointer border border-indigo-100 select-none"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Standardized Template CSV</span>
        </button>
      </div>

      {/* Drag & Drop Main stage wrapper */}
      {!fileName ? (
        <div
          id="csv_drag_zone"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-2 cursor-pointer transition select-none ${
            dragOver 
              ? "border-indigo-500 bg-indigo-50/40 text-indigo-700" 
              : "border-slate-200 bg-slate-50/50 text-slate-500 hover:border-slate-350 hover:bg-slate-50"
          }`}
        >
          <FileSpreadsheet className={`h-8 w-8 transition ${dragOver ? "text-indigo-600 scale-110" : "text-slate-400"}`} />
          <div>
            <span className="text-2xs font-bold text-slate-850 block">Drag & Drop Student CSV Spreadsheet Here</span>
            <span className="text-[9.5px] text-slate-405 block mt-0.5">or <strong className="text-indigo-600 underline">browse computer local folders</strong></span>
          </div>
          <span className="text-[9px] text-slate-400 font-medium">Standard columns: id, name, email, department, cgpa, skills</span>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept=".csv"
            className="hidden"
            id="hidden_csv_file_picker"
          />
        </div>
      ) : (
        <div className="bg-slate-50/50 border border-slate-150 rounded-2xl p-4 space-y-3">
          <div className="flex justify-between items-center text-[11px]">
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="h-5 w-5 text-indigo-500 shrink-0" />
              <div>
                <p className="font-extrabold text-slate-800 leading-none">{fileName}</p>
                <p className="text-[9px] text-slate-405 mt-0.5">{parsedRows.length} rows parsed successfully</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={clearImportWidget}
                className="p-1 px-2.5 border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100 bg-white rounded-lg text-[9px] font-bold uppercase transition cursor-pointer select-none"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Validation Metrics dashboard summary */}
          <div className="grid grid-cols-3 gap-2 py-1 font-mono text-[9px]">
            <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 p-2 rounded-xl text-center space-y-0.5">
              <span className="block font-black uppercase text-[8px] tracking-wider text-emerald-650">Ready as New</span>
              <strong className="text-xs font-black">{newCount}</strong>
            </div>
            <div className="bg-amber-50 text-amber-805 border border-amber-100 p-2 rounded-xl text-center space-y-0.5">
              <span className="block font-black uppercase text-[8px] tracking-wider text-amber-655">Will Overwrite</span>
              <strong className="text-xs font-black">{overwriteCount}</strong>
            </div>
            <div className="bg-rose-50 text-rose-800 border border-rose-100 p-2 rounded-xl text-center space-y-0.5">
              <span className="block font-black uppercase text-[8px] tracking-wider text-rose-650">Verify Alerts</span>
              <strong className="text-xs font-black">{invalidCount}</strong>
            </div>
          </div>

          {/* Action trigger button */}
          <div className="flex justify-between items-center gap-3">
            <button
              type="button"
              disabled={isUploading}
              onClick={handleBulkSubmit}
              className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 select-none"
            >
              <CheckCircle className="h-4 w-4 animate-bounce-short" />
              <span>{isUploading ? "Transmitting Database logs..." : `Commit Bulk Load (${newCount + overwriteCount} Valid Profiles)`}</span>
            </button>
          </div>
        </div>
      )}

      {/* Error notification banner */}
      {errorMsg && (
        <div id="import_error_banner" className="flex items-start space-x-2 text-rose-650 bg-rose-50 border border-rose-150 p-3 rounded-2xl font-semibold leading-relaxed">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <div className="space-y-0.5">
            <span className="block font-black text-[9px] uppercase tracking-wider text-rose-800">Standard Schema Deviation Alert</span>
            <span className="text-[10px]">{errorMsg}</span>
          </div>
        </div>
      )}

      {/* Roster detail previews grid sheet */}
      {parsedRows.length > 0 && (
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="w-full flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-600 cursor-pointer py-1 block"
          >
            <span>Preview Detailed Parse Queue Grid</span>
            {showPreview ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {showPreview && (
            <div className="border border-slate-100 rounded-xl max-h-48 overflow-y-auto select-none bg-slate-50/50">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 text-[8px] font-black uppercase tracking-widest text-slate-450 border-b border-slate-150 select-none">
                  <tr>
                    <th className="p-2">Row</th>
                    <th className="p-2">Reg ID</th>
                    <th className="p-2">Name</th>
                    <th className="p-2">Department</th>
                    <th className="p-2 text-center">CGPA</th>
                    <th className="p-2 text-center">Action/Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[10px]">
                  {parsedRows.map((row) => (
                    <tr 
                      key={row.index} 
                      className={`hover:bg-slate-105 transition-all text-slate-650 ${
                        !row.isValid 
                          ? "bg-rose-50/30 text-rose-900" 
                          : row.willOverwrite 
                          ? "bg-amber-50/20" 
                          : "bg-white"
                      }`}
                    >
                      <td className="p-2 text-slate-405 font-semibold text-center">{row.index}</td>
                      <td className="p-2 font-bold text-slate-800">{row.id || "N/A"}</td>
                      <td className="p-2 font-bold max-w-[120px] truncate" title={row.name}>{row.name || "N/A"}</td>
                      <td className="p-2 max-w-[100px] truncate">{row.department || "N/A"}</td>
                      <td className="p-2 font-extrabold text-center">{row.cgpa.toFixed(2)}</td>
                      <td className="p-2 text-right">
                        {!row.isValid ? (
                          <div className="flex items-center justify-end space-x-1.5 text-rose-600 font-bold uppercase text-[8px] shrink-0" title={row.warnings.join(", ")}>
                            <AlertTriangle className="h-3 w-3 inline shrink-0" />
                            <span className="truncate max-w-[80px]">{row.warnings[0]}</span>
                          </div>
                        ) : row.willOverwrite ? (
                          <span className="inline-block text-[8px] font-black uppercase rounded bg-amber-50 text-amber-700 px-1.5 py-0.5 border border-amber-200 shrink-0 leading-none">
                            Overwrite DB
                          </span>
                        ) : (
                          <span className="inline-block text-[8px] font-black uppercase rounded bg-emerald-50 text-emerald-700 px-1.5 py-0.5 border border-emerald-200 shrink-0 leading-none">
                            Create New
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
