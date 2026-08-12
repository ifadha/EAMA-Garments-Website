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
    const body = await req.json();

    const {
      email,
      type,
      request_id,
      company_name,
      contact_person,
    } = body;

    if (!email) {
      throw new Error("Email is required.");
    }

    // ---------------------------------------------------------
    // SUPABASE CONFIGURATION
    // ---------------------------------------------------------

    let SUPABASE_URL = Deno.env.get("SUPABASE_URL");

    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY"
    );

    // ---------------------------------------------------------
    // BREVO / SITE CONFIGURATION
    // ---------------------------------------------------------

    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    const SITE_ORIGIN = Deno.env.get("SITE_ORIGIN");

    const DEFAULT_SUPABASE_URL =
      "https://mxbzlscxsonbwiqjmnzx.supabase.co";

    if (!SUPABASE_URL || SUPABASE_URL.includes("MY_SUPABASE")) {
      console.warn(
        "SUPABASE_URL is missing or placeholder. Falling back to the known project URL."
      );

      SUPABASE_URL = DEFAULT_SUPABASE_URL;
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

    const normalizedOrigin = SITE_ORIGIN
      .trim()
      .replace(/\/+$/, "");

    const originBase = `${normalizedOrigin}/`;

    const supabaseAdmin = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );

    // =========================================================
    // 1. MANUFACTURING REQUEST EMAIL
    // =========================================================

    if (type === "manufacturing_request") {

      if (!request_id) {
        throw new Error(
          "request_id is required for a manufacturing request email."
        );
      }

      /*
       * Verify that the manufacturing request actually exists.
       *
       * This prevents the function from sending an email containing
       * a completely invalid request ID.
       */

      const {
        data: request,
        error: requestError,
      } = await supabaseAdmin
        .from("manufacturing_requests")
        .select("id, email, company_name, contact_person, status")
        .eq("id", request_id)
        .single();

      if (requestError || !request) {
        console.error(
          "Manufacturing request lookup error:",
          requestError
        );

        throw new Error(
          "The manufacturing request could not be found."
        );
      }

      /*
       * Make sure the email being used for the notification
       * belongs to the request.
       */

      if (
        request.email &&
        request.email.toLowerCase() !== email.toLowerCase()
      ) {
        throw new Error(
          "The email address does not match the manufacturing request."
        );
      }

      /*
       * Build the link that the Brevo button will use.
       *
       * Example:
       *
       * https://ifadha.github.io/EAMA-Garments-Website/
       * client-dashboard.html?request_id=xxxxxxxx
       */

      const portalLink =
        new URL(
          "client-dashboard.html",
          originBase
        );

      portalLink.searchParams.set(
        "request_id",
        request_id
      );

      // Keep the currently deployed template as the compatibility default,
      // but make the production template explicit and configurable by secret.
      const configuredTemplateId = Number(
        Deno.env.get("BREVO_MANUFACTURING_REQUEST_TEMPLATE_ID") || "4"
      );

      if (!Number.isInteger(configuredTemplateId) || configuredTemplateId <= 0) {
        throw new Error("BREVO_MANUFACTURING_REQUEST_TEMPLATE_ID must be a positive integer.");
      }

      const MANUFACTURING_REQUEST_TEMPLATE_ID = configuredTemplateId;

      console.log(
        "Sending manufacturing request Brevo template:",
        MANUFACTURING_REQUEST_TEMPLATE_ID
      );

      console.log(
        "Request ID:",
        request_id
      );

      console.log(
        "Portal link:",
        portalLink.toString()
      );

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
                name:
                  contact_person ||
                  request.contact_person ||
                  undefined,
              },
            ],

            templateId:
              MANUFACTURING_REQUEST_TEMPLATE_ID,

            params: {
              request_id:
                request.id,

              company_name:
                company_name ||
                request.company_name ||
                "",

              contact_person:
                contact_person ||
                request.contact_person ||
                "",

              portal_link:
                portalLink.toString(),
            },
          }),
        }
      );

      const brevoText =
        await brevoResponse.text();

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
          type: "manufacturing_request",
          request_id: request_id,
          portal_link: portalLink.toString(),
        }),
        {
          status: 200,

          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // =========================================================
    // 2. EXISTING VERIFICATION / PASSWORD RESET EMAILS
    // =========================================================

    const isVerification =
      type === "verify";

    const redirectTo =
      isVerification
        ? new URL(
            "client-portal-sign-in.html",
            originBase
          ).toString()
        : new URL(
            "create-new-password.html",
            originBase
          ).toString();

    // ---------------------------------------------------------
    // GENERATE SECURE SUPABASE AUTH LINK
    // ---------------------------------------------------------

    const {
      data,
      error,
    } =
      await supabaseAdmin.auth.admin.generateLink({
        type: isVerification
          ? "signup"
          : "recovery",

        email: email,

        options: {
          redirectTo,
        },
      });

    if (error) {
      console.error(
        "Supabase generateLink error:",
        error
      );

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

    const secureLink =
      data?.properties?.action_link;

    if (!secureLink) {
      throw new Error(
        "Supabase did not return an action link."
      );
    }

    // ---------------------------------------------------------
    // EXISTING BREVO TEMPLATE IDS
    // ---------------------------------------------------------

    // Template 2 = Client Account Verification
    // Template 3 = Password Reset

    const templateId =
      isVerification
        ? 2
        : 3;

    console.log(
      "Sending Brevo template:",
      templateId
    );

    const brevoResponse =
      await fetch(
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

            templateId:
              templateId,

            params: {
              VERIFICATION_LINK:
                secureLink,

              RESET_LINK:
                secureLink,

              ACTION_LINK:
                secureLink,
            },
          }),
        }
      );

    const brevoText =
      await brevoResponse.text();

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

    console.error(
      "send-auth-email error:",
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
