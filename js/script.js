// Smooth scroll for nav links
document.querySelectorAll('a.nav-link[href^="#"]').forEach(function (link) {
  link.addEventListener('click', function (e) {
    var targetId = this.getAttribute('href');
    var targetEl = document.querySelector(targetId);
    if (!targetEl) return;
    e.preventDefault();
    var yOffset = -72; // account for fixed navbar
    var y = targetEl.getBoundingClientRect().top + window.pageYOffset + yOffset;
    window.scrollTo({ top: y, behavior: 'smooth' });
  });
});

// Current year in footer
var yearEl = document.getElementById('year');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

// Reservation form validation and submit
(function () {
  var form = document.getElementById('reservationForm');
  if (!form) return;
  var alertEl = document.getElementById('formAlert');

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    // Bootstrap validation styling
    if (!form.checkValidity()) {
      e.stopPropagation();
      form.classList.add('was-validated');
      return;
    }

    // Simulate async submission
    form.classList.remove('was-validated');
    if (alertEl) {
      alertEl.classList.remove('d-none');
    }
    form.reset();

    // Hide alert after a delay
    if (alertEl) {
      setTimeout(function () { alertEl.classList.add('d-none'); }, 4000);
    }
  });
})();








