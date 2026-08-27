// components/common/ReportModal.jsx
// Modal báo cáo vi phạm dùng cho user — dựng trên Dialog của MUI
//
// Props giữ nguyên như bản cũ để 6 chỗ đang gọi không phải sửa:
//   targetType - 'user' | 'post' | 'reel' | 'story' | 'comment'
//   targetId   - id của đối tượng bị báo cáo
//   onClose    - đóng modal
//   onReported - gọi sau khi gửi báo cáo thành công
//
// Danh sách lý do dùng RadioGroup của MUI thay cho <input type="radio"> viết tay:
//   MUI tự lo phần nhãn bấm được, trạng thái focus và điều hướng bằng bàn phím

import { useState } from 'react'
import toast from 'react-hot-toast'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import Radio from '@mui/material/Radio'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import api from '../../services/api'
import { useLanguage } from '../../i18n/LanguageContext'
import Button from './Button'

export default function ReportModal({ targetId, targetType, onClose, onReported }) {
  var { t } = useLanguage()
  var [reason, setReason] = useState('spam')
  var [description, setDescription] = useState('')
  var [loading, setLoading] = useState(false)

  var reasons = [
    { value: 'spam', label: t.report.spam },
    { value: 'harassment', label: t.report.harassment },
    { value: 'inappropriate', label: t.report.inappropriate },
    { value: 'fake', label: t.report.fake },
    { value: 'violence', label: t.report.violence },
    { value: 'other', label: t.report.other },
  ]

  async function handleSubmit(e) {
    e.preventDefault()
    if (!targetId || !targetType || loading) return

    setLoading(true)
    try {
      await api.post('/reports', {
        targetId: targetId,
        targetType: targetType,
        reason: reason,
        description: description.trim(),
      })
      toast.success(t.report.success)
      if (onReported) onReported()
      onClose()
    } catch (err) {
      toast.error(err?.response?.data?.message || t.report.error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        <Typography component="span" sx={{ fontSize: 16, fontWeight: 600 }}>
          {t.report.title}
        </Typography>
        <IconButton onClick={onClose} size="small" aria-label={t.report.cancel}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      {/* Bọc form quanh cả nội dung và nút để nút submit vẫn kích hoạt được form */}
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent dividers>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1.5 }}>
            {t.report.helpText}
          </Typography>

          <RadioGroup
            value={reason}
            onChange={function (e) { setReason(e.target.value) }}
          >
            {reasons.map(function (item) {
              return (
                <FormControlLabel
                  key={item.value}
                  value={item.value}
                  control={<Radio size="small" />}
                  label={item.label}
                  slotProps={{ typography: { sx: { fontSize: 14 } } }}
                />
              )
            })}
          </RadioGroup>

          <TextField
            value={description}
            onChange={function (e) { setDescription(e.target.value) }}
            placeholder={t.report.descriptionPlaceholder}
            multiline
            rows={3}
            fullWidth
            size="small"
            slotProps={{ htmlInput: { maxLength: 300 } }}
            // helperText hiển thị bộ đếm ký tự, thay cho div .count viết tay
            helperText={description.length + ' / 300'}
            sx={{ mt: 1.5 }}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, gap: 1.25 }}>
          <Button variant="outline-secondary" fullWidth onClick={onClose}>
            {t.report.cancel}
          </Button>
          <Button type="submit" variant="danger" fullWidth loading={loading}>
            {loading ? t.report.submitting : t.report.submit}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
