-- =============================================================================
-- MediSaathi – Supabase schema for backend APIs
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. user_profiles (auth / onboarding flag)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT DEFAULT 'patient',
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.user_profiles IS 'Tracks onboarding status per user (used by auth/signin).';

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own user_profile" ON public.user_profiles;
CREATE POLICY "Users can read own user_profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own user_profile" ON public.user_profiles;
CREATE POLICY "Users can insert own user_profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own user_profile" ON public.user_profiles;
CREATE POLICY "Users can update own user_profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 2. profiles (full profile + onboarding steps)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  age INT,
  gender TEXT,
  location TEXT,
  avatar TEXT,
  health_profile JSONB DEFAULT '{}',
  questionnaire_responses JSONB DEFAULT '{}',
  primary_doctor JSONB DEFAULT '{}',
  emergency_contact JSONB DEFAULT '{}',
  setup_completed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'Full user profile and onboarding data.';

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 3. members (family / household members)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT,
  avatar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.members IS 'Family/household members per user.';

CREATE INDEX IF NOT EXISTS idx_members_user_id ON public.members(user_id);

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own members" ON public.members;
CREATE POLICY "Users can read own members"
  ON public.members FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own members" ON public.members;
CREATE POLICY "Users can insert own members"
  ON public.members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own members" ON public.members;
CREATE POLICY "Users can update own members"
  ON public.members FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own members" ON public.members;
CREATE POLICY "Users can delete own members"
  ON public.members FOR DELETE
  USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 4. medicines (medicine tracking per user / family member)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.medicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  dosage TEXT,
  form TEXT,
  frequency TEXT,
  intake_times JSONB NOT NULL DEFAULT '[]',
  custom_times JSONB NOT NULL DEFAULT '[]',
  dose_count NUMERIC DEFAULT 1,
  unit TEXT DEFAULT 'tablet',
  start_date TEXT,
  end_date TEXT,
  quantity_current NUMERIC,
  quantity_unit TEXT,
  refill_reminder_days INT,
  is_critical BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  daily_status JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.medicines IS 'Medicines and schedules per user (member_id null = self).';

CREATE INDEX IF NOT EXISTS idx_medicines_user_id ON public.medicines(user_id);
CREATE INDEX IF NOT EXISTS idx_medicines_member_id ON public.medicines(member_id);
CREATE INDEX IF NOT EXISTS idx_medicines_created_at ON public.medicines(created_at DESC);

ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own medicines" ON public.medicines;
CREATE POLICY "Users can read own medicines"
  ON public.medicines FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own medicines" ON public.medicines;
CREATE POLICY "Users can insert own medicines"
  ON public.medicines FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own medicines" ON public.medicines;
CREATE POLICY "Users can update own medicines"
  ON public.medicines FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own medicines" ON public.medicines;
CREATE POLICY "Users can delete own medicines"
  ON public.medicines FOR DELETE
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_medicines_updated_at ON public.medicines;
CREATE TRIGGER set_medicines_updated_at
  BEFORE UPDATE ON public.medicines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 5. health_records (health metrics)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.health_records IS 'Health metrics (e.g. BP, sugar, weight) per user.';

CREATE INDEX IF NOT EXISTS idx_health_records_user_id ON public.health_records(user_id);
CREATE INDEX IF NOT EXISTS idx_health_records_user_metric ON public.health_records(user_id, metric);
CREATE INDEX IF NOT EXISTS idx_health_records_created_at ON public.health_records(created_at DESC);

ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own health_records" ON public.health_records;
CREATE POLICY "Users can read own health_records"
  ON public.health_records FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own health_records" ON public.health_records;
CREATE POLICY "Users can insert own health_records"
  ON public.health_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own health_records" ON public.health_records;
CREATE POLICY "Users can update own health_records"
  ON public.health_records FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own health_records" ON public.health_records;
CREATE POLICY "Users can delete own health_records"
  ON public.health_records FOR DELETE
  USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- Optional: trigger to keep updated_at in sync (profiles, members)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER set_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_members_updated_at ON public.members;
CREATE TRIGGER set_members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- Done. Tables: user_profiles, profiles, members, medicines, health_records
-- RLS is enabled; users can only access rows where user_id = auth.uid().
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 7. patient_documents (RAG source documents + embeddings)
-- -----------------------------------------------------------------------------
-- Requires pgvector extension. In Supabase: Extensions -> enable "vector".
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.patient_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  embedding vector(768),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.patient_documents IS 'RAG documents per user/member (embedding dimension must match model).';

