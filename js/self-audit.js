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
  const leadPanel = form.querySelector('[data-lead-panel]');
  const resultPanel = form.querySelector('[data-result-panel]');
  const error = form.querySelector('[data-audit-error]');
  let step = 0;

  panelsWrap.innerHTML = sections.map((section, sectionIndex) => `<section class="audit-panel" data-section="${sectionIndex}"><div class="audit-step-label">Section ${sectionIndex + 1} of ${sections.length}</div><h2>${section.title}</h2><p class="audit-step-intro">${section.intro}</p>${section.questions.map((question, questionIndex) => { const index = sectionIndex * 3 + questionIndex; return `<fieldset class="audit-question"><legend>${index + 1}. ${question}</legend><div class="audit-options">${choices.map(([label,value]) => `<div class="audit-option"><input id="q${index}-${value}" type="radio" name="q${index}" value="${value}" required><label for="q${index}-${value}">${label}</label></div>`).join('')}</div></fieldset>`; }).join('')}<div class="audit-error" data-step-error role="alert"></div><div class="audit-actions">${sectionIndex ? '<button class="audit-back" type="button" data-back>Back</button>' : '<span></span>'}<button class="btn btn-primary audit-btn" type="button" data-next>${sectionIndex === sections.length - 1 ? 'Get my result' : 'Next section'}</button></div></section>`).join('');
  const questionPanels = [...form.querySelectorAll('[data-section]')];

  function showStep(nextStep) {
    step = nextStep;
    [...questionPanels, leadPanel, resultPanel].forEach(panel => panel.classList.remove('active'));
    const panel = step < sections.length ? questionPanels[step] : step === sections.length ? leadPanel : resultPanel;
    panel.classList.add('active');
    const progress = Math.min(100, Math.round(((step + 1) / (sections.length + 1)) * 100));
    form.querySelector('[data-progress-label]').textContent = step < sections.length ? `Section ${step + 1} of ${sections.length}` : step === sections.length ? 'Your details' : 'Complete';
    form.querySelector('[data-progress-percent]').textContent = `${progress}%`;
    form.querySelector('[data-progress-bar]').style.transform = `scaleX(${progress / 100})`;
    window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  document.querySelector('[data-start-audit]').addEventListener('click', () => { intro.hidden = true; form.hidden = false; showStep(0); });
  form.addEventListener('click', event => {
    if (event.target.closest('[data-next]')) {
      const panel = questionPanels[step];
      const missing = [...panel.querySelectorAll('fieldset')].find(fieldset => !fieldset.querySelector('input:checked'));
      panel.querySelector('[data-step-error]').textContent = missing ? 'Choose one answer for each statement to continue.' : '';
      if (missing) { missing.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      showStep(step + 1);
    }
    if (event.target.closest('[data-back]')) showStep(Math.max(0, step - 1));
  });
  form.addEventListener('submit', async event => {
    event.preventDefault(); error.textContent = '';
    if (!form.reportValidity()) { error.textContent = 'Please complete your name, work email, and company.'; return; }
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true; submit.textContent = 'Calculating...';
    const data = Object.fromEntries(new FormData(form).entries());
    data.answers = Array.from({length:15},(_,i) => Number(data[`q${i}`]));
    data.followUpConsent = data.followUpConsent === 'yes';
    Object.assign(data, window.N8iVAttribution?.getPayload?.() || {});
    try {
      const response = await fetch(form.action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'We could not submit your audit.');
      renderResult(result, data.followUpConsent);
      window.N8iVAttribution?.track?.('self_audit_completed', {
        score_band: result.band,
        follow_up_consent: data.followUpConsent ? 'yes' : 'no'
      });
      showStep(sections.length + 1);
    } catch (err) { error.textContent = `${err.message} Please try again or email zajen@n8ivpromotions.com.`; }
    finally { submit.disabled = false; submit.textContent = 'Show my result'; }
  });
  function renderResult(result, consent) {
    resultPanel.querySelector('[data-score]').textContent = result.score;
    resultPanel.querySelector('[data-score-band]').textContent = result.band;
    resultPanel.querySelector('[data-score-copy]').textContent = result.summary;
    resultPanel.querySelector('[data-category-results]').innerHTML = result.categories.map(item => `<div class="result-row"><span>${item.name}</span><strong>${item.score}%</strong></div>`).join('');
    const delivery = result.emailDelivered ? 'A copy of your score has been emailed to you.' : 'Your result is available here, but the email copy could not be delivered.';
    resultPanel.querySelector('[data-followup-message]').textContent = consent ? `You agreed to follow-up. N8iV may contact you with a practical observation about your result. ${delivery}` : `You did not opt in to follow-up, so N8iV will not contact you about this audit. ${delivery}`;
  }
})();
