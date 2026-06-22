import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Cliente central para acessar o Supabase em toda a aplicação
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
