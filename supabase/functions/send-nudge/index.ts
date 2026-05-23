import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS for options request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // Initialize Supabase client with Service Role Key to bypass RLS and read user profiles
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    console.log('Received webhook payload:', JSON.stringify(payload));

    const { record, old_record, type } = payload;
    
    // We only handle UPDATE events on the friends table
    if (type !== 'UPDATE' || !record) {
      return new Response(JSON.stringify({ message: 'Event ignored. Only UPDATE events are processed.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    let senderId: string | null = null;
    let receiverId: string | null = null;

    // Check if user_id nudged friend_id
    if (record.user_nudged_friend_at && record.user_nudged_friend_at !== old_record?.user_nudged_friend_at) {
      senderId = record.user_id;
      receiverId = record.friend_id;
    }
    // Check if friend_id nudged user_id
    else if (record.friend_nudged_user_at && record.friend_nudged_user_at !== old_record?.friend_nudged_user_at) {
      senderId = record.friend_id;
      receiverId = record.user_id;
    }

    // If no nudge columns were updated, exit early
    if (!senderId || !receiverId) {
      return new Response(JSON.stringify({ message: 'No nudge timestamp changes detected.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    console.log(`Processing nudge: sender=${senderId}, receiver=${receiverId}`);

    // Fetch the sender's profile name and the receiver's push token
    const [senderProfile, receiverProfile] = await Promise.all([
      supabaseClient.from('profiles').select('name').eq('id', senderId).single(),
      supabaseClient.from('profiles').select('expo_push_token').eq('id', receiverId).single(),
    ]);

    if (senderProfile.error) {
      console.error('Error fetching sender profile name:', senderProfile.error);
    }
    if (receiverProfile.error) {
      console.error('Error fetching receiver push token:', receiverProfile.error);
    }

    const senderName = senderProfile.data?.name || 'A friend';
    const expoPushToken = receiverProfile.data?.expo_push_token;

    if (!expoPushToken) {
      console.log('Receiver does not have an expo_push_token registered.');
      return new Response(JSON.stringify({ message: 'Recipient has no push token registered. Skipping push delivery.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Deliver notification through Expo push server
    console.log(`Sending Expo push notification to: ${expoPushToken}`);
    const pushMessage = {
      to: expoPushToken,
      sound: 'default',
      title: 'Workout Nudge! 🔥',
      body: `${senderName} is nudging you to complete your workout today!`,
      data: { type: 'nudge', senderName }
    };

    const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(pushMessage)
    });

    const expoData = await expoRes.json();
    console.log('Expo Push API response:', JSON.stringify(expoData));

    return new Response(JSON.stringify({ success: true, expoData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error: any) {
    console.error('Edge Function exception:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
})
