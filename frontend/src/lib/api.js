import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// We can add an interceptor here or dynamically set the header in the AuthContext.
// For simplicity in a mock auth environment, we'll export a function to update the header globally.

export const setAuthHeader = (email) => {
  if (email) {
    api.defaults.headers.common['X-Test-Email'] = email;
    localStorage.setItem('documind_test_email', email);
  } else {
    delete api.defaults.headers.common['X-Test-Email'];
    localStorage.removeItem('documind_test_email');
  }
};

// Initialize from local storage if exists
const storedEmail = localStorage.getItem('documind_test_email');
if (storedEmail) {
  setAuthHeader(storedEmail);
}

export default api;
