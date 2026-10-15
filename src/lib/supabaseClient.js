
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://yudnahzfxjzzdfemsikl.supabase.co";

const supabasePublishableKey =
    "sb_publishable_wocZsnihfZlFtDzj2D38dw_9MOYo3Xr";

export const supabase = createClient(
    supabaseUrl,
    supabasePublishableKey,
    {
        auth: {
            flowType: "pkce",
            detectSessionInUrl: true,
            persistSession: true,
            autoRefreshToken: true,
        },
    }
);
