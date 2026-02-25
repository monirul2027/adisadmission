import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Download, LogOut, Search, Printer, Plus, Settings, Edit, ClipboardList } from "lucide-react";
import { CLASS_OPTIONS, SESSION_OPTIONS, checkUserRole } from "@/lib/supabase-helpers";
import { getSafeErrorMessage } from "@/lib/safe-error";
import * as XLSX from "xlsx";

const ALL_CLASSES = ["All", ...CLASS_OPTIONS];

const AdminDashboard = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [filteredClass, setFilteredClass] = useState("All");
  const [filteredSession, setFilteredSession] = useState("All");
  const [search, setSearch] = useState("");
  const [editApp, setEditApp] = useState<any>(null);
  const [editTest, setEditTest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("admission");
  const { toast } = useToast();
  const navigate = useNavigate();

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
    const [appRes, testRes] = await Promise.all([
      supabase.from("applications").select("*").order("created_at", { ascending: false }),
      supabase.from("admission_tests").select("*").order("created_at", { ascending: false }),
    ]);
    if (appRes.data) setApplications(appRes.data);
    if (testRes.data) setTests(testRes.data);
    setLoading(false);
  };

  const updateAppStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("applications").update({ status }).eq("id", id);
    if (error) { toast({ title: "Error", description: getSafeErrorMessage(error), variant: "destructive" }); return; }
    setApplications(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    toast({ title: "Status updated" });
  };

  const updateTestStatus = async (id: string, status: string) => {
    let updateData: any = { status };
    if (status === "Approved") {
      // Generate roll number
      const test = tests.find(t => t.id === id);
      if (test && !test.roll_no) {
        try {
          const { data } = await supabase.functions.invoke("generate-id", {
            body: { type: "roll_no", session: test.session, class_name: test.applying_for_class },
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
    const classMatch = filteredClass === "All" || a.desired_class === filteredClass;
    const sessionMatch = filteredSession === "All" || a.session === filteredSession;
    const searchMatch = !search || a.full_name?.toLowerCase().includes(search.toLowerCase()) || a.application_id?.toLowerCase().includes(search.toLowerCase());
    return classMatch && sessionMatch && searchMatch;
  });

  const filteredTests = tests.filter(t => {
    const classMatch = filteredClass === "All" || t.applying_for_class === filteredClass;
    const sessionMatch = filteredSession === "All" || t.session === filteredSession;
    const searchMatch = !search || t.student_name?.toLowerCase().includes(search.toLowerCase()) || t.test_id?.toLowerCase().includes(search.toLowerCase());
    return classMatch && sessionMatch && searchMatch;
  });

  const exportAdmissions = (classFilter?: string) => {
    const data = classFilter && classFilter !== "All"
      ? applications.filter(a => a.desired_class === classFilter)
      : filteredApps;
    const exportData = data.map(a => ({
      "Application ID": a.application_id, "Name": a.full_name, "Father": a.father_name,
      "Class": a.desired_class, "Session": a.session || "", "DOB": a.date_of_birth,
      "Sex": a.sex, "Religion": a.religion, "Mobile": a.mobile_no,
      "Monthly Fees": a.monthly_fees || "", "Admission Fee": a.admission_fee || "",
      "Status": a.status, "Applied On": new Date(a.created_at).toLocaleDateString(),
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Admissions");
    XLSX.writeFile(wb, `Admissions_${classFilter || filteredClass}_${Date.now()}.xlsx`);
  };

  const exportTests = () => {
    const exportData = filteredTests.map(t => ({
      "Test ID": t.test_id, "Name": t.student_name, "Father": t.father_name,
      "Class": t.applying_for_class, "Session": t.session, "Mobile": t.mobile_no,
      "Roll No": t.roll_no || "", "Status": t.status,
      "Applied On": new Date(t.created_at).toLocaleDateString(),
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tests");
    XLSX.writeFile(wb, `AdmissionTests_${Date.now()}.xlsx`);
  };

  const saveEditApp = async () => {
    if (!editApp) return;
    const { id, ...rest } = editApp;
    const { error } = await supabase.from("applications").update(rest).eq("id", id);
    if (error) { toast({ title: "Error", description: getSafeErrorMessage(error), variant: "destructive" }); return; }
    setApplications(prev => prev.map(a => a.id === id ? editApp : a));
    setEditApp(null);
    toast({ title: "Application updated" });
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
          <img src="/lovable-uploads/b3369ca5-553a-4c65-961b-27d4deb3ca86.jpg" alt="Logo" className="mx-auto h-12 w-12 rounded-full bg-white p-0.5 mb-2" />
          <h2 className="font-bold text-sm">Admin Dashboard</h2>
          <p className="text-xs opacity-75">Alor Disha Islamic School</p>
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
          <Button variant="ghost" size="sm" className="w-full text-sidebar-foreground hover:bg-sidebar-accent justify-start" onClick={() => navigate("/admin/settings")}>
            <Settings className="mr-2 h-4 w-4" /> Form Settings
          </Button>
          <Button variant="ghost" size="sm" className="w-full text-sidebar-foreground hover:bg-sidebar-accent justify-start" onClick={handleLogout}>
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
            <SelectContent>{ALL_CLASSES.map(cls => <SelectItem key={cls} value={cls}>{cls}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <h1 className="text-2xl font-bold text-primary">
            {filteredClass === "All" ? "All Applications" : filteredClass}
          </h1>
          <div className="flex gap-2 w-full sm:w-auto flex-wrap">
            <Select value={filteredSession} onValueChange={setFilteredSession}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Session" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Sessions</SelectItem>
                {SESSION_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-full sm:w-56" />
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="admission">Admissions ({filteredApps.length})</TabsTrigger>
            <TabsTrigger value="test">Admission Tests ({filteredTests.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="admission">
            <div className="flex gap-2 mb-3 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => exportAdmissions()}>
                <Download className="mr-1 h-4 w-4" /> Export Current
              </Button>
              <Select onValueChange={(v) => exportAdmissions(v)}>
                <SelectTrigger className="w-44 h-9 text-sm"><SelectValue placeholder="Export Class-wise" /></SelectTrigger>
                <SelectContent>{CLASS_OPTIONS.map(cls => <SelectItem key={cls} value={cls}>{cls}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead>Application No.</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Father's Name</TableHead>
                    <TableHead>Village</TableHead>
                    <TableHead>P.O</TableHead>
                    <TableHead>P.S</TableHead>
                    <TableHead>District</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : filteredApps.length === 0 ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No applications found.</TableCell></TableRow>
                  ) : filteredApps.map(app => (
                    <TableRow key={app.id}>
                      <TableCell className="font-mono text-xs">{app.application_id}</TableCell>
                      <TableCell>{app.desired_class}</TableCell>
                      <TableCell className="font-medium">{app.full_name}</TableCell>
                      <TableCell>{app.father_name}</TableCell>
                      <TableCell>{app.present_vill || "—"}</TableCell>
                      <TableCell>{app.present_po || "—"}</TableCell>
                      <TableCell>{app.present_ps || "—"}</TableCell>
                      <TableCell>{app.present_dist || "—"}</TableCell>
                      <TableCell>{app.mobile_no}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 flex-wrap">
                          <Select value={app.status} onValueChange={v => updateAppStatus(app.id, v)}>
                            <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Pending">Pending</SelectItem>
                              <SelectItem value="Approved">Approved</SelectItem>
                              <SelectItem value="Rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate(`/print/admission/${app.id}`)}>
                            <Printer className="mr-1 h-3 w-3" /> Print
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditApp({ ...app })}>
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="test">
            <div className="mb-3">
              <Button size="sm" variant="outline" onClick={exportTests}>
                <Download className="mr-1 h-4 w-4" /> Export Tests
              </Button>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead>Test ID</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Father's Name</TableHead>
                    <TableHead>Village</TableHead>
                    <TableHead>P.O</TableHead>
                    <TableHead>P.S</TableHead>
                    <TableHead>District</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : filteredTests.length === 0 ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No test applications found.</TableCell></TableRow>
                  ) : filteredTests.map(test => (
                    <TableRow key={test.id}>
                      <TableCell className="font-mono text-xs">{test.test_id}</TableCell>
                      <TableCell>{test.applying_for_class}</TableCell>
                      <TableCell className="font-medium">{test.student_name}</TableCell>
                      <TableCell>{test.father_name}</TableCell>
                      <TableCell>{test.village || "—"}</TableCell>
                      <TableCell>{test.po || "—"}</TableCell>
                      <TableCell>{test.ps || "—"}</TableCell>
                      <TableCell>{test.dist || "—"}</TableCell>
                      <TableCell>{test.mobile_no}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 flex-wrap">
                          <Select value={test.status} onValueChange={v => updateTestStatus(test.id, v)}>
                            <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Pending">Pending</SelectItem>
                              <SelectItem value="Approved">Approved</SelectItem>
                              <SelectItem value="Rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate(`/print/test/${test.id}`)}>
                            <Printer className="mr-1 h-3 w-3" /> Print
                          </Button>
                          {test.status === "Approved" && (
                            <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => navigate(`/print/admit-card/${test.id}`)}>
                              Admit Card
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit Application Dialog */}
      <Dialog open={!!editApp} onOpenChange={() => setEditApp(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {editApp && (
            <>
              <DialogHeader>
                <DialogTitle className="text-primary">Edit Application — {editApp.application_id}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Full Name</Label>
                    <Input value={editApp.full_name || ""} onChange={e => setEditApp({ ...editApp, full_name: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Father's Name</Label>
                    <Input value={editApp.father_name || ""} onChange={e => setEditApp({ ...editApp, father_name: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Mother's Name</Label>
                    <Input value={editApp.mother_name || ""} onChange={e => setEditApp({ ...editApp, mother_name: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Mobile</Label>
                    <Input value={editApp.mobile_no || ""} onChange={e => setEditApp({ ...editApp, mobile_no: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Monthly Fees (₹)</Label>
                    <Input value={editApp.monthly_fees || ""} onChange={e => setEditApp({ ...editApp, monthly_fees: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Admission Fee (₹)</Label>
                    <Input value={editApp.admission_fee || ""} onChange={e => setEditApp({ ...editApp, admission_fee: e.target.value })} />
                  </div>
                </div>
                <Button onClick={saveEditApp} className="w-full">Save Changes</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
