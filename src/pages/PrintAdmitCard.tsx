import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { getSignedUrl } from "@/lib/supabase-helpers";

const PrintAdmitCard = () => {
  const { id } = useParams();
  const [test, setTest] = useState<any>(null);
  const [instructions, setInstructions] = useState("");
  const [signatures, setSignatures] = useState<{ head_master: string | null; exam_controller: string | null }>({ head_master: null, exam_controller: null });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      const [testRes, settingsRes] = await Promise.all([
        supabase.from("admission_tests").select("*").eq("id", id).single(),
        supabase.from("form_settings").select("*"),
      ]);
      setTest(testRes.data);

      if (settingsRes.data) {
        const instrSetting = settingsRes.data.find((d: any) => d.setting_key === "admit_card_instructions");
        if (instrSetting) {
          const val = instrSetting.setting_value as Record<string, string> | null;
          setInstructions(val?.text || "");
        }
        const sigSetting = settingsRes.data.find((d: any) => d.setting_key === "signature_images");
        if (sigSetting && testRes.data?.status === "Approved") {
          const sigVal = sigSetting.setting_value as any;
          const [hmUrl, ecUrl] = await Promise.all([
            getSignedUrl("signature-uploads", sigVal?.head_master),
            getSignedUrl("signature-uploads", sigVal?.exam_controller),
          ]);
          setSignatures({ head_master: hmUrl, exam_controller: ecUrl });
        }
      }
      setLoading(false);
      if (testRes.data) setTimeout(() => window.print(), 500);
    };
    fetch();
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!test) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Test application not found.</div>;

  const address = [test.village, test.po, test.ps, test.dist, test.state].filter(Boolean).join(", ");

  return (
    <>
      <div className="print:hidden p-4">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
      </div>

      <div className="print-page w-[210mm] mx-auto p-[15mm] text-[12px] font-sans">
        {/* Header */}
        <div className="text-center border-2 border-black p-4 mb-0">
          <div className="flex items-center justify-center gap-3 mb-2">
            <img src="/lovable-uploads/b3369ca5-553a-4c65-961b-27d4deb3ca86.jpg" alt="Logo" className="h-16 w-16 rounded-full" />
            <div>
              <h1 className="text-xl font-bold">Alor Disha Islamic School</h1>
              <p className="text-[10px]">Dakshin Krishnanagar, Malancha-Antardwipa Road, Dhuliyan, Murshidabad, 742202</p>
            </div>
          </div>
          <div className="bg-black text-white py-1 px-4 inline-block font-bold text-lg tracking-wider">
            ADMIT CARD
          </div>
          <p className="mt-2 text-sm font-semibold">Exam Venue - Alor Disha Islamic School</p>
        </div>

        {/* Card Body */}
        <div className="border-2 border-black border-t-0 p-4">
          <table className="w-full border-collapse mb-4">
            <tbody>
              <tr className="border border-black">
                <td className="border border-black px-3 py-2 font-semibold w-[35%] bg-gray-100">Test ID</td>
                <td className="border border-black px-3 py-2 font-mono">{test.test_id}</td>
              </tr>
              <tr className="border border-black">
                <td className="border border-black px-3 py-2 font-semibold bg-gray-100">Student's Name</td>
                <td className="border border-black px-3 py-2 font-bold">{test.student_name}</td>
              </tr>
              <tr className="border border-black">
                <td className="border border-black px-3 py-2 font-semibold bg-gray-100">Father's Name</td>
                <td className="border border-black px-3 py-2">{test.father_name}</td>
              </tr>
              <tr className="border border-black">
                <td className="border border-black px-3 py-2 font-semibold bg-gray-100">Address</td>
                <td className="border border-black px-3 py-2">{address || "—"}</td>
              </tr>
              <tr className="border border-black">
                <td className="border border-black px-3 py-2 font-semibold bg-gray-100">Session</td>
                <td className="border border-black px-3 py-2">{test.session}</td>
              </tr>
              <tr className="border border-black">
                <td className="border border-black px-3 py-2 font-semibold bg-gray-100">Present Class</td>
                <td className="border border-black px-3 py-2">{test.present_class || "—"}</td>
              </tr>
              <tr className="border border-black">
                <td className="border border-black px-3 py-2 font-semibold bg-gray-100">Applying for Class</td>
                <td className="border border-black px-3 py-2 font-bold">{test.applying_for_class}</td>
              </tr>
              <tr className="border border-black">
                <td className="border border-black px-3 py-2 font-semibold bg-gray-100">Roll No</td>
                <td className="border border-black px-3 py-2 font-bold text-lg">{test.roll_no || "—"}</td>
              </tr>
            </tbody>
          </table>

          {/* Instructions Box */}
          {instructions && (
            <div className="border-2 border-black p-3 mb-6">
              <h3 className="font-bold text-sm mb-1 underline">Instructions:</h3>
              <p className="whitespace-pre-line text-[11px] leading-relaxed">{instructions}</p>
            </div>
          )}

          {/* Signatures */}
          <div className="flex justify-between mt-12 pt-4">
            <div className="text-center">
              <div className="border-t-2 border-black w-36 mx-auto mb-1"></div>
              <p className="text-[10px] font-semibold">Student's Signature</p>
            </div>
            <div className="text-center">
              {signatures.exam_controller && (
                <img src={signatures.exam_controller} alt="Exam Controller Sign" className="h-12 mx-auto mb-1 object-contain" />
              )}
              <div className="border-t-2 border-black w-36 mx-auto mb-1"></div>
              <p className="text-[10px] font-semibold">Sign of Exam Controller</p>
            </div>
            <div className="text-center">
              {signatures.head_master && (
                <img src={signatures.head_master} alt="Head Master Sign" className="h-12 mx-auto mb-1 object-contain" />
              )}
              <div className="border-t-2 border-black w-40 mx-auto mb-1"></div>
              <p className="text-[10px] font-semibold">Sign of Head Teacher<br />(with seal)</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PrintAdmitCard;
