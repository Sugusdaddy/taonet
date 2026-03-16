const API_URL = import.meta.env.VITE_API_URL || 'https://api.taonet.fun';

export const api = {
  async get(endpoint) {
    const response = await fetch(`${API_URL}${endpoint}`);
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return { data: await response.json() };
  },
  
  async post(endpoint, data) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return { data: await response.json() };
  }
};

export default api;
