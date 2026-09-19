-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
-- Supabase handles auth in the `auth.users` table, but it's common practice to have a public `users` table or `profiles` table to store public user data.
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Workspaces Table
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    x_account_id TEXT,
    x_access_token TEXT,
    x_refresh_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enum for Post Status
CREATE TYPE post_status AS ENUM ('draft', 'scheduled', 'published');

-- 3. Posts Table
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    content_body TEXT NOT NULL,
    status post_status NOT NULL DEFAULT 'draft',
    scheduled_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Calendar Events Table
-- Allows for scheduling posts flexibly and flawlessly
CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    post_id UUID UNIQUE REFERENCES posts(id) ON DELETE CASCADE,
    event_date DATE NOT NULL,
    event_time TIME WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Analytics Table
CREATE TABLE analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    follower_count INTEGER DEFAULT 0,
    engagement_score NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RLS Policies
-- ==========================================

-- Assuming authentication provides a user ID via auth.uid() that matches the users table id.
-- (If using Supabase's built-in auth, auth.uid() references auth.users table. 
-- In that case, `users.id` should map exactly to `auth.uid()`)

-- Users
CREATE POLICY "Users can read own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Workspaces
CREATE POLICY "Users can view own workspaces" ON workspaces
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workspaces" ON workspaces
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workspaces" ON workspaces
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workspaces" ON workspaces
    FOR DELETE USING (auth.uid() = user_id);

-- Posts
CREATE POLICY "Users can manage posts in their workspaces" ON posts
    FOR ALL USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE user_id = auth.uid()
        )
    );

-- Calendar Events
CREATE POLICY "Users can manage calendar events in their workspaces" ON calendar_events
    FOR ALL USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE user_id = auth.uid()
        )
    );

-- Analytics
CREATE POLICY "Users can read analytics in their workspaces" ON analytics
    FOR SELECT USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE user_id = auth.uid()
        )
    );
