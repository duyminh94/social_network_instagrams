import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { useLanguage } from '../../i18n/LanguageContext'
import CommentItem from './CommentItem'
import Box from '@mui/material/Box'
import { CommentSkeleton } from '../common/Skeletons'
import { staggerIn } from '../../theme/animations'

// canPin: chỉ chủ bài viết mới thấy nút Ghim trên từng bình luận
// onPinChanged: ghim xong thì báo lên PostModal để fetch lại (bình luận ghim được đưa lên đầu)
export default function CommentList({ postId, refreshKey, onReply, onClose, canPin = false, onPinChanged }) {
  var { t } = useLanguage()
  const { data, isLoading } = useQuery({
    queryKey: ['comments', postId, refreshKey],
    queryFn: () => api.get(`/comments/post/${postId}`).then((r) => r.data),
    enabled: !!postId,
  })

  if (isLoading) return <CommentSkeleton />

  const comments = data?.comments || data || []

  if (comments.length === 0) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: 'var(--ig-text-light)', fontSize: 13 }}>
        {t.comment.empty}
      </div>
    )
  }

  return (
    <div>
      {comments.map(function (comment, i) {
        return (
          // Bọc thêm một lớp chỉ để chạy hiệu ứng so le — không đụng vào CommentItem
          <Box key={comment._id} sx={staggerIn(i, { step: 30, maxDelay: 200 })}>
            <CommentItem
              comment={comment}
              refreshKey={refreshKey}
              onReply={onReply}
              onClose={onClose}
              canPin={canPin}
              onPinChanged={onPinChanged}
            />
          </Box>
        )
      })}
    </div>
  )
}
