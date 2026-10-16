export interface AdminPermissionSet {
  user_id: string;
  full_name: string;
  email: string;
  is_super_admin: boolean;
  can_approve_reject: boolean;
  can_sync_system: boolean;
  can_edit_applications: boolean;
  can_edit_site: boolean;
  can_manage_settings: boolean;
  can_export_data: boolean;
  is_active: boolean;
}

export type AdminPermissionKey = Exclude<keyof AdminPermissionSet, "user_id" | "full_name" | "email" | "is_super_admin">;

export const ADMIN_PERMISSION_LABELS: Record<Exclude<AdminPermissionKey, "is_active">, string> = {
  can_approve_reject: "Approve & reject applications",
  can_sync_system: "Sync to EduNest & Fee Portal",
  can_edit_applications: "Edit application information",
  can_edit_site: "Edit website content & notices",
  can_manage_settings: "Manage form settings & signatures",
  can_export_data: "Export applications",
};
