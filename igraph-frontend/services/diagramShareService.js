// Sharing/collaboration API calls for a single diagram — kept separate from
// authService.js (which already covers auth + the plain diagram CRUD calls)
// since this is its own feature surface with its own shape of data.
import api from './authService';

export const getShareSettings = async (diagramId) => {
  const response = await api.get(`/diagrams/${diagramId}/share`);
  return response.data;
};

export const addCollaborator = async (diagramId, email, permission) => {
  const response = await api.post(`/diagrams/${diagramId}/share/collaborators`, { email, permission });
  return response.data;
};

export const updateCollaboratorPermission = async (diagramId, userId, permission) => {
  const response = await api.patch(`/diagrams/${diagramId}/share/collaborators/${userId}`, { permission });
  return response.data;
};

export const removeCollaborator = async (diagramId, userId) => {
  const response = await api.delete(`/diagrams/${diagramId}/share/collaborators/${userId}`);
  return response.data;
};

export const updateShareLink = async (diagramId, { enabled, permission } = {}) => {
  const body = {};
  if (enabled !== undefined) body.enabled = enabled;
  if (permission !== undefined) body.permission = permission;
  const response = await api.patch(`/diagrams/${diagramId}/share/link`, body);
  return response.data;
};

export const redeemShareLink = async (token) => {
  const response = await api.post(`/diagrams/share-links/${token}/redeem`, {});
  return response.data;
};

export const requestAccess = async (diagramId, message) => {
  const response = await api.post(`/diagrams/${diagramId}/access-requests`, { message });
  return response.data;
};

export const approveAccessRequest = async (diagramId, userId, permission = 'edit') => {
  const response = await api.post(`/diagrams/${diagramId}/access-requests/${userId}/approve`, { permission });
  return response.data;
};

export const denyAccessRequest = async (diagramId, userId) => {
  const response = await api.post(`/diagrams/${diagramId}/access-requests/${userId}/deny`, {});
  return response.data;
};