(function () {
  document.querySelectorAll('[data-booking-form]').forEach((form) => {
    const status = form.querySelector('[data-booking-status]');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (status) status.textContent = 'Sending your booking...';
      try {
        if (!window.dbApi) throw new Error("Database API not available.");
        const bookingData = Object.fromEntries(new FormData(form));
        
        // Map form fields to correct fields if necessary (Feliciano maps Name, Phone, Email, Date, Time, Guests, Message)
        // Ensure guests is populated
        if (!bookingData.guests && bookingData.Select) {
          bookingData.guests = bookingData.Select; // Handle select elements
        }
        if (!bookingData.time && bookingData.Select2) {
          bookingData.time = bookingData.Select2; // Handle time select
        }
        
        await window.dbApi.dbAddBooking(bookingData);
        form.reset();
        if (status) status.textContent = 'Thank you. Your booking request has been sent.';
      } catch (error) {
        if (status) status.textContent = error.message;
      }
    });
  });
})();
