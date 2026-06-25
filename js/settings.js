(function () {
  const defaults = {
    restaurantName: 'Feliciano',
    facebookLink: '#',
    instagramLink: '#',
    twitterLink: '#',
    googleMapsEmbed: '',
    openingTime: '9:00',
    closingTime: '24:00',
    images: {}
  };

  function setBackground(selector, url) {
    if (!url) return;
    document.querySelectorAll(selector).forEach((element) => {
      element.style.backgroundImage = `url("${url}")`;
    });
  }

  function setText(selector, text) {
    document.querySelectorAll(selector).forEach((element) => {
      element.textContent = text;
    });
  }

  function setHref(selector, href) {
    document.querySelectorAll(selector).forEach((element) => {
      element.href = href || '#';
    });
  }

  function renderHours(settings) {
    const hours = `${settings.openingTime || defaults.openingTime} - ${settings.closingTime || defaults.closingTime}`;
    document.querySelectorAll('[data-setting-hours]').forEach((element) => {
      element.textContent = hours;
    });
  }

  function renderMap(settings) {
    if (!settings.googleMapsEmbed) return;
    document.querySelectorAll('[data-setting-map]').forEach((element) => {
      element.innerHTML = `<iframe src="${settings.googleMapsEmbed}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
    });
  }

  async function loadSettings() {
    try {
      if (!window.dbApi) {
        console.warn("dbApi not loaded, settings fallback active");
        return;
      }
      const settings = await window.dbApi.dbGetSettings();
      const images = settings.images || {};
      setText('[data-setting-name]', settings.restaurantName);
      setHref('[data-setting-facebook]', settings.facebookLink);
      setHref('[data-setting-instagram]', settings.instagramLink);
      setHref('[data-setting-twitter]', settings.twitterLink);
      renderHours(settings);
      renderMap(settings);
      setBackground('[data-home-hero-1]', images.heroImage1);
      setBackground('[data-home-hero-1-secondary]', images.heroImage1Secondary);
      setBackground('[data-home-hero-2]', images.heroImage2);
      setBackground('[data-home-hero-2-secondary]', images.heroImage2Secondary);
      setBackground('[data-about-image-1]', images.aboutImage1);
      setBackground('[data-about-image-2]', images.aboutImage2);
      setBackground('[data-booking-side-image]', images.bookingSideImage);
      setBackground('[data-menu-header]', images.menuHeaderImage);
      setBackground('[data-gallery-header]', images.galleryHeaderImage);
      setBackground('[data-contact-header]', images.contactHeaderImage);
    } catch (e) {
      console.error("Error loading settings:", e);
    }
  }

  loadSettings();
})();
