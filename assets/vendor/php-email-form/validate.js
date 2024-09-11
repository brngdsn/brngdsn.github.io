(function () {
  "use strict";

  let forms = document.querySelectorAll('.php-email-form');

  forms.forEach(function(e) {
    const formName = e.getAttribute('data-name'); // Get the form name (login or register)
    e.addEventListener('submit', function(event) {
      event.preventDefault();

      let thisForm = this;

      let action = thisForm.getAttribute('action');
      let redirectUrl = formName === 'login-form' ? 'profile.html' : 'login.html'; // Set the redirect URL
      let recaptcha = thisForm.getAttribute('data-recaptcha-site-key');

      thisForm.querySelector('.loading').classList.add('d-block');
      thisForm.querySelector('.error-message').classList.remove('d-block');
      thisForm.querySelector('.sent-message').classList.remove('d-block');

      let formData = new FormData(thisForm);

      // Handle reCAPTCHA (if present)
      if (recaptcha) {
        if (typeof grecaptcha !== "undefined") {
          grecaptcha.ready(function() {
            try {
              grecaptcha.execute(recaptcha, { action: 'form_submit' }).then(token => {
                formData.set('recaptcha-response', token);
                submitForm(thisForm, action, formData, redirectUrl);
              });
            } catch (error) {
              displayError(thisForm, error);
            }
          });
        } else {
          displayError(thisForm, 'The reCAPTCHA javascript API url is not loaded!');
        }
      } else {
        submitForm(thisForm, action, formData, redirectUrl);
      }
    });
  });

  function submitForm(thisForm, action, formData, redirectUrl) {
    let jsonObject = {};
    formData.forEach((value, key) => {
      jsonObject[key] = value;
    });
    fetch(action, {
      method: 'POST',
      body: JSON.stringify(jsonObject),
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/json', // Ensure content type is JSON
        'Accept': 'application/json'
      },
      mode: 'cors' // Enable CORS for cross-origin requests
    })
    .then(response => {
      if (response.ok) {
        return response.json(); // Expect a JSON response
      } else {
        throw new Error(`${response.status} ${response.statusText} ${response.url}`);
      }
    })
    .then(data => {
      thisForm.querySelector('.loading').classList.remove('d-block');
      if (data.success) {
        window.location.href = redirectUrl; // Redirect on success
      } else {
        throw new Error(data.message || 'Form submission failed.');
      }
    })
    .catch(error => {
      displayError(thisForm, error);
    });
  }

  function displayError(thisForm, error) {
    thisForm.querySelector('.loading').classList.remove('d-block');
    thisForm.querySelector('.error-message').innerHTML = error.message || error;
    thisForm.querySelector('.error-message').classList.add('d-block');
  }

})();
