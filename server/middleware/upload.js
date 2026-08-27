// middleware/upload.js
// Nhận file upload từ multipart/form-data qua multer
//
// Dùng memoryStorage: file được giữ trong RAM (req.file.buffer) thay vì ghi thẳng ra disk
//   → Controller đọc buffer và gọi uploadToCloudinary()
//   → Nếu dùng diskStorage thì phải đọc lại file từ disk — tốn hơn
//
// Giới hạn kích thước:
//   - Ảnh: tối đa 10MB (sau khi compress xuống còn nhỏ hơn)
//   - Video: tối đa 100MB
//   - Upload chung dùng giới hạn 100MB; nếu cần strict hơn thì tạo 2 instance riêng
//
// FIX: thêm fileFilter — chỉ chấp nhận ảnh và video đã biết
//      Trước đây không có fileFilter → file PDF, exe, zip... vẫn upload được

const multer = require('multer');

// Danh sách MIME type được chấp nhận
var ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
var ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
var ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/x-m4a'];
var ALLOWED_TYPES = ALLOWED_IMAGE_TYPES.concat(ALLOWED_VIDEO_TYPES).concat(ALLOWED_AUDIO_TYPES);

// Lưu file tạm trong bộ nhớ (buffer), sau đó ghi ra thư mục uploads/ local hoặc Cloudinary
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    // 100MB — đủ cho video ngắn
    // Với ảnh, client đã validate ≤ 10MB; server compress trước khi lưu
    fileSize: 100 * 1024 * 1024,
  },
  fileFilter: function (req, file, cb) {
    // Chỉ chấp nhận MIME type đã biết — từ chối mọi loại file lạ
    if (ALLOWED_TYPES.indexOf(file.mimetype) !== -1) {
      cb(null, true);
    } else {
      cb(new Error(
        'Loại file không được hỗ trợ: ' + file.mimetype +
        '. Chỉ chấp nhận ảnh (JPEG, PNG, WebP, GIF) và video (MP4, MOV, WebM).'
      ));
    }
  },
});

module.exports = upload;
