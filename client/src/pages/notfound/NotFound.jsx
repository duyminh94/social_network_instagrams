// pages/notfound/NotFound.jsx
// Trang 404 — hiện khi URL không khớp bất kỳ route nào đã khai báo
//
// Vì sao cần: AppRoutes trước đây không có route `path="*"`, nên URL sai
//   từ 2 đoạn trở lên (vd /abc/xyz) render ra trang rỗng, không báo gì cả
//
// Trang này nằm trong MainLayout nên vẫn giữ Sidebar / MobileNav,
// người dùng có thể điều hướng tiếp thay vì bị kẹt

import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useLanguage } from '../../i18n/LanguageContext'
import Button from '../../components/common/Button'

export default function NotFound() {
  var { t } = useLanguage()

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        minHeight: '60vh',
        px: 2.5,
        py: 5,
      }}
    >
      {/* Số 404 cỡ lớn, làm mờ để không lấn át dòng tiêu đề bên dưới */}
      <Typography
        sx={{
          fontSize: 72,
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: '-2px',
          color: 'text.secondary',
          opacity: .35,
          mb: 1,
        }}
      >
        404
      </Typography>

      <Typography component="h1" sx={{ fontSize: 22, fontWeight: 600, mb: 1.25 }}>
        {t.notFound.title}
      </Typography>

      <Typography sx={{ fontSize: 14, lineHeight: 1.6, maxWidth: 380, mb: 3, color: 'text.secondary' }}>
        {t.notFound.message}
      </Typography>

      <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Button component={RouterLink} to="/">
          {t.notFound.backHome}
        </Button>
        <Button component={RouterLink} to="/explore" variant="outline-secondary">
          {t.notFound.explore}
        </Button>
      </Box>
    </Box>
  )
}
