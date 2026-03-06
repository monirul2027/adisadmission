import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { getSignedUrl, checkUserRole } from "@/lib/supabase-helpers";
import { toast } from "@/hooks/use-toast";

const PrintHeader = () => (
  <div className="text-center border-b-2 border-black pb-2 mb-3">
    <div className="flex items-center justify-center gap-3">
      <img src="/lovable-uploads/b3369ca5-553a-4c65-961b-27d4deb3ca86.jpg" alt="Logo" className="h-14 w-14 rounded-full" />
      <div>
        <h1 className="text-2xl font-bold">Alor Disha Islamic School</h1>
        <p className="text-[9px]">Dakshin Krishnanagar, Malancha-Antardwipa Road, Dhuliyan, Murshidabad, 742202</p>
        <p className="text-[9px]">Mob: 9933624600 / 8016238853 / 78725 96349 / 7586985349</p>
      </div>
    </div>
    <p className="font-bold mt-1 text-sm">ADMISSION TEST APPLICATION FORM</p>
  </div>
);

const PrintAdmissionTest = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const viewOnly = searchParams.get("view") === "true";
  const [test, setTest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [signedSigUrl, setSignedSigUrl] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/student/login"); return; }

      const { data } = await supabase.from("admission_tests").select("*").eq("id", id).single();

      // Authorization: only owner or admin can view
      if (data) {
        const role = await checkUserRole(session.user.id);
        if (role !== "admin" && data.user_id !== session.user.id) {
          toast({ title: "Access Denied", description: "You don't have permission to view this record.", variant: "destructive" });
          navigate("/student/dashboard");
          return;
        }
      }

      setTest(data);
      if (data?.student_signature_url) {
        const url = await getSignedUrl("student-documents", data.student_signature_url);
        setSignedSigUrl(url);
      }
      setLoading(false);
      if (data && !viewOnly) {
        // Wait for DOM render then print
        await new Promise(r => setTimeout(r, 300));
        window.print();
      }
    };
    fetchData();
  }, [id, viewOnly]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!test) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Test application not found.</div>;

  return (
    <>
      <div className="print:hidden p-4">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
      </div>

      <div className="print-page w-[210mm] min-h-[297mm] mx-auto p-[12mm] text-[11px] leading-tight font-sans box-border">
        <PrintHeader />
        <p className="text-[9px] mb-3">Test ID: {test.test_id} | Session: {test.session} | Date: {new Date(test.created_at).toLocaleDateString()}</p>

        <table className="w-full border-collapse mb-3">
          <tbody>
            {[
              ["Student's Name", test.student_name],
              ["Father's Name", test.father_name],
              ["Occupation", test.occupation || "—"],
              ["Session", test.session],
              ["Applying for Class", test.applying_for_class],
              ["Present School", test.present_school || "—"],
              ["Present Class", test.present_class || "—"],
            ].map(([label, value], i) => (
              <tr key={i} className="border border-black">
                <td className="border border-black px-2 py-1 font-semibold w-[35%] bg-gray-100 print:bg-gray-100">{label}</td>
                <td className="border border-black px-2 py-1">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 className="font-bold mt-3 mb-1 text-xs border-b border-black">ADDRESS</h3>
        <table className="w-full border-collapse mb-3">
          <tbody>
            {[
              ["Village", test.village || "—"],
              ["P.O", test.po || "—"],
              ["P.S", test.ps || "—"],
              ["District", test.dist || "—"],
              ["State", test.state || "—"],
              ["Landmark", test.landmark || "—"],
            ].map(([label, value], i) => (
              <tr key={i} className="border border-black">
                <td className="border border-black px-2 py-1 font-semibold w-[35%] bg-gray-100 print:bg-gray-100">{label}</td>
                <td className="border border-black px-2 py-1">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 className="font-bold mt-3 mb-1 text-xs border-b border-black">CONTACT</h3>
        <table className="w-full border-collapse mb-3">
          <tbody>
            {[
              ["Mobile No", test.mobile_no],
              ["WhatsApp No", test.whatsapp_no || "—"],
            ].map(([label, value], i) => (
              <tr key={i} className="border border-black">
                <td className="border border-black px-2 py-1 font-semibold w-[35%] bg-gray-100 print:bg-gray-100">{label}</td>
                <td className="border border-black px-2 py-1">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {test.roll_no && (
          <div className="border-2 border-black p-3 my-4 text-center">
            <p className="text-xs">Roll Number</p>
            <p className="text-2xl font-bold">{test.roll_no}</p>
          </div>
        )}

        <div className="flex justify-between mt-12 pt-4">
          <div className="text-center">
            {signedSigUrl && <img src={signedSigUrl} alt="Student Signature" className="h-10 mx-auto mb-1 object-contain" />}
            <div className="border-t border-black w-32 mx-auto mb-1"></div>
            <p className="text-[9px]">Student's Signature</p>
          </div>
          <div className="text-center">
            <div className="border-t border-black w-32 mx-auto mb-1"></div>
            <p className="text-[9px]">Guardian's Signature</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default PrintAdmissionTest;
