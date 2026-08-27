// utils/validators.js
// Tập hợp hàm validate dùng chung cho form (react-hook-form)
//
// Cách dùng với react-hook-form:
//   {...register('email', { validate: isValidEmail })}
//
// Hoặc dùng độc lập:
//   if (!isValidEmail(value)) toast.error('Email không hợp lệ')

// Kiểm tra email hợp lệ
// Hợp lệ: user@example.com | Không hợp lệ: "abc", "abc@", "@gmail"
export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

// Kiểm tra mật khẩu: phải có ít nhất 6 ký tự
export function isValidPassword(value) {
  return value != null && value.length >= 6
}

// Kiểm tra username: chỉ gồm chữ thường, số, dấu _ và . (3-30 ký tự)
// Hợp lệ: "nguyen_minh", "user.123" | Không hợp lệ: "AB", "user name", "ab"
export function isValidUsername(value) {
  return value != null && /^[a-z0-9_.]{3,30}$/.test(value)
}
