// utils/cloudinary.js
// Upload file lên Cloudinary, tự động fallback lưu local nếu Cloudinary lỗi
//
// Thứ tự xử lý:
//   1. Validate MIME type — từ chối file không biết ngay tại đây (defense in depth)
//   2. Nén ảnh bằng Sharp (resize tối đa 1080px, WebP quality 80)
//   3. Thử upload lên Cloudinary
//   4. Nếu lỗi (mất mạng, sai key, quota...) → lưu vào server/uploads/ local
//
// Trả về { secure_url, public_id } trong cả 2 trường hợp — controllers không cần sửa
//
// Ảnh: JPEG/PNG/WebP → nén + WebP, GIF → giữ nguyên
// Video: không nén, upload/lưu thẳng
//
// FIX: trước đây mọi MIME không phải ảnh đều được xử lý như video và fallback về .mp4
//      Giờ chỉ chấp nhận video đã biết, MIME lạ sẽ throw lỗi

const cloudinary = require('cloudinary').v2;
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

var IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
var VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
var AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/x-m4a'];
var VIDEO_EXT_MAP = { 'video/mp4': '.mp4', 'video/quicktime': '.mov', 'video/webm': '.webm' };
var AUDIO_EXT_MAP = { 'audio/mpeg': '.mp3', 'audio/mp3': '.mp3', 'audio/mp4': '.m4a', 'audio/aac': '.aac', 'audio/ogg': '.ogg', 'audio/wav': '.wav', 'audio/webm': '.webm', 'audio/x-m4a': '.m4a' };

var UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Nén ảnh: resize tối đa 1080px, chuyển WebP quality 80
async function compressImage(buffer, mimetype) {
  var transformer = sharp(buffer);
  var metadata = await transformer.metadata();

  if (metadata.width > 1080 || metadata.height > 1080) {
    transformer = transformer.resize(1080, 1080, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  if (mimetype === 'image/gif') {
    return { buffer: await transformer.gif().toBuffer(), ext: '.gif' };
  }

  return { buffer: await transformer.webp({ quality: 80 }).toBuffer(), ext: '.webp' };
}

// Upload buffer lên Cloudinary
function uploadToCloudinaryCloud(buffer, folder, resourceType) {
  return new Promise(function (resolve, reject) {
    var stream = cloudinary.uploader.upload_stream(
      { folder: folder, resource_type: resourceType },
      function (error, result) {
        if (error) { reject(error); } else { resolve(result); }
      }
    );
    stream.end(buffer);
  });
}

// Fallback: lưu buffer vào thư mục local server/uploads/
function saveLocal(buffer, folder, ext) {
  return new Promise(function (resolve, reject) {
    var randomName = crypto.randomBytes(16).toString('hex') + ext;
    var folderPath = path.join(UPLOADS_DIR, folder);
    var filePath = path.join(folderPath, randomName);

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    fs.writeFile(filePath, buffer, function (err) {
      if (err) {
        reject(err);
      } else {
        var baseUrl = process.env.BASE_URL || ('http://localhost:' + (process.env.PORT || 5001));
        resolve({
          secure_url: baseUrl + '/uploads/' + folder + '/' + randomName,
          public_id: folder + '/' + randomName,
        });
      }
    });
  });
}

async function uploadToCloudinary(fileBuffer, folder, mimetype) {
  // Normalize: cắt codec info để so sánh đúng
  // VD: "video/webm;codecs=vp9,opus" → "video/webm"
  var baseMime = (mimetype || '').split(';')[0].trim().toLowerCase();

  var isImage = IMAGE_TYPES.indexOf(baseMime) !== -1;
  var isVideo = VIDEO_TYPES.indexOf(baseMime) !== -1;
  var isAudio = AUDIO_TYPES.indexOf(baseMime) !== -1;

  if (!isImage && !isVideo && !isAudio) {
    throw new Error('Loại file không được hỗ trợ: ' + mimetype);
  }

  // Chuẩn bị buffer và extension
  var finalBuffer, ext, resourceType;

  if (isImage) {
    var result = await compressImage(fileBuffer, baseMime);
    finalBuffer = result.buffer;
    ext = result.ext;
    resourceType = 'image';
  } else if (isAudio) {
    // Audio — giữ nguyên, Cloudinary dùng resource_type 'video' cho cả audio
    finalBuffer = fileBuffer;
    ext = AUDIO_EXT_MAP[baseMime] || '.mp3';
    resourceType = 'video';
  } else {
    // Video — giữ nguyên, không nén
    finalBuffer = fileBuffer;
    ext = VIDEO_EXT_MAP[baseMime] || '.webm';
    resourceType = 'video';
  }

  // Thử Cloudinary trước, lỗi thì lưu local
  try {
    return await uploadToCloudinaryCloud(finalBuffer, folder, resourceType);
  } catch (cloudinaryError) {
    console.warn('Cloudinary lỗi, chuyển sang lưu local:', cloudinaryError.message);
    return saveLocal(finalBuffer, folder, ext);
  }
}

// Xóa file khỏi Cloudinary hoặc local tùy nguồn gốc URL
//
// Cloudinary URL: https://res.cloudinary.com/{cloud}/{type}/upload/v{ver}/{public_id}.{ext}
//   → trích public_id, gọi cloudinary.uploader.destroy
// Local URL:      http://localhost:5001/uploads/{folder}/{file}
//   → map sang đường dẫn thực, gọi fs.unlinkSync
// URL ngoài (preset audio, v.v.): bỏ qua
async function deleteFromCloudinary(url, resourceType) {
  if (!url) return;

  var localBase = process.env.BASE_URL || ('http://localhost:' + (process.env.PORT || 5001));

  if (url.includes('res.cloudinary.com')) {
    // Trích public_id từ URL Cloudinary
    // Dạng: .../upload/v1234567890/reels/abc.webm  →  reels/abc
    var uploadIdx = url.indexOf('/upload/');
    if (uploadIdx === -1) return;
    var afterUpload = url.slice(uploadIdx + 8); // bỏ '/upload/'
    afterUpload = afterUpload.replace(/^v\d+\//, ''); // bỏ version prefix vd: v1234567890/
    var publicId = afterUpload.replace(/\.[^.]+$/, ''); // bỏ extension

    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType || 'video' });
    } catch (e) {
      console.warn('Cloudinary delete lỗi (' + publicId + '):', e.message);
    }

  } else if (url.startsWith(localBase)) {
    // File local: cắt base URL lấy path tương đối rồi map sang thư mục uploads/
    var relativePath = url.slice(localBase.length); // vd: /uploads/reels/abc.webm
    var fullPath = path.join(__dirname, '..', relativePath);
    try {
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    } catch (e) {
      console.warn('Local delete lỗi (' + fullPath + '):', e.message);
    }
  }
  // URL ngoài (Pixabay, v.v.) → không làm gì
}

module.exports = { uploadToCloudinary, deleteFromCloudinary };
