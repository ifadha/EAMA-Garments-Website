import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const { email, type } = await req.json();

    if (!email) {
      throw new Error("Email is required.");
    }

    // Supabase's built-in secrets
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY"
    );

    // Your custom secrets
    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    const SITE_ORIGIN = Deno.env.get("SITE_ORIGIN");

    if (!SUPABASE_URL) {
      throw new Error("SUPABASE_URL is missing.");
    }

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing.");
    }

    if (!BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY is missing.");
    }

    if (!SITE_ORIGIN) {
      throw new Error("SITE_ORIGIN is missing.");
    }

    const supabaseAdmin = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );

    // Determine whether this is verification or password reset
    const isVerification = type === "verify";

    const redirectTo = isVerification
      ? new URL(
          "/client-portal-sign-in.html",
          SITE_ORIGIN
        ).toString()
      : new URL(
          "/create-new-password.html",
          SITE_ORIGIN
        ).toString();

    // Generate secure Supabase link
    const { data, error } =
      await supabaseAdmin.auth.admin.generateLink({
        type: isVerification ? "signup" : "recovery",
        email: email,
        options: {
          redirectTo,
        },
      });

    if (error) {
      console.error("Supabase generateLink error:", error);

      return new Response(
        JSON.stringify({
          error: error.message,
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

    const secureLink = data?.properties?.action_link;

    if (!secureLink) {
      throw new Error(
        "Supabase did not return an action link."
      );
    }

    // Template 2 = verification
    // Template 3 = password reset
    const templateId = isVerification ? 2 : 3;

    console.log("Sending Brevo template:", templateId);

    const brevoResponse = await fetch(
      "https://api.brevo.com/v3/smtp/email",
      {
        method: "POST",

        headers: {
          accept: "application/json",
          "api-key": BREVO_API_KEY,
          "content-type": "application/json",
        },

        body: JSON.stringify({
          to: [
            {
              email: email,
            },
          ],

          templateId: templateId,

          params: {
            VERIFICATION_LINK: secureLink,
            RESET_LINK: secureLink,
          },
        }),
      }
    );

    const brevoText = await brevoResponse.text();

    console.log(
      "Brevo status:",
      brevoResponse.status
    );

    console.log(
      "Brevo response:",
      brevoText
    );

    if (!brevoResponse.ok) {
      throw new Error(
        `Brevo returned ${brevoResponse.status}: ${brevoText}`
      );
    }

    return new Response(
      JSON.stringify({
        sent: true,
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
    console.error("send-auth-email error:", err);

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