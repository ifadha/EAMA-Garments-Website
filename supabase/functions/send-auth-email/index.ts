import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};


serve(async (req) => {

  // ============================================================
  // CORS
  // ============================================================

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }


  try {

    // ==========================================================
    // METHOD
    // ==========================================================

    if (req.method !== "POST") {
      throw new Error("Method not allowed.");
    }


    // ==========================================================
    // BODY
    // ==========================================================

    const body = await req.json();


    const {
      email,
      type,

      // Manufacturing request
      request_id,
      company_name,
      contact_person,

      // Factory visit
      name,
      company,
      visit_date,
      visit_time,

      // General inquiry
      country,
      message,

    } = body;


    // ==========================================================
    // EMAIL VALIDATION
    // ==========================================================

    if (!email || typeof email !== "string") {
      throw new Error("Email is required.");
    }


    const normalizedEmail =
      email.trim().toLowerCase();


    // ==========================================================
    // ENVIRONMENT VARIABLES
    // ==========================================================

    const SUPABASE_URL =
      Deno.env.get("SUPABASE_URL");

    const SUPABASE_SERVICE_ROLE_KEY =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const BREVO_API_KEY =
      Deno.env.get("BREVO_API_KEY");

    const BREVO_SENDER_EMAIL =
      Deno.env.get("BREVO_SENDER_EMAIL") ||
      "info@eamagarments.com";

    const BREVO_SENDER_NAME =
      Deno.env.get("BREVO_SENDER_NAME") ||
      "EAMA Garments";

    const SITE_ORIGIN =
      Deno.env.get("SITE_ORIGIN") ||
      "https://ifadha.github.io/EAMA-Garments-Website";


    // ==========================================================
    // CONFIG VALIDATION
    // ==========================================================

    if (!SUPABASE_URL) {
      throw new Error(
        "SUPABASE_URL is missing."
      );
    }


    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY is missing."
      );
    }


    if (!BREVO_API_KEY) {
      throw new Error(
        "BREVO_API_KEY is missing."
      );
    }


    // ==========================================================
    // SITE URL
    // ==========================================================

    const normalizedOrigin =
      SITE_ORIGIN
        .trim()
        .replace(/\/+$/, "");


    const originBase =
      `${normalizedOrigin}/`;


    // ==========================================================
    // SUPABASE ADMIN CLIENT
    // ==========================================================

    const supabaseAdmin =
      createClient(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY
      );


    // ==========================================================
    // BREVO HELPER
    // ==========================================================

    async function sendBrevoEmail(
      templateId: number,
      recipientEmail: string,
      recipientName: string,
      params: Record<string, unknown>
    ) {

      const response =
        await fetch(
          "https://api.brevo.com/v3/smtp/email",
          {
            method: "POST",

            headers: {
              "accept":
                "application/json",

              "api-key":
                BREVO_API_KEY,

              "content-type":
                "application/json",
            },

            body: JSON.stringify({

              sender: {
                email:
                  BREVO_SENDER_EMAIL,

                name:
                  BREVO_SENDER_NAME,
              },

              to: [
                {
                  email:
                    recipientEmail,

                  name:
                    recipientName || "",
                },
              ],

              templateId,

              params,

            }),
          }
        );


      const responseText =
        await response.text();


      console.log(
        `Brevo template ${templateId} status:`,
        response.status
      );


      if (!response.ok) {

        console.error(
          "Brevo error:",
          responseText
        );

        throw new Error(
          `Brevo returned ${response.status}: ${responseText}`
        );
      }


      return true;
    }


    // ==========================================================
    // 1. GENERAL INQUIRY
    // ==========================================================

    if (type === "general_inquiry") {

      if (!name || !String(name).trim()) {
        throw new Error(
          "Name is required."
        );
      }


      if (!message || !String(message).trim()) {
        throw new Error(
          "Message is required."
        );
      }


      const inquiryName =
        String(name).trim();


      const inquiryCompany =
        company
          ? String(company).trim()
          : "";


      const inquiryCountry =
        country
          ? String(country).trim()
          : "";


      const inquiryMessage =
        String(message).trim();


      // --------------------------------------------------------
      // SAVE INQUIRY
      // --------------------------------------------------------

      const {
        data: inquiry,
        error: inquiryError,
      } =
        await supabaseAdmin
          .from("inquiries")
          .insert({
            name:
              inquiryName,

            company_name:
              inquiryCompany || null,

            email:
              normalizedEmail,

            country:
              inquiryCountry || null,

            message:
              inquiryMessage,

            status:
              "New",
          })
          .select()
          .single();


      if (inquiryError || !inquiry) {

        console.error(
          "Inquiry database error:",
          inquiryError
        );

        throw new Error(
          inquiryError?.message ||
          "Unable to save your inquiry."
        );
      }


      // --------------------------------------------------------
      // BREVO TEMPLATE
      // --------------------------------------------------------

      const GENERAL_INQUIRY_TEMPLATE_ID = 7;


      let emailSent = false;


      try {

        await sendBrevoEmail(
          GENERAL_INQUIRY_TEMPLATE_ID,

          normalizedEmail,

          inquiryName,

          {
            customer_name:
              inquiryName,

            status:
              inquiry.status || "New",

            admin_message:
              inquiryMessage,

            company_name:
              inquiryCompany,

            country:
              inquiryCountry,

            inquiry_id:
              inquiry.id,

            created_at:
              inquiry.created_at || "",
          }
        );


        emailSent = true;


      } catch (brevoError) {

        console.error(
          "General inquiry email failed:",
          brevoError
        );

      }


      return new Response(
        JSON.stringify({

          success: true,

          sent:
            emailSent,

          type:
            "general_inquiry",

          inquiry_id:
            inquiry.id,

          error:
            emailSent
              ? null
              : "Inquiry saved, but confirmation email failed.",

        }),

        {
          status: 200,

          headers: {
            ...corsHeaders,

            "Content-Type":
              "application/json",
          },
        }
      );
    }


    // ==========================================================
    // 2. MANUFACTURING REQUEST
    // ==========================================================

    if (type === "manufacturing_request") {

      if (!request_id) {
        throw new Error(
          "request_id is required."
        );
      }


      // --------------------------------------------------------
      // GET REQUEST
      // --------------------------------------------------------

      const {
        data: request,
        error: requestError,
      } =
        await supabaseAdmin
          .from("manufacturing_requests")
          .select(
            "id, email, company_name, contact_person, status"
          )
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


      // --------------------------------------------------------
      // SECURITY CHECK
      // --------------------------------------------------------

      if (
        request.email &&
        request.email.trim().toLowerCase() !==
          normalizedEmail
      ) {

        throw new Error(
          "The email address does not match the manufacturing request."
        );
      }


      // --------------------------------------------------------
      // CLIENT PORTAL LINK
      // --------------------------------------------------------

      const portalLink =
        new URL(
          "client-dashboard.html",
          originBase
        );


      portalLink.searchParams.set(
        "request_id",
        String(request.id)
      );


      // --------------------------------------------------------
      // BREVO TEMPLATE #5
      // --------------------------------------------------------

      const MANUFACTURING_REQUEST_TEMPLATE_ID = 5;


      // --------------------------------------------------------
      // SEND EMAIL
      // --------------------------------------------------------

      await sendBrevoEmail(

        MANUFACTURING_REQUEST_TEMPLATE_ID,

        normalizedEmail,

        String(
          contact_person ||
          request.contact_person ||
          ""
        ),

        {

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

        }
      );


      console.log(
        "Manufacturing request confirmation sent:",
        normalizedEmail
      );


      return new Response(
        JSON.stringify({

          success: true,

          sent: true,

          type:
            "manufacturing_request",

          request_id:
            request.id,

        }),

        {
          status: 200,

          headers: {
            ...corsHeaders,

            "Content-Type":
              "application/json",
          },
        }
      );
    }


    // ==========================================================
    // 3. FACTORY VISIT
    // ==========================================================

    if (type === "factory_visit") {

      if (!name || !String(name).trim()) {
        throw new Error(
          "Factory visit name is required."
        );
      }


      if (!visit_date) {
        throw new Error(
          "Factory visit date is required."
        );
      }


      if (!visit_time) {
        throw new Error(
          "Factory visit time is required."
        );
      }


      const FACTORY_VISIT_TEMPLATE_ID = 6;


      await sendBrevoEmail(

        FACTORY_VISIT_TEMPLATE_ID,

        normalizedEmail,

        String(name).trim(),

        {

          name:
            String(name).trim(),

          company:
            company
              ? String(company).trim()
              : "",

          visit_date:
            String(visit_date),

          visit_time:
            String(visit_time),

        }

      );


      return new Response(
        JSON.stringify({

          success: true,

          sent: true,

          type:
            "factory_visit",

        }),

        {
          status: 200,

          headers: {
            ...corsHeaders,

            "Content-Type":
              "application/json",
          },
        }
      );
    }


    // ==========================================================
    // 4. VERIFICATION / PASSWORD RESET
    // ==========================================================

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


    const {
      data,
      error,
    } =
      await supabaseAdmin.auth.admin.generateLink({

        type:
          isVerification
            ? "signup"
            : "recovery",

        email:
          normalizedEmail,

        options: {
          redirectTo,
        },

      });


    if (error) {

      console.error(
        "Supabase generateLink error:",
        error
      );

      throw new Error(
        error.message
      );
    }


    const secureLink =
      data?.properties?.action_link;


    if (!secureLink) {
      throw new Error(
        "Supabase did not return an action link."
      );
    }


    // ----------------------------------------------------------
    // AUTH EMAIL TEMPLATES
    // ----------------------------------------------------------

    const templateId =
      isVerification
        ? 2
        : 3;


    await sendBrevoEmail(

      templateId,

      normalizedEmail,

      "",

      {

        VERIFICATION_LINK:
          secureLink,

        RESET_LINK:
          secureLink,

        ACTION_LINK:
          secureLink,

      }

    );


    return new Response(
      JSON.stringify({

        success: true,

        sent: true,

      }),

      {
        status: 200,

        headers: {
          ...corsHeaders,

          "Content-Type":
            "application/json",
        },
      }
    );

  } catch (error) {

    console.error(
      "send-auth-email error:",
      error
    );


    return new Response(

      JSON.stringify({

        success: false,

        error:
          error instanceof Error
            ? error.message
            : String(error),

      }),

      {
        status: 400,

        headers: {
          ...corsHeaders,

          "Content-Type":
            "application/json",
        },
      }

    );
  }

});