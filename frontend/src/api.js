import axios from 'axios';

// Create an axios instance pointing to your FastAPI URL
const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1', 
  headers: {
    'Content-Type': 'application/json',
    // 1. DEFAULT USER: We pretend to be a Senior Dev by default so we can test everything
    'X-Test-Email': 'senior@documind.com'
  },
});



export const uploadPDF = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  // 2. UPLOAD HEADER: Explicitly send header here too, just in case
  const response = await api.post('/upload', formData, {
    headers: { 
        'Content-Type': 'multipart/form-data',
        'X-Test-Email': 'senior@documind.com'
    },
  });
  return response.data;
};

export const sendChatMessage = async (message) => {
  const response = await api.post('/chat', { message });
  return response.data;
};

export default api;