import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://mxbzlscxsonbwiqjmnzx.supabase.co";
const supabaseKey = "sb_publishable_H3k7_8EsXTns6v0YVOdGww_9xd6iBYE";

export const supabase = createClient(supabaseUrl, supabaseKey);