CREATE INDEX IF NOT EXISTS idx_patient_documents_user_id ON public.patient_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_patient_documents_member_id ON public.patient_documents(member_id);
CREATE INDEX IF NOT EXISTS idx_patient_documents_embedding ON public.patient_documents
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own patient_documents" ON public.patient_documents;
CREATE POLICY "Users can read own patient_documents"
  ON public.patient_documents FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own patient_documents" ON public.patient_documents;
CREATE POLICY "Users can insert own patient_documents"
  ON public.patient_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own patient_documents" ON public.patient_documents;
CREATE POLICY "Users can update own patient_documents"
  ON public.patient_documents FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own patient_documents" ON public.patient_documents;
CREATE POLICY "Users can delete own patient_documents"
  ON public.patient_documents FOR DELETE
  USING (auth.uid() = user_id);

-- Similarity search RPC for RAG
CREATE OR REPLACE FUNCTION public.match_patient_documents(
  query_embedding vector(768),
  match_count int,
  user_id uuid,
  member_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE SQL
AS $$
  SELECT
    d.id,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM public.patient_documents d
  WHERE d.user_id = match_patient_documents.user_id
    AND (
      (match_patient_documents.member_id IS NULL AND d.member_id IS NULL)
      OR d.member_id = match_patient_documents.member_id
    )
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- -----------------------------------------------------------------------------
-- 6. doctors (doctor profiles)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  license_number TEXT,
  license_verified BOOLEAN NOT NULL DEFAULT FALSE,
  license_verified_at TIMESTAMPTZ,
  specialization TEXT,
  fees_inr INT DEFAULT 500,
  bio TEXT,
  avatar TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.doctors IS 'Doctor profiles with medical license and specialization.';

CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON public.doctors(user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_license ON public.doctors(license_number);

ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Doctors can read own profile" ON public.doctors;
CREATE POLICY "Doctors can read own profile"
  ON public.doctors FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Doctors can insert own profile" ON public.doctors;
CREATE POLICY "Doctors can insert own profile"
  ON public.doctors FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Doctors can update own profile" ON public.doctors;
CREATE POLICY "Doctors can update own profile"
  ON public.doctors FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Patients can read doctor profiles" ON public.doctors;
CREATE POLICY "Patients can read doctor profiles"
  ON public.doctors FOR SELECT
  USING (onboarding_completed = TRUE);

DROP TRIGGER IF EXISTS set_doctors_updated_at ON public.doctors;
CREATE TRIGGER set_doctors_updated_at
  BEFORE UPDATE ON public.doctors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 7. doctor_availability (weekly availability slots)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.doctor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.doctor_availability IS 'Weekly availability for doctors (day_of_week: 0=Sun..6=Sat).';

CREATE INDEX IF NOT EXISTS idx_doctor_availability_doctor ON public.doctor_availability(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_availability_day ON public.doctor_availability(doctor_id, day_of_week);

ALTER TABLE public.doctor_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Doctors can manage own availability" ON public.doctor_availability;
CREATE POLICY "Doctors can manage own availability"
  ON public.doctor_availability FOR ALL
  USING (
    doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
  )
  WITH CHECK (
    doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Patients can read doctor availability" ON public.doctor_availability;
CREATE POLICY "Patients can read doctor availability"
  ON public.doctor_availability FOR SELECT
  USING (TRUE);

DROP TRIGGER IF EXISTS set_doctor_availability_updated_at ON public.doctor_availability;
CREATE TRIGGER set_doctor_availability_updated_at
  BEFORE UPDATE ON public.doctor_availability
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 8. appointments (patient appointments with doctors)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  doctor_id TEXT NOT NULL,
  doctor_name TEXT,
  specialization TEXT,
  date TEXT NOT NULL,
  time_slot TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed')),
  symptoms TEXT,
  fees_inr INT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.appointments IS 'Patient appointments with doctors (supports mock doctors for demos).';

CREATE INDEX IF NOT EXISTS idx_appointments_patient ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_member ON public.appointments(member_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients can read own appointments" ON public.appointments;
CREATE POLICY "Patients can read own appointments"
  ON public.appointments FOR SELECT
  USING (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Patients can insert own appointments" ON public.appointments;
CREATE POLICY "Patients can insert own appointments"
  ON public.appointments FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Patients can update own appointments" ON public.appointments;
CREATE POLICY "Patients can update own appointments"
  ON public.appointments FOR UPDATE
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Patients can delete own appointments" ON public.appointments;
CREATE POLICY "Patients can delete own appointments"
  ON public.appointments FOR DELETE
  USING (auth.uid() = patient_id);

DROP TRIGGER IF EXISTS set_appointments_updated_at ON public.appointments;
CREATE TRIGGER set_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 9. medical_reports (patient medical reports - for doctor access)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.medical_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  report_id TEXT,
  file_name TEXT,
  full_text TEXT,
  summary TEXT,
  storage_path TEXT,
  storage_encrypted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.medical_reports IS 'Medical reports uploaded by patients.';
COMMENT ON COLUMN public.medical_reports.storage_path IS 'Path in medical_reports bucket (encrypted file when storage_encrypted=true).';
COMMENT ON COLUMN public.medical_reports.storage_encrypted IS 'When true, file at storage_path is encrypted; summary/full_text are not stored.';

CREATE INDEX IF NOT EXISTS idx_medical_reports_user ON public.medical_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_medical_reports_member ON public.medical_reports(member_id);
CREATE INDEX IF NOT EXISTS idx_medical_reports_report_id ON public.medical_reports(report_id);

ALTER TABLE public.medical_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own medical_reports" ON public.medical_reports;
CREATE POLICY "Users can read own medical_reports"
  ON public.medical_reports FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own medical_reports" ON public.medical_reports;
CREATE POLICY "Users can insert own medical_reports"
  ON public.medical_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own medical_reports" ON public.medical_reports;
CREATE POLICY "Users can update own medical_reports"
  ON public.medical_reports FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Doctors can read patient reports" ON public.medical_reports;
CREATE POLICY "Doctors can read patient reports"
  ON public.medical_reports FOR SELECT
  USING (
    user_id IN (
      SELECT DISTINCT patient_id 
      FROM public.appointments 
      WHERE doctor_id::uuid IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
    )
  );

DROP TRIGGER IF EXISTS set_medical_reports_updated_at ON public.medical_reports;
CREATE TRIGGER set_medical_reports_updated_at
  BEFORE UPDATE ON public.medical_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- Complete schema with doctor system integration
-- Tables: user_profiles, profiles, members, medicines, health_records, 
--         doctors, doctor_availability, appointments, medical_reports

-- -----------------------------------------------------------------------------
-- 10. agent_clarifications (AI agent follow-up questions)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_clarifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  context TEXT,
  answer TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  priority INTEGER DEFAULT 2,
  related_item_type VARCHAR(50),
  related_item_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  answered_at TIMESTAMPTZ,
  CONSTRAINT valid_agent_clarification_status CHECK (status IN ('pending', 'answered', 'dismissed')),
  CONSTRAINT valid_agent_clarification_priority CHECK (priority BETWEEN 1 AND 3)
);

CREATE INDEX IF NOT EXISTS idx_agent_clarifications_user ON public.agent_clarifications(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_clarifications_status ON public.agent_clarifications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_clarifications_created ON public.agent_clarifications(created_at DESC);

ALTER TABLE public.agent_clarifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own clarifications" ON public.agent_clarifications;
CREATE POLICY "Users can view own clarifications"
  ON public.agent_clarifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own clarifications" ON public.agent_clarifications;
CREATE POLICY "Users can update own clarifications"
  ON public.agent_clarifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can insert clarifications" ON public.agent_clarifications;
CREATE POLICY "Service role can insert clarifications"
  ON public.agent_clarifications FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete own clarifications" ON public.agent_clarifications;
CREATE POLICY "Users can delete own clarifications"
  ON public.agent_clarifications FOR DELETE
  USING (auth.uid() = user_id AND status = 'dismissed');

-- -----------------------------------------------------------------------------
-- 11. agent_execution_logs (AI agent audit trail)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id VARCHAR(255),
  iteration INTEGER,
  agent_state VARCHAR(50),
  action VARCHAR(100),
  action_input JSONB,
  observation TEXT,
  success BOOLEAN DEFAULT true,
  reasoning TEXT,
  confidence_score DECIMAL(3,2),
  metadata JSONB,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_logs_user_session ON public.agent_execution_logs(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created ON public.agent_execution_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_action ON public.agent_execution_logs(action);

ALTER TABLE public.agent_execution_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own execution logs" ON public.agent_execution_logs;
CREATE POLICY "Users can view own execution logs"
  ON public.agent_execution_logs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can insert logs" ON public.agent_execution_logs;
CREATE POLICY "Service role can insert logs"
  ON public.agent_execution_logs FOR INSERT
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- Agent metadata columns on existing tables
-- -----------------------------------------------------------------------------
ALTER TABLE public.health_records
  ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;

ALTER TABLE public.medicines
  ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS idx_health_records_user_metric_date
  ON public.health_records(user_id, metric, date);
CREATE INDEX IF NOT EXISTS idx_health_records_member_id
  ON public.health_records(member_id);

CREATE INDEX IF NOT EXISTS idx_medicines_user_active
  ON public.medicines(user_id, is_active) WHERE is_active = true;
-- RLS is enabled for all tables with appropriate policies
-- =============================================================================
