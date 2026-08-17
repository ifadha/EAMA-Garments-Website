import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {

  // =========================================================
  // CORS
  // =========================================================

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {

    if (req.method !== "POST") {
      throw new Error("Method not allowed.");
    }

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


    // =========================================================
    // BASIC VALIDATION
    // =========================================================

    if (!email || typeof email !== "string") {
      throw new Error("Email is required.");
    }

    const normalizedEmail = email.trim().toLowerCase();


    // =========================================================
    // SUPABASE CONFIGURATION
    // =========================================================

    const SUPABASE_URL =
      Deno.env.get("SUPABASE_URL");

    const SUPABASE_SERVICE_ROLE_KEY =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");


    // =========================================================
    // BREVO CONFIGURATION
    // =========================================================

    const BREVO_API_KEY =
      Deno.env.get("BREVO_API_KEY");

    const BREVO_SENDER_EMAIL =
      Deno.env.get("BREVO_SENDER_EMAIL") ||
      "info@eamagarments.com";

    const BREVO_SENDER_NAME =
      Deno.env.get("BREVO_SENDER_NAME") ||
      "EAMA Garments";


    // =========================================================
    // WEBSITE URL
    // =========================================================

    const SITE_ORIGIN =
      Deno.env.get("SITE_ORIGIN") ||
      "https://ifadha.github.io/EAMA-Garments-Website";


    // =========================================================
    // CONFIGURATION VALIDATION
    // =========================================================

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


    const normalizedOrigin =
      SITE_ORIGIN
        .trim()
        .replace(/\/+$/, "");

    const originBase =
      `${normalizedOrigin}/`;


    // =========================================================
    // SUPABASE ADMIN CLIENT
    // =========================================================

    const supabaseAdmin =
      createClient(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY
      );


    // =========================================================
    // 1. GENERAL INQUIRY
    // =========================================================

    if (type === "general_inquiry") {

      if (!name || !String(name).trim()) {
        throw new Error("Name is required.");
      }

      if (!message || !String(message).trim()) {
        throw new Error("Message is required.");
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


      // -------------------------------------------------------
      // SAVE INQUIRY
      // -------------------------------------------------------

      const {
        data: inquiry,
        error: inquiryError,
      } =
        await supabaseAdmin
          .from("inquiries")
          .insert([
            {
              name: inquiryName,

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
            },
          ])
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


      // -------------------------------------------------------
      // SEND CLIENT CONFIRMATION
      // -------------------------------------------------------

      const GENERAL_INQUIRY_TEMPLATE_ID = 7;

      let emailSent = false;


      try {

        const brevoResponse =
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
                      normalizedEmail,

                    name:
                      inquiryName,
                  },
                ],

                templateId:
                  GENERAL_INQUIRY_TEMPLATE_ID,

                params: {
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
                },
              }),
            }
          );


        if (brevoResponse.ok) {

          emailSent = true;

          console.log(
            "General inquiry email sent successfully."
          );

        } else {

          const errorText =
            await brevoResponse.text();

          console.error(
            "Brevo API error:",
            errorText
          );
        }

      } catch (brevoErr) {

        console.error(
          "Brevo fetch error:",
          brevoErr
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


    // =========================================================
    // 2. MANUFACTURING REQUEST
    // =========================================================

    if (type === "manufacturing_request") {

      if (!request_id) {
        throw new Error(
          "request_id is required."
        );
      }


      // -------------------------------------------------------
      // GET REQUEST
      // -------------------------------------------------------

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


      // -------------------------------------------------------
      // SECURITY CHECK
      // -------------------------------------------------------

      if (
        request.email &&
        request.email.toLowerCase() !==
          normalizedEmail
      ) {

        throw new Error(
          "The email address does not match the manufacturing request."
        );
      }


      // -------------------------------------------------------
      // CLIENT PORTAL LINK
      // -------------------------------------------------------

      const portalLink =
        new URL(
          "client-dashboard.html",
          originBase
        );

      portalLink.searchParams.set(
        "request_id",
        request_id
      );


      // -------------------------------------------------------
      // BREVO TEMPLATE
      // -------------------------------------------------------

      const configuredTemplateId =
        Number(
          Deno.env.get(
            "BREVO_MANUFACTURING_REQUEST_TEMPLATE_ID"
          ) || "4"
        );


      if (
        !Number.isInteger(
          configuredTemplateId
        ) ||
        configuredTemplateId <= 0
      ) {

        throw new Error(
          "BREVO_MANUFACTURING_REQUEST_TEMPLATE_ID must be a positive integer."
        );
      }


      // -------------------------------------------------------
      // SEND EMAIL TO CLIENT
      // -------------------------------------------------------

      const brevoResponse =
        await fetch(
          "https://api.brevo.com/v3/smtp/email",
          {
            method: "POST",

            headers: {
              accept:
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


              // CLIENT RECEIVES THE EMAIL
              to: [
                {
                  email:
                    normalizedEmail,

                  name:
                    contact_person ||
                    request.contact_person ||
                    "",
                },
              ],


              templateId:
                configuredTemplateId,


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
        "Manufacturing request client email status:",
        brevoResponse.status
      );


      if (!brevoResponse.ok) {

        console.error(
          "Brevo manufacturing request error:",
          brevoText
        );

        throw new Error(
          `Brevo returned ${brevoResponse.status}: ${brevoText}`
        );
      }


      console.log(
        "Manufacturing request confirmation email sent to client:",
        normalizedEmail
      );


      return new Response(
        JSON.stringify({

          success: true,

          sent: true,

          type:
            "manufacturing_request",

          request_id:
            request_id,
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


    // =========================================================
    // 3. FACTORY VISIT
    // =========================================================

    if (type === "factory_visit") {

      if (!name) {
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


      const brevoResponse =
        await fetch(
          "https://api.brevo.com/v3/smtp/email",
          {
            method: "POST",

            headers: {
              accept:
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
                    normalizedEmail,

                  name:
                    String(name).trim(),
                },
              ],

              templateId:
                FACTORY_VISIT_TEMPLATE_ID,

              params: {

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
              },
            }),
          }
        );


      const brevoText =
        await brevoResponse.text();


      console.log(
        "Factory visit Brevo status:",
        brevoResponse.status
      );


      if (!brevoResponse.ok) {

        throw new Error(
          `Brevo returned ${brevoResponse.status}: ${brevoText}`
        );
      }


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


    // =========================================================
    // 4. VERIFICATION / PASSWORD RESET
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


    const templateId =
      isVerification
        ? 2
        : 3;


    const brevoResponse =
      await fetch(
        "https://api.brevo.com/v3/smtp/email",
        {
          method: "POST",

          headers: {
            accept:
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
                  normalizedEmail,
              },
            ],

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
      "Auth Brevo status:",
      brevoResponse.status
    );


    if (!brevoResponse.ok) {

      throw new Error(
        `Brevo returned ${brevoResponse.status}: ${brevoText}`
      );
    }


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
