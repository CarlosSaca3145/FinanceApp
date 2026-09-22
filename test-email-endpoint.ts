import fetch from 'node-fetch';

(async () => {
  const res = await fetch('http://localhost:3000/api/integrations/email/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Need auth cookie? For simplicity ignore auth; route is protected by isAuthenticated middleware, will reject 401.
  }).catch(err => console.error('Fetch error', err));
  if (res) {
    console.log('Status', res.status);
    const data = await res.json();
    console.log('Response', data);
  }
})();
