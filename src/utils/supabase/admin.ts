import { createClient } from '@supabase/supabase-js'

// This client should ONLY be used in server actions/routes where you need to bypass Row Level Security
// or perform administrative tasks like creating new users without logging out the current admin.

export function createAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )
}
