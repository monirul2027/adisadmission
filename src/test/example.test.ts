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
    expect(source).toContain('cropTarget.kind === "photo" ? 70 * 1024 : cropTarget.label === "Guardian Signature" ? 30 * 1024 : 100 * 1024');
    expect(source).toContain("maxSizeKB={100}");
    expect(source).toContain("maxSizeKB={30}");
    expect(source).toContain("disabled={Boolean(birthCert)}");
    expect(source).toContain("disabled={Boolean(aadharDoc)}");
    expect(source).toContain("if (aadharDoc && !birthCert)");
    expect(source).toContain("else if (birthCert && !aadharDoc)");
  });

  it("prevents Android Gboard IME dismissal on spacebar long-press", () => {
    const source = fs.readFileSync(formPath, "utf8");
    expect(source).not.toContain("<datalist");
    expect(source).toContain("{cropTarget && (");
    expect(source).toContain('autoComplete="off"');
    expect(source).toContain("full_name: cleaned.full_name");
  });

  it("uses atomic database trigger for application_id and synchronous double-tap lock", () => {
    const source = fs.readFileSync(formPath, "utf8");
    const testFormPath = path.resolve(__dirname, "../pages/AdmissionTestForm.tsx");
    const testFormSource = fs.readFileSync(testFormPath, "utf8");
    const atomicMigrationPath = path.resolve(
      __dirname,
      "../../supabase/migrations/20261116080000_atomic_application_id_triggers.sql",
    );
    const atomicSql = fs.readFileSync(atomicMigrationPath, "utf8");

    expect(atomicSql).toContain("CREATE TRIGGER trg_assign_application_id");
    expect(atomicSql).toContain("public.generate_next_id(\n      'admission',\n      COALESCE(NULLIF(BTRIM(NEW.session), ''), '2027')\n    )");
    expect(atomicSql).toContain("CREATE TRIGGER trg_assign_admission_test_id");

    expect(source).not.toContain('generateIdViaEdge("admission"');
    expect(source).toContain("submittingRef.current");
    expect(source).toContain(".insert(insertData)\n        .select()\n        .single()");
    expect(source).toContain("setAppId(inserted.application_id)");

    expect(testFormSource).not.toContain('generateIdViaEdge("admission_test"');
    expect(testFormSource).toContain("submittingRef.current");
    expect(testFormSource).toContain(".insert(insertData)\n        .select()\n        .single()");
    expect(testFormSource).toContain("setTestId(inserted.test_id)");
  });

  it("implements Student Forgot Password and StudentResetPassword flow and routes", () => {
    const loginSource = fs.readFileSync(path.resolve(__dirname, "../pages/StudentLogin.tsx"), "utf8");
    const resetSource = fs.readFileSync(path.resolve(__dirname, "../pages/StudentResetPassword.tsx"), "utf8");
    const appSource = fs.readFileSync(path.resolve(__dirname, "../App.tsx"), "utf8");

    expect(loginSource).toContain("{!isSignUp && (");
    expect(loginSource).toContain("Please enter your registered email first.");
    expect(loginSource).toContain("supabase.auth.resetPasswordForEmail(normalizedEmail");
    expect(loginSource).toContain("`${window.location.origin}/student/reset-password`");
    expect(loginSource).toContain("Sending reset link...");
    expect(loginSource).toContain("Check your email - A password reset link has been sent to your email address.");

    expect(resetSource).toContain("PASSWORD_RECOVERY");
    expect(resetSource).toContain("This reset link is invalid or has expired. Please request a new password reset email.");
    expect(resetSource).toContain("supabase.auth.updateUser({ password })");
    expect(resetSource).toContain("await supabase.auth.signOut()");
    expect(resetSource).toContain("Password updated successfully. You can now sign in.");

    expect(appSource).toContain('<Route path="/student/reset-password" element={<StudentResetPassword />} />');
    expect(appSource).toContain('<Route path="/reset-password" element={<Navigate to="/student/reset-password" replace />} />');
  });
});


