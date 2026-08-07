(function () {
    "use strict";

    const SUPABASE_URL = window.EAMA_SUPABASE_URL || "https://mxbzlscxsonbwiqjmnzx.supabase.co";
    const SUPABASE_ANON_KEY = window.EAMA_SUPABASE_ANON_KEY || "sb_publishable_H3k7_8EsXTns6v0YVOdGww_9xd6iBYE";


    function initializeSupabase() {

        if (
            !window.supabase ||
            typeof window.supabase.createClient !== "function"
        ) {
            console.error(
                "EAMA Supabase Error: Supabase JS library is not loaded."
            );

            window.eamaSupabase = null;
            window.eamaSupabaseReady = false;
            return;
        }


        if (
            !SUPABASE_URL ||
            !SUPABASE_ANON_KEY ||
            SUPABASE_URL.includes("MY_SUPABASE") ||
            SUPABASE_ANON_KEY.includes("MY_SUPABASE")
        ) {
            console.error(
                "EAMA Supabase Error: Missing Supabase URL or Anonymous Key."
            );

            window.eamaSupabase = null;
            window.eamaSupabaseReady = false;
            return;
        }


        const client = window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_ANON_KEY
        );


        window.eamaSupabase = client;
        window.eamaSupabaseReady = true;


        console.log(
            "EAMA Supabase connected successfully."
        );
    }


    initializeSupabase();

})();
