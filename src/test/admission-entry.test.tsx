import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import DateOfBirthInput from "@/components/DateOfBirthInput";
import NewAdmissionForm from "@/pages/NewAdmissionForm";
import FormSettings from "@/pages/FormSettings";
import { datePartsToISO, type DateParts } from "@/lib/date-entry";
import { ADMISSION_FIELD_LABELS, readAdmissionVisibility } from "@/lib/admission-field-visibility";

vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });

const database = vi.hoisted(() => ({ visibility: {} as Record<string, boolean>, error: null as null | { message: string }, missingRow: false, activeSession: "2028" as unknown }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { user: { id: "test-user", user_metadata: { full_name: "Test Applicant" } } } } }) },
    from: () => ({
      select: () => ({
        then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [{ setting_key: "admission_form_fields", setting_value: database.visibility }] }).then(resolve),
        eq: (_col: string, key: string) => ({ maybeSingle: async () => ({ data: { setting_value: key === "active_session" ? { session: database.activeSession } : database.visibility }, error: database.error }) }),
      }),
      update: (payload: { setting_value: Record<string, boolean> }) => ({ eq: () => ({
        then: (resolve: (value: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve),
        select: () => ({ single: async () => {
          if (database.missingRow) return { error: { message: "Settings row missing" } };
          database.visibility = payload.setting_value;
          return { data: { setting_value: database.visibility }, error: null };
        } }),
      }) }),
      upsert: async () => ({ error: null }),
    }),
  },
}));
vi.mock("@/lib/supabase-helpers", async (original) => ({
  ...await original<typeof import("@/lib/supabase-helpers")>(),
  checkUserRole: async () => "admin",
  checkAdminPermission: async () => true,
}));

afterEach(() => { cleanup(); database.visibility = {}; database.error = null; database.missingRow = false; database.activeSession = "2028"; });

function DateHarness() {
  const [value, setValue] = useState<DateParts>({ day: "", month: "", year: "" });
  return <DateOfBirthInput value={value} onChange={setValue} />;
}

function renderForm() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter><NewAdmissionForm /></MemoryRouter></QueryClientProvider>);
}

describe("DD/MM/YYYY entry", () => {
  it("moves from day to month after exactly two digits", () => {
    render(<DateHarness />);
    const day = screen.getByLabelText("Date of Birth Day");
    day.focus();
    fireEvent.change(day, { target: { value: "1" } });
    expect(day).toHaveFocus();
    fireEvent.change(day, { target: { value: "15" } });
    expect(screen.getByLabelText("Date of Birth Month")).toHaveFocus();
  });
  it("moves from month to year after exactly two digits", () => {
    render(<DateHarness />);
    const month = screen.getByLabelText("Date of Birth Month");
    month.focus();
    fireEvent.change(month, { target: { value: "0" } });
    expect(month).toHaveFocus();
    fireEvent.change(month, { target: { value: "08" } });
    expect(screen.getByLabelText("Date of Birth Year")).toHaveFocus();
  });
  it("does not move focus or mutate raw input during IME composition", () => {
    render(<DateHarness />);
    const day = screen.getByLabelText("Date of Birth Day");
    day.focus();
    fireEvent.compositionStart(day);
    fireEvent.change(day, { target: { value: "15" } });
    expect(day).toHaveFocus();
    fireEvent.compositionEnd(day);
    expect(screen.getByLabelText("Date of Birth Month")).toHaveFocus();
    fireEvent.change(day, { target: { value: " a" } });
    expect(day).toHaveValue(" a");
  });
  it("splits a pasted DD/MM/YYYY date into its three parts", () => {
    render(<DateHarness />);
    fireEvent.paste(screen.getByLabelText("Date of Birth Day"), { clipboardData: { getData: () => "15/08/2018" } });
    expect(screen.getByLabelText("Date of Birth Day")).toHaveValue("15");
    expect(screen.getByLabelText("Date of Birth Month")).toHaveValue("08");
    expect(screen.getByLabelText("Date of Birth Year")).toHaveValue("2018");
  });
  it("returns to the preceding part on Backspace only when empty", () => {
    render(<DateHarness />);
    const year = screen.getByLabelText("Date of Birth Year");
    year.focus();
    fireEvent.keyDown(year, { key: "Backspace" });
    expect(screen.getByLabelText("Date of Birth Month")).toHaveFocus();
  });
  it("serializes the exact calendar date without a timezone shift", () => {
    expect(datePartsToISO({ day: "15", month: "08", year: "2018" })).toBe("2018-08-15");
  });
  it("rejects impossible, incomplete, and future birth dates", () => {
    const today = new Date(2026, 10, 25);
    expect(datePartsToISO({ day: "31", month: "02", year: "2018" }, today)).toBeNull();
    expect(datePartsToISO({ day: "29", month: "02", year: "2024" }, today)).toBe("2024-02-29");
    expect(datePartsToISO({ day: "15", month: "", year: "2018" }, today)).toBeNull();
    expect(datePartsToISO({ day: "26", month: "11", year: "2026" }, today)).toBeNull();
  });
});

