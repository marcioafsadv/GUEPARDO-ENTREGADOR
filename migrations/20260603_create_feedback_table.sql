-- Create tester_feedback table for Google Play testing feedback collection
CREATE TABLE IF NOT EXISTS public.tester_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    category TEXT NOT NULL, -- 'bug', 'suggestion', 'question', 'complaint', 'other'
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    device_info JSONB,
    app_version TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.tester_feedback ENABLE ROW LEVEL SECURITY;

-- Allow public inserts so testers don't get blocked by session verification during feedback submission
CREATE POLICY "Allow public insert for tester_feedback" 
    ON public.tester_feedback
    FOR INSERT 
    WITH CHECK (true);

-- Allow authenticated users to view their own feedbacks
CREATE POLICY "Allow authenticated users to view own feedback" 
    ON public.tester_feedback
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = user_id);
