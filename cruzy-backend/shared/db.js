const supabase = require('../config/supabase');

const MISSING_TABLE_CODES = ['42P01', 'PGRST205'];

function applyQueryOptions(query, options = {}) {
  let built = query;
  if (options.filters) {
    const filters = Array.isArray(options.filters) ? options.filters : [options.filters];
    filters.forEach((filter) => {
      if (!filter?.column) return;
      const operator = filter.operator || 'eq';
      if (operator === 'in') {
        built = built.in(filter.column, Array.isArray(filter.value) ? filter.value : []);
        return;
      }
      if (operator === 'is') {
        built = built.is(filter.column, filter.value);
        return;
      }
      built = built[operator](filter.column, filter.value);
    });
  }
  if (options.order) {
    const orders = Array.isArray(options.order) ? options.order : [options.order];
    orders.forEach((item) => {
      if (!item) return;
      if (typeof item === 'string') {
        built = built.order(item, { ascending: true });
        return;
      }
      built = built.order(item.column, { ascending: item.ascending !== false, nullsFirst: item.nullsFirst });
    });
  }
  if (Number.isInteger(options.limit) && options.limit > 0) {
    built = built.limit(options.limit);
  }
  return built;
}

async function fetchTable(table, select = '*', options = {}) {
  const { data, error } = await applyQueryOptions(supabase.from(table).select(select), options);
  if (error) throw error;
  return data || [];
}

async function fetchOptionalTable(table, select = '*', options = {}) {
  const { data, error } = await applyQueryOptions(supabase.from(table).select(select), options);
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
  applyQueryOptions,
  MISSING_TABLE_CODES
};
