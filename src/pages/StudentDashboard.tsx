import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ClipboardList, FileText, LogOut, Printer, Search, Eye, ArrowRight, CheckCircle2, Circle, Clock3, Home, MoreHorizontal, ArrowDownToLine } from "lucide-react";
import { normalizeClass } from "@/lib/supabase-helpers";

const StudentDashboard = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "admissions");
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/student/login", { replace: true }); return; }
      const [apps, admissionTests] = await Promise.all([
        supabase.from("applications").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false }),
        supabase.from("admission_tests").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false }),
      ]);
      if (active) {
        setApplications(apps.data || []);
        setTests(admissionTests.data || []);
        setLoading(false);
      }
    };
    void init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate("/student/login", { replace: true });
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [navigate]);

  const changeTab = (tab: string) => { setActiveTab(tab); setSearchParams({ tab }); };
  const logout = async () => { await supabase.auth.signOut(); navigate("/"); };
  const matches = (item: any, id: string, name: string) => !search || item[id]?.toLowerCase().includes(search.toLowerCase()) || item[name]?.toLowerCase().includes(search.toLowerCase());
  const filteredApps = applications.filter(app => matches(app, "application_id", "full_name"));
  const filteredTests = tests.filter(test => matches(test, "test_id", "student_name"));

  return <div className="min-h-screen bg-background">
    <header className="bg-primary text-primary-foreground"><div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6"><div className="flex items-center gap-3"><img src="/lovable-uploads/b3369ca5-553a-4c65-961b-27d4deb3ca86.jpg" alt="School logo" className="h-10 w-10 rounded-full border border-primary-foreground/30" /><div><h1 className="font-bold">My admission dashboard</h1><p className="text-xs text-primary-foreground/70">Alor Disha Islamic School</p></div></div><div className="flex gap-1"><Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" onClick={() => navigate("/")}><Home className="mr-1 h-4 w-4" /> <span className="hidden sm:inline">View Website</span></Button><Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" onClick={logout}><LogOut className="mr-1 h-4 w-4" /> Sign out</Button></div></div></header>
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <section className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border"><p className="text-sm font-semibold text-primary">Welcome back</p><div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h2 className="text-2xl font-bold">Keep your admission on track.</h2><p className="mt-1 text-sm text-muted-foreground">Apply, view your status, and download documents from one place.</p></div><div className="flex flex-col gap-2 sm:flex-row"><Button onClick={() => navigate("/student/new-admission")}><FileText className="mr-2 h-4 w-4" /> New application</Button><Button variant="outline" onClick={() => navigate("/student/admission-test")}><ClipboardList className="mr-2 h-4 w-4" /> Admission test</Button></div></div></section>
      <div className="grid gap-4 sm:grid-cols-3"><Stat label="Applications" value={applications.length} /><Stat label="Under review" value={applications.filter(app => app.status === "Pending").length} tone="amber" /><Stat label="Approved" value={applications.filter(app => app.status === "Approved").length} tone="green" /></div>
      <section className="rounded-xl border bg-card p-4 shadow-sm"><div className="relative mb-4 max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search by name or ID" value={search} onChange={event => setSearch(event.target.value)} /></div>
        <Tabs value={activeTab} onValueChange={changeTab}><TabsList className="grid w-full grid-cols-2 sm:w-auto"><TabsTrigger value="admissions">Applications ({applications.length})</TabsTrigger><TabsTrigger value="tests">Tests ({tests.length})</TabsTrigger></TabsList>
          <TabsContent value="admissions" className="mt-4"><div className="overflow-x-auto rounded-lg border"><Table className="min-w-[760px]"><TableHeader><TableRow><TableHead>Application Number</TableHead><TableHead>Class</TableHead><TableHead>Student Name</TableHead><TableHead>Father’s Name</TableHead><TableHead>Village</TableHead><TableHead>Phone Number</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>{loading ? <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Loading your applications…</TableCell></TableRow> : filteredApps.length ? filteredApps.map(app => <TableRow key={app.id}><TableCell className="font-mono text-xs"><div>{app.application_id}</div><Badge className="mt-1" variant="secondary">{app.status}</Badge><Timeline status={app.status} /></TableCell><TableCell>{normalizeClass(app.desired_class) || app.desired_class}</TableCell><TableCell className="font-medium">{app.full_name}</TableCell><TableCell>{app.father_name}</TableCell><TableCell>{app.present_vill || "—"}</TableCell><TableCell>{app.mobile_no}</TableCell><TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Actions for ${app.application_id}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-52"><DropdownMenuLabel>Application actions</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => window.open(`/print/admission/${app.id}?view=true`, "_blank", "noopener,noreferrer")}><Eye className="mr-2 h-4 w-4" /> View application</DropdownMenuItem><DropdownMenuItem onSelect={() => navigate(`/print/admission/${app.id}`)}><Printer className="mr-2 h-4 w-4" /> Print application</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow>) : <TableRow><TableCell colSpan={7}><Empty text="No applications yet. Start a new application when you are ready." /></TableCell></TableRow>}</TableBody></Table></div></TabsContent>
          <TabsContent value="tests" className="mt-4"><div className="overflow-x-auto rounded-lg border"><Table className="min-w-[760px]"><TableHeader><TableRow><TableHead>Application Number</TableHead><TableHead>Class</TableHead><TableHead>Student Name</TableHead><TableHead>Father’s Name</TableHead><TableHead>Village</TableHead><TableHead>Phone Number</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>{loading ? <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Loading your test applications…</TableCell></TableRow> : filteredTests.length ? filteredTests.map(test => <TableRow key={test.id}><TableCell className="font-mono text-xs"><div>{test.test_id}</div><Badge className="mt-1" variant="secondary">{test.status}</Badge></TableCell><TableCell>{normalizeClass(test.applying_for_class) || test.applying_for_class}</TableCell><TableCell className="font-medium">{test.student_name}</TableCell><TableCell>{test.father_name}</TableCell><TableCell>{test.village || "—"}</TableCell><TableCell>{test.mobile_no}</TableCell><TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Actions for ${test.test_id}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-52"><DropdownMenuLabel>Test actions</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => window.open(`/print/test/${test.id}?view=true`, "_blank", "noopener,noreferrer")}><Eye className="mr-2 h-4 w-4" /> View application</DropdownMenuItem><DropdownMenuItem onSelect={() => navigate(`/print/test/${test.id}`)}><Printer className="mr-2 h-4 w-4" /> Print application</DropdownMenuItem>{test.status === "Approved" && <DropdownMenuItem onSelect={() => navigate(`/print/admit-card/${test.id}`)}><ArrowDownToLine className="mr-2 h-4 w-4" /> Print admit card</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu></TableCell></TableRow>) : <TableRow><TableCell colSpan={7}><Empty text="No admission test applications yet." /></TableCell></TableRow>}</TableBody></Table></div></TabsContent>
        </Tabs>
      </section>
    </main>
  </div>;
};

const Stat = ({ label, value, tone = "primary" }: { label: string; value: number; tone?: "primary" | "amber" | "green" }) => <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">{label}</p><p className={`mt-1 text-3xl font-bold ${tone === "amber" ? "text-accent-foreground" : tone === "green" ? "text-success" : "text-primary"}`}>{value}</p></CardContent></Card>;
const Timeline = ({ status }: { status: string }) => { const steps = ["Submitted", "Under review", status === "Rejected" ? "Decision" : "Approved"]; const current = status === "Approved" || status === "Rejected" ? 2 : 1; return <div className="mt-2 flex flex-wrap gap-x-2 text-[10px] text-muted-foreground">{steps.map((step, index) => <span key={step} className="inline-flex items-center gap-1">{index < current ? <CheckCircle2 className="h-3 w-3 text-primary" /> : <Circle className="h-3 w-3" />}{step}</span>)}</div>; };
const Empty = ({ text }: { text: string }) => <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{text}<ArrowRight className="ml-1 inline h-4 w-4" /></div>;
export default StudentDashboard;
