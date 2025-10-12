document.getElementById('pastorInfoSection').addEventListener('submit', async (e) => {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);
  const eventId = generateUUID();

  // Add metadata
  const isoNow = new Date().toISOString();
  formData.set('Event Time', isoNow);
  formData.set('Event Source URL', window.location.href);
  formData.set('Event ID', eventId);
  formData.set('User Agent', navigator.userAgent || '');
  formData.set('fbp', getCookie('_fbp') || '');
  formData.set('fbc', getCookie('_fbc') || '');

  for (let i = 1; i <= questions.length; i++) {
    const sel = document.querySelector(`select[name="q${i}"]`);
    if (sel) formData.set(`Q${i}`, sel.value);
  }

  // Convert to URL-encoded
  const params = new URLSearchParams();
  formData.forEach((v, k) => params.append(k, v));

  try {
    // POST to Apps Script
    const appsResp = await fetch('https://script.google.com/macros/s/AKfycbxs0ImTg3lDGe9MXP3kSLd_GxCSPLBJLNmjeZIQ5mylyBNaJwHO9eUhkaCyA6wjTmZX/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: params.toString()
    });

    // Optionally inspect Apps Script response
    const appsText = await appsResp.text();
    console.log('AppsScript response:', appsText);

    // Fire Meta Pixel with advanced matching + dedup
    fbq('track', 'Lead', {
      content_name: 'Heart Health Scorecard',
      event_source_url: window.location.href,
      em: hash(formData.get('Email')),
      ph: hash(formData.get('Phone')),
      fn: hash(formData.get('First Name')),
      ln: hash(formData.get('Last Name')),
      ct: hash(formData.get('City'))
    }, { eventID: eventId });

    // Redirect after success
    window.location.href = 'post-submission.html';

  } catch (error) {
    console.error('Submission failed:', error);
    alert('Something went wrong. Please try again.');
  }
});
