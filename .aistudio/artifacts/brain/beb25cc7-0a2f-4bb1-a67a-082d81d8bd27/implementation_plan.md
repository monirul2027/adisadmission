# Admission Form Upload Size Limits & Single-ID Document Rule

Update the **New Admission Form** (`NewAdmissionForm`) file size limits (**70 KB** for Student Photo, **100 KB** for Aadhar Card and Birth Certificate, and **30 KB** for Guardian Signature) and enforce mutual exclusion between **Aadhar Card** and **Birth Certificate** so that at most one of those two documents can be selected and uploaded to storage, without altering any database rules, functions, or other portal logic.

## User Review & Critical Decisions

> [!IMPORTANT]
> Summary of your confirmed choices and strict scope constraints:

- **Confirmed Decision 1 (Optional Single Identity Document)**: Uploading an **Aadhar Card** or **Birth Certificate** remains optional, but **only one of the two** may be uploaded—never both.
- **Confirmed Decision 2 (Disable Opposite Upload Slot)**: When a parent/admin selects an **Aadhar Card**, the **Birth Certificate** upload button is disabled (with a clear helper note that only one of Aadhar Card or Birth Certificate is needed) until the Aadhar Card is removed—and vice versa.
- **Confirmed Decision 3 (Updated File Size Caps)**:
  - **Student Photograph**: Max **`70 KB`** (`70 * 1024` bytes)
  - **Aadhar Card**: Max **`100 KB`** (`100 * 1024` bytes)
  - **Birth Certificate**: Max **`100 KB`** (`100 * 1024` bytes)
  - **Guardian's Signature**: Max **`30 KB`** (`30 * 1024` bytes)
- **Zero Impact on Other Logic**: No Supabase database rules, RLS policies, SQL functions, or unrelated pages/workflows will be modified.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. Configures the crop-and-compress pipeline on the New Admission Form to target and enforce the new per-document byte limits (`70 KB` photo, `100 KB` Aadhar/Birth Certificate, `30 KB` Guardian Signature) and updates the displayed helper labels accordingly.
  2. Prevents dual uploads of both **Aadhar Card** and **Birth Certificate** both in the form UI (by disabling the second slot when the first is chosen) and in the submission handler (guaranteeing that only one of the two is ever uploaded to `student-documents` storage).
- **Target Audience / Persona**: Applicants, parents, and staff filling out the New Admission Form.
- **Key Value**: Significantly reduces storage consumption per student application by enforcing tighter image compression targets and preventing redundant dual-ID document uploads.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Student Photo Upload (`70 KB`)**: Selecting a student photo opens the crop dialog, compresses the cropped image to `<= 70 KB`, and shows `"Supported: JPG, JPEG, PNG • Max size: 70 KB"`.
  2. **Aadhar Card OR Birth Certificate Selection (`100 KB` each, mutually exclusive)**:
     - Initially, both **Aadhar Card** and **Birth Certificate** upload buttons are active and display `"Supported: JPG, JPEG, PNG • Max size: 100 KB"`.
     - Once a file is cropped and saved for **Aadhar Card**, the **Birth Certificate** upload control becomes disabled (`opacity-60 cursor-not-allowed`) with a concise note (`"Aadhar Card selected (upload only one). Remove it to upload Birth Certificate instead."`).
     - Conversely, if **Birth Certificate** is selected first, the **Aadhar Card** upload control is disabled until the Birth Certificate is removed.
  3. **Guardian's Signature Upload (`30 KB`)**: Selecting a Guardian Signature opens the crop dialog, compresses the cropped image to `<= 30 KB`, and shows `"Supported: JPG, JPEG, PNG • Max size: 30 KB"`.
- **Visual Identity & Theme**:
  - Preserves the exact existing card layout, typography, colors, and mobile responsiveness of the New Admission Form.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Per-Slot `maxSizeBytes` Routing in `ImageCropDialog`**
  - *Chosen Approach*: Pass the exact byte limit into `ImageCropDialog` based on the active `cropTarget`:
    - `cropTarget.kind === "photo"` → `70 * 1024` (`70 KB`)
    - `cropTarget.label === "Guardian Signature"` → `30 * 1024` (`30 KB`)
    - `cropTarget.label === "Aadhar Card"` or `"Birth Certificate"` → `100 * 1024` (`100 KB`)
  - *Why*: Ensures the browser's built-in cropper and compressor automatically optimizes each image to fit its specific KB limit without requiring parents to manually resize files before selecting them.
- **Decision 2: UI-Level Lock + Pre-Upload Submission Guard**
  - *Chosen Approach*: Disable the opposite file input in `GalleryInput` when either `aadharDoc` or `birthCert` is present, clear the opposite state if one is saved, and guard the storage upload in `handleSubmit` so only `aadharDoc` OR `birthCert` can ever be uploaded to Supabase Storage.
  - *Why*: Guarantees both a clear user experience and strict storage enforcement.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Component & State Flow Diagram**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         NewAdmissionForm View                           │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Student Photograph Slot                                           │  │
│  │  • Label: "Max size: 70 KB"                                       │  │
│  │  • ImageCropDialog(maxSizeBytes = 70 * 1024)                      │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Supporting Documents Section                                      │  │
│  │  ┌───────────────────┐ ┌───────────────────┐ ┌─────────────────┐  │  │
│  │  │ Aadhar Card       │ │ Birth Certificate │ │ Guardian's Sign │  │  │
│  │  │ Max: 100 KB       │ │ Max: 100 KB       │ │ Max: 30 KB      │  │  │
│  │  │ Disabled if       │ │ Disabled if       │ │ Always independent│ │  │
│  │  │ birthCert != null │ │ aadharDoc != null │ │ (30 * 1024 B)   │  │  │
│  │  └─────────┬─────────┘ └─────────┬─────────┘ └────────┬────────┘  │  │
│  └────────────┼─────────────────────┼────────────────────┼───────────┘  │
│               └──────────┬──────────┘                    │              │
│                          ▼                               ▼              │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ handleSubmit Pre-Upload & Storage Pipeline                        │  │
│  │  • Verifies !(aadharDoc && birthCert)                             │  │
│  │  • Uploads photo (<= 70 KB) to 'student-photos'                   │  │
│  │  • Uploads ONLY aadharDoc OR birthCert (<= 100 KB) if provided    │  │
│  │  • Uploads guardianSig (<= 30 KB) if provided                     │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

- **State & Validation Mapping**:
  - **`saveCroppedFile` Handler**:
    - When `cropTarget.label === "Aadhar Card"`, sets `aadharDoc(file)` and ensures `birthCert` is `null`.
    - When `cropTarget.label === "Birth Certificate"`, sets `birthCert(file)` and ensures `aadharDoc` is `null`.
  - **`GalleryInput` Props**:
    - Accepts `maxSizeKB: number` (`100` for Aadhar/Birth Certificate, `30` for Guardian Signature) and optional `disabled?: boolean` + `disabledReason?: string`.
  - **`handleSubmit` Storage Guard**:
    - Blocks submission if both `aadharDoc` and `birthCert` are somehow set simultaneously, and uploads at most one of the two to `student-documents`.
