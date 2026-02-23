import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { getSignedUrl } from "@/lib/supabase-helpers";

const PrintAdmission = () => {
  const { id } = useParams();
  const [app, setApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [signedUrls, setSignedUrls] = useState<Record<string, string | null>>({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.from("applications").select("*").eq("id", id).single();
      setApp(data);
      if (data) {
        // Resolve signed URLs for all file fields
        const [photoUrl, aadharUrl, birthUrl, sigUrl] = await Promise.all([
          getSignedUrl("student-photos", data.photo_url),
          getSignedUrl("student-documents", data.aadhar_doc_url),
          getSignedUrl("student-documents", data.birth_cert_url),
          getSignedUrl("student-documents", data.guardian_signature_url),
        ]);
        setSignedUrls({ photo: photoUrl, aadhar: aadharUrl, birth: birthUrl, signature: sigUrl });
        setTimeout(() => window.print(), 500);
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!app) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Application not found.</div>;

  const addr = (prefix: string) =>
    [app[`${prefix}_vill`], app[`${prefix}_po`], app[`${prefix}_ps`], app[`${prefix}_dist`], app[`${prefix}_pin`], app[`${prefix}_state`]].filter(Boolean).join(", ");

  return (
    <>
      <div className="print:hidden p-4">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
      </div>

      <div className="print-page w-[210mm] min-h-[297mm] max-h-[297mm] mx-auto p-[12mm] text-[11px] leading-tight font-sans overflow-hidden box-border">
        <div className="text-center border-b-2 border-black pb-2 mb-3">
          <div className="flex items-center justify-center gap-3">
            <img src="/lovable-uploads/b3369ca5-553a-4c65-961b-27d4deb3ca86.jpg" alt="Logo" className="h-14 w-14 rounded-full" />
            <div>
              <h1 className="text-lg font-bold">Alor Disha Islamic School</h1>
              <p className="text-[9px]">Dakshin Krishnanagar, Malancha-Antardwipa Road, Dhuliyan, Murshidabad, 742202</p>
            </div>
          </div>
          <p className="font-bold mt-1 text-sm">APPLICATION FORM FOR ADMISSION</p>
          <p className="text-[9px]">Application ID: {app.application_id} | Session: {app.session || "—"} | Date: {new Date(app.created_at).toLocaleDateString()}</p>
        </div>

        <div className="flex gap-3 mb-3">
          <div className="flex-1">
            <PrintTable rows={[
              ["Full Name", app.full_name],
              ["Father's Name", app.father_name],
              ["Class Applied", app.desired_class],
              ["Date of Birth", app.date_of_birth],
              ["Sex", app.sex],
              ["Religion", app.religion],
              ["Nationality", "INDIAN"],
            ]} />
          </div>
          <div className="w-[25mm] h-[30mm] border border-black flex-shrink-0">
            {signedUrls.photo && <img src={signedUrls.photo} alt="Photo" className="w-full h-full object-cover" />}
          </div>
        </div>

        <PrintTable rows={[
          ["Aadhar No", app.aadhar_no || "—"],
          ["Health Issue", app.health_issue || "None"],
          ["Name in Bengali", app.name_bengali || "—"],
        ]} />

        <h3 className="font-bold mt-3 mb-1 text-xs border-b border-black">PARENTS / GUARDIAN INFORMATION</h3>
        <PrintTable rows={[
          ["Father's Occupation", app.father_occupation || "—"],
          ["Father's Qualification", app.father_qualification || "—"],
          ["Mother's Name", app.mother_name],
          ["Mother's Occupation", app.mother_occupation || "—"],
          ["Mother's Qualification", app.mother_qualification || "—"],
          ["Guardian Name", app.guardian_name || "—"],
          ["Relation", app.guardian_relation || "—"],
        ]} />

        <h3 className="font-bold mt-3 mb-1 text-xs border-b border-black">CONTACT & ADDRESS</h3>
        <PrintTable rows={[
          ["Present Address", addr("present") || "—"],
          ["Permanent Address", addr("permanent") || "—"],
          ["Phone No", app.mobile_no],
          ["WhatsApp No", app.whatsapp_no || "—"],
        ]} />

        <h3 className="font-bold mt-3 mb-1 text-xs border-b border-black">ADMISSION & FINANCIAL</h3>
        <PrintTable rows={[
          ["Last Attended Class", app.last_attended_class || "—"],
          ["Last Institution", app.last_institution || "—"],
          ["Monthly Fees", app.monthly_fees ? `₹${app.monthly_fees}` : "—"],
          ["Admission Fee", app.admission_fee ? `₹${app.admission_fee}` : "—"],
        ]} />

        <div className="flex justify-between mt-8 pt-4">
          <div className="text-center">
            <div className="border-t border-black w-32 mx-auto mb-1"></div>
            <p className="text-[9px]">Guardian's Signature</p>
          </div>
          <div className="text-center">
            <div className="border-t border-black w-32 mx-auto mb-1"></div>
            <p className="text-[9px]">Office Use Only</p>
          </div>
        </div>
      </div>

      {signedUrls.aadhar && (
        <div className="print-page w-[210mm] min-h-[297mm] mx-auto p-[15mm] flex flex-col items-center" style={{ pageBreakBefore: "always" }}>
          <h2 className="text-base font-bold mb-4 text-center">Aadhar Card — {app.full_name}</h2>
          <img src={signedUrls.aadhar} alt="Aadhar Card" className="max-w-full max-h-[250mm] object-contain" />
        </div>
      )}
      {signedUrls.birth && (
        <div className="print-page w-[210mm] min-h-[297mm] mx-auto p-[15mm] flex flex-col items-center" style={{ pageBreakBefore: "always" }}>
          <h2 className="text-base font-bold mb-4 text-center">Birth Certificate — {app.full_name}</h2>
          <img src={signedUrls.birth} alt="Birth Certificate" className="max-w-full max-h-[250mm] object-contain" />
        </div>
      )}
      {signedUrls.signature && (
        <div className="print-page w-[210mm] min-h-[297mm] mx-auto p-[15mm] flex flex-col items-center" style={{ pageBreakBefore: "always" }}>
          <h2 className="text-base font-bold mb-4 text-center">Guardian Signature — {app.full_name}</h2>
          <img src={signedUrls.signature} alt="Guardian Signature" className="max-w-full max-h-[250mm] object-contain" />
        </div>
      )}
    </>
  );
};

const PrintTable = ({ rows }: { rows: [string, string][] }) => (
  <table className="w-full border-collapse">
    <tbody>
      {rows.map(([label, value], i) => (
        <tr key={i} className="border border-black">
          <td className="border border-black px-2 py-1 font-semibold w-[35%] bg-gray-100 print:bg-gray-100">{label}</td>
          <td className="border border-black px-2 py-1">{value}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

export default PrintAdmission;
