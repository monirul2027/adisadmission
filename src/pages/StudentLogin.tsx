import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { admissionPath, AUTH_DESTINATION_KEY, AUTH_KNOWN_USER_KEY, consumeAdmissionDestination, markKnownAuthUser, rememberAdmissionDestination, type AdmissionDestination } from "@/lib/auth-flow";

const StudentLogin = () => {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(() => {
    try { return localStorage.getItem(AUTH_KNOWN_USER_KEY) !== "true"; } catch { return true; }
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  const destinationFromUrl = searchParams.get("destination");
  useEffect(() => {
    if (destinationFromUrl === "new-admission" || destinationFromUrl === "admission-test") {
      try {
        if (localStorage.getItem(AUTH_DESTINATION_KEY) !== destinationFromUrl) rememberAdmissionDestination(destinationFromUrl as AdmissionDestination);
      } catch { rememberAdmissionDestination(destinationFromUrl as AdmissionDestination); }
    }
  }, [destinationFromUrl]);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active || !session) return;
      markKnownAuthUser();
      const destination = consumeAdmissionDestination();
      navigate(destination ? admissionPath(destination) : "/", { replace: true });
    });
    return () => { active = false; };
  }, [navigate]);

  const continueToIntent = () => {
    const destination = consumeAdmissionDestination();
    navigate(destination ? admissionPath(destination) : "/", { replace: true });
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    markKnownAuthUser();
    setLoading(true);
    try {
      if (isSignUp) {
        if (!fullName.trim()) throw new Error("Enter your full name.");
        if (password !== confirmPassword) throw new Error("Passwords do not match.");
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName.trim() } } });
        if (error) throw error;
        markKnownAuthUser();
        if (data.session) continueToIntent();
        else {
          toast({ title: "Account created!", description: "Please verify your email, then sign in to continue." });
          setIsSignUp(false);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        markKnownAuthUser();
        if (data.user?.user_metadata?.full_name && data.user.user_metadata.full_name !== fullName) setFullName(data.user.user_metadata.full_name);
        continueToIntent();
      }
    } catch (err: any) {
      toast({ title: "Error", description: getSafeErrorMessage(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-3">
          <img src="/lovable-uploads/b3369ca5-553a-4c65-961b-27d4deb3ca86.jpg" alt="Logo" className="mx-auto h-20 w-20 rounded-full bg-primary p-1" />
          <CardTitle className="text-primary text-xl">{isSignUp ? "Create your account" : "Sign in to continue"}</CardTitle>
          <p className="text-sm text-muted-foreground">Alor Disha Islamic School</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && <div className="space-y-2"><Label htmlFor="full-name">Full Name</Label><Input id="full-name" autoComplete="name" maxLength={100} value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete={isSignUp ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={isSignUp ? 8 : undefined} />
            </div>
            {isSignUp && <div className="space-y-2"><Label htmlFor="confirm-password">Confirm Password</Label><Input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} /></div>}
            <Button type="submit" className="w-full" disabled={loading}>
              <GraduationCap className="mr-2 h-4 w-4" />
              {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {isSignUp ? "Already have an account?" : "New to ADIS?"}{" "}
              <button type="button" className="text-primary underline" onClick={() => setIsSignUp(!isSignUp)}>
                {isSignUp ? "Sign in" : "Create account"}
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentLogin;
