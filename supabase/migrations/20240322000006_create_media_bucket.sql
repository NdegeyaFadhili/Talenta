INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  52428800,
  '{"image/*","video/*"}'
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');

CREATE POLICY "Authenticated users can upload media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own media"
ON storage.objects FOR DELETE
USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);
