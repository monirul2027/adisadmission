import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Download, LogOut, Search, Eye, Printer, Plus } from "lucide-react";
import * as XLSX from "xlsx";

const CLASS_OPTIONS = ["All", "LKG", "UKG", "Class I", "Class II", "Class III", "Class IV", "Class V", "Class VI", "Class VII", "Class VIII", "Class IX", "Class X"];

interface Application {
  id: string;
  application_id: string;
  photo_url: string;
  full_name: string;
  date_of_birth: string;
  sex: string;
  religion: string;
  mobile_no: string;
  desired_class: string;
  status: string;
  created_at: string;
  name_bengali?: string;
  aadhar_no?: string;
  health_issue?: string;
  father_name: string;
  father_occupation?: string;
  father_qualification?: string;
  mother_name: string;
  mother_occupation?: string;
  mother_qualification?: string;
  present_vill?: string;
  present_po?: string;
  present_ps?: string;
  present_dist?: string;
  present_pin?: string;
  present_state?: string;
  whatsapp_no?: string;
  permanent_vill?: string;
  permanent_po?: string;
  permanent_ps?: string;
  permanent_dist?: string;
  permanent_pin?: string;
  permanent_state?: string;
  guardian_name?: string;
  guardian_relation?: string;
  last_attended_class?: string;
  last_institution?: string;
  aadhar_doc_url?: string;
  birth_cert_url?: string;
  guardian_signature_url?: string;
  monthly_fees?: string;
  admission_fee?: string;
}

