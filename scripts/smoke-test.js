const app = require('../api/index');

const requiredEnv = {
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'pass',
  SESSION_SECRET: process.env.SESSION_SECRET || 'secret'
};

Object.assign(process.env, requiredEnv);

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

const server = app.listen(0, async () => {
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  try {
    const admin = await fetch(`${base}/admin`);
    const protectedBeforeLogin = await fetch(`${base}/api/admin/bookings`);
    const settings = await fetch(`${base}/api/settings`);
    const imagesPage = await fetch(`${base}/images.html`);
    const booking = await fetch(`${base}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Smoke Test',
        phone: '1234567890',
        email: 'guest@example.com',
        date: '2026-06-16',
        time: '19:00',
        guests: '2',
        message: 'Window table'
      })
    });
    const login = await fetch(`${base}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: requiredEnv.ADMIN_USERNAME, password: requiredEnv.ADMIN_PASSWORD })
    });
    const cookie = login.headers.get('set-cookie') || '';
    const protectedAfterLogin = await fetch(`${base}/api/admin/bookings`, { headers: { cookie } });

    if (admin.status !== 200) fail(`/admin expected 200, got ${admin.status}`);
    if (protectedBeforeLogin.status !== 401) fail(`protected admin API expected 401 before login, got ${protectedBeforeLogin.status}`);
    if (settings.status !== 200) fail(`settings endpoint expected 200, got ${settings.status}`);
    if (imagesPage.status !== 200) fail(`public image page expected 200, got ${imagesPage.status}`);
    if (booking.status !== 201) fail(`booking endpoint expected 201, got ${booking.status}`);
    if (login.status !== 200) fail(`admin login expected 200, got ${login.status}`);
    if (protectedAfterLogin.status !== 200) fail(`protected admin API expected 200 after login, got ${protectedAfterLogin.status}`);

    if (!process.exitCode) console.log('Smoke test passed');
  } catch (error) {
    fail(error.stack || error.message);
  } finally {
    server.close();
  }
});
