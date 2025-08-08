CREATE TABLE IF NOT EXISTS "references" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('document', 'link')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  url TEXT,
  file_path TEXT,
  file_name TEXT,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_references_user_id ON "references"(user_id);
CREATE INDEX IF NOT EXISTS idx_references_type ON "references"(type);

alter publication supabase_realtime add table "references";

NOTIFY pgrst, 'reload schema';