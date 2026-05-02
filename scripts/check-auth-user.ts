import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) console.error(error);
    else {
        const u = data.users.find(u => u.email?.toLowerCase().includes('recepcion'));
        console.log('Auth user email:', u?.email);
    }
}
main();
