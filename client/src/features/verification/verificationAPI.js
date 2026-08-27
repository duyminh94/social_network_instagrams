// features/verification/verificationAPI.js
// Gọi API yêu cầu cấp tích xanh (user) và xử lý yêu cầu (admin)
import api from '../../services/api'

// --- User ---
// Kiểm tra điều kiện đủ xin tích xanh
export function checkVerifyEligibility() {
  return api.get('/verification/check')
}

// Gửi yêu cầu OTP về email (nếu đủ điều kiện)
export function requestVerifyOtp() {
  return api.post('/verification/request-otp')
}

// Xác nhận OTP → cấp tích xanh
export function confirmVerifyOtp(otp) {
  return api.post('/verification/confirm-otp', { otp: otp })
}

// Lấy trạng thái yêu cầu của chính mình (giữ lại cho compat)
export function getMyVerification() {
  return api.get('/verification/me')
}

// --- Admin ---
// Danh sách yêu cầu (status: 'pending' | 'processed')
export function getVerificationRequests(status, page, limit) {
  return api.get('/admin/verifications', { params: { status: status, page: page, limit: limit } })
}

// Duyệt hoặc từ chối một yêu cầu
export function handleVerificationRequest(id, action, note) {
  return api.patch('/admin/verifications/' + id, { action: action, note: note })
}

// Thu hồi tích xanh của một user (dùng lại endpoint untrust sẵn có), kèm lý do
export function revokeVerification(userId, reason) {
  return api.patch('/admin/users/' + userId + '/untrust', { reason: reason })
}
