// components/post/SaveToCollectionModal.jsx
// Dialog chọn bộ sưu tập để lưu bài viết / reel
//
// Mở từ menu ba chấm của PostCard và PostModal.
// Có 2 trường hợp, phân biệt bằng prop isSaved:
//   - Chưa lưu  → POST /saved với collectionId đã chọn
//   - Đã lưu    → PATCH /saved/:id để chuyển sang bộ sưu tập khác
// Tách riêng 2 API vì POST /saved trả 400 khi nội dung đã được lưu trước đó.

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import TextField from '@mui/material/TextField'
import Button from '../common/Button'
import Spinner from '../common/Spinner'
import { useLanguage } from '../../i18n/LanguageContext'
import {
  getCollections,
  createCollection,
  saveToCollection,
  moveSavedItem,
} from '../../features/saved/savedAPI'

export default function SaveToCollectionModal({
  targetId,
  targetType = 'post',
  isSaved = false,
  onClose,
  onSaved,
}) {
  var { t } = useLanguage()
  var queryClient = useQueryClient()

  // Ô nhập tên bộ sưu tập mới — để rỗng nghĩa là user chỉ chọn bộ sưu tập có sẵn
  const [newName, setNewName] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['collections'],
    queryFn: function () {
      return getCollections().then(function (r) { return r.data })
    },
  })

  const collections = data?.collections || []

  // Lưu vào bộ sưu tập đã chọn — hoặc chuyển bộ sưu tập nếu nội dung đã được lưu
  const saveMutation = useMutation({
    mutationFn: function (collectionId) {
      if (isSaved) {
        return moveSavedItem(targetId, collectionId, targetType)
      }
      return saveToCollection(targetId, collectionId, targetType)
    },
    onSuccess: function () {
      toast.success(t.post.savedToCollection)
      queryClient.invalidateQueries({ queryKey: ['collections'] })
      queryClient.invalidateQueries({ queryKey: ['savedPosts'] })
      onSaved?.()
      onClose()
    },
    onError: function (error) {
      toast.error(error.response?.data?.message || t.common.error)
    },
  })

  // Tạo bộ sưu tập mới rồi lưu luôn nội dung vào đó — gộp 2 bước cho đỡ thao tác
  const createMutation = useMutation({
    mutationFn: function (name) {
      return createCollection(name)
    },
    onSuccess: function (res) {
      var created = res.data?.collection
      setNewName('')
      queryClient.invalidateQueries({ queryKey: ['collections'] })
      if (created?._id) {
        saveMutation.mutate(created._id)
      }
    },
    onError: function (error) {
      toast.error(error.response?.data?.message || t.common.error)
    },
  })

  var isBusy = saveMutation.isPending || createMutation.isPending

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t.post.saveToCollection}</DialogTitle>

      <DialogContent dividers>
        {isLoading ? (
          <Spinner />
        ) : (
          <List dense>
            {collections.map(function (collection) {
              return (
                <ListItemButton
                  key={collection._id}
                  disabled={isBusy}
                  onClick={function () { saveMutation.mutate(collection._id) }}
                >
                  <ListItemText
                    primary={collection.name}
                    secondary={(collection.itemsCount || 0) + ' ' + t.post.collectionItems}
                  />
                </ListItemButton>
              )
            })}
          </List>
        )}

        {/* Tạo bộ sưu tập mới ngay trong dialog, không phải sang trang cá nhân */}
        <TextField
          fullWidth
          margin="dense"
          size="small"
          label={t.post.newCollectionName}
          value={newName}
          inputProps={{ maxLength: 50 }}
          onChange={function (e) { setNewName(e.target.value) }}
        />
      </DialogContent>

      <DialogActions>
        <Button variant="outline-secondary" onClick={onClose}>
          {t.common.cancel}
        </Button>
        <Button
          loading={isBusy}
          disabled={newName.trim().length === 0}
          onClick={function () { createMutation.mutate(newName.trim()) }}
        >
          {t.post.createAndSave}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
