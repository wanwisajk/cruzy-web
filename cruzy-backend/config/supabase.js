const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: please set SUPABASE_URL and SUPABASE_KEY in .env');
  process.exit(1);
}

module.exports = createClient(supabaseUrl, supabaseKey);
