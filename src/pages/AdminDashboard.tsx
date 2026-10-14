import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Download, LogOut, Search, Printer, Plus, Settings, Edit, ClipboardList, Eye, BarChart3, Clock3, CheckCircle2, XCircle, Home, RefreshCw, Menu, MoreHorizontal, UserRound, Pencil, Ban, BadgeCheck, FileText, ImagePlus, X, ArrowDownToLine } from "lucide-react";
import { CLASS_OPTIONS, SESSION_OPTIONS, SEX_OPTIONS, RELIGION_OPTIONS, checkUserRole, cleanupUploads, getSignedUrl, normalizeClass, stripClassPrefix, uploadFile } from "@/lib/supabase-helpers";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { compressImage } from "@/lib/image-compressor";
import { admissionFormSchema } from "@/lib/form-validation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import * as XLSX from "xlsx";

const ALL_CLASSES = ["All", ...CLASS_OPTIONS];
const APP_EDIT_FIELDS: { key: string; label: string; type?: "date" | "textarea" | "class" | "session" | "sex" | "religion" }[] = [
  { key: "full_name", label: "Student Full Name" }, { key: "name_bengali", label: "Name in Bengali" },
  { key: "date_of_birth", label: "Date of Birth", type: "date" }, { key: "sex", label: "Gender", type: "sex" },
  { key: "religion", label: "Religion", type: "religion" }, { key: "nationality", label: "Nationality" },
  { key: "desired_class", label: "Applying Class", type: "class" }, { key: "session", label: "Session", type: "session" },
  { key: "father_name", label: "Father's Name" }, { key: "father_occupation", label: "Father's Occupation" },
  { key: "father_qualification", label: "Father's Qualification" }, { key: "mother_name", label: "Mother's Name" },
  { key: "mother_occupation", label: "Mother's Occupation" }, { key: "mother_qualification", label: "Mother's Qualification" },
  { key: "guardian_name", label: "Guardian Name" }, { key: "guardian_relation", label: "Guardian Relation" },
  { key: "mobile_no", label: "Phone Number" }, { key: "whatsapp_no", label: "WhatsApp Number" },
  { key: "aadhar_no", label: "Aadhaar Number" }, { key: "health_issue", label: "Health Issue" },
  { key: "present_vill", label: "Present Village" }, { key: "present_po", label: "Present P.O." },
  { key: "present_ps", label: "Present P.S." }, { key: "present_dist", label: "Present District" },
  { key: "present_pin", label: "Present PIN" }, { key: "present_state", label: "Present State" },
  { key: "permanent_vill", label: "Permanent Village" }, { key: "permanent_po", label: "Permanent P.O." },
  { key: "permanent_ps", label: "Permanent P.S." }, { key: "permanent_dist", label: "Permanent District" },
  { key: "permanent_pin", label: "Permanent PIN" }, { key: "permanent_state", label: "Permanent State" },
  { key: "landmark", label: "Landmark" }, { key: "last_attended_class", label: "Last Attended Class" },
  { key: "last_institution", label: "Last Attended Institution" }, { key: "form_filled_by", label: "Form Filled in By" },
  { key: "monthly_fees", label: "Monthly Fees" }, { key: "admission_fee", label: "Admission Fee" },
  { key: "remarks", label: "Admin Remarks", type: "textarea" },
];
const APP_FILES = [
  { key: "photo_url", label: "Student Photo", bucket: "student-photos", folder: "photos" },
  { key: "aadhar_doc_url", label: "Aadhaar Document", bucket: "student-documents", folder: "aadhar" },
  { key: "birth_cert_url", label: "Birth Certificate", bucket: "student-documents", folder: "birth-cert" },
  { key: "guardian_signature_url", label: "Guardian Signature", bucket: "student-documents", folder: "signatures" },
];

