// seedMaster.js
// Chạy toàn bộ seed theo đúng thứ tự trong 1 lệnh
//
// Chạy: node server/seedMaster.js
//
// Thứ tự:
//   1. seedAll.js          — xóa sạch + tạo 10 users, posts, chats cơ bản
//   2. seedReels.js        — tạo reels + likes/comments/reports
//   3. seedAptech.js       — tạo tài khoản aptech_vietnam + reels quảng cáo
//   4. seedAptechChat.js   — tạo các cuộc chat tuyển sinh với sinh viên
//   5. seedExtraUsers.js   — thêm 20 users + group chats
//   6. seedMoreInteractions.js — thêm likes, comments, follows phong phú
//   7. seedBulkUsers.js    — thêm 200 users + follow graph + posts; dựng tài khoản test tích xanh
//   8. seedVerifications.js    — lịch sử tích xanh "approved" theo luồng OTP mới

var { execSync } = require('child_process')
var path = require('path')

var files = [
  'seedAll.js',
  'seedReels.js',
  'seedAptech.js',
  'seedAptechChat.js',
  'seedExtraUsers.js',
  'seedMoreInteractions.js',
  'seedBulkUsers.js',
  'seedVerifications.js',
  'seedFollowers.js'
]

var line = '='.repeat(52)

console.log('\n' + line)
console.log('  SEED MASTER — Chạy tất cả ' + files.length + ' file seed')
console.log(line)

for (var i = 0; i < files.length; i++) {
  var file = files[i]
  console.log('\n[' + (i + 1) + '/' + files.length + '] ' + file + '...')
  try {
    execSync('node ' + path.join(__dirname, file), { stdio: 'inherit' })
  } catch (err) {
    console.error('\nLỗi khi chạy ' + file + ':')
    console.error(err.message)
    process.exit(1)
  }
}

console.log('\n' + line)
console.log('  TẤT CẢ SEED HOÀN TẤT!')
console.log(line + '\n')
