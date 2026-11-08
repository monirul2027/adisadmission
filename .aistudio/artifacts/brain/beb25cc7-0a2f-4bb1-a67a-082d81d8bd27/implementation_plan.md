# CSV Export for Admissions & Admission Tests

Add a dedicated **Export CSV** capability to the Admin Dashboard so authorized administrators can download filtered or class-wise **New Admission** and **Admission Test** records in standard UTF-8 CSV format alongside the existing Excel (`.xlsx`) export.

## User Review & Critical Decisions

> [!IMPORTANT]
> Please review the following design and data scope decisions before we write any code:

- **Placement & Coverage**: Add an **Export CSV** button directly alongside the existing `Export All` (Excel) button in both the **Admissions** tab and the **Admission Tests** tab of the Admin Dashboard, gated by the existing `can_export_data` admin permission.
- **Filter-Aware & Class-Wise Scope**: Clicking **Export CSV** will export the currently filtered dataset (respecting the active Class, Session, Status, and Search filters). In addition, we can support class-wise CSV export or include key fields such as Student Code, Bengali Name, WhatsApp Number, and Sync Status.
- **UTF-8 BOM Encoding for Bengali Text**: Prepend a UTF-8 Byte Order Mark (`\uFEFF`) to generated CSV files so Bengali names (`name_bengali`) and regional characters render accurately when opened in Microsoft Excel, Google Sheets, or LibreOffice.

---

## 1. Overview & Core Concept

- **What It Does**: Provides instant, one-click CSV file generation and browser download for both **Admissions** and **Admission Tests** in the Admin Dashboard.
- **Target Audience / Persona**: Super Admins and authorized school office staff (`can_export_data = true`) who need lightweight `.csv` files for bulk SMS/WhatsApp tools, external school ERPs, government portal uploads, or spreadsheet analysis.
- **Key Value**: Eliminates manual file conversion from `.xlsx` to `.csv`, preserves Bengali script fidelity via UTF-8 BOM encoding, and respects current dashboard filters so admins only export the exact slice of records they need.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Filtered CSV Export**: The admin navigates to the **Admissions** or **Admission Tests** tab, optionally filters by Class, Session, Status (`Pending`, `Approved`, `Rejected`), or search query, and clicks **Export CSV**.
  2. **Instant Download & Feedback**: If matching records exist, the browser immediately downloads a timestamped `.csv` file (e.g., `Admissions_Class_V_1730908000.csv`) and displays a confirmation toast showing the number of exported rows.
  3. **Empty-State Guard**: If the current filter matches zero records, clicking **Export CSV** shows a clear informational toast (`"No matching records to export"`) instead of downloading an empty file.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Clean, utilitarian SaaS admin toolbar aligned with the existing Alor Disha Islamic School emerald-and-gold palette.
  - *Color Palette & Mood*: Uses existing semantic tokens (`--background`, `--card`, `--primary`, `--border`, `--muted-foreground`) with crisp 1px borders and single-elevation depth.
  - *Typography & Hierarchy*: Single-line button labels (`whitespace-nowrap shrink-0`) with `tabular-nums` for record counts and IDs.
  - *Component Styling & Layout*: Action toolbar above the data table groups the export controls cleanly with `size="sm"` outline buttons and a `FileSpreadsheet` / `Download` icon pair so admins can visually distinguish Excel (`.xlsx`) vs. CSV (`.csv`) at a glance.
- **Interactive Feedback & Motion**:
  - Subtle hover background transition (`150ms`) on export buttons.
  - Disabled button state when `loading` is active or when the filtered list is empty.
  - Immediate toast confirmation upon export completion.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: UTF-8 BOM + RFC 4180 CSV Serialization**
  - *Chosen Approach*: Generate RFC 4180-compliant CSV strings (escaping embedded commas, double quotes, and newlines) prefixed with `\uFEFF` (UTF-8 BOM) and trigger download via a native `Blob` (`text/csv;charset=utf-8;`).
  - *Why*: Admissions data includes Bengali script (`name_bengali`) and multi-word addresses/landmarks containing commas. Without a UTF-8 BOM, Microsoft Excel on Windows misinterprets UTF-8 characters as Mojibake.
  - *Alternatives Considered*: Plain `XLSX.utils.sheet_to_csv` without BOM or raw string concatenation — rejected because Excel fails to decode Bengali characters without the BOM header.
- **Decision 2: Respecting Active Dashboard Filters**
  - *Chosen Approach*: Use the active `filteredApps` and `filteredTests` arrays when clicking **Export CSV**, and also allow class-specific export selection.
  - *Why*: Matches the existing `Export All` behavior so admins can filter by Session, Status (`Approved` only, `Pending` only), or Class and immediately export that exact subset.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AdminDashboard View                              │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Global Filter Bar (Class · Session · Status · Search Query)       │  │
│  └───────────────┬───────────────────────────────────┬───────────────┘  │
│                  ▼                                   ▼                  │
│  ┌───────────────────────────────┐   ┌───────────────────────────────┐  │
│  │ Admissions Tab                │   │ Admission Tests Tab           │  │
│  │ (filteredApps)                │   │ (filteredTests)               │  │
│  │ ┌───────────────────────────┐ │   │ ┌───────────────────────────┐ │  │
│  │ │ Export Toolbar            │ │   │ │ Export Toolbar            │ │  │
│  │ │ [Export Excel]            │ │   │ │ [Export Excel]            │ │  │
│  │ │ [Export CSV]              │ │   │ │ [Export CSV]              │ │  │
│  │ │ [Class-wise Select]       │ │   │ │ [Class-wise Select]       │ │  │
│  │ └─────────────┬─────────────┘ │   │ └─────────────┬─────────────┘ │  │
│  └───────────────┼───────────────┘   └───────────────┼───────────────┘  │
│                  └─────────────────┬─────────────────┘                  │
│                                    ▼                                    │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ CSV Serializer & Download Handler                                 │  │
│  │  1. Map records to normalized column headers                      │  │
│  │  2. Escape quotes/commas/newlines (RFC 4180)                      │  │
│  │  3. Prepend UTF-8 BOM (\uFEFF) & create Blob(text/csv)            │  │
│  │  4. Trigger anchor download & show summary Toast                  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & Export Columns**:
  - **Admissions CSV Columns**: `Application ID`, `Student Code`, `Name`, `Name (Bengali)`, `Father`, `Mother`, `Class`, `Session`, `DOB`, `Sex`, `Religion`, `Mobile`, `WhatsApp`, `Village`, `P.O`, `P.S`, `District`, `PIN`, `Landmark`, `Monthly Fees`, `Admission Fee`, `Status`, `Applied On`.
  - **Admission Tests CSV Columns**: `Test ID`, `Roll No`, `Name`, `Father`, `Class`, `Session`, `Mobile`, `Village`, `P.O`, `P.S`, `District`, `Landmark`, `Status`, `Applied On`.
- **Interactive Component & State Mapping**:
  - **Permission Check**: Export toolbar renders only when `permissions?.can_export_data` is truthy (Super Admins and authorized staff).
  - **Validation & Empty State**: Checks `data.length === 0` before generating the file; if empty, triggers a toast notification instead of downloading a blank CSV.
  - **File Naming**: Dynamically names the downloaded file using the active tab, class filter (`All` or specific class), and timestamp (e.g., `Admissions_All_1730908000.csv` or `AdmissionTests_Class_VI_1730908000.csv`).
