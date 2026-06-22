import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente Admin central para acessar o Supabase no Backend
// TEM PODER ABSOLUTO E IGNORA AS POLÍTICAS DE RLS.
// Deve ser usado EXCLUSIVAMENTE em rotas protegidas ou Server Actions.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
