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
import { ArrowLeft, Save, Upload, Trash2 } from "lucide-react";
import { checkUserRole, uploadFile, validateFileSize, MAX_DOC_SIZE } from "@/lib/supabase-helpers";
import { getSafeErrorMessage } from "@/lib/safe-error";

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
  const [headMasterSignUrl, setHeadMasterSignUrl] = useState("");
  const [examControllerSignUrl, setExamControllerSignUrl] = useState("");
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
        const signatures = data.find(d => d.setting_key === "signature_images");
        if (fields) setFieldVisibility(fields.setting_value as Record<string, boolean>);
        if (instructions) setAdmitCardInstructions((instructions.setting_value as any)?.text || "");
        if (signatures) {
          const sigVal = signatures.setting_value as any;
          setHeadMasterSignUrl(sigVal?.head_master || "");
          setExamControllerSignUrl(sigVal?.exam_controller || "");
        }
      }
      setLoading(false);
    };
    init();
  }, [navigate]);

  const sanitizeInstructions = (text: string): string => {
    return text.replace(/[<>"']/g, '').substring(0, 1000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        supabase.from("form_settings").update({ setting_value: fieldVisibility }).eq("setting_key", "admission_form_fields"),
        supabase.from("form_settings").update({ setting_value: { text: sanitizeInstructions(admitCardInstructions) } }).eq("setting_key", "admit_card_instructions"),
        supabase.from("form_settings").upsert({
          setting_key: "signature_images",
          setting_value: { head_master: headMasterSignUrl, exam_controller: examControllerSignUrl },
        }, { onConflict: "setting_key" }),
      ]);
      toast({ title: "Settings saved!" });
    } catch (err: any) {
      toast({ title: "Error", description: getSafeErrorMessage(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "head_master" | "exam_controller") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateFileSize(file, MAX_DOC_SIZE, "Signature");
    if (err) { toast({ title: "File too large", description: err, variant: "destructive" }); return; }
    const path = await uploadFile("signature-uploads", file, type);
    if (path) {
      if (type === "head_master") setHeadMasterSignUrl(path);
      else setExamControllerSignUrl(path);
      toast({ title: `${type === "head_master" ? "Head Master" : "Exam Controller"} signature uploaded` });
    } else {
      toast({ title: "Upload failed", variant: "destructive" });
    }
  };

  const handleDeleteSignature = (type: "head_master" | "exam_controller") => {
    if (type === "head_master") setHeadMasterSignUrl("");
    else setExamControllerSignUrl("");
    toast({ title: `${type === "head_master" ? "Head Master" : "Exam Controller"} signature removed. Save to apply.` });
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
              maxLength={1000}
              placeholder="Enter instructions that will appear on the admit card..."
            />
            <p className="text-xs text-muted-foreground mt-1">{admitCardInstructions.length}/1000 characters</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Signature Uploads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Head Master Sign</Label>
              <div className="flex items-center gap-3">
                <Input type="file" accept="image/*" onChange={(e) => handleSignatureUpload(e, "head_master")} className="max-w-xs" />
                {headMasterSignUrl && (
                  <>
                    <span className="text-xs text-green-600">✓ Uploaded</span>
                    <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleDeleteSignature("head_master")}>
                      <Trash2 className="mr-1 h-3 w-3" /> Remove
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Exam Controller Sign</Label>
              <div className="flex items-center gap-3">
                <Input type="file" accept="image/*" onChange={(e) => handleSignatureUpload(e, "exam_controller")} className="max-w-xs" />
                {examControllerSignUrl && (
                  <>
                    <span className="text-xs text-green-600">✓ Uploaded</span>
                    <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleDeleteSignature("exam_controller")}>
                      <Trash2 className="mr-1 h-3 w-3" /> Remove
                    </Button>
                  </>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Max 50 KB each. Head Master sign appears on Admission Form & Admit Card. Exam Controller sign appears only on Admit Card.</p>
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
