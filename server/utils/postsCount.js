// utils/postsCount.js
// Cập nhật số bài viết hiển thị trên trang cá nhân (User.postsCount).
//
// Invariant: postsCount chỉ đếm bài ĐANG hiện công khai trên profile.
//   - Bài lưu trữ (isArchived) đã bị archivePost trừ ra ngay lúc lưu trữ
//   - Bài xoá mềm / bị admin ẩn cũng không được tính
//
// Vì bài lưu trữ đã nằm ngoài số đếm, mọi thao tác ẩn/hiện bài sau đó đều phải
// bỏ qua nó. Trừ thêm lần nữa thì postsCount xuống âm, cộng thêm thì dôi ra.
// Gom về một hàm để mọi nhánh ẩn/hiện bài (user tự xoá, admin xoá, admin ẩn,
// admin bỏ ẩn, xử lý báo cáo) dùng chung một quy tắc.

const User = require('../models/User');

// KHÔNG dùng cho archivePost / unarchivePost: hai hàm đó chính là nơi bài đi vào và
// đi ra khỏi số đếm, chúng set isArchived rồi mới cập nhật nên hàm này sẽ bỏ qua nhầm.
//
// post  : document bài viết (cần có userId và isArchived)
// delta : -1 khi bài rời khỏi profile, +1 khi bài quay lại profile
async function applyPostsCountDelta(post, delta) {
  if (post.isArchived) return;

  await User.findByIdAndUpdate(post.userId, { $inc: { postsCount: delta } });
}

module.exports = { applyPostsCountDelta };
