(function () {
  document.querySelectorAll('[data-booking-form]').forEach((form) => {
    const status = form.querySelector('[data-booking-status]');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (status) status.textContent = 'Sending your booking...';
      try {
        const response = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(Object.fromEntries(new FormData(form)))
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Booking could not be saved');
        form.reset();
        if (status) status.textContent = 'Thank you. Your booking request has been sent.';
      } catch (error) {
        if (status) status.textContent = error.message;
      }
    });
  });
})();
