// One deterministic scoring implementation for browser results and email copies.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.N8iVAuditScore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
const CATEGORY_NAMES = ['Source capture', 'CRM connection', 'Attribution confidence', 'Revenue reconciliation', 'Decision readiness'];
function scoreAudit(answers) {
  if (!Array.isArray(answers) || answers.length !== 15 || answers.some(value => !Number.isInteger(value) || value < 0 || value > 3)) throw new Error('Please answer all 15 audit questions.');
  const categories = CATEGORY_NAMES.map((name, index) => ({ name, score: Math.round(answers.slice(index * 3, index * 3 + 3).reduce((sum, value) => sum + value, 0) / 9 * 100) }));
  const score = Math.round(answers.reduce((sum, value) => sum + value, 0) / 45 * 100);
  if (score >= 80) return { score, categories, band: 'Decision-ready visibility', summary: 'Your revenue receipt is strong. Focus on the lowest category to improve confidence and make the system easier to maintain as you scale.' };
  if (score >= 60) return { score, categories, band: 'Connected, with material gaps', summary: 'You have useful pieces in place, but one or more handoffs can still break the path from marketing activity to revenue. Start with your lowest-scoring category.' };
  if (score >= 35) return { score, categories, band: 'Partial revenue visibility', summary: 'Your team can see activity, but cannot consistently produce a defensible receipt for closed revenue. Repair source capture and CRM connection before adding reporting complexity.' };
  return { score, categories, band: 'Revenue receipt at risk', summary: 'Most marketing and revenue evidence is disconnected or manually reconstructed. Establish a clean source-to-CRM foundation first, then add attribution.' };
}

return scoreAudit;
});