const AdminDashboard = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [filteredClass, setFilteredClass] = useState("All");
  const [filteredSession, setFilteredSession] = useState("All");
  const [filteredStatus, setFilteredStatus] = useState("All");
  const [search, setSearch] = useState("");
  const [editApp, setEditApp] = useState<any>(null);
  const [editTest, setEditTest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "admission");
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/admin/login"); return; }
      const role = await checkUserRole(session.user.id);
      if (role !== "admin") { navigate("/"); return; }
      fetchData();
    };
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate("/admin/login");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchData = async () => {
    const [appRes, testRes, settingsRes] = await Promise.all([
      supabase.from("applications").select("*").order("created_at", { ascending: false }),
      supabase.from("admission_tests").select("*").order("created_at", { ascending: false }),
      supabase.from("form_settings").select("setting_value").eq("setting_key", "sync_fee_defaults").maybeSingle(),
    ]);
    if (appRes.data) setApplications(appRes.data);
    if (testRes.data) setTests(testRes.data);
    const defaults = settingsRes.data?.setting_value as { admission_fee?: unknown; monthly_fee?: unknown } | undefined;
    setFeeDefaults({ admission_fee: String(defaults?.admission_fee ?? "0"), monthly_fee: String(defaults?.monthly_fee ?? "0") });
    setLoading(false);
  };

  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncApp, setSyncApp] = useState<any>(null);
  const [section, setSection] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [admissionFee, setAdmissionFee] = useState("0");
  const [monthlyFee, setMonthlyFee] = useState("0");
  const [feeDefaults, setFeeDefaults] = useState({ admission_fee: "0", monthly_fee: "0" });
  const [editUploads, setEditUploads] = useState<{ bucket: string; path: string }[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  const syncToEduNest = async (id: string, sec?: string, syncData?: { roll_number: string; admission_fee: number; monthly_fee: number }, retryFee = false): Promise<{ ok: boolean; error?: string; fee_sync_status?: string; fee_sync_error?: string | null }> => {
    setSyncingId(id);
    try {
      const { data, error } = await supabase.functions.invoke("sync-to-edunest", { body: { application_id: id, ...(sec ? { section: sec } : {}), ...(syncData || {}), ...(retryFee ? { retry_fee_portal: true } : {}) } });
      if (error) {
        let msg = error.message;
        try {
          const body = await (error as any).context?.json?.();
          if (body?.error) msg = typeof body.error === "string" ? body.error : JSON.stringify(body.error);
        } catch { /* ignore */ }
        return { ok: false, error: msg };
      }
      if (data?.success !== true) return { ok: false, error: data?.error || "Unknown sync error" };
      return { ok: true, fee_sync_status: data?.fee_sync_status, fee_sync_error: data?.fee_sync_error || null };
    } catch (e: any) {
      return { ok: false, error: e?.message || "Network error" };
    } finally {
      setSyncingId(null);
    }
  };

  const confirmSync = async () => {
    if (!syncApp || !section) return;
    const id = syncApp.id;
    const parsedAdmissionFee = Number(admissionFee);
    const parsedMonthlyFee = Number(monthlyFee);
    if (!Number.isFinite(parsedAdmissionFee) || parsedAdmissionFee < 0 || !Number.isFinite(parsedMonthlyFee) || parsedMonthlyFee < 0) {
      toast({ title: "Check fee amounts", description: "Admission Fee and Monthly Fee must be zero or a positive number.", variant: "destructive" });
      return;
    }
    const r = await syncToEduNest(id, section, { roll_number: rollNumber.trim(), admission_fee: parsedAdmissionFee, monthly_fee: parsedMonthlyFee });
    if (!r.ok) { toast({ title: "Sync failed", description: r.error, variant: "destructive" }); return; }
    setApplications(prev => prev.map(a => a.id === id ? { ...a, is_synced: true, is_fee_synced: r.fee_sync_status === "synced", fee_sync_status: r.fee_sync_status || (parsedAdmissionFee > 0 || parsedMonthlyFee > 0 ? "failed" : "not_requested"), fee_sync_error: r.fee_sync_error } : a));
    setSyncApp(null); setSection(""); setRollNumber(""); setAdmissionFee("0"); setMonthlyFee("0");
    if ((parsedAdmissionFee > 0 || parsedMonthlyFee > 0) && r.fee_sync_status !== "synced") toast({ title: "Synced to EduNest; Fee Portal needs attention", description: r.fee_sync_error || "Fee Portal did not confirm the sync. Retry from the row actions.", variant: "destructive" });
    else toast({ title: r.fee_sync_status === "synced" ? "Synced to EduNest & Fee Portal" : "Synced to EduNest" });
  };

  const retryFeePortal = async (app: any) => {
    const result = await syncToEduNest(app.id, undefined, undefined, true);
    if (!result.ok) { toast({ title: "Fee Portal retry failed", description: result.error, variant: "destructive" }); return; }
    setApplications(prev => prev.map(row => row.id === app.id ? { ...row, is_fee_synced: result.fee_sync_status === "synced", fee_sync_status: result.fee_sync_status, fee_sync_error: result.fee_sync_error } : row));
    if (result.fee_sync_status === "synced") toast({ title: "Synced to EduNest & Fee Portal" });
    else toast({ title: "Fee Portal retry failed", description: result.fee_sync_error || "Fee Portal did not confirm the sync.", variant: "destructive" });
  };

  const updateAppStatus = async (id: string, status: string) => {
    const app = applications.find(a => a.id === id);
    const update: Record<string, string> = { status };
    if (status === "Approved" && app && !app.student_code) {
      const { data: code, error: codeError } = await (supabase.rpc as any)("generate_new_student_code", { p_session_year: app.session || String(new Date().getFullYear()) });
      if (codeError || !code) { toast({ title: "Error", description: "Could not generate student code. Status not changed.", variant: "destructive" }); return; }
      update.student_code = code as string;
    }
    const { error } = await supabase.from("applications").update(update as any).eq("id", id);
    if (error) { toast({ title: "Error", description: getSafeErrorMessage(error), variant: "destructive" }); return; }
    setApplications(prev => prev.map(a => a.id === id ? { ...a, ...update } : a));
    toast({ title: status === "Approved" ? "Student approved. Use \"Add to System\" to sync to EduNest." : "Status updated" });
  };

  const updateTestStatus = async (id: string, status: string) => {
    let updateData: any = { status };
    if (status === "Approved") {
      const test = tests.find(t => t.id === id);
      if (test && !test.roll_no) {
        try {
          const { data } = await supabase.functions.invoke("generate-id", {
            body: { type: "roll_no", session: test.session, class_name: normalizeClass(test.applying_for_class) },
          });
          if (data?.id) updateData.roll_no = data.id;
        } catch {}
      }
    }
    const { error } = await supabase.from("admission_tests").update(updateData).eq("id", id);
    if (error) { toast({ title: "Error", description: getSafeErrorMessage(error), variant: "destructive" }); return; }
    setTests(prev => prev.map(t => t.id === id ? { ...t, ...updateData } : t));
    toast({ title: "Status updated" });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const filteredApps = applications.filter(a => {
    const classMatch = filteredClass === "All" || normalizeClass(a.desired_class) === filteredClass;
    const sessionMatch = filteredSession === "All" || a.session === filteredSession;
    const searchMatch = !search || a.full_name?.toLowerCase().includes(search.toLowerCase()) || a.application_id?.toLowerCase().includes(search.toLowerCase());
    const statusMatch = filteredStatus === "All" || a.status === filteredStatus;
    return classMatch && sessionMatch && statusMatch && searchMatch;
  });

  const filteredTests = tests.filter(t => {
    const classMatch = filteredClass === "All" || normalizeClass(t.applying_for_class) === filteredClass;
    const sessionMatch = filteredSession === "All" || t.session === filteredSession;
    const searchMatch = !search || t.student_name?.toLowerCase().includes(search.toLowerCase()) || t.test_id?.toLowerCase().includes(search.toLowerCase());
    const statusMatch = filteredStatus === "All" || t.status === filteredStatus;
    return classMatch && sessionMatch && statusMatch && searchMatch;
  });

  const exportAdmissions = (classFilter?: string) => {
    const data = classFilter && classFilter !== "All"
      ? applications.filter(a => normalizeClass(a.desired_class) === classFilter)
      : filteredApps;
    const exportData = data.map(a => ({
      "Application ID": a.application_id, "Name": a.full_name, "Father": a.father_name,
      "Class": a.desired_class, "Session": a.session || "", "DOB": a.date_of_birth,
      "Sex": a.sex, "Religion": a.religion, "Mobile": a.mobile_no,
      "Village": a.present_vill || "", "P.O": a.present_po || "", "P.S": a.present_ps || "",
      "District": a.present_dist || "", "Landmark": a.landmark || "",
      "Monthly Fees": a.monthly_fees || "", "Admission Fee": a.admission_fee || "",
      "Status": a.status, "Applied On": new Date(a.created_at).toLocaleDateString(),
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Admissions");
    XLSX.writeFile(wb, `Admissions_${classFilter || filteredClass}_${Date.now()}.xlsx`);
  };

  const exportTests = (classFilter?: string) => {
    const data = classFilter && classFilter !== "All"
      ? tests.filter(t => normalizeClass(t.applying_for_class) === classFilter)
      : filteredTests;
    const exportData = data.map(t => ({
      "Test ID": t.test_id, "Name": t.student_name, "Father": t.father_name,
      "Class": t.applying_for_class, "Session": t.session, "Mobile": t.mobile_no,
      "Village": t.village || "", "P.O": t.po || "", "P.S": t.ps || "",
      "District": t.dist || "", "Landmark": t.landmark || "",
      "Roll No": t.roll_no || "", "Status": t.status,
      "Applied On": new Date(t.created_at).toLocaleDateString(),
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tests");
    XLSX.writeFile(wb, `AdmissionTests_${classFilter || filteredClass}_${Date.now()}.xlsx`);
  };

  const saveEditApp = async () => {
    if (!editApp) return;
    const normalizedClass = normalizeClass(editApp.desired_class);
    const validation = admissionFormSchema.safeParse({
      ...Object.fromEntries(APP_EDIT_FIELDS.map(field => [field.key, editApp[field.key] ?? ""])),
      desired_class: normalizedClass,
    });
    if (!normalizedClass || !validation.success) {
      toast({ title: "Check application details", description: validation.success ? "Select a valid class." : `${validation.error.errors[0].path.join(".")}: ${validation.error.errors[0].message}`, variant: "destructive" });
      return;
    }
    const editableKeys = [...APP_EDIT_FIELDS.map(field => field.key), ...APP_FILES.map(file => file.key)];
    const update = Object.fromEntries(editableKeys.map(key => [key, key === "desired_class" ? normalizedClass : editApp[key] ?? null]));
    setSavingEdit(true);
    const { error, data } = await supabase.from("applications").update(update as any).eq("id", editApp.id).select("id").maybeSingle();
    setSavingEdit(false);
    if (error || !data) {
      await cleanupUploads(editUploads);
      setEditUploads([]);
      toast({ title: "Could not save application", description: error ? getSafeErrorMessage(error) : "The application was not updated. Check your admin access.", variant: "destructive" });
      return;
    }
    setApplications(prev => prev.map(a => a.id === editApp.id ? { ...a, ...update, desired_class: normalizedClass } : a));
    await cleanupUploads(editUploads.filter(upload => !Object.values(update).includes(upload.path)));
    setEditUploads([]);
    setEditApp(null);
    toast({ title: "Application updated" });
  };

  const uploadEditedFile = async (fileField: typeof APP_FILES[number], file?: File) => {
    if (!editApp || !file) return;
    try {
      const optimized = file.type.startsWith("image/") ? await compressImage(file, { maxSizeBytes: 1200 * 1024, maxWidthOrHeight: 1600 }) : file;
      const path = await uploadFile(fileField.bucket, optimized, fileField.folder);
      if (!path) throw new Error("Upload failed. The existing file is unchanged.");
      setEditApp((current: any) => current ? { ...current, [fileField.key]: path } : current);
      setEditUploads(current => [...current, { bucket: fileField.bucket, path }]);
      toast({ title: `${fileField.label} uploaded`, description: "Save Changes to attach it to this application." });
    } catch (error) {
      toast({ title: `Could not upload ${fileField.label.toLowerCase()}`, description: error instanceof Error ? error.message : "Please try another file.", variant: "destructive" });
    }
  };

  const openApplicationFile = async (fileField: typeof APP_FILES[number]) => {
    const path = editApp?.[fileField.key];
    if (!path) return;
    const url = await getSignedUrl(fileField.bucket, path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    else toast({ title: "File unavailable", description: "Could not create a secure preview link.", variant: "destructive" });
  };

  const saveEditTest = async () => {
    if (!editTest) return;
    const { id, ...rest } = editTest;
    const { error } = await supabase.from("admission_tests").update(rest).eq("id", id);
    if (error) { toast({ title: "Error", description: getSafeErrorMessage(error), variant: "destructive" }); return; }
    setTests(prev => prev.map(t => t.id === id ? editTest : t));
    setEditTest(null);
    toast({ title: "Test updated" });
  };

  const statusBadge = (status: string) => {
    const variant = status === "Approved" ? "default" : status === "Rejected" ? "destructive" : "secondary";
    return <Badge variant={variant}>{status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background flex print:hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-sidebar text-sidebar-foreground flex-shrink-0 hidden md:flex flex-col">
        <div className="p-4 text-center border-b border-sidebar-border">
          <img src="/lovable-uploads/b3369ca5-553a-4c65-961b-27d4deb3ca86.jpg" alt="Logo" className="mx-auto h-12 w-12 rounded-full bg-sidebar-foreground p-0.5 mb-2" />
          <h2 className="font-bold text-sm">Admin Dashboard</h2>
          <p className="text-xs opacity-75">Alor Disha Islamic School</p>
          <Button variant="ghost" size="sm" className="mt-2 w-full text-sidebar-foreground hover:bg-sidebar-accent" onClick={() => navigate("/")}><Home className="mr-2 h-4 w-4" /> View Website</Button>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto text-sm">
          {ALL_CLASSES.map(cls => (
            <button
              key={cls}
              onClick={() => setFilteredClass(cls)}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${filteredClass === cls ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50"}`}
            >
              {cls === "All" ? "All Applications" : cls}
            </button>
          ))}
        </nav>
        <div className="p-2 border-t border-sidebar-border space-y-1">
          <Button variant="ghost" size="sm" className="w-full text-sidebar-foreground hover:bg-sidebar-accent justify-start" onClick={() => navigate("/student/new-admission")}>
            <Plus className="mr-2 h-4 w-4" /> New Admission
          </Button>
          <Button variant="ghost" size="sm" className="w-full text-sidebar-foreground hover:bg-sidebar-accent justify-start" onClick={() => navigate("/student/admission-test")}>
            <ClipboardList className="mr-2 h-4 w-4" /> New Test
          </Button>
          <Button variant="ghost" size="sm" className="w-full text-sidebar-foreground hover:bg-sidebar-accent justify-start" onClick={() => navigate("/admin/site-editor")}>
            <Settings className="mr-2 h-4 w-4" /> Site Content Editor
          </Button>
          <Button variant="ghost" size="sm" className="w-full text-sidebar-foreground hover:bg-sidebar-accent justify-start" onClick={() => navigate("/admin/settings")}>
            <Settings className="mr-2 h-4 w-4" /> Form Settings
          </Button>
          <Button variant="ghost" size="sm" className="w-full text-sidebar-foreground hover:bg-sidebar-accent justify-start" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-6">
        <div className="mb-4 flex items-center justify-between md:hidden">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild><Button variant="outline" size="sm" aria-label="Open admin navigation"><Menu className="mr-2 h-4 w-4" /> Menu</Button></SheetTrigger>
            <SheetContent side="left" className="w-[min(84vw,20rem)] overflow-y-auto">
              <SheetHeader className="text-left"><SheetTitle>Admin navigation</SheetTitle><SheetDescription>Go to a portal area or manage applications.</SheetDescription></SheetHeader>
              <nav className="mt-5 space-y-1">
                <Button variant={activeTab === "admission" ? "secondary" : "ghost"} className="w-full justify-start" onClick={() => { handleTabChange("admission"); setMobileNavOpen(false); }}><FileText className="mr-2 h-4 w-4" /> Applications</Button>
                <Button variant={activeTab === "test" ? "secondary" : "ghost"} className="w-full justify-start" onClick={() => { handleTabChange("test"); setMobileNavOpen(false); }}><ClipboardList className="mr-2 h-4 w-4" /> Admission Tests</Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => { navigate("/admin/site-editor"); setMobileNavOpen(false); }}><Settings className="mr-2 h-4 w-4" /> Site Editor</Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => { navigate("/admin/settings"); setMobileNavOpen(false); }}><Settings className="mr-2 h-4 w-4" /> Form Settings</Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => { navigate("/student/new-admission"); setMobileNavOpen(false); }}><Plus className="mr-2 h-4 w-4" /> New Admission</Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => { navigate("/student/admission-test"); setMobileNavOpen(false); }}><ClipboardList className="mr-2 h-4 w-4" /> New Admission Test</Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => { navigate("/"); setMobileNavOpen(false); }}><Home className="mr-2 h-4 w-4" /> View Website</Button>
                <Button variant="ghost" className="w-full justify-start text-destructive" onClick={() => { setMobileNavOpen(false); void handleLogout(); }}><LogOut className="mr-2 h-4 w-4" /> Sign Out</Button>
              </nav>
            </SheetContent>
          </Sheet>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}><Home className="mr-1 h-4 w-4" /> Website</Button>
        </div>
        {/* Mobile class filter */}
        <div className="md:hidden mb-4">
          <Select value={filteredClass} onValueChange={setFilteredClass}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ALL_CLASSES.map(cls => <SelectItem key={cls} value={cls}>{cls}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div><p className="text-sm font-medium text-primary">Admissions workspace</p><h1 className="text-2xl font-bold text-primary">{filteredClass === "All" ? "All applications" : filteredClass}</h1></div>
          <div className="flex gap-2 w-full sm:w-auto flex-wrap">
            <Select value={filteredSession} onValueChange={setFilteredSession}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Session" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Sessions</SelectItem>
                {SESSION_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filteredStatus} onValueChange={setFilteredStatus}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent><SelectItem value="All">All statuses</SelectItem><SelectItem value="Pending">Pending</SelectItem><SelectItem value="Approved">Approved</SelectItem><SelectItem value="Rejected">Rejected</SelectItem></SelectContent>
            </Select>
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-full sm:w-56" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <DashboardStat icon={BarChart3} label="Total applications" value={applications.length} />
          <DashboardStat icon={Clock3} label="Pending review" value={applications.filter(a => a.status === "Pending").length} tone="amber" />
          <DashboardStat icon={CheckCircle2} label="Approved" value={applications.filter(a => a.status === "Approved").length} tone="green" />
          <DashboardStat icon={XCircle} label="Rejected" value={applications.filter(a => a.status === "Rejected").length} tone="red" />
        </div>
        <div className="mb-6 rounded-xl border bg-card p-4"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Application pipeline</h2><p className="text-sm text-muted-foreground">Use the status filter or update an application directly from the list below.</p></div><span className="text-sm text-muted-foreground">{filteredApps.length} matching</span></div><div className="mt-4 grid grid-cols-3 gap-2">{(["Pending", "Approved", "Rejected"] as const).map(status => <button key={status} onClick={() => setFilteredStatus(filteredStatus === status ? "All" : status)} className={`rounded-lg border p-3 text-left transition-colors ${filteredStatus === status ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}><p className="text-xs text-muted-foreground">{status}</p><p className="mt-1 text-xl font-bold">{applications.filter(a => a.status === status).length}</p></button>)}</div></div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="admission">Admissions ({filteredApps.length})</TabsTrigger>
            <TabsTrigger value="test">Admission Tests ({filteredTests.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="admission">
            <div className="flex gap-2 mb-3 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => exportAdmissions()}>
                <Download className="mr-1 h-4 w-4" /> Export All
              </Button>
              <Select onValueChange={(v) => exportAdmissions(v)}>
                <SelectTrigger className="w-44 h-9 text-sm"><SelectValue placeholder="Export Class-wise" /></SelectTrigger>
                <SelectContent>{CLASS_OPTIONS.map(cls => <SelectItem key={cls} value={cls}>{cls}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead>Application Number</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Father's Name</TableHead>
                    <TableHead>Village</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : filteredApps.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No applications found.</TableCell></TableRow>
                  ) : filteredApps.map(app => (
                    <TableRow key={app.id}>
                      <TableCell className="font-mono text-xs">{app.application_id}{app.student_code && <div className="text-primary font-semibold">{app.student_code}</div>}</TableCell>
                      <TableCell>{normalizeClass(app.desired_class) || app.desired_class}</TableCell>
                      <TableCell className="font-medium">{app.full_name}</TableCell>
                      <TableCell>{app.father_name}</TableCell>
                      <TableCell>{app.present_vill || "—"}</TableCell>
                      <TableCell>{app.mobile_no}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {app.is_synced && <Badge variant="secondary" className="whitespace-nowrap">{app.is_fee_synced ? "Synced to EduNest & Fee Portal" : "Synced to EduNest"}</Badge>}
                          {app.is_synced && (app.fee_sync_status === "failed" || app.fee_sync_status === "pending") && <Badge variant={app.fee_sync_status === "failed" ? "destructive" : "outline"} className="whitespace-nowrap" title={app.fee_sync_error || undefined}>Fee Portal {app.fee_sync_status}</Badge>}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Actions for ${app.application_id}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuLabel>{app.application_id} · {app.status}</DropdownMenuLabel><DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={() => window.open(`/print/admission/${app.id}?view=true`, "_blank", "noopener,noreferrer")}><Eye className="mr-2 h-4 w-4" /> View details</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => navigate(`/print/admission/${app.id}`)}><Printer className="mr-2 h-4 w-4" /> Print application</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => { setEditUploads([]); setEditApp({ ...app, desired_class: normalizeClass(app.desired_class) || app.desired_class }); }}><Pencil className="mr-2 h-4 w-4" /> Edit application</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {app.status !== "Approved" && <DropdownMenuItem onSelect={() => void updateAppStatus(app.id, "Approved")}><BadgeCheck className="mr-2 h-4 w-4" /> Approve</DropdownMenuItem>}
                              {app.status !== "Rejected" && <DropdownMenuItem onSelect={() => void updateAppStatus(app.id, "Rejected")}><Ban className="mr-2 h-4 w-4" /> Reject</DropdownMenuItem>}
                              {app.status !== "Pending" && <DropdownMenuItem onSelect={() => void updateAppStatus(app.id, "Pending")}><Clock3 className="mr-2 h-4 w-4" /> Set pending</DropdownMenuItem>}
                              {app.status === "Approved" && app.student_code && !app.is_synced && <DropdownMenuItem onSelect={() => { setSyncApp(app); setSection(""); setRollNumber(""); setAdmissionFee(feeDefaults.admission_fee); setMonthlyFee(feeDefaults.monthly_fee); }}><Plus className="mr-2 h-4 w-4" /> Add to System</DropdownMenuItem>}
                              {app.status === "Approved" && app.is_synced && (app.fee_sync_status === "failed" || (app.fee_sync_status === "pending" && Boolean(app.fee_sync_error))) && <DropdownMenuItem onSelect={() => void retryFeePortal(app)}><RefreshCw className="mr-2 h-4 w-4" /> Retry Fee Portal sync</DropdownMenuItem>}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="test">
            <div className="flex gap-2 mb-3 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => exportTests()}>
                <Download className="mr-1 h-4 w-4" /> Export All
              </Button>
              <Select onValueChange={(v) => exportTests(v)}>
                <SelectTrigger className="w-44 h-9 text-sm"><SelectValue placeholder="Export Class-wise" /></SelectTrigger>
                <SelectContent>{CLASS_OPTIONS.map(cls => <SelectItem key={cls} value={cls}>{cls}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead>Test ID</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Father's Name</TableHead>
                    <TableHead>Village</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : filteredTests.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No test applications found.</TableCell></TableRow>
                  ) : filteredTests.map(test => (
                    <TableRow key={test.id}>
                      <TableCell className="font-mono text-xs">{test.test_id}</TableCell>
                      <TableCell>{normalizeClass(test.applying_for_class) || test.applying_for_class}</TableCell>
                      <TableCell className="font-medium">{test.student_name}</TableCell>
                      <TableCell>{test.father_name}</TableCell>
                      <TableCell>{test.village || "—"}</TableCell>
                      <TableCell>{test.mobile_no}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Actions for ${test.test_id}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>{test.test_id} · {test.status}</DropdownMenuLabel><DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => window.open(`/print/test/${test.id}?view=true`, "_blank", "noopener,noreferrer")}><Eye className="mr-2 h-4 w-4" /> View details</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => navigate(`/print/test/${test.id}`)}><Printer className="mr-2 h-4 w-4" /> Print application</DropdownMenuItem>
                            {test.status === "Approved" && <DropdownMenuItem onSelect={() => navigate(`/print/admit-card/${test.id}`)}><ArrowDownToLine className="mr-2 h-4 w-4" /> Print admit card</DropdownMenuItem>}
                            <DropdownMenuItem onSelect={() => setEditTest({ ...test, applying_for_class: normalizeClass(test.applying_for_class) || test.applying_for_class })}><Pencil className="mr-2 h-4 w-4" /> Edit application</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {test.status !== "Approved" && <DropdownMenuItem onSelect={() => void updateTestStatus(test.id, "Approved")}><BadgeCheck className="mr-2 h-4 w-4" /> Approve</DropdownMenuItem>}
                            {test.status !== "Rejected" && <DropdownMenuItem onSelect={() => void updateTestStatus(test.id, "Rejected")}><Ban className="mr-2 h-4 w-4" /> Reject</DropdownMenuItem>}
                            {test.status !== "Pending" && <DropdownMenuItem onSelect={() => void updateTestStatus(test.id, "Pending")}><Clock3 className="mr-2 h-4 w-4" /> Set pending</DropdownMenuItem>}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Add to System Dialog */}
      <Dialog open={!!syncApp} onOpenChange={(o) => { if (!o && !syncingId) { setSyncApp(null); setSection(""); setRollNumber(""); setAdmissionFee("0"); setMonthlyFee("0"); } }}>
        <DialogContent className="max-w-md">
          {syncApp && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-primary">Add to System — EduNest</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div><Label>Student Name</Label><Input value={syncApp.full_name || ""} readOnly /></div>
                <div><Label>Class</Label><Input value={normalizeClass(syncApp.desired_class) || syncApp.desired_class || ""} readOnly /></div>
                <div>
                  <Label>Section *</Label>
                  <Select value={section} onValueChange={setSection}>
                    <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                    <SelectContent>
                      {["GREEN", "VIOLET", "BLUE", "ORANGE"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label htmlFor="sync-roll-number">Roll Number <span className="text-muted-foreground">(optional)</span></Label><Input id="sync-roll-number" value={rollNumber} onChange={(event) => setRollNumber(event.target.value)} placeholder="Enter roll number" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label htmlFor="sync-admission-fee">Admission Fee</Label><Input id="sync-admission-fee" type="number" min="0" step="0.01" value={admissionFee} onChange={(event) => setAdmissionFee(event.target.value)} /></div>
                  <div><Label htmlFor="sync-monthly-fee">Monthly Fee</Label><Input id="sync-monthly-fee" type="number" min="0" step="0.01" value={monthlyFee} onChange={(event) => setMonthlyFee(event.target.value)} /></div>
                </div>
                <p className="text-xs text-muted-foreground">Fee values begin with the admin defaults. Changes here apply to this sync only.</p>
              </div>
              <Button className="w-full" disabled={!section || syncingId === syncApp.id} onClick={confirmSync}>
                {syncingId === syncApp.id ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Syncing...</> : "Confirm & Sync"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Application Dialog */}
      <Dialog open={!!editApp} onOpenChange={(open) => { if (!open && !savingEdit) { void cleanupUploads(editUploads); setEditUploads([]); setEditApp(null); } }}>
        <DialogContent className="max-h-[90dvh] max-w-4xl overflow-y-auto">
          {editApp && (
            <>
              <DialogHeader>
                <DialogTitle className="text-primary">Edit Application — {editApp.application_id}</DialogTitle>
              </DialogHeader>
              <div className="mt-4 space-y-5">
                <section><h3 className="mb-3 font-semibold">Student, guardian, address and form details</h3><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {APP_EDIT_FIELDS.map(field => <div key={field.key} className="min-w-0 space-y-1.5">
                    <Label htmlFor={`edit-${field.key}`} className="text-xs">{field.label}</Label>
                    {field.type === "textarea" ? <Textarea id={`edit-${field.key}`} value={editApp[field.key] || ""} onChange={event => setEditApp({ ...editApp, [field.key]: event.target.value })} />
                      : field.type === "class" || field.type === "session" || field.type === "sex" || field.type === "religion" ? <Select value={field.type === "class" ? normalizeClass(editApp[field.key]) : editApp[field.key] || ""} onValueChange={value => setEditApp({ ...editApp, [field.key]: value })}>
                        <SelectTrigger id={`edit-${field.key}`} className="w-full max-w-full"><SelectValue placeholder={`Select ${field.label.toLowerCase()}`} /></SelectTrigger><SelectContent className="max-w-[calc(100vw-2rem)]">{(field.type === "class" ? CLASS_OPTIONS : field.type === "session" ? SESSION_OPTIONS : field.type === "sex" ? SEX_OPTIONS : RELIGION_OPTIONS).map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
                      </Select>
                      : <Input id={`edit-${field.key}`} type={field.type || (field.key.includes("fee") ? "number" : "text")} value={editApp[field.key] ?? ""} onChange={event => setEditApp({ ...editApp, [field.key]: event.target.value })} />}
                  </div>)}
                </div></section>
                <section><h3 className="mb-3 font-semibold">Photo and supporting documents</h3><div className="grid gap-3 sm:grid-cols-2">{APP_FILES.map(fileField => <div key={fileField.key} className="min-w-0 rounded-lg border p-3">
                  <Label className="text-sm">{fileField.label}</Label>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {editApp[fileField.key] ? <><Button type="button" size="sm" variant="outline" onClick={() => void openApplicationFile(fileField)}><Eye className="mr-1 h-4 w-4" /> View current</Button><span className="max-w-full truncate text-xs text-muted-foreground" title={editApp[fileField.key]}>{editApp[fileField.key]}</span><Button type="button" size="icon" variant="ghost" aria-label={`Remove ${fileField.label}`} onClick={() => setEditApp({ ...editApp, [fileField.key]: null })}><X className="h-4 w-4" /></Button></> : <span className="text-xs text-muted-foreground">No file attached</span>}
                    <Label className="inline-flex min-h-9 cursor-pointer items-center rounded-md border px-3 text-sm hover:bg-muted"><ImagePlus className="mr-2 h-4 w-4" /> Replace / upload<Input type="file" className="sr-only" accept={fileField.key === "photo_url" ? "image/*" : "image/*,application/pdf"} onChange={event => { const selected = event.target.files?.[0]; void uploadEditedFile(fileField, selected); event.target.value = ""; }} /></Label>
                  </div>
                </div>)}</div></section>
                <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">Current status ({editApp.status}) and generated student code are unchanged by this edit.</div>
                <Button onClick={() => void saveEditApp()} className="w-full" disabled={savingEdit}>{savingEdit ? "Saving…" : "Save Changes"}</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Test Dialog */}
      <Dialog open={!!editTest} onOpenChange={() => setEditTest(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {editTest && (
            <>
              <DialogHeader>
                <DialogTitle className="text-primary">Edit Test — {editTest.test_id}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Student Name</Label>
                    <Input value={editTest.student_name || ""} onChange={e => setEditTest({ ...editTest, student_name: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Father's Name</Label>
                    <Input value={editTest.father_name || ""} onChange={e => setEditTest({ ...editTest, father_name: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Mobile</Label>
                    <Input value={editTest.mobile_no || ""} onChange={e => setEditTest({ ...editTest, mobile_no: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Village</Label>
                    <Input value={editTest.village || ""} onChange={e => setEditTest({ ...editTest, village: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Public status remark</Label>
                  <Textarea value={editTest.remarks || ""} onChange={e => setEditTest({ ...editTest, remarks: e.target.value })} placeholder="Shown in Quick Application Tracker for needs-action or rejected tests." />
                </div>
                <Button onClick={saveEditTest} className="w-full">Save Changes</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const DashboardStat = ({ icon: Icon, label, value, tone = "primary" }: { icon: typeof BarChart3; label: string; value: number; tone?: "primary" | "amber" | "green" | "red" }) => (
  <div className="rounded-xl border bg-card p-4 shadow-sm">
    <Icon className={`h-5 w-5 ${tone === "amber" ? "text-accent-foreground" : tone === "green" ? "text-success" : tone === "red" ? "text-destructive" : "text-primary"}`} />
    <p className="mt-3 text-2xl font-bold">{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);

export default AdminDashboard;
