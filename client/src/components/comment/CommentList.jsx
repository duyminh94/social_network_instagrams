import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { useLanguage } from '../../i18n/LanguageContext'
import CommentItem from './CommentItem'
import Box from '@mui/material/Box'
import { CommentSkeleton } from '../common/Skeletons'
import { staggerIn } from '../../theme/animations'

export default function CommentList({ postId, refreshKey, onReply, onClose }) {
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
            <CommentItem comment={comment} postId={postId} refreshKey={refreshKey} onReply={onReply} onClose={onClose} />
          </Box>
        )
      })}
    </div>
  )
}
