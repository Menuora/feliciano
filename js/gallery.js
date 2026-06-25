(function () {
  function card(image) {
    return `
      <div class="col-md-6 col-lg-4 ftco-animate">
        <div class="menu-entry gallery-entry">
          <a href="${image.url}" class="img" style="background-image: url(${image.url});"></a>
          <div class="text pt-4">
            <h3>${escapeHtml(image.title)}</h3>
            <p>${image.type === 'full-menu' ? 'Full menu image' : 'Individual menu item'}</p>
          </div>
        </div>
      </div>
    `;
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

  async function loadGallery() {
    const grid = document.querySelector('[data-gallery-grid]');
    if (!grid) return;
    try {
      if (!window.dbApi) throw new Error("Database API not available.");
      const images = await window.dbApi.dbGetMedia();
      grid.innerHTML = images.length ? images.map(card).join('') : '<div class="col-12 text-center"><p>No menu images have been uploaded yet.</p></div>';
    } catch (error) {
      console.error("Error loading gallery:", error);
      grid.innerHTML = '<div class="col-12 text-center"><p>No menu images have been uploaded yet.</p></div>';
    }
  }

  loadGallery();
})();
