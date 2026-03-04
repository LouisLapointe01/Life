-- ============================================================
-- MIGRATION COMPLÈTE — Système RDV Multi-Participants + Notifications
-- Exécuter dans l'éditeur SQL de Supabase (supabase.com → SQL Editor)
-- ============================================================

-- 1. TYPES DE RENDEZ-VOUS
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration_min INTEGER NOT NULL DEFAULT 30,
  color TEXT NOT NULL DEFAULT '#007AFF',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Colonnes manquantes sur appointment_types
ALTER TABLE appointment_types ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE appointment_types ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE appointment_types ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- 2. RÈGLES DE DISPONIBILITÉ
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Colonnes manquantes sur availability_rules
ALTER TABLE availability_rules ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE availability_rules ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 3. CONTACTS
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  is_close BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Colonnes manquantes sur contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_close BOOLEAN NOT NULL DEFAULT false;

-- 4. RENDEZ-VOUS (table principale, rétrocompatible)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_id UUID REFERENCES appointment_types(id),
  user_id UUID REFERENCES auth.users(id),
  requester_id UUID REFERENCES auth.users(id),
  guest_name TEXT NOT NULL DEFAULT '',
  guest_email TEXT NOT NULL DEFAULT '',
  guest_phone TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','rescheduling')),
  is_close_contact BOOLEAN NOT NULL DEFAULT false,
  notify_on_event BOOLEAN NOT NULL DEFAULT true,
  recipient_type_id UUID REFERENCES appointment_types(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ajouter les colonnes manquantes si la table existait déjà
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS type_id UUID REFERENCES appointment_types(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS requester_id UUID REFERENCES auth.users(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS guest_name TEXT NOT NULL DEFAULT '';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS guest_email TEXT NOT NULL DEFAULT '';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS guest_phone TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS is_close_contact BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS notify_on_event BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS recipient_type_id UUID REFERENCES appointment_types(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
-- Ajouter le status 'rescheduling' au CHECK si manquant (ignore si déjà OK)
DO $$ BEGIN
  ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
  ALTER TABLE appointments ADD CONSTRAINT appointments_status_check CHECK (status IN ('pending','confirmed','cancelled','rescheduling'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 5. PARTICIPANTS (NOUVEAU)
-- --------------------------------------------------------
DROP TABLE IF EXISTS appointment_participants CASCADE;
CREATE TABLE appointment_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  type_id UUID REFERENCES appointment_types(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  is_organizer BOOLEAN NOT NULL DEFAULT false,
  is_close_contact BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ
);

-- 6. NOTIFICATIONS (NOUVEAU)
-- --------------------------------------------------------
DROP TABLE IF EXISTS notifications CASCADE;
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  from_name TEXT,
  title TEXT NOT NULL,
  body TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. DEMANDES DE REPORT (NOUVEAU)
-- --------------------------------------------------------
DROP TABLE IF EXISTS reschedule_votes CASCADE;
DROP TABLE IF EXISTS reschedule_requests CASCADE;

CREATE TABLE reschedule_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  new_start_at TIMESTAMPTZ NOT NULL,
  new_end_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. VOTES DE REPORT (NOUVEAU)
-- --------------------------------------------------------
CREATE TABLE reschedule_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reschedule_id UUID NOT NULL REFERENCES reschedule_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  vote TEXT NOT NULL CHECK (vote IN ('yes','no')),
  alternative_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(reschedule_id, user_id)
);

-- ============================================================
-- INDEX
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_apt_requester ON appointments(requester_id);
CREATE INDEX IF NOT EXISTS idx_apt_user ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_apt_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_apt_start ON appointments(start_at);
CREATE INDEX IF NOT EXISTS idx_part_appointment ON appointment_participants(appointment_id);
CREATE INDEX IF NOT EXISTS idx_part_user ON appointment_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_part_status ON appointment_participants(status);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_types_user ON appointment_types(user_id);
CREATE INDEX IF NOT EXISTS idx_avail_user ON availability_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_reschedule_apt ON reschedule_requests(appointment_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE appointment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reschedule_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reschedule_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques si elles existent
DO $$ BEGIN
  -- appointment_types
  DROP POLICY IF EXISTS "types_select" ON appointment_types;
  DROP POLICY IF EXISTS "types_insert" ON appointment_types;
  DROP POLICY IF EXISTS "types_update" ON appointment_types;
  DROP POLICY IF EXISTS "types_delete" ON appointment_types;
  -- availability_rules
  DROP POLICY IF EXISTS "avail_select" ON availability_rules;
  DROP POLICY IF EXISTS "avail_insert" ON availability_rules;
  DROP POLICY IF EXISTS "avail_update" ON availability_rules;
  DROP POLICY IF EXISTS "avail_delete" ON availability_rules;
  -- appointments
  DROP POLICY IF EXISTS "apt_select" ON appointments;
  DROP POLICY IF EXISTS "apt_insert" ON appointments;
  DROP POLICY IF EXISTS "apt_update" ON appointments;
  -- participants
  DROP POLICY IF EXISTS "part_select" ON appointment_participants;
  DROP POLICY IF EXISTS "part_insert" ON appointment_participants;
  DROP POLICY IF EXISTS "part_update" ON appointment_participants;
  -- notifications
  DROP POLICY IF EXISTS "notif_select" ON notifications;
  DROP POLICY IF EXISTS "notif_update" ON notifications;
  DROP POLICY IF EXISTS "notif_insert" ON notifications;
  -- reschedule
  DROP POLICY IF EXISTS "reschd_select" ON reschedule_requests;
  DROP POLICY IF EXISTS "reschd_insert" ON reschedule_requests;
  DROP POLICY IF EXISTS "vote_select" ON reschedule_votes;
  DROP POLICY IF EXISTS "vote_insert" ON reschedule_votes;
  DROP POLICY IF EXISTS "vote_update" ON reschedule_votes;
  -- contacts
  DROP POLICY IF EXISTS "contacts_select" ON contacts;
  DROP POLICY IF EXISTS "contacts_insert" ON contacts;
  DROP POLICY IF EXISTS "contacts_update" ON contacts;
  DROP POLICY IF EXISTS "contacts_delete" ON contacts;
END $$;

-- appointment_types : lecture own + global, écriture own
CREATE POLICY "types_select" ON appointment_types FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "types_insert" ON appointment_types FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "types_update" ON appointment_types FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "types_delete" ON appointment_types FOR DELETE USING (user_id = auth.uid());

-- availability_rules : lecture own + global, écriture own
CREATE POLICY "avail_select" ON availability_rules FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "avail_insert" ON availability_rules FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "avail_update" ON availability_rules FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "avail_delete" ON availability_rules FOR DELETE USING (user_id = auth.uid());

-- appointments : lecture si créateur ou participant
CREATE POLICY "apt_select" ON appointments FOR SELECT USING (
  requester_id = auth.uid()
  OR user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM appointment_participants WHERE appointment_id = id AND user_id = auth.uid())
);
CREATE POLICY "apt_insert" ON appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "apt_update" ON appointments FOR UPDATE USING (
  requester_id = auth.uid()
  OR user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM appointment_participants WHERE appointment_id = id AND user_id = auth.uid())
);

-- participants : lecture si concerné
CREATE POLICY "part_select" ON appointment_participants FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM appointments WHERE id = appointment_id AND requester_id = auth.uid())
  OR EXISTS (SELECT 1 FROM appointment_participants p2 WHERE p2.appointment_id = appointment_id AND p2.user_id = auth.uid())
);
CREATE POLICY "part_insert" ON appointment_participants FOR INSERT WITH CHECK (true);
CREATE POLICY "part_update" ON appointment_participants FOR UPDATE USING (
  user_id = auth.uid()
);

-- notifications : lecture/écriture propres uniquement
CREATE POLICY "notif_select" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notif_update" ON notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "notif_insert" ON notifications FOR INSERT WITH CHECK (true);

-- reschedule_requests : lecture si participant du RDV
CREATE POLICY "reschd_select" ON reschedule_requests FOR SELECT USING (
  requested_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM appointment_participants ap
    WHERE ap.appointment_id = reschedule_requests.appointment_id
    AND ap.user_id = auth.uid()
  )
);
CREATE POLICY "reschd_insert" ON reschedule_requests FOR INSERT WITH CHECK (true);

-- reschedule_votes
CREATE POLICY "vote_select" ON reschedule_votes FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "vote_insert" ON reschedule_votes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "vote_update" ON reschedule_votes FOR UPDATE USING (user_id = auth.uid());

-- contacts : lecture/écriture propres
CREATE POLICY "contacts_select" ON contacts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "contacts_insert" ON contacts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "contacts_update" ON contacts FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "contacts_delete" ON contacts FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- REALTIME
-- ============================================================
DO $$
BEGIN
  -- Ajouter les tables au realtime (ignore si déjà ajoutées)
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE notifications; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE appointments; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE appointment_participants; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- ============================================================
-- FONCTION RPC : recherche de profils par email (si pas déjà créée)
-- ============================================================
CREATE OR REPLACE FUNCTION search_profiles_by_email(search_email TEXT)
RETURNS TABLE(id UUID, email TEXT, full_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT au.id, au.email::TEXT, COALESCE(p.full_name, au.raw_user_meta_data->>'full_name', '')::TEXT
  FROM auth.users au
  LEFT JOIN profiles p ON p.id = au.id
  WHERE au.email ILIKE '%' || search_email || '%'
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TERMINÉ ! Toutes les tables sont prêtes.
-- ============================================================
