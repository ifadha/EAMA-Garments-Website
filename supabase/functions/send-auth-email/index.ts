import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { email, type } = await req.json();

    const SUPABASE_URL = Deno.env.get('MY_SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('MY_SUPABASE_SERVICE_ROLE_KEY');
    const BREVO_KEY = Deno.env.get('BREVO_API_KEY');
    const SITE_ORIGIN = Deno.env.get('SITE_ORIGIN');

    if (!SUPABASE_URL) throw new Error('MY_SUPABASE_URL is not configured.');
    if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('MY_SUPABASE_SERVICE_ROLE_KEY is not configured.');
    if (!BREVO_KEY) throw new Error('BREVO_API_KEY is not configured.');
    if (!SITE_ORIGIN) throw new Error('SITE_ORIGIN is not configured.');

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const resetUrl = new URL('/create-new-password.html', SITE_ORIGIN).toString();

    // 2. Generate link
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: { redirectTo: resetUrl }
    });

    if (error) throw error;
    const secureLink = data?.properties?.action_link;

    // 3. Send to Brevo
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": BREVO_KEY, "content-type": "application/json" },
      body: JSON.stringify({
        // IMPORTANT: Ensure this email is a "Verified Sender" in Brevo Dashboard
        sender: { name: "EAMA Garments", email: "info@eamagarments.com" },
        to: [{ email: email }],
        templateId: 3,
        params: { ACTION_LINK: secureLink }
      })
    });

    const brevoLog = await response.json();
    console.log("Brevo API Response:", brevoLog);

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})