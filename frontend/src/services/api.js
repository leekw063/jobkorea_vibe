const API_BASE = 'http://localhost:4001/api';

export const api = {
  async getResumes(status) {
    const query = status ? `?status=${status}` : '';
    const response = await fetch(`${API_BASE}/resumes${query}`);
    return response.json();
  },

  async collectResumes() {
    const response = await fetch(`${API_BASE}/resumes/collect`, {
      method: 'POST'
    });
    return response.json();
  },

  async updateResumeStatus(id, status) {
    const response = await fetch(`${API_BASE}/resumes/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return response.json();
  }
};