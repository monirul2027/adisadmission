import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save } from "lucide-react";
import { checkUserRole } from "@/lib/supabase-helpers";

const FIELD_LABELS: Record<string, string> = {
  name_bengali: "Name in Bengali",
  aadhar_no: "Aadhar Card No",
  health_issue: "Health Issue",
  guardian_name: "Guardian Name",
  guardian_relation: "Guardian Relation",
  last_attended_class: "Last Attended Class",
  last_institution: "Last Institution",
  father_occupation: "Father's Occupation",
  father_qualification: "Father's Qualification",
  mother_occupation: "Mother's Occupation",
  mother_qualification: "Mother's Qualification",
};

const FormSettings = () => {
  const [fieldVisibility, setFieldVisibility] = useState<Record<string, boolean>>({});
  const [admitCardInstructions, setAdmitCardInstructions] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/admin/login"); return; }
      const role = await checkUserRole(session.user.id);
      if (role !== "admin") { navigate("/"); return; }

      const { data } = await supabase.from("form_settings").select("*");
      if (data) {
        const fields = data.find(d => d.setting_key === "admission_form_fields");
        const instructions = data.find(d => d.setting_key === "admit_card_instructions");
        if (fields) setFieldVisibility(fields.setting_value as Record<string, boolean>);
        if (instructions) setAdmitCardInstructions((instructions.setting_value as any)?.text || "");
      }
      setLoading(false);
    };
    init();
  }, [navigate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        supabase.from("form_settings").update({ setting_value: fieldVisibility }).eq("setting_key", "admission_form_fields"),
        supabase.from("form_settings").update({ setting_value: { text: admitCardInstructions } }).eq("setting_key", "admit_card_instructions"),
      ]);
      toast({ title: "Settings saved!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;

  return (
    <div className="min-h-screen bg-secondary">
      <header className="bg-primary text-primary-foreground py-4 px-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-white/10" onClick={() => navigate("/admin/dashboard")}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <h1 className="text-lg font-bold">Form Settings</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Admission Form Field Visibility</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(FIELD_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <Label className="text-sm">{label}</Label>
                <Switch
                  checked={fieldVisibility[key] !== false}
                  onCheckedChange={(v) => setFieldVisibility(prev => ({ ...prev, [key]: v }))}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Admit Card Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={admitCardInstructions}
              onChange={(e) => setAdmitCardInstructions(e.target.value)}
              rows={6}
              placeholder="Enter instructions that will appear on the admit card..."
            />
          </CardContent>
        </Card>

        <Button onClick={handleSave} className="w-full" disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
};

export default FormSettings;
