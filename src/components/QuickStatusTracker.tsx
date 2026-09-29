import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type TrackerSettings = { is_enabled: boolean; search_placeholder: string; helper_text: string };
type StatusResult = { found: boolean; student_name: string; applying_for_class: string; status: string; session: string; remarks: string; has_admit_card: boolean };

const statusStyle = (status: string) => {
  const value = status.toLowerCase();
  if (value === "approved") return "bg-emerald-100 text-emerald-800";
  if (value.includes("reject") || value.includes("action")) return "bg-rose-100 text-rose-800";
  return "bg-amber-100 text-amber-800";
};

export default function QuickStatusTracker({ settings }: { settings: TrackerSettings }) {
  const [applicationId, setApplicationId] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StatusResult | null>(null);
  const { toast } = useToast();

  if (!settings.is_enabled) return null;

  const checkStatus = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedPhone = phone.replace(/\D/g, "");
    if (!applicationId.trim() || normalizedPhone.length !== 10) {
      toast({ variant: "destructive", title: "Check your details", description: "Enter an application ID and the registered 10-digit mobile number." });
      return;
    }
    setLoading(true);
    setResult(null);
    const { data, error } = await supabase.rpc("check_application_quick_status", { p_app_id: applicationId.trim(), p_phone: normalizedPhone });
    setLoading(false);
    if (error) {
      toast({ variant: "destructive", title: "Could not check status", description: "Please try again in a moment." });
      return;
    }
    if (!data?.length || !data[0].found) {
      toast({ variant: "destructive", title: "Application not found", description: "The application ID and mobile number do not match our records." });
      return;
    }
    setResult(data[0]);
  };

  return <section id="application-status" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <Card className="overflow-hidden border-primary/15 shadow-lg"><CardContent className="grid gap-6 p-6 md:grid-cols-[.85fr_1.15fr] md:p-8">
      <div><p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary"><ShieldCheck className="h-4 w-4" /> Quick application tracker</p><h2 className="mt-2 text-2xl font-bold">Check your admission status.</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{settings.helper_text}</p></div>
      <div><form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={checkStatus}><div className="space-y-1.5"><Label htmlFor="quick-application-id">Application ID</Label><Input id="quick-application-id" value={applicationId} onChange={(e) => setApplicationId(e.target.value)} placeholder={settings.search_placeholder} /></div><div className="space-y-1.5"><Label htmlFor="quick-mobile">Registered mobile</Label><Input id="quick-mobile" inputMode="numeric" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="10-digit mobile number" /></div><Button type="submit" disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Search className="mr-2 h-4 w-4" /> Check</>}</Button></form>
      {result && <div className="mt-4 rounded-lg border bg-muted/35 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold">{result.student_name}</p><p className="text-sm text-muted-foreground">{result.applying_for_class} · {result.session}</p></div><Badge className={statusStyle(result.status)}>{result.status || "Under review"}</Badge></div><p className="mt-3 text-sm text-muted-foreground">{result.status.toLowerCase() === "approved" ? "Your application has been approved. Sign in to your student portal for the next steps." : result.remarks || "Your application is being verified by the admissions team. Please check again soon."}</p>{result.status.toLowerCase() === "approved" && <Button asChild size="sm" className="mt-3"><Link to="/student/login">Open student portal</Link></Button>}</div>}</div>
    </CardContent></Card>
  </section>;
}
