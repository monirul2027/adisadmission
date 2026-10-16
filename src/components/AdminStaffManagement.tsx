import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ADMIN_PERMISSION_LABELS, AdminPermissionSet } from "@/lib/admin-permissions";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Pencil, Plus, RefreshCw, Shield, UserMinus } from "lucide-react";

type PermissionFlags = Pick<AdminPermissionSet, "can_approve_reject" | "can_sync_system" | "can_edit_applications" | "can_edit_site" | "can_manage_settings" | "can_export_data">;
type StaffRecord = AdminPermissionSet & { last_sign_in_at?: string | null; invited_at?: string | null };
const permissionKeys = Object.keys(ADMIN_PERMISSION_LABELS) as (keyof PermissionFlags)[];
const emptyPermissions: PermissionFlags = {
  can_approve_reject: true,
  can_sync_system: false,
  can_edit_applications: false,
  can_edit_site: false,
  can_manage_settings: false,
  can_export_data: false,
};

const invokeManage = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke("manage-admins", { body });
  if (error) {
    let message = error.message;
    try {
      const response = await (error as any).context?.json?.();
      if (response?.error) message = response.error;
    } catch { /* use the SDK message */ }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
};

const PermissionSwitches = ({ value, onChange }: { value: PermissionFlags; onChange: (key: keyof PermissionFlags, checked: boolean) => void }) => (
  <div className="space-y-3">
    {permissionKeys.map(key => <div key={key} className="flex items-center justify-between gap-4 rounded-lg border p-3">
      <Label htmlFor={`permission-${key}`} className="cursor-pointer text-sm">{ADMIN_PERMISSION_LABELS[key]}</Label>
      <Switch id={`permission-${key}`} checked={value[key]} onCheckedChange={checked => onChange(key, checked)} />
    </div>)}
  </div>
);

