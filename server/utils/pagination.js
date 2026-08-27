// utils/pagination.js
// Chuẩn hoá tham số phân trang lấy từ query string.
// Mục đích: chặn 2 input xấu mà client có thể gửi:
//   - page âm  → skip âm → MongoDB ném BadValue (lỗi 500)
//   - limit quá lớn (vd 999999) → kéo cả nghìn document, query nặng
//
// page  ≥ 1                (mặc định 1)
// limit trong [1, MAX_LIMIT] (mặc định = defaultLimit truyền vào, hoặc 20)

const MAX_LIMIT = 50;

function getPagination(req, defaultLimit) {
  var def = defaultLimit || 20;

  var page = parseInt(req.query.page, 10) || 1;
  if (page < 1) page = 1;

  var limit = parseInt(req.query.limit, 10) || def;
  if (limit < 1) limit = def;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  var skip = (page - 1) * limit;
  return { page: page, limit: limit, skip: skip };
}

module.exports = { getPagination, MAX_LIMIT };
