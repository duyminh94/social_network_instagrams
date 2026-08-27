// models/Comment.js
// Bình luận và reply lồng nhau trên bài viết
//
// parentId=null: comment gốc
// parentId=ObjectId: đây là reply của comment có id đó
// Chỉ hỗ trợ 1 cấp reply (reply của reply không được xử lý)
//
// isDeleted=true: xóa mềm — content vẫn còn trong DB
// deletedBy: admin xóa vi phạm thì lưu id admin, chủ comment tự xóa thì null

const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    postId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // parentId: trỏ về comment cha nếu là reply, null nếu là comment gốc
    parentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
    content:    { type: String, required: true },
    likesCount: { type: Number, default: 0 },
    isDeleted:  { type: Boolean, default: false },
    deletedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

commentSchema.index({ postId: 1, parentId: 1, isDeleted: 1 });

module.exports = mongoose.model('Comment', commentSchema);
