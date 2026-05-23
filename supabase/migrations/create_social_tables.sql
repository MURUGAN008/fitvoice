-- ============================================
-- Blaze — Supabase SQL Migration (Social Features)
-- ============================================
-- Run this in your Supabase SQL Editor.
-- ============================================

-- 1. Add invite_code column to profiles if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- 2. Populate existing profiles with a unique invite code based on their ID
UPDATE public.profiles 
SET invite_code = UPPER(SUBSTRING(id::text, 1, 8))
WHERE invite_code IS NULL;

-- 3. Create the friends table for storing friendships
CREATE TABLE IF NOT EXISTS public.friends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted')),
    created_at TIMESTAMPTZ DEFAULT now(),
    -- Prevent duplicate friendships between the same users
    UNIQUE (user_id, friend_id)
);

-- 4. Enable Row Level Security (RLS) on the friends table
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies
-- Allows users to view friendships they are part of
CREATE POLICY "Users can view their own friendships" ON public.friends
    FOR SELECT USING (
        auth.uid() = user_id OR auth.uid() = friend_id
    );

-- Allows authenticated users to add a friendship
CREATE POLICY "Users can add friends" ON public.friends
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

-- Allows users to remove a friendship
CREATE POLICY "Users can delete friends" ON public.friends
    FOR DELETE USING (
        auth.uid() = user_id OR auth.uid() = friend_id
    );
