(function () {
  const $ = (selector) => document.querySelector(selector);
  const loginPanel = $('#loginPanel');
  const dashboard = $('#dashboard');

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
    try {
      const settings = await window.dbApi.dbGetSettings();
      fillForm($('#settingsForm'), settings);
      fillForm($('#homeImagesForm'), settings.images || {});
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  }

  async function loadBookings() {
    try {
      const bookings = await window.dbApi.dbGetBookings();
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
    } catch (error) {
      console.error("Error loading bookings:", error);
    }
  }

  async function loadImages() {
    try {
      const images = await window.dbApi.dbGetMedia();
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
    } catch (error) {
      console.error("Error loading images:", error);
    }
  }

  async function showDashboard() {
    loginPanel.classList.add('is-hidden');
    dashboard.classList.remove('is-hidden');
    await Promise.all([loadSettings(), loadBookings(), loadImages()]);
  }

  function checkSession() {
    if (!window.dbApi) {
      console.error("Database API not initialized!");
      return;
    }
    window.dbApi.dbCheckAuth(async function (user) {
      if (user) {
        await showDashboard();
      } else {
        loginPanel.classList.remove('is-hidden');
        dashboard.classList.add('is-hidden');
      }
    });
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
      const formData = Object.fromEntries(new FormData(event.target));
      await window.dbApi.dbLogin(formData.username || formData.email, formData.password);
      setStatus('#loginStatus', '');
    } catch (error) {
      setStatus('#loginStatus', error.message);
    }
  });

  $('#logoutButton').addEventListener('click', async () => {
    await window.dbApi.dbLogout();
    location.reload();
  });

  $('#refreshBookings').addEventListener('click', loadBookings);

  $('#bookingsBody').addEventListener('click', async (event) => {
    const id = event.target.dataset.deleteBooking;
    if (!id) return;
    if (!confirm('Are you sure you want to delete this booking?')) return;
    try {
      await window.dbApi.dbDeleteBooking(id);
      await loadBookings();
    } catch (error) {
      alert(error.message);
    }
  });

  $('#adminImages').addEventListener('click', async (event) => {
    const id = event.target.dataset.deleteImage;
    if (!id) return;
    if (!confirm('Are you sure you want to delete this image?')) return;
    try {
      await window.dbApi.dbDeleteMediaItem(id);
      await loadImages();
    } catch (error) {
      alert(error.message);
    }
  });

  $('#settingsForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('#settingsStatus', 'Saving...');
    try {
      const settings = Object.fromEntries(new FormData(event.target));
      await window.dbApi.dbUpdateSettings(settings);
      setStatus('#settingsStatus', 'Settings saved.');
    } catch (error) {
      setStatus('#settingsStatus', error.message);
    }
  });

  $('#homeImagesForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('#homeImagesStatus', 'Saving...');
    try {
      const images = Object.fromEntries(new FormData(event.target));
      await window.dbApi.dbUpdateImages(images);
      setStatus('#homeImagesStatus', 'Image settings saved.');
    } catch (error) {
      setStatus('#homeImagesStatus', error.message);
    }
  });

  $('#imageForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('#imageStatus', 'Saving image...');
    try {
      const formData = new FormData(event.target);
      const title = formData.get('title');
      const type = formData.get('type');
      const urlInput = formData.get('url');
      const fileInput = event.target.querySelector('input[type="file"]').files[0];

      let imageUrl = '';
      let publicId = '';

      if (fileInput) {
        setStatus('#imageStatus', 'Uploading to Cloudinary...');
        const result = await window.dbApi.dbUploadImage(fileInput);
        imageUrl = result.url;
        publicId = result.publicId;
      } else if (urlInput) {
        imageUrl = urlInput;
      } else {
        throw new Error('Please select a file to upload or paste a URL.');
      }

      setStatus('#imageStatus', 'Saving to database...');
      await window.dbApi.dbAddMediaItem(title, type, imageUrl, publicId);
      
      event.target.reset();
      setStatus('#imageStatus', 'Image saved.');
      await loadImages();
    } catch (error) {
      setStatus('#imageStatus', error.message);
    }
  });

  $('#passwordForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('#passwordStatus', 'Changing password...');
    try {
      const currentPassword = event.target.elements.currentPassword.value;
      const newPassword = event.target.elements.newPassword.value;
      const confirmPassword = event.target.elements.confirmPassword.value;

      if (newPassword !== confirmPassword) {
        throw new Error('New passwords do not match');
      }

      await window.dbApi.dbChangePassword(currentPassword, newPassword);
      event.target.reset();
      setStatus('#passwordStatus', 'Password changed successfully.');
    } catch (error) {
      setStatus('#passwordStatus', error.message);
    }
  });

  checkSession();
})();
