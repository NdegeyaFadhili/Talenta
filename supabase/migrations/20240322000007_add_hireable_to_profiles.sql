ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hireable BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_profiles_hireable ON profiles(hireable) WHERE hireable = TRUE;

NOTIFY pgrst, 'reload schema';
