import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, CheckCircle2, Upload } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { generateApplicationId, uploadFile } from "@/lib/supabase-helpers";
import schoolLogo from "@/assets/school-logo.png";

const CLASS_OPTIONS = ["LKG", "UKG", "Class I", "Class II", "Class III", "Class IV", "Class V", "Class VI", "Class VII", "Class VIII", "Class IX", "Class X"];
const SEX_OPTIONS = ["Male", "Female", "Other"];
const RELIGION_OPTIONS = ["Islam", "Hinduism", "Christianity", "Sikhism", "Buddhism", "Jainism", "Other"];

const Index = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [appId, setAppId] = useState("");
  const [dob, setDob] = useState<Date>();
  const [sameAddress, setSameAddress] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [aadharDoc, setAadharDoc] = useState<File | null>(null);
  const [birthCert, setBirthCert] = useState<File | null>(null);
  const [guardianSig, setGuardianSig] = useState<File | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!photo) {
      toast({ title: "Error", description: "Student photograph is mandatory.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const get = (name: string) => fd.get(name) as string || "";

    try {
      const photoUrl = await uploadFile("student-photos", photo, "photos");
      if (!photoUrl) throw new Error("Photo upload failed");

      let aadharUrl = null,birthUrl = null,sigUrl = null;
      if (aadharDoc) aadharUrl = await uploadFile("student-documents", aadharDoc, "aadhar");
      if (birthCert) birthUrl = await uploadFile("student-documents", birthCert, "birth-cert");
      if (guardianSig) sigUrl = await uploadFile("student-documents", guardianSig, "signatures");

      const applicationId = generateApplicationId();

      const { error } = await supabase.from("applications").insert({
        application_id: applicationId,
        photo_url: photoUrl,
        full_name: get("full_name"),
        name_bengali: get("name_bengali"),
        date_of_birth: dob?.toISOString().split("T")[0],
        sex: get("sex"),
        religion: get("religion"),
        nationality: "INDIAN",
        aadhar_no: get("aadhar_no"),
        health_issue: get("health_issue"),
        father_name: get("father_name"),
        father_occupation: get("father_occupation"),
        father_qualification: get("father_qualification"),
        mother_name: get("mother_name"),
        mother_occupation: get("mother_occupation"),
        mother_qualification: get("mother_qualification"),
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
        guardian_name: get("guardian_name"),
        guardian_relation: get("guardian_relation"),
        desired_class: get("desired_class"),
        last_attended_class: get("last_attended_class"),
        last_institution: get("last_institution"),
        aadhar_doc_url: aadharUrl,
        birth_cert_url: birthUrl,
        guardian_signature_url: sigUrl
      });

      if (error) throw error;

      setAppId(applicationId);
      setSubmitted(true);
    } catch (err: any) {
      toast({ title: "Submission Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
        <Card className="max-w-md w-full text-center p-8">
          <CardContent className="space-y-4">
            <CheckCircle2 className="mx-auto h-16 w-16 text-success" />
            <h2 className="text-2xl font-bold text-primary">Application Submitted!</h2>
            <p className="text-muted-foreground">Your application has been successfully submitted.</p>
            <div className="bg-secondary rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Your Application ID</p>
              <p className="text-2xl font-bold text-primary tracking-wider">{appId}</p>
            </div>
            <p className="text-sm text-muted-foreground">Please save this ID for future reference.</p>
            <Button onClick={() => {setSubmitted(false);setPhoto(null);setPhotoPreview("");setDob(undefined);}} className="mt-4">Submit Another Application</Button>
          </CardContent>
        </Card>
      </div>);

  }

  return (
    <div className="min-h-screen bg-secondary">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-6">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <img alt="School Logo" className="mx-auto h-24 w-24 rounded-full bg-white p-1 mb-3" src="/lovable-uploads/b3369ca5-553a-4c65-961b-27d4deb3ca86.jpg" />
          <h1 className="text-2xl md:text-3xl font-bold">Alor Disha Islamic School</h1>
          <p className="text-sm opacity-90 mt-1">Dakshin Krishnanagar, Malancha-Antardwipa Road, Dhuliyan, Murshidabad, 742202
Contact: 8967559607 /9933624600
          </p>
          <div className="mt-3 inline-block bg-accent text-accent-foreground px-4 py-1.5 rounded-full text-sm font-semibold">
            Application Form for Admission
          </div>
        </div>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Student Photograph */}
        <SectionCard title="Student Photograph" required>
          <div className="flex items-center gap-6">
            <div className="h-32 w-28 border-2 border-dashed border-primary/30 rounded-lg flex items-center justify-center overflow-hidden bg-white">
              {photoPreview ? <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" /> :
              <Upload className="h-8 w-8 text-muted-foreground" />
              }
            </div>
            <div>
              <Input type="file" accept="image/*" onChange={handlePhotoChange} className="max-w-xs" />
              <p className="text-xs text-muted-foreground mt-1">Upload a passport-size photograph</p>
            </div>
          </div>
        </SectionCard>

        {/* 1. Basic Information */}
        <SectionCard title="1. Basic Information">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Full Name (Block Letters)" name="full_name" required className="md:col-span-2 uppercase" />
            <FormField label="Name in Bengali" name="name_bengali" />
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
                  <Calendar mode="single" selected={dob} onSelect={setDob} captionLayout="dropdown-buttons" fromYear={2000} toYear={2025} className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <SelectField label="Sex" name="sex" options={SEX_OPTIONS} required />
            <SelectField label="Religion" name="religion" options={RELIGION_OPTIONS} required />
            <div className="space-y-2">
              <Label>Nationality</Label>
              <Input value="INDIAN" readOnly className="bg-muted" />
            </div>
            <FormField label="Aadhar Card No" name="aadhar_no" />
            <FormField label="Health Issue (if any)" name="health_issue" className="md:col-span-2" />
          </div>
        </SectionCard>

        {/* 2. Parents Information */}
        <SectionCard title="2. Parents Information">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Father's Name" name="father_name" required />
            <FormField label="Occupation" name="father_occupation" />
            <FormField label="Qualification" name="father_qualification" />
            <FormField label="Mother's Name" name="mother_name" required />
            <FormField label="Occupation" name="mother_occupation" />
            <FormField label="Qualification" name="mother_qualification" />
          </div>
        </SectionCard>

        {/* 3. Contact Details */}
        <SectionCard title="3. Contact Details">
          <h4 className="font-medium text-sm text-primary mb-2">Present Address</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <FormField label="Village" name="present_vill" />
            <FormField label="Post Office" name="present_po" />
            <FormField label="Police Station" name="present_ps" />
            <FormField label="District" name="present_dist" />
            <FormField label="PIN Code" name="present_pin" />
            <FormField label="State" name="present_state" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <FormField label="Mobile No" name="mobile_no" required type="tel" />
            <FormField label="WhatsApp No" name="whatsapp_no" type="tel" />
          </div>
          <div className="flex items-center gap-2 mb-3">
            <Checkbox id="same_addr" checked={sameAddress} onCheckedChange={(v) => setSameAddress(!!v)} />
            <Label htmlFor="same_addr" className="text-sm cursor-pointer">Permanent Address same as Present Address</Label>
          </div>
          {!sameAddress &&
          <>
              <h4 className="font-medium text-sm text-primary mb-2">Permanent Address</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField label="Village" name="permanent_vill" />
                <FormField label="Post Office" name="permanent_po" />
                <FormField label="Police Station" name="permanent_ps" />
                <FormField label="District" name="permanent_dist" />
                <FormField label="PIN Code" name="permanent_pin" />
                <FormField label="State" name="permanent_state" />
              </div>
            </>
          }
        </SectionCard>

        {/* 4. Admission Details */}
        <SectionCard title="4. Admission Details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Guardian Name" name="guardian_name" />
            <FormField label="Relation with Student" name="guardian_relation" />
            <SelectField label="Desiring Admission in Class" name="desired_class" options={CLASS_OPTIONS} required />
            <FormField label="Last Attended Class" name="last_attended_class" />
            <FormField label="Name of Last Attended Institution" name="last_institution" className="md:col-span-2" />
          </div>
        </SectionCard>

        {/* 5. Document Uploads */}
        <SectionCard title="5. Document Uploads (Optional)">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Aadhar Card (PDF/Image)</Label>
              <Input type="file" accept="image/*,.pdf" onChange={(e) => setAadharDoc(e.target.files?.[0] || null)} />
            </div>
            <div className="space-y-2">
              <Label>Birth Certificate (PDF/Image)</Label>
              <Input type="file" accept="image/*,.pdf" onChange={(e) => setBirthCert(e.target.files?.[0] || null)} />
            </div>
            <div className="space-y-2">
              <Label>Guardian's Signature (Image)</Label>
              <Input type="file" accept="image/*" onChange={(e) => setGuardianSig(e.target.files?.[0] || null)} />
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
    </div>);

};

// Helper components
const SectionCard = ({ title, required, children }: {title: string;required?: boolean;children: React.ReactNode;}) =>
<Card>
    <CardContent className="pt-6">
      <h3 className="text-lg font-semibold text-primary mb-4 border-b border-border pb-2">
        {title} {required && <span className="text-destructive text-sm">*</span>}
      </h3>
      {children}
    </CardContent>
  </Card>;


const FormField = ({ label, name, required, type = "text", className = "" }: {label: string;name: string;required?: boolean;type?: string;className?: string;}) =>
<div className={cn("space-y-2", className)}>
    <Label htmlFor={name}>{label} {required && <span className="text-destructive">*</span>}</Label>
    <Input id={name} name={name} type={type} required={required} />
  </div>;


const SelectField = ({ label, name, options, required }: {label: string;name: string;options: string[];required?: boolean;}) => {
  const [value, setValue] = useState("");
  return (
    <div className="space-y-2">
      <Label>{label} {required && <span className="text-destructive">*</span>}</Label>
      <input type="hidden" name={name} value={value} />
      <Select value={value} onValueChange={setValue} required={required}>
        <SelectTrigger>
          <SelectValue placeholder={`Select ${label}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) =>
          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>);

};

export default Index;