-- Supabase Migration Script
-- Execute this in your Supabase SQL Editor

-- 1. Create Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT auth.uid(),
    email TEXT UNIQUE,
    name TEXT,
    role TEXT DEFAULT 'student',
    points INTEGER DEFAULT 0,
    last_login TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policies for users
CREATE POLICY "Users can view all users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Leaders can update any user" ON public.users FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'leader')
);

-- 2. Create Announcements Table
CREATE TABLE IF NOT EXISTS public.announcements (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    date TIMESTAMPTZ DEFAULT now(),
    is_important BOOLEAN DEFAULT false,
    author_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Policies for announcements
CREATE POLICY "Anyone can view announcements" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Leaders can manage announcements" ON public.announcements FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'leader')
);

-- 3. Create Activities Table
CREATE TABLE IF NOT EXISTS public.activities (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    deadline TIMESTAMPTZ,
    points INTEGER DEFAULT 0,
    subject TEXT,
    pdf_data TEXT,
    author_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on activities
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Policies for activities
CREATE POLICY "Anyone can view activities" ON public.activities FOR SELECT USING (true);
CREATE POLICY "Leaders can manage activities" ON public.activities FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'leader')
);

-- 4. Create Activity Completions Table
CREATE TABLE IF NOT EXISTS public.activity_completions (
    activity_id BIGINT REFERENCES public.activities(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    points_awarded INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (activity_id, user_id)
);

-- Enable RLS on activity_completions
ALTER TABLE public.activity_completions ENABLE ROW LEVEL SECURITY;

-- Policies for activity_completions
CREATE POLICY "Users can view their own completions" ON public.activity_completions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Leaders can view all completions" ON public.activity_completions FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'leader')
);
CREATE POLICY "Leaders can manage completions" ON public.activity_completions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'leader')
);

-- 5. Create Announcement Views Table
CREATE TABLE IF NOT EXISTS public.announcement_views (
    announcement_id BIGINT REFERENCES public.announcements(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (announcement_id, user_id)
);

-- Enable RLS on announcement_views
ALTER TABLE public.announcement_views ENABLE ROW LEVEL SECURITY;

-- Policies for announcement_views
CREATE POLICY "Users can view their own views" ON public.announcement_views FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can mark as viewed" ON public.announcement_views FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Leaders can view all views" ON public.announcement_views FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'leader')
);

-- 6. Create Student Activity Status Table
CREATE TABLE IF NOT EXISTS public.student_activity_status (
    activity_id BIGINT REFERENCES public.activities(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending',
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (activity_id, user_id)
);

-- Enable RLS on student_activity_status
ALTER TABLE public.student_activity_status ENABLE ROW LEVEL SECURITY;

-- Policies for student_activity_status
CREATE POLICY "Users can view their own status" ON public.student_activity_status FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own status" ON public.student_activity_status FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Leaders can view all status" ON public.student_activity_status FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'leader')
);
CREATE POLICY "Leaders can manage status" ON public.student_activity_status FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'leader')
);

-- Trigger to update last_login on auth.users changes
-- Note: This requires more complex setup in Supabase, but for now we'll handle it via API.
