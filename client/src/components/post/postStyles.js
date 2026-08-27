// components/post/postStyles.js
// Các object sx dùng chung giữa PostCard và PostModal
//
// Tách riêng vì hai component cùng hiển thị một bài viết với cùng bộ nút
// tương tác — trước đây PostModal phải import ngược CSS module của PostCard,
// khiến xoá file bên này là gãy bên kia

// Nút qua/lại của carousel ảnh — dùng chung cho cả hai bên trái phải
export var mediaNavSx = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  width: 34,
  height: 34,
  border: 'none',
  borderRadius: '50%',
  bgcolor: 'rgba(255,255,255,.86)',
  color: '#333',
  fontSize: 34,
  lineHeight: '28px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 2px 10px rgba(0,0,0,.22)',
  '&:hover': { bgcolor: '#fff' },
}

// Nút like / comment / lưu bài
export var actionBtnSx = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  p: .75,
  color: 'text.primary',
  display: 'inline-flex',
  alignItems: 'center',
  gap: .875,
  transition: 'transform .15s',
  // Nhấn xuống thì phóng to một nhịp, cho cảm giác bấm thật
  '&:active': { transform: 'scale(1.3)' },
}

// Khi đã like: tô đỏ icon trái tim
export var likedSx = {
  '& svg': { fill: '#ff3b5c', color: '#ff3b5c' },
}

// Con số bên cạnh icon like / comment
export var countSx = {
  fontSize: 15,
  fontWeight: 800,
  lineHeight: 1,
}
