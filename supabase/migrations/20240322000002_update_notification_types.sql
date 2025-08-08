ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('like', 'comment', 'follow', 'message', 'streak', 'welcome', 'content', 'profile_edit', 'mention'));

CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(read);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_privacy_setting ON posts(privacy_setting);
CREATE INDEX IF NOT EXISTS idx_posts_likes_count ON posts(likes_count DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON profiles(full_name);

CREATE INDEX IF NOT EXISTS idx_skill_categories_posts_count ON skill_categories(posts_count DESC);
CREATE INDEX IF NOT EXISTS idx_skill_categories_trending_score ON skill_categories(trending_score DESC);