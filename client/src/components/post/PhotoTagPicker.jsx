// components/post/PhotoTagPicker.jsx
// Dialog tìm và chọn người để gắn thẻ vào vị trí vừa bấm trên ảnh.
//
// Mở dialog là đã có sẵn gợi ý (gọi /users/search với q rỗng, giống Notifications),
// gõ thêm thì lọc dần. Debounce 400ms bám theo cách Chat.jsx đang làm.
//
// excludeUserIds: những người đã được gắn thẻ trên chính tấm ảnh này. Server chặn
// gắn trùng bằng lỗi 400, nên lọc sẵn ở đây để người dùng không bấm vào ngõ cụt.

import { useState, useEffect } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import TextField from '@mui/material/TextField'
import Box from '@mui/material/Box'
import api from '../../services/api'
import Avatar from '../common/Avatar'
import Spinner from '../common/Spinner'
import { useLanguage } from '../../i18n/LanguageContext'

export default function PhotoTagPicker({ open, onClose, onSelect, excludeUserIds }) {
  var { t } = useLanguage()
  var [keyword, setKeyword] = useState('')
  var [users, setUsers] = useState([])
  var [loading, setLoading] = useState(false)

  // Mỗi lần mở lại thì trả ô tìm kiếm về rỗng, tránh giữ từ khoá của lần gắn thẻ trước
  useEffect(function () {
    if (open) setKeyword('')
  }, [open])

  useEffect(function () {
    if (!open) return undefined

    var timer = setTimeout(function () {
      setLoading(true)
      api.get('/users/search', { params: { q: keyword, limit: 10 } })
        .then(function (res) {
          setUsers(res.data?.users || [])
        })
        .catch(function (error) {
          console.error('Tìm người dùng thất bại', error)
          setUsers([])
        })
        .finally(function () {
          setLoading(false)
        })
    }, 400)

    return function () { clearTimeout(timer) }
  }, [keyword, open])

  // Set cho tra cứu O(1) thay vì includes() trên mảng ở mỗi dòng kết quả
  var excludedIds = new Set(excludeUserIds || [])
  var selectableUsers = users.filter(function (user) { return !excludedIds.has(user._id) })

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t.post.tagPickerTitle}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          margin="dense"
          size="small"
          placeholder={t.post.tagSearchPlaceholder}
          value={keyword}
          onChange={function (e) { setKeyword(e.target.value) }}
        />

        <Box sx={{ mt: 1, maxHeight: 320, overflowY: 'auto' }}>
          {loading ? (
            <Spinner />
          ) : selectableUsers.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 3, color: 'text.secondary', fontSize: 14 }}>
              {t.post.tagNoResult}
            </Box>
          ) : (
            selectableUsers.map(function (user) {
              return (
                <Box
                  key={user._id}
                  onClick={function () { onSelect(user) }}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5,
                    p: 1, borderRadius: 1, cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Avatar src={user.avatarUrl} username={user.username} size="sm" />
                  <Box sx={{ minWidth: 0 }}>
                    <Box sx={{ fontSize: 14, fontWeight: 600 }}>{user.username}</Box>
                    <Box sx={{ fontSize: 12, color: 'text.secondary' }}>{user.fullName}</Box>
                  </Box>
                </Box>
              )
            })
          )}
        </Box>
      </DialogContent>
    </Dialog>
  )
}
