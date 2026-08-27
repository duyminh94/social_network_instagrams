// components/common/ConfirmModal.jsx
// Modal xác nhận hành động với 2 nút Huỷ / Xác nhận — dựng trên Dialog của MUI
//
// Props giữ nguyên như bản cũ để 6 chỗ đang gọi không phải sửa:
//   message   - nội dung câu hỏi
//   onConfirm - bấm nút xác nhận
//   onCancel  - bấm nút huỷ, bấm ra ngoài, hoặc nhấn phím Esc
//
// Dialog của MUI làm sẵn những thứ bản cũ phải tự viết tay:
//   - Bấm ra ngoài và nhấn Esc đều gọi onClose
//   - Khoá focus trong modal, trả focus về chỗ cũ khi đóng
//   - Khoá cuộn trang nền
//
// Component chỉ được render khi cần hiện (dạng {show && <ConfirmModal />}),
//   nên open mặc định là true. Vẫn nhận prop open để chỗ nào muốn giữ
//   component trong cây và bật/tắt bằng state thì dùng được

import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Typography from '@mui/material/Typography'
import { useLanguage } from '../../i18n/LanguageContext'
import Button from './Button'

export default function ConfirmModal({ message, onConfirm, onCancel, open = true }) {
  var { t } = useLanguage()

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="xs"
      fullWidth
      // Giữ hộp thoại nhỏ gọn như bản CSS cũ (max-width 320px)
      slotProps={{ paper: { sx: { maxWidth: 320 } } }}
    >
      <DialogContent sx={{ pt: 4, pb: 2 }}>
        <Typography
          sx={{ fontSize: 15, fontWeight: 500, textAlign: 'center', lineHeight: 1.5 }}
        >
          {message}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 1.25 }}>
        <Button variant="outline-secondary" fullWidth onClick={onCancel}>
          {t.common.cancel}
        </Button>
        {/* Nút xác nhận dùng tông đỏ vì luôn gắn với hành động khó hoàn tác:
            xoá bài, chặn user, đăng xuất */}
        <Button variant="danger" fullWidth onClick={onConfirm}>
          {t.common.confirm}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
