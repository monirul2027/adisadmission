import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("security hardening migration for Issues 1.1 and 1.2", () => {
  const migrationPath = path.resolve(
    __dirname,
    "../../supabase/migrations/20261108073000_fix_storage_privacy_and_lock_student_updates.sql",
  );

  it("restricts student-photos and student-documents SELECT policies to student owners and active admins (Issue 1.1)", () => {
    const sql = fs.readFileSync(migrationPath, "utf8");
    expect(sql).toContain("create or replace function private.can_read_student_storage_object");
    expect(sql).toContain("private.has_role(auth.uid(), 'admin'::public.app_role)");
    expect(sql).toContain("private.can_read_student_storage_object(bucket_id, name, owner)");
  });

  it("restricts UPDATE on applications and admission_tests strictly to active admins (Issue 1.2)", () => {
    const sql = fs.readFileSync(migrationPath, "utf8");
    expect(sql).toContain("raise exception 'Only administrators can update submitted applications'");
    expect(sql).toContain("raise exception 'Only administrators can update submitted admission test records'");
    expect(sql).toContain("raise exception 'Application identity fields cannot be modified'");
    expect(sql).toContain("raise exception 'Admission test identity fields cannot be modified'");
  });
});

describe("NewAdmissionForm file size limits and single-document rule", () => {
  const formPath = path.resolve(__dirname, "../pages/NewAdmissionForm.tsx");

  it("enforces 70 KB photo, 100 KB Aadhar/Birth Certificate, 30 KB Guardian Signature, and mutual exclusion", () => {
    const source = fs.readFileSync(formPath, "utf8");
    expect(source).toContain('cropTarget?.kind === "photo" ? 70 * 1024 : cropTarget?.label === "Guardian Signature" ? 30 * 1024 : 100 * 1024');
    expect(source).toContain("maxSizeKB={100}");
    expect(source).toContain("maxSizeKB={30}");
    expect(source).toContain("disabled={Boolean(birthCert)}");
    expect(source).toContain("disabled={Boolean(aadharDoc)}");
    expect(source).toContain("if (aadharDoc && !birthCert)");
    expect(source).toContain("else if (birthCert && !aadharDoc)");
  });
});
