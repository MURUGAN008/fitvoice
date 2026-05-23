-- ============================================
-- Blaze — Supabase SQL Migration (Nudge & Push Notifications)
-- ============================================
-- Run this in your Supabase SQL Editor.
-- ============================================

-- 1. Add expo_push_token column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS expo_push_token TEXT;

-- 2. Add nudge timestamp columns to friends table
ALTER TABLE public.friends
ADD COLUMN IF NOT EXISTS user_nudged_friend_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS friend_nudged_user_at TIMESTAMPTZ;

-- 3. Add UPDATE policy on friends table to allow users to send nudges
-- Without this, Row Level Security will block updates to the nudge timestamps!
CREATE POLICY "Users can update their own friendships" ON public.friends
    FOR UPDATE USING (
        auth.uid() = user_id OR auth.uid() = friend_id
    ) WITH CHECK (
        auth.uid() = user_id OR auth.uid() = friend_id
    );

-- =========================================================================
-- NOTE: HOW TO SET UP THE SUPABASE DATABASE WEBHOOK FOR PUSH NOTIFICATIONS
-- =========================================================================
-- You can set up the database webhook in one of two ways:
--
-- OPTION A: In the Supabase Dashboard (Recommended)
-- 1. Go to Database -> Webhooks in your Supabase Dashboard.
-- 2. Click "Enable webhooks" if not already enabled.
-- 3. Create a new webhook:
--    - Name: send-nudge-webhook
--    - Table: friends
--    - Events: Update
--    - Type: HTTP POST (Supabase Edge Function)
--    - Edge Function: select your deployed "send-nudge" function
-- 4. Save the webhook.
--
-- OPTION B: Via SQL Editor (Requires pg_net extension to be enabled)
-- Un-comment and run the block below after replacing '<PROJECT_REF>' with your project's reference ID:
--
-- CREATE OR REPLACE TRIGGER send_nudge_webhook
-- AFTER UPDATE ON public.friends
-- FOR EACH ROW
-- WHEN (
--   (OLD.user_nudged_friend_at IS DISTINCT FROM NEW.user_nudged_friend_at AND NEW.user_nudged_friend_at IS NOT NULL) OR
--   (OLD.friend_nudged_user_at IS DISTINCT FROM NEW.friend_nudged_user_at AND NEW.friend_nudged_user_at IS NOT NULL)
-- )
-- EXECUTE FUNCTION supabase_functions.http_request(
--   'https://<PROJECT_REF>.supabase.co/functions/v1/send-nudge',
--   'POST',
--   '{"Content-Type":"application/json"}',
--   '{}',
--   '2000'
-- );
-- =========================================================================
