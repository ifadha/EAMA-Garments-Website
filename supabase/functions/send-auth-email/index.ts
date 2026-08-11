import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    console.log("STEP 1: Function started");

    // Read request body
    const { email, type } = await req.json();

    console.log("STEP 1: Request received", {
      email,
      type,
    });

    // =========================================================
    // SUPABASE DEFAULT SECRETS
    // These are provided automatically by Supabase.
    // =========================================================

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY"
    );

    // =========================================================
    // CUSTOM SECRETS
    // These are the only custom secrets required.
    // =========================================================

    const BREVO_KEY = Deno.env.get("BREVO_API_KEY");
    const SITE_ORIGIN = Deno.env.get("SITE_ORIGIN");

    // =========================================================
    // CHECK REQUIRED CONFIGURATION
    // =========================================================

    console.log("STEP 1: Environment check", {
      supabaseUrl: !!SUPABASE_URL,
      serviceRoleKey: !!SUPABASE_SERVICE_ROLE_KEY,
      brevoKey: !!BREVO_KEY,
      siteOrigin: !!SITE_ORIGIN,
    });

    if (!SUPABASE_URL) {
      throw new Error(
        "STEP 1 FAILED: SUPABASE_URL is not available."
      );
    }

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        "STEP 1 FAILED: SUPABASE_SERVICE_ROLE_KEY is not available."
      );
    }

    if (!BREVO_KEY) {
      throw new Error(
        "STEP 1 FAILED: BREVO_API_KEY is not configured."
      );
    }

    if (!SITE_ORIGIN) {
      throw new Error(
        "STEP 1 FAILED: SITE_ORIGIN is not configured."
      );
    }

    // =========================================================
    // CREATE SUPABASE ADMIN CLIENT
    // =========================================================

    console.log("STEP 2: Creating Supabase admin client");

    const supabaseAdmin = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );

    // GitHub Pages website URL
    const resetUrl = new URL(
      "/create-new-password.html",
      SITE_ORIGIN
    ).toString();

    console.log("STEP 2: Reset URL:", resetUrl);

    // =========================================================
    // GENERATE PASSWORD RECOVERY LINK
    // =========================================================

    console.log(
      "STEP 2: Generating password recovery link"
    );

    const { data, error } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: email,
        options: {
          redirectTo: resetUrl,
        },
      });

    if (error) {
      console.error(
        "STEP 2 FAILED: Supabase generateLink error:",
        error
      );

      throw new Error(
        `STEP 2 FAILED: ${error.message}`
      );
    }

    const secureLink = data?.properties?.action_link;

    if (!secureLink) {
      throw new Error(
        "STEP 2 FAILED: Supabase did not return a recovery link."
      );
    }

    console.log(
      "STEP 2: Recovery link generated successfully"
    );

    // =========================================================
    // SEND EMAIL THROUGH BREVO
    // =========================================================

    console.log("STEP 3: Sending email through Brevo");

    const brevoResponse = await fetch(
      "https://api.brevo.com/v3/smtp/email",
      {
        method: "POST",

        headers: {
          "api-key": BREVO_KEY,
          "content-type": "application/json",
        },

        body: JSON.stringify({
          sender: {
            name: "EAMA Garments",
            email: "info@eamagarments.com",
          },

          to: [
            {
              email: email,
            },
          ],

          templateId: 3,

          params: {
            ACTION_LINK: secureLink,
          },
        }),
      }
    );

    const brevoResponseText =
      await brevoResponse.text();

    let brevoResult;

    try {
      brevoResult = JSON.parse(
        brevoResponseText
      );
    } catch {
      brevoResult = brevoResponseText;
    }

    console.log(
      "STEP 3: Brevo HTTP status:",
      brevoResponse.status
    );

    console.log(
      "STEP 3: Brevo response:",
      brevoResult
    );

    // =========================================================
    // CHECK BREVO RESPONSE
    // =========================================================

    if (!brevoResponse.ok) {
      throw new Error(
        `STEP 3 FAILED: Brevo returned HTTP ${brevoResponse.status}: ${brevoResponseText}`
      );
    }

    console.log(
      "STEP 3: Email sent successfully through Brevo"
    );

    // =========================================================
    // SUCCESS
    // =========================================================

    return new Response(
      JSON.stringify({
        success: true,
      }),
      {
        status: 200,

        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    console.error(
      "FUNCTION FAILED:",
      err
    );

    return new Response(
      JSON.stringify({
        error:
          err instanceof Error
            ? err.message
            : String(err),
      }),
      {
        status: 400,

        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});