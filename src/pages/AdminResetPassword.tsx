import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const AdminResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => setReady(!!session));
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) return toast({ title: "Password too short", description: "Use at least 8 characters.", variant: "destructive" });
    if (password !== confirmPassword) return toast({ title: "Passwords do not match", variant: "destructive" });
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast({ title: "Unable to update password", description: error.message, variant: "destructive" });
    toast({ title: "Password updated", description: "You can now sign in to the Admin Panel." });
    await supabase.auth.signOut();
    navigate("/admin/login", { replace: true });
  };

  return <div className="min-h-screen flex items-center justify-center bg-secondary p-4"><Card className="w-full max-w-sm"><CardHeader className="text-center space-y-3"><img src="/lovable-uploads/b3369ca5-553a-4c65-961b-27d4deb3ca86.jpg" alt="Logo" className="mx-auto h-20 w-20 rounded-full bg-primary p-1" /><CardTitle className="text-primary text-xl">Set new admin password</CardTitle></CardHeader><CardContent>{ready ? <form onSubmit={handleSubmit} className="space-y-4"><div className="space-y-2"><Label htmlFor="password">New password</Label><Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required /></div><div className="space-y-2"><Label htmlFor="confirm-password">Confirm new password</Label><Input id="confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required /></div><Button className="w-full" disabled={loading}>{loading ? "Updating..." : "Update password"}</Button></form> : <div className="space-y-4 text-center"><p className="text-sm text-muted-foreground">This reset link is invalid or has expired. Please request a new password reset email.</p><Button onClick={() => navigate("/admin/login")}>Back to Admin Login</Button></div>}</CardContent></Card></div>;
};

export default AdminResetPassword;
