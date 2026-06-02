const supabase = require('../config/supabase');

const MISSING_TABLE_CODES = ['42P01', 'PGRST205'];

async function fetchTable(table, select = '*') {
  const { data, error } = await supabase.from(table).select(select);
  if (error) throw error;
  return data || [];
}

async function fetchOptionalTable(table, select = '*') {
  const { data, error } = await supabase.from(table).select(select);
  if (error) {
    if (MISSING_TABLE_CODES.includes(error.code) || String(error.message || '').includes('does not exist')) {
      console.warn(`optional table skipped: ${table}`);
      return [];
    }
    throw error;
  }
  return data || [];
}

module.exports = {
  supabase,
  fetchTable,
  fetchOptionalTable,
  MISSING_TABLE_CODES
};
