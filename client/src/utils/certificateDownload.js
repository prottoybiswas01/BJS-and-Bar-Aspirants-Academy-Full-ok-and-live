import api from '../services/api';

export async function downloadCertificate(certificateId) {
  const response = await api.get(`/certificates/${encodeURIComponent(certificateId)}/download`, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = `Certificate-${certificateId}.pdf`;
    link.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}
