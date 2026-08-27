// pages/post/PostDetail.jsx
// Trang xem chi tiết 1 bài viết theo URL /p/:postId
//
// Dùng cho deep-link — ví dụ khi bấm vào thông báo like/comment thì mở đúng bài
// (trước đây không có route này nên thông báo chỉ nhảy về trang cá nhân người gửi).
// Cách làm: fetch bài theo id rồi tái sử dụng PostModal để hiển thị.

import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getPost } from '../../features/post/postAPI'
import PostModal from '../../components/post/PostModal'
import Spinner from '../../components/common/Spinner'
import { useLanguage } from '../../i18n/LanguageContext'

export default function PostDetail() {
  var { postId } = useParams()
  var navigate = useNavigate()
  var { t } = useLanguage()

  var { data, isLoading, isError } = useQuery({
    queryKey: ['post', postId],
    queryFn: function () { return getPost(postId).then(function (r) { return r.data }) },
    enabled: !!postId,
    retry: false,
  })

  function handleClose() {
    // Có lịch sử điều hướng thì quay lại, không thì về trang chủ
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  if (isLoading) {
    return <Spinner fullPage />
  }

  // Bài không tồn tại / bị xóa / không có quyền xem → báo gọn
  if (isError || !data || !data.post) {
    return (
      <div style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--ink-muted)' }}>
        {(t.post && t.post.notFound) || 'Không tìm thấy bài viết'}
      </div>
    )
  }

  // onDelete cũng đóng trang vì bài đã không còn để xem
  return (
    <>
      {/* Nút đóng nổi ở góc trên-trái — chỉ có ở trang chi tiết /p/:postId.
          z-index 1200 để nằm trên overlay của PostModal (1050). */}
      <button
        type="button"
        onClick={handleClose}
        aria-label={(t.common && t.common.close) || 'Đóng'}
        style={{
          position: 'fixed', top: 16, left: 16, zIndex: 1200,
          width: 40, height: 40, borderRadius: '50%',
          border: 'none', cursor: 'pointer',
          background: 'rgba(0, 0, 0, 0.55)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>

      <PostModal post={data.post} onClose={handleClose} onDelete={handleClose} />
    </>
  )
}
