import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, CheckCircle2, Upload, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { uploadFile, CLASS_OPTIONS, SEX_OPTIONS, RELIGION_OPTIONS, SESSION_OPTIONS, generateIdViaEdge, MAX_PHOTO_SIZE, MAX_DOC_SIZE, validateFileSize, checkUserRole } from "@/lib/supabase-helpers";
import { useNavigate } from "react-router-dom";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { admissionFormSchema } from "@/lib/form-validation";

const NewAdmissionForm = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [appId, setAppId] = useState("");
  const [dob, setDob] = useState<Date>();
  const [sameAddress, setSameAddress] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [aadharDoc, setAadharDoc] = useState<File | null>(null);
  const [birthCert, setBirthCert] = useState<File | null>(null);
  const [guardianSig, setGuardianSig] = useState<File | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [session, setSession] = useState("");
  const [desiredClass, setDesiredClass] = useState("");
  const [sex, setSex] = useState("");
  const [religion, setReligion] = useState("");

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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const err = validateFileSize(file, MAX_PHOTO_SIZE, "Photo");
      if (err) { toast({ title: "File too large", description: err, variant: "destructive" }); return; }
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleDocChange = (setter: (f: File | null) => void, label: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const err = validateFileSize(file, MAX_DOC_SIZE, label);
      if (err) { toast({ title: "File too large", description: err, variant: "destructive" }); e.target.value = ""; return; }
      setter(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!photo) { toast({ title: "Error", description: "Student photograph is mandatory.", variant: "destructive" }); return; }
    if (!session) { toast({ title: "Error", description: "Session is required.", variant: "destructive" }); return; }
    if (!userId) return;

    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const get = (name: string) => (fd.get(name) as string) || "";

    try {
      const photoUrl = await uploadFile("student-photos", photo, "photos");
      if (!photoUrl) throw new Error("Photo upload failed");

      let aadharUrl = null, birthUrl = null, sigUrl = null;
      if (aadharDoc) aadharUrl = await uploadFile("student-documents", aadharDoc, "aadhar");
      if (birthCert) birthUrl = await uploadFile("student-documents", birthCert, "birth-cert");
      if (guardianSig) sigUrl = await uploadFile("student-documents", guardianSig, "signatures");

      // Validate form inputs
      const validationResult = admissionFormSchema.safeParse({
        full_name: get("full_name"),
        father_name: get("father_name"),
        mother_name: get("mother_name"),
        mobile_no: get("mobile_no"),
        whatsapp_no: get("whatsapp_no"),
        present_pin: get("present_pin"),
        permanent_pin: sameAddress ? get("present_pin") : get("permanent_pin"),
        aadhar_no: get("aadhar_no"),
        present_vill: get("present_vill"),
        present_po: get("present_po"),
        present_ps: get("present_ps"),
        present_dist: get("present_dist"),
        present_state: get("present_state"),
        permanent_vill: sameAddress ? get("present_vill") : get("permanent_vill"),
        permanent_po: sameAddress ? get("present_po") : get("permanent_po"),
        permanent_ps: sameAddress ? get("present_ps") : get("permanent_ps"),
        permanent_dist: sameAddress ? get("present_dist") : get("permanent_dist"),
        permanent_state: sameAddress ? get("present_state") : get("permanent_state"),
        health_issue: get("health_issue"),
        name_bengali: get("name_bengali"),
        mother_occupation: get("mother_occupation"),
        mother_qualification: get("mother_qualification"),
        father_occupation: get("father_occupation"),
        father_qualification: get("father_qualification"),
        guardian_name: get("guardian_name"),
        guardian_relation: get("guardian_relation"),
        last_attended_class: get("last_attended_class"),
        last_institution: get("last_institution"),
      });

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        toast({ title: "Validation Error", description: `${firstError.path.join(".")}: ${firstError.message}`, variant: "destructive" });
        setLoading(false);
        return;
      }

      const applicationId = await generateIdViaEdge("admission", session);

      const insertData: any = {
        user_id: userId,
        application_id: applicationId,
        session,
        photo_url: photoUrl,
        full_name: get("full_name"),
        father_name: get("father_name"),
        desired_class: desiredClass,
        present_vill: get("present_vill"),
        present_po: get("present_po"),
        present_ps: get("present_ps"),
        present_dist: get("present_dist"),
        present_pin: get("present_pin"),
        present_state: get("present_state"),
        mobile_no: get("mobile_no"),
        whatsapp_no: get("whatsapp_no"),
        permanent_vill: sameAddress ? get("present_vill") : get("permanent_vill"),
        permanent_po: sameAddress ? get("present_po") : get("permanent_po"),
        permanent_ps: sameAddress ? get("present_ps") : get("permanent_ps"),
        permanent_dist: sameAddress ? get("present_dist") : get("permanent_dist"),
        permanent_pin: sameAddress ? get("present_pin") : get("permanent_pin"),
        permanent_state: sameAddress ? get("present_state") : get("permanent_state"),
        date_of_birth: dob?.toISOString().split("T")[0] || "",
        sex,
        religion,
        nationality: "INDIAN",
        aadhar_no: get("aadhar_no"),
        health_issue: get("health_issue"),
        name_bengali: get("name_bengali"),
        mother_name: get("mother_name"),
        mother_occupation: get("mother_occupation"),
        mother_qualification: get("mother_qualification"),
        father_occupation: get("father_occupation"),
        father_qualification: get("father_qualification"),
        guardian_name: get("guardian_name"),
        guardian_relation: get("guardian_relation"),
        last_attended_class: get("last_attended_class"),
        last_institution: get("last_institution"),
        aadhar_doc_url: aadharUrl,
        birth_cert_url: birthUrl,
        guardian_signature_url: sigUrl,
      };

      // Admin can fill fees and auto-approve
      if (isAdmin) {
        insertData.monthly_fees = get("monthly_fees");
        insertData.admission_fee = get("admission_fee");
        insertData.status = "Approved";
      }

      const { error } = await supabase.from("applications").insert(insertData);
      if (error) throw error;
      setAppId(applicationId);
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
            <h2 className="text-2xl font-bold text-primary">Application Submitted!</h2>
            <p className="text-muted-foreground">Your application has been successfully submitted.</p>
            <div className="bg-secondary rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Application ID</p>
              <p className="text-2xl font-bold text-primary tracking-wider">{appId}</p>
            </div>
            <p className="text-sm text-muted-foreground">Please save this ID for future reference.</p>
            <Button onClick={() => navigate(backPath)}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-6">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <Button variant="ghost" size="sm" className="absolute left-4 top-4 text-primary-foreground hover:bg-white/10" onClick={() => navigate(backPath)}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <img alt="School Logo" className="mx-auto h-20 w-20 rounded-full bg-white p-1 mb-3" src="/lovable-uploads/b3369ca5-553a-4c65-961b-27d4deb3ca86.jpg" />
          <h1 className="text-2xl md:text-3xl font-bold">Alor Disha Islamic School</h1>
          <p className="text-sm opacity-90 mt-1">Dakshin Krishnanagar, Malancha-Antardwipa Road, Dhuliyan, Murshidabad, 742202</p>
          <div className="mt-3 inline-block bg-accent text-accent-foreground px-4 py-1.5 rounded-full text-sm font-semibold">
            Application Form for Admission
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Session Selection */}
        <SectionCard title="Session" required>
          <SelectField label="Academic Session" value={session} onValueChange={setSession} options={SESSION_OPTIONS} required />
        </SectionCard>

        {/* Student Photograph */}
        <SectionCard title="Student Photograph" required>
          <div className="flex items-center gap-6">
            <div className="h-32 w-28 border-2 border-dashed border-primary/30 rounded-lg flex items-center justify-center overflow-hidden bg-white">
              {photoPreview ? <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" /> : <Upload className="h-8 w-8 text-muted-foreground" />}
            </div>
            <div>
              <Input type="file" accept="image/*" onChange={handlePhotoChange} className="max-w-xs" />
              <p className="text-xs text-muted-foreground mt-1">Max 30 KB. Passport-size photograph.</p>
            </div>
          </div>
        </SectionCard>

        {/* Basic Info */}
        <SectionCard title="Basic Information">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Full Name of the Student" name="full_name" required className="md:col-span-2" />
            <FormField label="Father's Name" name="father_name" required className="md:col-span-2" />
          </div>
        </SectionCard>

        {/* Class Selection */}
        <SectionCard title="Class Selection">
          <SelectField label="Desiring Admission in Class" value={desiredClass} onValueChange={setDesiredClass} options={CLASS_OPTIONS} required />
        </SectionCard>

        {/* Contact Details */}
        <SectionCard title="Contact Details">
          <h4 className="font-medium text-sm text-primary mb-2">Present Address</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <FormField label="Village" name="present_vill" />
            <FormField label="Post Office" name="present_po" />
            <FormField label="Police Station" name="present_ps" />
            <FormField label="District" name="present_dist" />
            <FormField label="PIN Code" name="present_pin" />
            <FormField label="State" name="present_state" />
          </div>
          <div className="flex items-center gap-2 mb-3">
            <Checkbox id="same_addr" checked={sameAddress} onCheckedChange={(v) => setSameAddress(!!v)} />
            <Label htmlFor="same_addr" className="text-sm cursor-pointer">Permanent Address same as Present Address</Label>
          </div>
          {!sameAddress && (
            <>
              <h4 className="font-medium text-sm text-primary mb-2">Permanent Address</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <FormField label="Village" name="permanent_vill" />
                <FormField label="Post Office" name="permanent_po" />
                <FormField label="Police Station" name="permanent_ps" />
                <FormField label="District" name="permanent_dist" />
                <FormField label="PIN Code" name="permanent_pin" />
                <FormField label="State" name="permanent_state" />
              </div>
            </>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Phone Number" name="mobile_no" required type="tel" />
            <FormField label="WhatsApp Number" name="whatsapp_no" type="tel" />
          </div>
        </SectionCard>

        {/* Other Details */}
        <SectionCard title="Other Details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date of Birth <span className="text-destructive">*</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dob && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dob ? format(dob, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dob} onSelect={setDob} captionLayout="dropdown-buttons" fromYear={2000} toYear={2026} className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <SelectField label="Sex" value={sex} onValueChange={setSex} options={SEX_OPTIONS} required />
            <SelectField label="Religion" value={religion} onValueChange={setReligion} options={RELIGION_OPTIONS} required />
            <div className="space-y-2">
              <Label>Nationality</Label>
              <Input value="INDIAN" readOnly className="bg-muted" />
            </div>
            <FormField label="Student Aadhar Card No" name="aadhar_no" />
            <FormField label="Health Issue (if any)" name="health_issue" />
            <FormField label="Name in Bengali" name="name_bengali" />
            <FormField label="Mother's Name" name="mother_name" required />
            <FormField label="Mother's Occupation" name="mother_occupation" />
            <FormField label="Mother's Qualification" name="mother_qualification" />
            <FormField label="Father's Occupation" name="father_occupation" />
            <FormField label="Father's Qualification" name="father_qualification" />
            <FormField label="Guardian Name" name="guardian_name" />
            <FormField label="Relation with Student" name="guardian_relation" />
            <FormField label="Last Attended Class" name="last_attended_class" />
            <FormField label="Last Attended Institution" name="last_institution" className="md:col-span-2" />
          </div>
        </SectionCard>

        {/* Financial Agreement */}
        <SectionCard title="Financial Agreement">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Monthly Fees (₹)</Label>
              <Input name="monthly_fees" readOnly={!isAdmin} className={!isAdmin ? "bg-muted" : ""} placeholder={!isAdmin ? "Set by admin" : "Enter amount"} />
            </div>
            <div className="space-y-2">
              <Label>Admission Fee (₹)</Label>
              <Input name="admission_fee" readOnly={!isAdmin} className={!isAdmin ? "bg-muted" : ""} placeholder={!isAdmin ? "Set by admin" : "Enter amount"} />
            </div>
          </div>
          {!isAdmin && <p className="text-xs text-muted-foreground mt-2">Fee fields are managed by the administration.</p>}
        </SectionCard>

        {/* Document Uploads */}
        <SectionCard title="Document Uploads (Optional)">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Aadhar Card (Max 50 KB)</Label>
              <Input type="file" accept="image/*,.pdf" onChange={handleDocChange(setAadharDoc, "Aadhar Card")} />
            </div>
            <div className="space-y-2">
              <Label>Birth Certificate (Max 50 KB)</Label>
              <Input type="file" accept="image/*,.pdf" onChange={handleDocChange(setBirthCert, "Birth Certificate")} />
            </div>
            <div className="space-y-2">
              <Label>Guardian's Signature (Max 50 KB)</Label>
              <Input type="file" accept="image/*" onChange={handleDocChange(setGuardianSig, "Guardian Signature")} />
            </div>
          </div>
        </SectionCard>

        {/* Declaration */}
        <SectionCard title="Declaration">
          <p className="text-sm text-muted-foreground leading-relaxed">
            I hereby declare that all the information provided above is true and correct to the best of my knowledge. I understand that any false information may lead to the cancellation of admission. I agree to abide by the rules and regulations of Alor Disha Islamic School.
          </p>
        </SectionCard>

        <Button type="submit" size="lg" className="w-full text-lg py-6" disabled={loading}>
          {loading ? "Submitting..." : "Submit Application"}
        </Button>
      </form>
    </div>
  );
};

// Helper components
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

export default NewAdmissionForm;
