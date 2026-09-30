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
import { CalendarIcon, CheckCircle2, Upload, ArrowLeft, FileCheck2, Loader2, ImagePlus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { uploadFile, cleanupUploads, CLASS_OPTIONS, SEX_OPTIONS, RELIGION_OPTIONS, SESSION_OPTIONS, generateIdViaEdge, checkUserRole } from "@/lib/supabase-helpers";
import { compressImage } from "@/lib/image-compressor";
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
  const [optimizing, setOptimizing] = useState<string | null>(null);

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

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setOptimizing("photo");
        const optimized = await compressImage(file, { maxSizeBytes: 250 * 1024, maxWidthOrHeight: 600 });
        setPhoto(optimized);
        setPhotoPreview(URL.createObjectURL(optimized));
      } catch (error) { toast({ title: "Could not optimize photo", description: error instanceof Error ? error.message : "Please choose another image.", variant: "destructive" }); }
      finally { setOptimizing(null); }
    }
  };

  const handleDocChange = (setter: (f: File | null) => void, label: string) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setOptimizing(label);
        setter(file.type.startsWith("image/") ? await compressImage(file, { maxSizeBytes: 900 * 1024, maxWidthOrHeight: 1024 }) : file);
      } catch (error) { toast({ title: `Could not optimize ${label}`, description: error instanceof Error ? error.message : "Please choose another file.", variant: "destructive" }); }
      finally { setOptimizing(null); }
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
    const uploaded: { bucket: string; path: string | null }[] = [];

    try {
      const photoUrl = await uploadFile("student-photos", photo, "photos");
      uploaded.push({ bucket: "student-photos", path: photoUrl });
      if (!photoUrl) throw new Error("Photo upload failed");

      let aadharUrl = null, birthUrl = null, sigUrl = null;
      if (aadharDoc) aadharUrl = await uploadFile("student-documents", aadharDoc, "aadhar");
      if (birthCert) birthUrl = await uploadFile("student-documents", birthCert, "birth-cert");
      if (guardianSig) sigUrl = await uploadFile("student-documents", guardianSig, "signatures");
      uploaded.push(
        { bucket: "student-documents", path: aadharUrl },
        { bucket: "student-documents", path: birthUrl },
        { bucket: "student-documents", path: sigUrl },
      );

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
        form_filled_by: get("form_filled_by"),
        landmark: get("landmark"),
      });

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        toast({ title: "Validation Error", description: `${firstError.path.join(".")}: ${firstError.message}`, variant: "destructive" });
        await cleanupUploads(uploaded);
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

      insertData.form_filled_by = get("form_filled_by");
      insertData.landmark = get("landmark");

      // Re-confirm the session so the row is inserted as the signed-in user (RLS: auth.uid() = user_id)
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) throw new Error("Your session expired. Please sign in again and resubmit.");
      insertData.user_id = authSession.user.id;

      const { data: inserted, error } = await supabase
        .from("applications")
        .insert(insertData)
        .select("id")
        .single();
      if (error) throw error;
      if (!inserted?.id) throw new Error("The application could not be saved. Please try again.");
      setAppId(applicationId);
      setSubmitted(true);
    } catch (err: any) {
      await cleanupUploads(uploaded);
      console.error("Application submission failed:", err);
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
            <p className="text-muted-foreground">Your application has been securely submitted for review.</p>
            <div className="bg-secondary rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Application ID</p>
              <p className="text-2xl font-bold text-primary tracking-wider">{appId}</p>
            </div>
            <div className="rounded-lg border bg-background p-3 text-left text-sm"><p className="flex items-center gap-2 font-medium text-primary"><FileCheck2 className="h-4 w-4" /> What happens next</p><p className="mt-1 text-muted-foreground">The school will review your details. You can check the application timeline and print your form from your dashboard.</p></div>
            <p className="text-sm text-muted-foreground">Please save this ID for future reference.</p>
            <Button className="w-full" onClick={() => navigate(backPath)}>Go to Dashboard</Button>
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
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-primary">Application progress</p>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
            {["Choose session", "Your details", "Documents", "Submit"].map((step, index) => <div key={step} className="space-y-1"><span className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full font-bold ${index === 0 ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>{index + 1}</span><span className={index === 0 ? "font-medium text-primary" : "text-muted-foreground"}>{step}</span></div>)}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Fields marked with * are required. Your documents are stored in the existing private school storage.</p>
        </div>
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
              <Label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"><ImagePlus className="h-4 w-4" /> Upload from Gallery / Files<Input type="file" accept="image/jpeg,image/png,image/webp,image/*" onChange={handlePhotoChange} className="sr-only" /></Label>
              <p className="text-xs text-muted-foreground mt-1">{optimizing === "photo" ? <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Optimizing image...</span> : "Large photos are automatically optimized before upload."}</p>
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
            <VillageCombobox
              name="present_vill"
              onAutoFill={(fields) => {
                const form = document.querySelector("form");
                if (!form) return;
                (form.querySelector('[name="present_po"]') as HTMLInputElement).value = fields.po;
                (form.querySelector('[name="present_ps"]') as HTMLInputElement).value = fields.ps;
                (form.querySelector('[name="present_dist"]') as HTMLInputElement).value = fields.dist;
                (form.querySelector('[name="present_pin"]') as HTMLInputElement).value = fields.pin;
                (form.querySelector('[name="present_state"]') as HTMLInputElement).value = fields.state;
              }}
            />
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
            <FormField label="Landmark" name="landmark" className="md:col-span-2" />
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

        {/* Form Filled in by */}
        <SectionCard title="Form Details">
          <FormField label="Form Filled in by" name="form_filled_by" required />
        </SectionCard>

        {/* Fees */}
        <SectionCard title="Fees">
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
        <SectionCard title="Supporting Documents">
          <p className="mb-4 text-sm text-muted-foreground">Upload clear, readable copies where available. Files remain private and are only used for your admission review.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Aadhar Card</Label>
              <GalleryInput busy={optimizing === "Aadhar Card"} file={aadharDoc} onRemove={() => setAadharDoc(null)} onChange={handleDocChange(setAadharDoc, "Aadhar Card")} />
            </div>
            <div className="space-y-2">
              <Label>Birth Certificate</Label>
              <GalleryInput busy={optimizing === "Birth Certificate"} file={birthCert} onRemove={() => setBirthCert(null)} onChange={handleDocChange(setBirthCert, "Birth Certificate")} />
            </div>
            <div className="space-y-2">
              <Label>Guardian's Signature</Label>
              <GalleryInput busy={optimizing === "Guardian Signature"} file={guardianSig} onRemove={() => setGuardianSig(null)} onChange={handleDocChange(setGuardianSig, "Guardian Signature")} imagesOnly />
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

const VILLAGE_OPTIONS = ["Dakshin Krishnanagar", "Uttar Krishnanagar", "Antardwipa", "Malancha"];

const ADDRESS_MAP: Record<string, { po: string; ps: string; dist: string; pin: string; state: string }> = {
  "Dakshin Krishnanagar": { po: "Malancha", ps: "Samserganj", dist: "Murshidabad", pin: "742202", state: "West Bengal" },
  "Uttar Krishnanagar": { po: "Malancha", ps: "Samserganj", dist: "Murshidabad", pin: "742202", state: "West Bengal" },
  "Malancha": { po: "Malancha", ps: "Samserganj", dist: "Murshidabad", pin: "742202", state: "West Bengal" },
  "Antardwipa": { po: "Bhasaipaikar", ps: "Samserganj", dist: "Murshidabad", pin: "742202", state: "West Bengal" },
};

const VillageCombobox = ({ name, onAutoFill }: { name: string; onAutoFill: (fields: { po: string; ps: string; dist: string; pin: string; state: string }) => void }) => {
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

const GalleryInput = ({ busy, file, onChange, onRemove, imagesOnly = false }: { busy: boolean; file: File | null; onChange: (event: React.ChangeEvent<HTMLInputElement>) => void; onRemove: () => void; imagesOnly?: boolean }) => <div className="space-y-2"><Label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"><ImagePlus className="h-4 w-4" /> {file ? "Change file" : "Upload from Gallery / Files"}<Input type="file" accept={imagesOnly ? "image/jpeg,image/png,image/webp,image/*" : "image/jpeg,image/png,image/webp,image/*,application/pdf"} onChange={onChange} className="sr-only" /></Label>{busy && <p className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Optimizing image...</p>}{file && <div className="flex items-center gap-2 text-xs"><span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-green-100 px-2 py-1 font-medium text-green-800"><CheckCircle2 className="h-3.5 w-3.5 shrink-0" /><span className="max-w-40 truncate">{file.name}</span> · Selected</span><button type="button" className="text-muted-foreground underline hover:text-destructive" onClick={onRemove}>Remove</button></div>}</div>;

export default NewAdmissionForm;
