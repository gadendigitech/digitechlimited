// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-analytics.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
apiKey: "AIzaSyD2WZnOuDXBLXR7uAq_LTK46q7tr13Mqvw",
authDomain: "gadendigitech.firebaseapp.com",
projectId: "gadendigitech",
storageBucket: "gadendigitech.firebasestorage.app",
messagingSenderId: "134032321432",
appId: "1:134032321432:web:dedbb189a68980661259ed",
measurementId: "G-VLG9G3FCP0"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  const auth = firebase.auth();
  
  // Show/hide password toggle
  const passwordInput = document.getElementById('password');
  const togglePasswordBtn = document.getElementById('togglePassword');
  const eyeIcon = document.getElementById('eyeIcon');
  togglePasswordBtn.addEventListener('click', () => {
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      eyeIcon.textContent = '🙈';
    } else {
      passwordInput.type = 'password';
      eyeIcon.textContent = '👁️';
    }
  });
  
  // Login form handler
  document.getElementById('loginForm').addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = passwordInput.value;
    auth.signInWithEmailAndPassword(email, password)
      .then(() => {
        window.location = 'home.html'; // or dashboard.html or wherever your home page is
      })
      .catch(err => alert(err.message));
  });
  
  // Forgot password handler
  document.getElementById('forgotPasswordLink').addEventListener('click', e => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    if (!email) {
      alert('Enter your email above first.');
      return;
    }
    auth.sendPasswordResetEmail(email)
      .then(() => {
        alert('A password reset link has been sent to your email.');
      })
      .catch(err => alert(err.message));
  });
  