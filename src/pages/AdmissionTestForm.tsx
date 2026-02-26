import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, ArrowLeft, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { CLASS_OPTIONS, SESSION_OPTIONS, generateIdViaEdge, checkUserRole, uploadFile, validateFileSize, MAX_PHOTO_SIZE } from "@/lib/supabase-helpers";
import { useNavigate } from "react-router-dom";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { admissionTestSchema } from "@/lib/form-validation";

const AdmissionTestForm = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [testId, setTestId] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [session, setSession] = useState("");
  const [applyingClass, setApplyingClass] = useState("");
  const [studentSig, setStudentSig] = useState<File | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) { navigate("/student/login"); return; }
      setUserId(authSession.user.id);
      const role = await checkUserRole(authSession.user.id);
      setIsAdmin(role === "admin");
    };
    checkAuth();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!session || !applyingClass || !userId) {
      toast({ title: "Error", description: "Session and Class are required.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const get = (name: string) => (fd.get(name) as string) || "";

    try {
      // Validate form inputs
      const validationResult = admissionTestSchema.safeParse({
        student_name: get("student_name"),
        father_name: get("father_name"),
        mobile_no: get("mobile_no"),
        whatsapp_no: get("whatsapp_no"),
        occupation: get("occupation"),
        village: get("village"),
        po: get("po"),
        ps: get("ps"),
        dist: get("dist"),
        state: get("state"),
        landmark: get("landmark"),
        present_school: get("present_school"),
        present_class: get("present_class"),
      });

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        toast({ title: "Validation Error", description: `${firstError.path.join(".")}: ${firstError.message}`, variant: "destructive" });
        setLoading(false);
        return;
      }

      const generatedId = await generateIdViaEdge("admission_test", session);

      let studentSigUrl = null;
      if (studentSig) {
        studentSigUrl = await uploadFile("student-documents", studentSig, "student-signatures");
      }

      const insertData: any = {
        user_id: userId,
        test_id: generatedId,
        session,
        applying_for_class: applyingClass,
        student_name: get("student_name"),
        father_name: get("father_name"),
        occupation: get("occupation"),
        village: get("village"),
        po: get("po"),
        ps: get("ps"),
        dist: get("dist"),
        state: get("state"),
        landmark: get("landmark"),
        mobile_no: get("mobile_no"),
        whatsapp_no: get("whatsapp_no"),
        present_school: get("present_school"),
        present_class: get("present_class"),
        student_signature_url: studentSigUrl,
      };

      if (isAdmin) {
        insertData.status = "Approved";
      }

      const { error } = await supabase.from("admission_tests").insert(insertData);
      if (error) throw error;
      setTestId(generatedId);
      setSubmitted(true);
    } catch (err: any) {
      toast({ title: "Submission Failed", description: getSafeErrorMessage(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const backPath = isAdmin ? "/admin/dashboard" : "/student/dashboard";

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
        <Card className="max-w-md w-full text-center p-8">
          <CardContent className="space-y-4">
            <CheckCircle2 className="mx-auto h-16 w-16 text-success" />
            <h2 className="text-2xl font-bold text-primary">Test Application Submitted!</h2>
            <div className="bg-secondary rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Test ID</p>
              <p className="text-2xl font-bold text-primary tracking-wider">{testId}</p>
            </div>
            <p className="text-sm text-muted-foreground">Your admit card will be available once approved.</p>
            <Button onClick={() => navigate(backPath)}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary">
      <div className="bg-primary text-primary-foreground py-6">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <Button variant="ghost" size="sm" className="absolute left-4 top-4 text-primary-foreground hover:bg-white/10" onClick={() => navigate(backPath)}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <img alt="School Logo" className="mx-auto h-20 w-20 rounded-full bg-white p-1 mb-3" src="/lovable-uploads/b3369ca5-553a-4c65-961b-27d4deb3ca86.jpg" />
          <h1 className="text-2xl md:text-3xl font-bold">Alor Disha Islamic School</h1>
          <p className="text-sm opacity-90 mt-1">Dakshin Krishnanagar, Malancha-Antardwipa Road, Dhuliyan, Murshidabad, 742202</p>
          <div className="mt-3 inline-block bg-accent text-accent-foreground px-4 py-1.5 rounded-full text-sm font-semibold">
            Admission Test Application
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <SectionCard title="Session & Class" required>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectField label="Session" value={session} onValueChange={setSession} options={SESSION_OPTIONS} required />
            <SelectField label="Applying for Class" value={applyingClass} onValueChange={setApplyingClass} options={CLASS_OPTIONS} required />
          </div>
        </SectionCard>

        <SectionCard title="Student Information">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Student's Name" name="student_name" required className="md:col-span-2" />
            <FormField label="Father's Name" name="father_name" required />
            <FormField label="Occupation" name="occupation" />
          </div>
        </SectionCard>

        <SectionCard title="Address">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <VillageCombobox
              name="village"
              onAutoFill={(fields) => {
                const form = document.querySelector("form");
                if (!form) return;
                (form.querySelector('[name="po"]') as HTMLInputElement).value = fields.po;
                (form.querySelector('[name="ps"]') as HTMLInputElement).value = fields.ps;
                (form.querySelector('[name="dist"]') as HTMLInputElement).value = fields.dist;
                (form.querySelector('[name="state"]') as HTMLInputElement).value = fields.state;
              }}
            />
            <FormField label="P.O" name="po" />
            <FormField label="P.S" name="ps" />
            <FormField label="District" name="dist" />
            <FormField label="State" name="state" />
            <FormField label="Landmark" name="landmark" />
          </div>
        </SectionCard>

        <SectionCard title="Contact">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Mobile No" name="mobile_no" required type="tel" />
            <FormField label="WhatsApp No" name="whatsapp_no" type="tel" />
          </div>
        </SectionCard>

        <SectionCard title="Present Education">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Present School" name="present_school" />
            <FormField label="Present Class" name="present_class" />
          </div>
        </SectionCard>

        <SectionCard title="Student Signature (Optional)">
          <div className="space-y-2">
            <Label>Upload Student Signature (Max 30 KB)</Label>
            <Input type="file" accept="image/*" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const err = validateFileSize(file, MAX_PHOTO_SIZE, "Student Signature");
                if (err) { toast({ title: "File too large", description: err, variant: "destructive" }); e.target.value = ""; return; }
                setStudentSig(file);
              }
            }} />
          </div>
        </SectionCard>

        <Button type="submit" size="lg" className="w-full text-lg py-6" disabled={loading}>
          {loading ? "Submitting..." : "Submit Test Application"}
        </Button>
      </form>
    </div>
  );
};

const SectionCard = ({ title, required, children }: { title: string; required?: boolean; children: React.ReactNode }) => (
  <Card>
    <CardContent className="pt-6">
      <h3 className="text-lg font-semibold text-primary mb-4 border-b border-border pb-2">
        {title} {required && <span className="text-destructive text-sm">*</span>}
      </h3>
      {children}
    </CardContent>
  </Card>
);

const FormField = ({ label, name, required, type = "text", className = "" }: { label: string; name: string; required?: boolean; type?: string; className?: string }) => (
  <div className={cn("space-y-2", className)}>
    <Label htmlFor={name}>{label} {required && <span className="text-destructive">*</span>}</Label>
    <Input id={name} name={name} type={type} required={required} />
  </div>
);

const SelectField = ({ label, value, onValueChange, options, required }: { label: string; value: string; onValueChange: (v: string) => void; options: string[]; required?: boolean }) => (
  <div className="space-y-2">
    <Label>{label} {required && <span className="text-destructive">*</span>}</Label>
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger><SelectValue placeholder={`Select ${label}`} /></SelectTrigger>
      <SelectContent>
        {options.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
      </SelectContent>
    </Select>
  </div>
);

const VILLAGE_OPTIONS = ["Dakshin Krishnanagar", "Uttar Krishnanagar", "Antardwipa", "Malancha"];

const ADDRESS_MAP: Record<string, { po: string; ps: string; dist: string; pin: string; state: string }> = {
  "Dakshin Krishnanagar": { po: "Malancha", ps: "Samserganj", dist: "Murshidabad", pin: "742202", state: "West Bengal" },
  "Uttar Krishnanagar": { po: "Malancha", ps: "Samserganj", dist: "Murshidabad", pin: "742202", state: "West Bengal" },
  "Malancha": { po: "Malancha", ps: "Samserganj", dist: "Murshidabad", pin: "742202", state: "West Bengal" },
  "Antardwipa": { po: "Bhasaipaikar", ps: "Samserganj", dist: "Murshidabad", pin: "742202", state: "West Bengal" },
};

const VillageCombobox = ({ name, onAutoFill }: { name: string; onAutoFill: (fields: { po: string; ps: string; dist: string; pin?: string; state: string }) => void }) => {
  const [value, setValue] = useState("");
  const handleChange = (val: string) => {
    setValue(val);
    const match = ADDRESS_MAP[val];
    if (match) onAutoFill(match);
  };
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>Village</Label>
      <Input
        id={name}
        name={name}
        list={`${name}-list`}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Select or type village"
      />
      <datalist id={`${name}-list`}>
        {VILLAGE_OPTIONS.map(v => <option key={v} value={v} />)}
      </datalist>
    </div>
  );
};

export default AdmissionTestForm;
