import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Redirect to login on 401 responses
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default client;
