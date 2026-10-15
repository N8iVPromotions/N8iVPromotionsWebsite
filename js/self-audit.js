(() => {
  const sections = [
    { title: 'Source capture', intro: 'First, check whether acquisition data survives beyond the click.', questions: [
      'Campaign links use a documented, consistent UTM naming system.',
      'Original source and campaign data are stored on every new contact record.',
      'We can distinguish direct, organic, paid, referral, and partner-created demand.'
    ]},
    { title: 'CRM connection', intro: 'Now check whether marketing activity can meet an actual sales outcome.', questions: [
      'Marketing contacts and opportunities share a reliable identifier in our CRM.',
      'Deal stages, close dates, and revenue values are complete and consistently maintained.',
      'Offline conversions, calls, and manually created deals retain their source context.'
    ]},
    { title: 'Attribution confidence', intro: 'A useful model should explain the journey without pretending one click did all the work.', questions: [
      'We can see meaningful touches between first visit and closed revenue.',
      'Duplicate platform conversions are reconciled against CRM outcomes.',
      'Our attribution approach reflects the length and complexity of our sales cycle.'
    ]},
    { title: 'Revenue reconciliation', intro: 'Test whether reported wins can be matched to money the business actually received.', questions: [
      'Closed-won CRM totals are regularly reconciled with invoicing or payment data.',
      'Refunds, cancellations, and duplicate deals are removed from revenue reporting.',
      'We know what percentage of revenue is unattributed or has an unknown source.'
    ]},
    { title: 'Decision readiness', intro: 'Finally, decide whether the reporting changes what your team does next.', questions: [
      'Leadership can see revenue and qualified pipeline by channel, campaign, or content theme.',
      'Reports clearly flag data-quality gaps instead of hiding them.',
      'The team uses revenue evidence to change budget, content, or campaign decisions.'
    ]}
  ];
  const choices = [['Not in place',0],['Partly',1],['Mostly',2],['Consistently',3]];
  const form = document.querySelector('[data-self-audit-form]');
  if (!form) return;
  const intro = document.querySelector('[data-audit-intro]');
  const panelsWrap = form.querySelector('[data-question-panels]');
  const resultPanel = form.querySelector('[data-result-panel]');
  const error = form.querySelector('[data-audit-error]');
  let step = 0;

  panelsWrap.innerHTML = sections.map((section, sectionIndex) => `<section class="audit-panel" data-section="${sectionIndex}"><div class="audit-step-label">Section ${sectionIndex + 1} of ${sections.length}</div><h2>${section.title}</h2><p class="audit-step-intro">${section.intro}</p>${section.questions.map((question, questionIndex) => { const index = sectionIndex * 3 + questionIndex; return `<fieldset class="audit-question"><legend>${index + 1}. ${question}</legend><div class="audit-options">${choices.map(([label,value]) => `<div class="audit-option"><input id="q${index}-${value}" type="radio" name="q${index}" value="${value}" required><label for="q${index}-${value}">${label}</label></div>`).join('')}</div></fieldset>`; }).join('')}<div class="audit-error" data-step-error role="alert"></div><div class="audit-actions">${sectionIndex ? '<button class="audit-back" type="button" data-back>Back</button>' : '<span></span>'}<button class="btn btn-primary audit-btn" type="button" data-next>${sectionIndex === sections.length - 1 ? 'Get my result' : 'Next section'}</button></div></section>`).join('');
  const questionPanels = [...form.querySelectorAll('[data-section]')];

  function showStep(nextStep) {
    step = nextStep;
    [...questionPanels, resultPanel].forEach(panel => panel.classList.remove('active'));
    const panel = step < sections.length ? questionPanels[step] : resultPanel;
    panel.classList.add('active');
    const progress = Math.min(100, Math.round(((step + 1) / sections.length) * 100));
    form.querySelector('[data-progress-label]').textContent = step < sections.length ? `Section ${step + 1} of ${sections.length}` : 'Complete';
    form.querySelector('[data-progress-percent]').textContent = `${progress}%`;
    form.querySelector('[data-progress-bar]').style.transform = `scaleX(${progress / 100})`;
    window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  // Keep answers in this tab so a refresh or back swipe doesn't wipe them.
  const DRAFT_KEY = 'n8iv_self_audit_draft';
  const DRAFT_SKIP = new Set(['website', 'cf-turnstile-response', 'followUpConsent']);
  function saveDraft() {
    try {
      const draft = {};
      for (const [name, value] of new FormData(form).entries()) {
        if (!DRAFT_SKIP.has(name) && typeof value === 'string') draft[name] = value;
      }
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {}
  }
  let resumeStep = 0;
  try {
    const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null');
    if (draft) {
      Object.entries(draft).forEach(([name, value]) => {
        if (DRAFT_SKIP.has(name)) return;
        if (/^q\d+$/.test(name)) {
          const radio = form.querySelector(`input[name="${name}"][value="${value}"]`);
          if (radio) radio.checked = true;
        } else {
          const field = form.elements.namedItem(name);
          if (field?.type === 'checkbox') field.checked = true;
          else if (field && 'value' in field && !field.value) field.value = value;
        }
      });
      // Resume at the first section that still has an unanswered question.
      const firstOpen = questionPanels.findIndex(panel => [...panel.querySelectorAll('fieldset')].some(fieldset => !fieldset.querySelector('input:checked')));
      resumeStep = firstOpen === -1 ? sections.length : firstOpen;
    }
  } catch (e) {}
  form.addEventListener('change', saveDraft);
  form.addEventListener('input', saveDraft);

  function startAudit() { intro.hidden = true; form.hidden = false; if (resumeStep === sections.length) completeAudit(); else showStep(resumeStep); }
  document.querySelector('[data-start-audit]').addEventListener('click', startAudit);
  // Landing pages link here with ?start=1 after the visitor has already
  // answered a question, so skip the intro and go straight to the form.
  if (new URLSearchParams(location.search).get('start') === '1') startAudit();
  form.addEventListener('click', event => {
    if (event.target.closest('[data-next]')) {
      const panel = questionPanels[step];
      const missing = [...panel.querySelectorAll('fieldset')].find(fieldset => !fieldset.querySelector('input:checked'));
      panel.querySelector('[data-step-error]').textContent = missing ? 'Choose one answer for each statement to continue.' : '';
      if (missing) { missing.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      if (step === sections.length - 1) completeAudit(); else showStep(step + 1);
    }
    if (event.target.closest('[data-back]')) showStep(Math.max(0, step - 1));
  });
  function readAnswers() {
    const data = new FormData(form);
    return Array.from({ length: 15 }, (_, i) => data.has(`q${i}`) ? Number(data.get(`q${i}`)) : NaN);
  }
  function completeAudit() {
    const result = window.N8iVAuditScore(readAnswers());
    renderResult(result);
    saveFitSummaryHandoff({}, result);
    window.N8iVAttribution?.track?.('self_audit_completed', { score_band: result.band });
    showStep(sections.length);
  }
  form.addEventListener('submit', async event => {
    event.preventDefault(); error.textContent = '';
    if (step < sections.length) return;
    if (!form.reportValidity()) { error.textContent = 'To email a copy, complete your name, work email, and company. Your score is available above.'; return; }
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true; submit.textContent = 'Sending...';
    const data = Object.fromEntries(new FormData(form).entries());
    data.answers = readAnswers();
    data.followUpConsent = data.followUpConsent === 'yes';
    const localResult = window.N8iVAuditScore(data.answers);
    saveFitSummaryHandoff(data, localResult);
    Object.assign(data, window.N8iVAttribution?.getPayload?.() || {});
    try {
      const response = await fetch(form.action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok !== true || typeof result.emailDelivered !== 'boolean') throw new Error(result.error || 'We could not confirm your email request.');
      const delivery = result.emailDelivered ? 'Your email copy was accepted by our email provider; inbox delivery is not confirmed.' : 'Your email copy could not be sent. Your score remains available above.';
      resultPanel.querySelector('[data-followup-message]').textContent = `${delivery} ${data.followUpConsent ? 'You opted in to follow-up about this audit.' : 'You did not opt in to follow-up about this audit.'} A Fit Review requires a separate request.`;
      window.N8iVAttribution?.track?.('self_audit_email_requested', { score_band: localResult.band, follow_up_consent: data.followUpConsent ? 'yes' : 'no' });
    } catch (err) { error.textContent = `${err.message} Your score is still available above. You can retry the email copy or request a free Fit Review separately.`; }
    finally {
      submit.disabled = false; submit.textContent = 'Email my score';
      window.turnstile?.reset?.();
    }
  });
  // Carry the visitor's details and score to the Fit Summary request in one
  // click. Stored in this tab only (sessionStorage), never in the URL.
  function saveFitSummaryHandoff(data, result) {
    try {
      const parts = String(data.name || '').trim().split(/\s+/);
      const draft = {
        firstName: parts.shift() || '',
        lastName: parts.join(' '),
        email: data.email || '',
        company: data.company || '',
        challenge: `Revenue Self-Audit score: ${result.score}/100 (${result.band}).`
      };
      sessionStorage.setItem('n8iv_fit_review_draft', JSON.stringify(draft));
      sessionStorage.setItem('n8iv_self_audit_result', JSON.stringify({ score: result.score, band: result.band }));
    } catch (e) {}
  }
  function renderResult(result) {
    resultPanel.querySelector('[data-score]').textContent = result.score;
    resultPanel.querySelector('[data-score-band]').textContent = result.band;
    resultPanel.querySelector('[data-score-copy]').textContent = result.summary;
    resultPanel.querySelector('[data-category-results]').innerHTML = result.categories.map(item => `<div class="result-row"><span>${item.name}</span><strong>${item.score}%</strong></div>`).join('');
    resultPanel.querySelector('[data-followup-message]').textContent = 'Your score is based on your answers, not a verified review of your systems. No email or follow-up is required. Request the free Fit Review below when you are ready.';
  }
})();
