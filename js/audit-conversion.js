/* One completed self-audit per tab/session, shared browser/server event ID. */
(function () {
  const key = 'n8iv_audit_conversion_v1';
  let sent = false;
  window.N8iVAuditConversion = function (answers) {
    if (sent || !['www.n8ivpromotions.com', 'n8ivpromotions.com'].includes(location.hostname)) return;
    if (!Array.isArray(answers) || answers.length !== 15 || answers.some(v => !Number.isInteger(v) || v < 0 || v > 3)) return;
    // Fail closed if the opt-out preference cannot be read.
    try { if (localStorage.getItem('n8iv_ga_opt_out') === '1') return; } catch (_) { return; }
    let record;
    try { record = JSON.parse(sessionStorage.getItem(key)); } catch (_) {}
    if (record?.sent) return;
    const id = record?.id || crypto.randomUUID();
    const timestamp = record?.timestamp || Date.now();
    sent = true;
    try { sessionStorage.setItem(key, JSON.stringify({ id, timestamp, sent: true })); } catch (_) {}
    try { window.oaiq?.('measure', 'custom', { type: 'custom' }, { custom_event_name: 'self_audit_completed', event_id: id }); } catch (_) {}
    // The server validates completion; answers are never forwarded to OpenAI.
    fetch('/api/audit-completed', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ id, timestamp, answers, measurementAllowed: true })
    }).catch(() => {});
  };
})();
