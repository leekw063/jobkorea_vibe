const API_BASE = 'http://localhost:4001/api';

export const api = {
  async getResumes(filters = {}, pagination = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.job_posting_title) params.append('job_posting_title', filters.job_posting_title);
    if (filters.job_posting_id) params.append('job_posting_id', filters.job_posting_id);
    if (filters.applicant_name) params.append('applicant_name', filters.applicant_name);
    if (filters.include_deleted === true) params.append('include_deleted', 'true');
    if (filters.deleted_only === true) params.append('deleted_only', 'true');

    if (pagination.limit) params.append('limit', pagination.limit);
    if (pagination.offset) params.append('offset', pagination.offset);
    const query = params.toString();
    const response = await fetch(`${API_BASE}/resumes${query ? '?' + query : ''}`);
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
  },

  async getMarkdownContent(filename) {
    const response = await fetch(`${API_BASE}/resumes/markdown/${filename}/view`);
    return response.json();
  },

  async deleteResume(id) {
    // Directly delete the resume by ID using RESTful endpoint
    const response = await fetch(`${API_BASE}/resumes/${id}`, {
      method: 'DELETE'
    });
    return response.json();
  },

  async restoreResume(id) {
    const response = await fetch(`${API_BASE}/resumes/${id}/restore`, {
      method: 'POST'
    });
    return response.json();
  },

  async permanentDeleteResume(id) {
    const response = await fetch(`${API_BASE}/resumes/${id}/permanent`, {
      method: 'DELETE'
    });
    return response.json();
  },

  async getDeletedResumes() {
    const response = await fetch(`${API_BASE}/resumes?deleted_only=true`);
    return response.json();
  },

  async getJobPostingMarkdown(jobPostingId) {
    const response = await fetch(`${API_BASE}/job-postings/${jobPostingId}/markdown`);
    return response.json();
  },

  async reviewResume(id) {
    const response = await fetch(`${API_BASE}/resumes/${id}/review`, {
      method: 'POST'
    });
    return response.json();
  }
};