describe("Admission Form Field Visibility", () => {
  const formLabels: Record<string, string> = {
    ...ADMISSION_FIELD_LABELS,
    aadhar_no: "Student Aadhar Card No",
    guardian_relation: "Relation with Student",
    last_institution: "Last Attended Institution",
    health_issue: "Health Issue (if any)",
  };
  for (const key of Object.keys(ADMISSION_FIELD_LABELS)) {
    it(`removes ${key} from the actual form when saved off`, async () => {
      database.visibility = { [key]: false };
      renderForm();
      await screen.findByLabelText("Full Name of the Student", { exact: false });
      expect(screen.queryByLabelText(formLabels[key])).not.toBeInTheDocument();
      expect(screen.getByLabelText("Mother's Name", { exact: false })).toBeInTheDocument();
    });
  }
  it("shows fields when settings are on or not configured", async () => {
    database.visibility = { name_bengali: true };
    renderForm();
    expect(await screen.findByLabelText("Name in Bengali")).toBeInTheDocument();
    expect(screen.getByLabelText("Guardian Name")).toBeInTheDocument();
    expect(readAdmissionVisibility(null)).toEqual({});
  });
  it("refuses to render a misleading form when settings cannot be loaded", async () => {
    database.error = { message: "Permission denied" };
    renderForm();
    await waitFor(() => expect(screen.getByText("Unable to load admission form settings.")).toBeInTheDocument(), { timeout: 3000 });
    expect(screen.queryByLabelText("Name in Bengali")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
  it("reads a saved off toggle back through the admission form", async () => {
    const client = new QueryClient();
    const settings = render(<QueryClientProvider client={client}><MemoryRouter><FormSettings /></MemoryRouter></QueryClientProvider>);
    fireEvent.click(await screen.findByRole("switch", { name: "Name in Bengali" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Settings" }));
    await waitFor(() => expect(database.visibility.name_bengali).toBe(false));
    settings.unmount();
    renderForm();
    await screen.findByLabelText("Full Name of the Student", { exact: false });
    expect(screen.queryByLabelText("Name in Bengali")).not.toBeInTheDocument();
  });
  it("does not accept a save that updated no visibility settings row", async () => {
    database.missingRow = true;
    const client = new QueryClient();
    render(<QueryClientProvider client={client}><MemoryRouter><FormSettings /></MemoryRouter></QueryClientProvider>);
    fireEvent.click(await screen.findByRole("switch", { name: "Name in Bengali" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Settings" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Save Settings" })).toBeEnabled());
    expect(database.visibility.name_bengali).toBeUndefined();
  });
});
describe("active academic session lock", () => {
  it("shows the admin-set session locked, with no session dropdown", async () => {
    renderForm();
    expect(await screen.findByLabelText("Academic Session: 2028")).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /academic session/i })).toBeNull();
  });

  it("blocks the form when the session setting is missing", async () => {
    database.activeSession = undefined;
    renderForm();
    expect(await screen.findByText("Unable to load admission form settings.", {}, { timeout: 4000 })).toBeInTheDocument();
  });
});

import { readActiveSession } from "@/lib/active-session";
describe("readActiveSession", () => {
  it("accepts a 4-digit year and rejects anything else", () => {
    expect(readActiveSession({ session: "2027" })).toBe("2027");
    expect(readActiveSession({ session: "abc" })).toBeNull();
    expect(readActiveSession(null)).toBeNull();
  });
});
