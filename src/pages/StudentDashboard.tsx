import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Search, Plus, FileText, Printer, ClipboardList, Eye } from "lucide-react";

const StudentDashboard = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "admissions");
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/student/login"); return; }
      setUserId(session.user.id);
      fetchData(session.user.id);
    };
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate("/student/login");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchData = async (uid: string) => {
    const [appRes, testRes] = await Promise.all([
      supabase.from("applications").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
      supabase.from("admission_tests").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
    ]);
    if (appRes.data) setApplications(appRes.data);
    if (testRes.data) setTests(testRes.data);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handlePrintForm = (app: any) => {
    navigate(`/print/admission/${app.id}`);
  };

  const handlePrintAdmitCard = (test: any) => {
    navigate(`/print/admit-card/${test.id}`);
  };

  const statusBadge = (status: string) => {
    const variant = status === "Approved" ? "default" : status === "Rejected" ? "destructive" : "secondary";
    return <Badge variant={variant}>{status}</Badge>;
  };

  const filteredApps = applications.filter(a =>
    !search || a.full_name?.toLowerCase().includes(search.toLowerCase()) || a.application_id?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredTests = tests.filter(t =>
    !search || t.student_name?.toLowerCase().includes(search.toLowerCase()) || t.test_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-4 px-4 shadow">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/lovable-uploads/b3369ca5-553a-4c65-961b-27d4deb3ca86.jpg" alt="Logo" className="h-10 w-10 rounded-full bg-white p-0.5" />
            <div>
              <h1 className="text-lg font-bold">Student Dashboard</h1>
              <p className="text-xs opacity-80">Alor Disha Islamic School</p>
            </div>
          </div>
          <Button variant="ghost" className="text-primary-foreground hover:bg-white/10" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary" onClick={() => navigate("/student/new-admission")}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-primary">New Admission</h3>
                <p className="text-sm text-muted-foreground">Apply for admission</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary" onClick={() => navigate("/student/admission-test")}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <ClipboardList className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-primary">Admission Test</h3>
                <p className="text-sm text-muted-foreground">Apply for admission test</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="admissions">My Admissions ({applications.length})</TabsTrigger>
            <TabsTrigger value="tests">My Tests ({tests.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="admissions">
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead>Application ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : filteredApps.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No applications yet.</TableCell></TableRow>
                  ) : filteredApps.map(app => (
                    <TableRow key={app.id}>
                      <TableCell className="font-mono text-xs">{app.application_id}</TableCell>
                      <TableCell className="font-medium">{app.full_name}</TableCell>
                      <TableCell>{app.desired_class}</TableCell>
                      <TableCell>{app.session || "—"}</TableCell>
                      <TableCell>{statusBadge(app.status)}</TableCell>
                      <TableCell className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => window.open(`/print/admission/${app.id}?view=true`, "_blank")}>
                          <Eye className="mr-1 h-3 w-3" /> View
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handlePrintForm(app)}>
                          <Printer className="mr-1 h-3 w-3" /> Print
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="tests">
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead>Test ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : filteredTests.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No test applications yet.</TableCell></TableRow>
                  ) : filteredTests.map(test => (
                    <TableRow key={test.id}>
                      <TableCell className="font-mono text-xs">{test.test_id}</TableCell>
                      <TableCell className="font-medium">{test.student_name}</TableCell>
                      <TableCell>{test.applying_for_class}</TableCell>
                      <TableCell>{test.session}</TableCell>
                      <TableCell>{statusBadge(test.status)}</TableCell>
                      <TableCell className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => window.open(`/print/test/${test.id}?view=true`, "_blank")}>
                          <Eye className="mr-1 h-3 w-3" /> View
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/print/test/${test.id}`)}>
                          <Printer className="mr-1 h-3 w-3" /> Print
                        </Button>
                        {test.status === "Approved" && (
                          <Button size="sm" variant="default" onClick={() => handlePrintAdmitCard(test)}>
                            Admit Card
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StudentDashboard;
