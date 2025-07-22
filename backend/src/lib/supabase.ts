import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase environment variables!'); // Add this
  console.error('SUPABASE_URL:', process.env.SUPABASE_URL); // Add this
  console.error('SUPABASE_SERVICE_KEY exists:', !!process.env.SUPABASE_SERVICE_KEY); // Add this
  throw new Error('Missing Supabase environment variables');
}

console.log('Initializing Supabase client...'); // Add this

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);