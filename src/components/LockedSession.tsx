import { Lock } from "lucide-react";

const LockedSession = ({ session, label = "Academic Session" }: { session: string; label?: string }) => (
  <div className="space-y-2 min-w-0">
    <span className="text-sm font-medium">{label} <span className="text-destructive">*</span></span>
    <div className="flex items-center gap-2 rounded-md border border-input bg-muted px-3 py-2 text-sm" aria-label={`${label}: ${session}`}>
      <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="font-semibold">{session}</span>
      <span className="truncate text-xs text-muted-foreground">Set by school</span>
    </div>
  </div>
);

export default LockedSession;
