const { generateMonthlySalarySummaries, previousMonth } = require('./salarySummaryGenerator');

const DAY_MS = 24 * 60 * 60 * 1000;
let lastGeneratedMonth = null;

function bangkokParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

async function generatePreviousMonth(reason) {
  const month = previousMonth(new Date());
  if (lastGeneratedMonth === month) return;
  lastGeneratedMonth = month;
  try {
    const result = await generateMonthlySalarySummaries(month);
    console.log(`[salary] generated ${result.count} summaries for ${result.month} (${reason})`);
  } catch (error) {
    lastGeneratedMonth = null;
    console.error('[salary] monthly generation failed:', error);
  }
}

function shouldGenerateToday(date = new Date()) {
  return bangkokParts(date).day === '01';
}

function startSalarySummaryScheduler() {
  if (process.env.SALARY_SUMMARY_AUTO_GENERATE === 'false') {
    console.log('[salary] monthly auto generation disabled');
    return;
  }

  generatePreviousMonth('startup');

  setInterval(() => {
    if (shouldGenerateToday()) generatePreviousMonth('monthly');
  }, DAY_MS);
}

module.exports = {
  startSalarySummaryScheduler
};