export default function AdminStaffManagement() {
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<StaffRecord | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [permissions, setPermissions] = useState<PermissionFlags>(emptyPermissions);
  const [editingActive, setEditingActive] = useState(true);
  const { toast } = useToast();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await invokeManage({ action: "list_admins" });
      setStaff(result.admins || []);
    } catch (error) {
      toast({ title: "Could not load administrators", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void refresh(); }, [refresh]);

  const setPermission = (key: keyof PermissionFlags, checked: boolean) => setPermissions(prev => ({ ...prev, [key]: checked }));

  const sendInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await invokeManage({ action: "invite_admin", full_name: fullName.trim(), email: email.trim(), ...permissions, redirect_to: `${window.location.origin}/admin/reset-password` });
      toast({ title: "Invitation sent", description: `A secure setup link was sent to ${email.trim()}.` });
      setInviteOpen(false); setFullName(""); setEmail(""); setPermissions(emptyPermissions);
      await refresh();
    } catch (error) {
      toast({ title: "Invitation failed", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally { setBusy(false); }
  };

  const savePermissions = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      await invokeManage({ action: "update_permissions", user_id: editing.user_id, ...permissions, is_active: editingActive });
      toast({ title: "Permissions updated", description: "The changes apply immediately." });
      setEditing(null); await refresh();
    } catch (error) {
      toast({ title: "Update failed", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally { setBusy(false); }
  };

  const revokeAccess = async (member: StaffRecord) => {
    if (!window.confirm(`Revoke admin access for ${member.full_name} (${member.email})? Their account and application records will be retained.`)) return;
    setBusy(true);
    try {
      await invokeManage({ action: "delete_admin", user_id: member.user_id });
      toast({ title: "Admin access revoked", description: "The user account and its existing records were retained." });
      await refresh();
    } catch (error) {
      toast({ title: "Could not revoke access", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally { setBusy(false); }
  };

  const editMember = (member: StaffRecord) => {
    setEditing(member);
    setPermissions(Object.fromEntries(permissionKeys.map(key => [key, member[key]])) as PermissionFlags);
    setEditingActive(member.is_active);
  };

  return <section className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 className="text-xl font-semibold">Admins &amp; Staff</h2><p className="text-sm text-muted-foreground">Manage staff access without changing student or application records.</p></div>
      <div className="flex gap-2"><Button variant="outline" onClick={() => void refresh()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button><Button onClick={() => setInviteOpen(true)}><Plus className="mr-2 h-4 w-4" /> Invite New Admin</Button></div>
    </div>

    {loading ? <div className="flex items-center justify-center rounded-xl border p-12 text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading staff…</div> : staff.length === 0 ? <div className="rounded-xl border p-10 text-center text-muted-foreground">No admin accounts found.</div> : <div className="grid gap-4 lg:grid-cols-2">
      {staff.map(member => {
        const status = !member.is_active ? "Suspended" : member.last_sign_in_at ? "Active" : "Pending Invite";
        const enabled = permissionKeys.filter(key => member.is_super_admin || member[key]);
        return <article key={member.user_id} className="min-w-0 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-semibold">{member.full_name}</h3><p className="truncate text-sm text-muted-foreground">{member.email}</p></div><div className="flex shrink-0 flex-wrap justify-end gap-1.5"><Badge variant={status === "Active" ? "default" : status === "Suspended" ? "destructive" : "secondary"}>{status}</Badge><Badge variant="outline">{member.is_super_admin ? "Super Admin" : "Admin"}</Badge></div></div>
          <div className="mt-4 flex flex-wrap gap-1.5">{member.is_super_admin ? <Badge variant="secondary"><Shield className="mr-1 h-3 w-3" /> Full control</Badge> : enabled.length ? enabled.map(key => <Badge variant="secondary" key={key}>{ADMIN_PERMISSION_LABELS[key]}</Badge>) : <span className="text-xs text-muted-foreground">No optional permissions granted</span>}</div>
          {!member.is_super_admin && <div className="mt-4 flex justify-end gap-2 border-t pt-3"><Button size="sm" variant="outline" onClick={() => editMember(member)} disabled={busy}><Pencil className="mr-1.5 h-4 w-4" /> Edit Permissions</Button><Button size="sm" variant="destructive" onClick={() => void revokeAccess(member)} disabled={busy}><UserMinus className="mr-1.5 h-4 w-4" /> Revoke Access</Button></div>}
        </article>;
      })}
    </div>}

    <Dialog open={inviteOpen} onOpenChange={open => { if (!busy) setInviteOpen(open); }}>
      <DialogContent className="max-h-[90dvh] max-w-xl overflow-y-auto"><DialogHeader><DialogTitle>Invite a new admin</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={sendInvite}><div className="space-y-2"><Label htmlFor="staff-full-name">Full Name</Label><Input id="staff-full-name" required maxLength={120} value={fullName} onChange={event => setFullName(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="staff-email">Email Address</Label><Input id="staff-email" type="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} /></div><div><p className="mb-2 text-sm font-medium">Permissions</p><PermissionSwitches value={permissions} onChange={setPermission} /></div><p className="text-xs text-muted-foreground">An invitation email will be sent automatically. The recipient will click the link to set their own secure password.</p><Button className="w-full" disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send Invitation</Button></form>
      </DialogContent>
    </Dialog>

    <Dialog open={!!editing} onOpenChange={open => { if (!open && !busy) setEditing(null); }}>
      <DialogContent className="max-h-[90dvh] max-w-xl overflow-y-auto"><DialogHeader><DialogTitle>Edit permissions — {editing?.full_name}</DialogTitle></DialogHeader><div className="space-y-4"><div className="flex items-center justify-between rounded-lg border p-3"><Label htmlFor="admin-active-switch">Admin account active</Label><Switch id="admin-active-switch" checked={editingActive} onCheckedChange={setEditingActive} /></div><PermissionSwitches value={permissions} onChange={setPermission} /><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button><Button onClick={() => void savePermissions()} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes</Button></div></div></DialogContent>
    </Dialog>
  </section>;
}