const AdminDashboard = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredClass, setFilteredClass] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [printApp, setPrintApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("applications");
  const { toast } = useToast();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      fetchApplications();
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate("/login");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchApplications = async () => {
    const { data, error } = await supabase.from("applications").select("*").order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setApplications((data as Application[]) || []);
    }
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("applications").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      toast({ title: "Status updated" });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const filtered = applications.filter((a) => {
    const classMatch = filteredClass === "All" || a.desired_class === filteredClass;
    const searchMatch = !search || a.full_name.toLowerCase().includes(search.toLowerCase()) || a.application_id.toLowerCase().includes(search.toLowerCase());
    return classMatch && searchMatch;
  });

  const exportToExcel = () => {
    const exportData = filtered.map((a) => ({
      "Application ID": a.application_id,
      "Name": a.full_name,
      "Father": a.father_name,
      "Class": a.desired_class,
      "DOB": a.date_of_birth,
      "Sex": a.sex,
      "Religion": a.religion,
      "Mobile": a.mobile_no,
      "Monthly Fees": a.monthly_fees || "",
      "Admission Fee": a.admission_fee || "",
      "Status": a.status,
      "Applied On": new Date(a.created_at).toLocaleDateString(),
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Applications");
    XLSX.writeFile(wb, `Applications_${filteredClass}_${Date.now()}.xlsx`);
  };

  const handlePrint = (app: Application) => {
    setPrintApp(app);
    setTimeout(() => window.print(), 300);
  };

  const statusBadge = (status: string) => {
    const variant = status === "Approved" ? "default" : status === "Rejected" ? "destructive" : "secondary";
    return <Badge variant={variant}>{status}</Badge>;
  };

  return (
    <>
      <div className="min-h-screen bg-background flex print:hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-sidebar text-sidebar-foreground flex-shrink-0 hidden md:flex flex-col">
          <div className="p-4 text-center border-b border-sidebar-border">
            <img src="/lovable-uploads/b3369ca5-553a-4c65-961b-27d4deb3ca86.jpg" alt="Logo" className="mx-auto h-14 w-14 rounded-full bg-white p-0.5 mb-2" />
            <h2 className="font-bold text-sm">Alor Disha Islamic School</h2>
            <p className="text-xs opacity-75">Staff Dashboard</p>
          </div>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {CLASS_OPTIONS.map((cls) => (
              <button
                key={cls}
                onClick={() => setFilteredClass(cls)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${filteredClass === cls ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50"}`}
              >
                {cls === "All" ? "📋 All Applications" : `📁 ${cls}`}
              </button>
            ))}
          </nav>
          <div className="p-3 border-t border-sidebar-border space-y-1">
            <Button variant="ghost" className="w-full text-sidebar-foreground hover:bg-sidebar-accent justify-start" onClick={() => navigate("/")}>
              <Plus className="mr-2 h-4 w-4" /> New Admission
            </Button>
            <Button variant="ghost" className="w-full text-sidebar-foreground hover:bg-sidebar-accent justify-start" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 p-4 md:p-6 overflow-x-auto">
          {/* Mobile class filter */}
          <div className="md:hidden mb-4">
            <Select value={filteredClass} onValueChange={setFilteredClass}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CLASS_OPTIONS.map((cls) => <SelectItem key={cls} value={cls}>{cls}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-primary">Applications</h1>
              <p className="text-sm text-muted-foreground">
                {filteredClass === "All" ? "All classes" : filteredClass} — {filtered.length} application(s)
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search name or ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-full sm:w-64" />
              </div>
              <Button onClick={exportToExcel} variant="outline">
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="applications">Applications</TabsTrigger>
              <TabsTrigger value="print">Print Forms</TabsTrigger>
            </TabsList>

            <TabsContent value="applications">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead>Photo</TableHead>
                      <TableHead>App ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Loading...</TableCell></TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">No applications found.</TableCell></TableRow>
                    ) : (
                      filtered.map((app) => (
                        <TableRow key={app.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedApp(app)}>
                          <TableCell><img src={app.photo_url} alt="" className="h-10 w-10 rounded-full object-cover" /></TableCell>
                          <TableCell className="font-mono text-xs">{app.application_id}</TableCell>
                          <TableCell className="font-medium">{app.full_name}</TableCell>
                          <TableCell>{app.desired_class}</TableCell>
                          <TableCell>{app.mobile_no}</TableCell>
                          <TableCell>{new Date(app.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>{statusBadge(app.status)}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Select value={app.status} onValueChange={(v) => updateStatus(app.id, v)}>
                              <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Pending">Pending</SelectItem>
                                <SelectItem value="Approved">Approved</SelectItem>
                                <SelectItem value="Rejected">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="print">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead>App ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Father's Name</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No applications found.</TableCell></TableRow>
                    ) : (
                      filtered.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell className="font-mono text-xs">{app.application_id}</TableCell>
                          <TableCell className="font-medium">{app.full_name}</TableCell>
                          <TableCell>{app.father_name}</TableCell>
                          <TableCell>{app.desired_class}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => handlePrint(app)}>
                              <Printer className="mr-1 h-4 w-4" /> Print
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </main>

        {/* Detail Dialog */}
        <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            {selectedApp && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-primary">Application Details — {selectedApp.application_id}</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 mt-4">
                  <div className="flex items-start gap-4">
                    <img src={selectedApp.photo_url} alt="" className="h-28 w-24 rounded-lg object-cover border" />
                    <div>
                      <h3 className="text-lg font-bold">{selectedApp.full_name}</h3>
                      {selectedApp.name_bengali && <p className="text-sm text-muted-foreground">{selectedApp.name_bengali}</p>}
                      <p className="text-sm mt-1">Class: <span className="font-medium">{selectedApp.desired_class}</span></p>
                      <div className="mt-2">{statusBadge(selectedApp.status)}</div>
                    </div>
                  </div>
                  <DetailSection title="Basic Information">
                    <DetailRow label="Date of Birth" value={selectedApp.date_of_birth} />
                    <DetailRow label="Sex" value={selectedApp.sex} />
                    <DetailRow label="Religion" value={selectedApp.religion} />
                    <DetailRow label="Nationality" value="INDIAN" />
                    <DetailRow label="Aadhar No" value={selectedApp.aadhar_no} />
                    <DetailRow label="Health Issue" value={selectedApp.health_issue} />
                  </DetailSection>
                  <DetailSection title="Parents Information">
                    <DetailRow label="Father's Name" value={selectedApp.father_name} />
                    <DetailRow label="Father's Occupation" value={selectedApp.father_occupation} />
                    <DetailRow label="Father's Qualification" value={selectedApp.father_qualification} />
                    <DetailRow label="Mother's Name" value={selectedApp.mother_name} />
                    <DetailRow label="Mother's Occupation" value={selectedApp.mother_occupation} />
                    <DetailRow label="Mother's Qualification" value={selectedApp.mother_qualification} />
                  </DetailSection>
                  <DetailSection title="Contact Details">
                    <DetailRow label="Mobile" value={selectedApp.mobile_no} />
                    <DetailRow label="WhatsApp" value={selectedApp.whatsapp_no} />
                    <DetailRow label="Present Address" value={[selectedApp.present_vill, selectedApp.present_po, selectedApp.present_ps, selectedApp.present_dist, selectedApp.present_pin, selectedApp.present_state].filter(Boolean).join(", ")} />
                    <DetailRow label="Permanent Address" value={[selectedApp.permanent_vill, selectedApp.permanent_po, selectedApp.permanent_ps, selectedApp.permanent_dist, selectedApp.permanent_pin, selectedApp.permanent_state].filter(Boolean).join(", ")} />
                  </DetailSection>
                  <DetailSection title="Admission & Financial">
                    <DetailRow label="Guardian" value={`${selectedApp.guardian_name || ""} (${selectedApp.guardian_relation || ""})`} />
                    <DetailRow label="Last Class" value={selectedApp.last_attended_class} />
                    <DetailRow label="Last Institution" value={selectedApp.last_institution} />
                    <DetailRow label="Monthly Fees" value={selectedApp.monthly_fees ? `₹${selectedApp.monthly_fees}` : undefined} />
                    <DetailRow label="Admission Fee" value={selectedApp.admission_fee ? `₹${selectedApp.admission_fee}` : undefined} />
                  </DetailSection>
                  {(selectedApp.aadhar_doc_url || selectedApp.birth_cert_url || selectedApp.guardian_signature_url) && (
                    <DetailSection title="Documents">
                      <div className="flex flex-wrap gap-3">
                        {selectedApp.aadhar_doc_url && <a href={selectedApp.aadhar_doc_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary underline"><Eye className="h-4 w-4" /> Aadhar Card</a>}
                        {selectedApp.birth_cert_url && <a href={selectedApp.birth_cert_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary underline"><Eye className="h-4 w-4" /> Birth Certificate</a>}
                        {selectedApp.guardian_signature_url && <a href={selectedApp.guardian_signature_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary underline"><Eye className="h-4 w-4" /> Guardian Signature</a>}
                      </div>
                    </DetailSection>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Print Layout - only visible when printing */}
      {printApp && (
        <div ref={printRef} className="hidden print:block">
          <PrintableForm app={printApp} />
        </div>
      )}
    </>
  );
};

/* =================== Print Layout =================== */
const PrintableForm = ({ app }: { app: Application }) => {
  const addr = (prefix: "present" | "permanent") =>
    [app[`${prefix}_vill`], app[`${prefix}_po`], app[`${prefix}_ps`], app[`${prefix}_dist`], app[`${prefix}_pin`], app[`${prefix}_state`]].filter(Boolean).join(", ");

  return (
    <>
      {/* Page 1 - Main A4 form */}
      <div className="print-page w-[210mm] min-h-[297mm] max-h-[297mm] mx-auto p-[12mm] text-[11px] leading-tight font-sans overflow-hidden box-border">
        {/* Header */}
        <div className="text-center border-b-2 border-black pb-2 mb-3">
          <div className="flex items-center justify-center gap-3">
            <img src="/lovable-uploads/b3369ca5-553a-4c65-961b-27d4deb3ca86.jpg" alt="Logo" className="h-14 w-14 rounded-full" />
            <div>
              <h1 className="text-lg font-bold">Alor Disha Islamic School</h1>
              <p className="text-[9px]">Dakshin Krishnanagar, Malancha-Antardwipa Road, Dhuliyan, Murshidabad, 742202</p>
            </div>
          </div>
          <p className="font-bold mt-1 text-sm">APPLICATION FORM FOR ADMISSION</p>
          <p className="text-[9px]">Application ID: {app.application_id} | Date: {new Date(app.created_at).toLocaleDateString()}</p>
        </div>

        {/* Photo + Basic */}
        <div className="flex gap-3 mb-3">
          <div className="flex-1">
            <PrintTable rows={[
              ["Full Name", app.full_name],
              ["Father's Name", app.father_name],
              ["Class Applied", app.desired_class],
              ["Date of Birth", app.date_of_birth],
              ["Sex", app.sex],
              ["Religion", app.religion],
              ["Nationality", "INDIAN"],
            ]} />
          </div>
          <div className="w-[25mm] h-[30mm] border border-black flex-shrink-0">
            <img src={app.photo_url} alt="Photo" className="w-full h-full object-cover" />
          </div>
        </div>

        <PrintTable rows={[
          ["Aadhar No", app.aadhar_no || "—"],
          ["Health Issue", app.health_issue || "None"],
          ["Name in Bengali", app.name_bengali || "—"],
        ]} />

        <h3 className="font-bold mt-3 mb-1 text-xs border-b border-black">PARENTS / GUARDIAN INFORMATION</h3>
        <PrintTable rows={[
          ["Father's Occupation", app.father_occupation || "—"],
          ["Father's Qualification", app.father_qualification || "—"],
          ["Mother's Name", app.mother_name],
          ["Mother's Occupation", app.mother_occupation || "—"],
          ["Mother's Qualification", app.mother_qualification || "—"],
          ["Guardian Name", app.guardian_name || "—"],
          ["Relation", app.guardian_relation || "—"],
        ]} />

        <h3 className="font-bold mt-3 mb-1 text-xs border-b border-black">CONTACT & ADDRESS</h3>
        <PrintTable rows={[
          ["Present Address", addr("present") || "—"],
          ["Permanent Address", addr("permanent") || "—"],
          ["Phone No", app.mobile_no],
          ["WhatsApp No", app.whatsapp_no || "—"],
        ]} />

        <h3 className="font-bold mt-3 mb-1 text-xs border-b border-black">ADMISSION & FINANCIAL</h3>
        <PrintTable rows={[
          ["Last Attended Class", app.last_attended_class || "—"],
          ["Last Institution", app.last_institution || "—"],
          ["Monthly Fees", app.monthly_fees ? `₹${app.monthly_fees}` : "—"],
          ["Admission Fee", app.admission_fee ? `₹${app.admission_fee}` : "—"],
        ]} />

        {/* Signatures */}
        <div className="flex justify-between mt-8 pt-4">
          <div className="text-center">
            <div className="border-t border-black w-32 mx-auto mb-1"></div>
            <p className="text-[9px]">Guardian's Signature</p>
          </div>
          <div className="text-center">
            <div className="border-t border-black w-32 mx-auto mb-1"></div>
            <p className="text-[9px]">Office Use Only</p>
          </div>
        </div>
      </div>

      {/* Subsequent pages for documents */}
      {app.aadhar_doc_url && (
        <div className="print-page w-[210mm] min-h-[297mm] mx-auto p-[15mm] flex flex-col items-center justify-start">
          <h2 className="text-base font-bold mb-4 text-center">Aadhar Card — {app.full_name} ({app.application_id})</h2>
          <img src={app.aadhar_doc_url} alt="Aadhar Card" className="max-w-full max-h-[250mm] object-contain" />
        </div>
      )}
      {app.birth_cert_url && (
        <div className="print-page w-[210mm] min-h-[297mm] mx-auto p-[15mm] flex flex-col items-center justify-start">
          <h2 className="text-base font-bold mb-4 text-center">Birth Certificate — {app.full_name} ({app.application_id})</h2>
          <img src={app.birth_cert_url} alt="Birth Certificate" className="max-w-full max-h-[250mm] object-contain" />
        </div>
      )}
      {app.guardian_signature_url && (
        <div className="print-page w-[210mm] min-h-[297mm] mx-auto p-[15mm] flex flex-col items-center justify-start">
          <h2 className="text-base font-bold mb-4 text-center">Guardian Signature — {app.full_name} ({app.application_id})</h2>
          <img src={app.guardian_signature_url} alt="Guardian Signature" className="max-w-full max-h-[250mm] object-contain" />
        </div>
      )}
    </>
  );
};

const PrintTable = ({ rows }: { rows: [string, string][] }) => (
  <table className="w-full border-collapse">
    <tbody>
      {rows.map(([label, value], i) => (
        <tr key={i} className="border border-black">
          <td className="border border-black px-2 py-1 font-semibold w-[35%] bg-muted">{label}</td>
          <td className="border border-black px-2 py-1">{value}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

/* =================== Detail Helpers =================== */
const DetailSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h4 className="font-semibold text-primary text-sm mb-2 border-b pb-1">{title}</h4>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">{children}</div>
  </div>
);

const DetailRow = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="flex justify-between py-1 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-right">{value || "—"}</span>
  </div>
);

export default AdminDashboard;
