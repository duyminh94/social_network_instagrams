import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { useLanguage } from '../../i18n/LanguageContext'
import CommentItem from './CommentItem'
import Spinner from '../common/Spinner'

export default function CommentList({ postId, refreshKey, onReply, onClose }) {
  var { t } = useLanguage()
  const { data, isLoading } = useQuery({
    queryKey: ['comments', postId, refreshKey],
    queryFn: () => api.get(`/comments/post/${postId}`).then((r) => r.data),
    enabled: !!postId,
  })

  if (isLoading) return <Spinner size="sm" />

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
      {comments.map(function (comment) {
        return <CommentItem key={comment._id} comment={comment} postId={postId} refreshKey={refreshKey} onReply={onReply} onClose={onClose} />
      })}
    </div>
  )
}
