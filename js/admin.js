(function () {
  const $ = (selector) => document.querySelector(selector);
  const loginPanel = $('#loginPanel');
  const dashboard = $('#dashboard');

  async function api(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  function setStatus(id, message) {
    const el = $(id);
    if (el) el.textContent = message;
  }

  function fillForm(form, values) {
    [...form.elements].forEach((element) => {
      if (element.name && values[element.name] !== undefined) element.value = values[element.name] || '';
    });
  }

  async function loadSettings() {
    const settings = await api('/api/settings');
    fillForm($('#settingsForm'), settings);
    fillForm($('#homeImagesForm'), settings.images || {});
  }

  async function loadBookings() {
    const bookings = await api('/api/admin/bookings');
    const body = $('#bookingsBody');
    body.innerHTML = bookings.length ? bookings.map((booking) => `
      <tr>
        <td><strong>${escapeHtml(booking.name)}</strong><br>${new Date(booking.createdAt).toLocaleString()}</td>
        <td>${escapeHtml(booking.date)}<br>${escapeHtml(booking.time)}</td>
        <td>${escapeHtml(booking.guests)}</td>
        <td>${escapeHtml(booking.phone)}<br>${escapeHtml(booking.email || '')}</td>
        <td>${escapeHtml(booking.message || '')}</td>
        <td><button class="danger" data-delete-booking="${booking.id}">Delete</button></td>
      </tr>
    `).join('') : '<tr><td colspan="6">No bookings yet.</td></tr>';
  }

  async function loadImages() {
    const images = await api('/api/images');
    const target = $('#adminImages');
    target.innerHTML = images.length ? images.map((image) => `
      <article class="image-card">
        <img src="${escapeAttribute(image.url)}" alt="${escapeAttribute(image.title)}">
        <div>
          <strong>${escapeHtml(image.title)}</strong>
          <p>${image.type === 'full-menu' ? 'Full menu image' : 'Individual item image'}</p>
          <button class="danger" data-delete-image="${image.id}">Delete</button>
        </div>
      </article>
    `).join('') : '<p>No gallery images yet.</p>';
  }

  async function showDashboard() {
    loginPanel.classList.add('is-hidden');
    dashboard.classList.remove('is-hidden');
    await Promise.all([loadSettings(), loadBookings(), loadImages()]);
  }

  async function checkSession() {
    const me = await api('/api/admin/me');
    if (me.isAdmin) await showDashboard();
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char]));
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, '&#096;');
  }

  $('#loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('#loginStatus', 'Signing in...');
    try {
      await api('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(event.target)))
      });
      setStatus('#loginStatus', '');
      await showDashboard();
    } catch (error) {
      setStatus('#loginStatus', error.message);
    }
  });

  $('#logoutButton').addEventListener('click', async () => {
    await api('/api/admin/logout', { method: 'POST' });
    location.reload();
  });

  $('#refreshBookings').addEventListener('click', loadBookings);

  $('#bookingsBody').addEventListener('click', async (event) => {
    const id = event.target.dataset.deleteBooking;
    if (!id) return;
    await api(`/api/admin/bookings/${id}`, { method: 'DELETE' });
    await loadBookings();
  });

  $('#adminImages').addEventListener('click', async (event) => {
    const id = event.target.dataset.deleteImage;
    if (!id) return;
    await api(`/api/admin/images/${id}`, { method: 'DELETE' });
    await loadImages();
  });

  $('#settingsForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('#settingsStatus', 'Saving...');
    try {
      await api('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(event.target)))
      });
      setStatus('#settingsStatus', 'Settings saved.');
    } catch (error) {
      setStatus('#settingsStatus', error.message);
    }
  });

  $('#homeImagesForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('#homeImagesStatus', 'Saving...');
    try {
      await api('/api/admin/home-images', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(event.target)))
      });
      setStatus('#homeImagesStatus', 'Image settings saved.');
    } catch (error) {
      setStatus('#homeImagesStatus', error.message);
    }
  });

  $('#imageForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('#imageStatus', 'Saving image...');
    try {
      await api('/api/admin/images', { method: 'POST', body: new FormData(event.target) });
      event.target.reset();
      setStatus('#imageStatus', 'Image saved.');
      await loadImages();
    } catch (error) {
      setStatus('#imageStatus', error.message);
    }
  });

  checkSession().catch(() => {});
})();
