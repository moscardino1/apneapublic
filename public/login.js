// Import the db instance from firebase-init.js
import { db } from './firebase-init.js';

// Get references to elements
const loginBtn = document.getElementById('login-btn');
const usernameInput = document.getElementById('username-input');
const passwordInput = document.getElementById('password-input');
const googleBtn = document.getElementById('google-btn');
const errorMessage = document.getElementById('error-message');

// Create an instance of the Google provider object
const googleProvider = new firebase.auth.GoogleAuthProvider();

// Add click event listener to the login button
loginBtn.addEventListener('click', loginUser);

// Add click event listener to the Google login button
googleBtn.addEventListener('click', loginWithGoogle);

// Function to handle login with email and password
function loginUser() {
  const email = usernameInput.value;
  const password = passwordInput.value;

  firebase.auth().signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      // Check and update user information in Firestore
      // checkAndUpdateUserInFirestore(user);
      window.location.href = 'index.html';

    })
    .catch((error) => {
      showError(error.message);
    });
}

// Function to handle login with Google
function loginWithGoogle() {
  firebase.auth().signInWithPopup(googleProvider)
    .then((result) => {
      const user = result.user;
      // Check and update user information in Firestore
      // checkAndUpdateUserInFirestore(user);
      window.location.href = 'index.html';

    })
    .catch((error) => {
      showError(error.message);
    });
}



// Function to display the error message
function showError(message) {
  errorMessage.textContent = message;
}



// Get the forgot password and register link elements
const forgotPasswordLink = document.getElementById('forgot-password');
const registerLink = document.getElementById('register-link');

// Add click event listener to the forgot password link
forgotPasswordLink.addEventListener('click', function() {
  console.log('Forgot password link clicked');
});

// Add click event listener to the register link
registerLink.addEventListener('click', function() {
  console.log('Register link clicked');
});

// Add click event listener to the forgot password link
forgotPasswordLink.addEventListener('click', function() {
    const email = prompt('Please enter your email:');
    if (email) {
      firebase.auth().sendPasswordResetEmail(email)
        .then(() => {
          alert('Password reset email sent!');
        })
        .catch((error) => {
          showError(error.message);
        });
    }
  });

// Get references to the register link and the register-modal
// const registerLink = document.getElementById('your-register-link-id');
const registerModal = document.getElementById('register-modal');

// Add click event listener to the register link
registerLink.addEventListener('click', function() {
  // Toggle the display of the registration form
  if (registerModal.style.display === 'block') {
    registerModal.style.display = 'none';
  } else {
    registerModal.style.display = 'block';
  }
});


  // Get the registration button and registration section
const registerBtn = document.getElementById('register-btn');
const registrationSection = document.querySelector('.registration');

// Add click event listener to the registration button
registerBtn.addEventListener('click', function() {
  // Hide the registration section
  registrationSection.style.display = 'none';
});
// Get the registration button and input fields
// const registerBtn = document.getElementById('register-btn');
const registerUsernameInput = document.getElementById('register-username-input');
const registerPasswordInput = document.getElementById('register-password-input');

// Add click event listener to the registration button
registerBtn.addEventListener('click', function() {
  const email = registerUsernameInput.value;
  const password = registerPasswordInput.value;

  firebase.auth().createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      // Signed in 
      var user = userCredential.user;
      // You can redirect to your app's page.
      window.location.href = 'index.html';
    })
    .catch((error) => {
      var errorCode = error.code;
      var errorMessage = error.message;
      // Display the error message
      showError(errorMessage);
    });
});
 
const getCookie = (name) => {
  const value = " " + document.cookie;
  console.log("value", `==${value}==`);
  const parts = value.split(" " + name + "=");
  return parts.length < 2 ? undefined : parts.pop().split(";").shift();
};

const setCookie = function (name, value, expiryDays, domain, path, secure) {
  const exdate = new Date();
  exdate.setHours(
    exdate.getHours() +
      (typeof expiryDays !== "number" ? 365 : expiryDays) * 24
  );
  document.cookie =
    name +
    "=" +
    value +
    ";expires=" +
    exdate.toUTCString() +
    ";path=" +
    (path || "/") +
    (domain ? ";domain=" + domain : "") +
    (secure ? ";secure" : "");
};