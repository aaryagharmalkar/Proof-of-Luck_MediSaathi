# MediSaathi – Tables and migration guide

## Tables to keep (do not delete)

| Table | Purpose |
|-------|--------|
| **user_profiles** | Auth: `user_id`, `email`, `onboarding_completed`, optional `role`. Used by signin/signup. |
| **profiles** | Patient profile: `full_name`, `age`, `gender`, `location`, `health_profile`, `emergency_contact`, etc. Used by `/auth/profile` and onboarding. |
| **members** | Family members linked to a user. Used by appointments, reports, medicines with `member_id`. |
| **medicines** | Medicine tracking per user/member. |
| **medicine_doses** | Dose-level tracking if you use it. |
| **health_records** | Patient health records. |
| **doctors** | Doctor profile: `user_id`, `full_name`, `license_number`, `specialization`, `fees_inr`, `onboarding_completed`, etc. Used by doctor APIs. |
| **doctor_availability** | Weekly slots per doctor: `doctor_id`, `day_of_week`, `start_time`, `end_time`. |
| **appointments** | Bookings: `patient_id`, `doctor_id`, `date`, `time_slot`, `status`, `symptoms`, `fees_inr`. |
| **medical_reports** | Uploaded reports: `user_id`, `report_id`, `file_name`, `storage_path`, `storage_encrypted`, optional `full_text`/`summary` (legacy). With zero-content strategy: file stored encrypted; no full_text/summary stored. Doctors can read reports of patients who have an appointment with them. |
| **document_chunks** | Chunks/embeddings for RAG (reports). |

**Do not delete `user_profiles` or `profiles`.** They serve different roles: `user_profiles` = auth/onboarding flag (and optional role); `profiles` = full patient profile and onboarding data. Merging them would require refactoring auth and profile APIs.

---

The main schema `supabase_schema.sql` includes `member_id` on **appointments** and **medical_reports** for family-member support. No separate migration is required.

---

## Tables you can consider removing (optional cleanup)

- **medicine_doses** – Only remove if you are not using dose-level tracking and have no references to this table.
- Do **not** remove **profiles** or **user_profiles**; both are in use.

---

## Doctor API and tables

The new **doctors** router uses:

- **doctors** – `GET /doctors/me`, `PATCH /doctors/me`, `POST /doctors/me/complete-onboarding`, etc.
- **doctor_availability** – `PUT /doctors/me/availability`
- **appointments** – `GET /doctors/me/appointments` (filter by `doctor_id`)
- **profiles** – patient list and detail (by `user_id` = `patient_id`)
- **medical_reports** – `GET /doctors/me/patients/{id}` (reports) and report-summary (by `user_id`)

Ensure the schema in `supabase_schema.sql` (doctors, doctor_availability, appointments, medical_reports with RLS) is applied in your Supabase project so the doctor APIs work correctly.

---

## Zero-content reports (encrypted storage, on-demand summary)

**Encryption is mandatory.** All report uploads are encrypted; there is no fallback to plain storage.

1. **Schema:** `supabase_schema.sql` already defines `storage_path` and `storage_encrypted` on `medical_reports`. Run the full schema (or ensure these columns exist) in the Supabase SQL Editor.

2. **Set encryption key** in backend `.env` (required; app will not start without it):
   - `REPORT_ENCRYPTION_KEY` = 32-byte key as **64 hex characters** (e.g. `openssl rand -hex 32`) or base64.

3. **Behaviour**
   - **Upload:** PDF is always encrypted (AES-256-GCM) and stored in `medical_reports` bucket; text is extracted only to build embeddings (stored in `document_chunks`); **full_text and summary are never stored**.
   - **View:** `GET /reports/{report_id}/view` decrypts the file, generates a summary on-demand (LLM), returns `{ summary, file_base64 }` **without persisting** the summary.
   - **Doctor report-summary:** Same on-demand decrypt + summarize; summary is not stored.
