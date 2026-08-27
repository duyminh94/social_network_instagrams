// theme/muiTheme.js
// Tạo theme MUI khớp với bộ màu sẵn có của app
//
// Bài toán: app đang đổi sáng/tối bằng cách gắn data-theme lên thẻ <html>,
//   còn MUI lại quản lý màu bằng theme object riêng của nó.
//   Nếu để 2 hệ chạy rời nhau thì component MUI luôn hiện màu sáng mặc định
//   trong khi phần còn lại của trang đang tối
//
// Cách nối: hàm này nhận mode ('dark' | 'light') lấy từ ThemeContext,
//   trả về theme MUI dùng đúng bộ token trong tokens.js
//   → một nguồn điều khiển duy nhất cho cả 2 hệ

import { createTheme } from '@mui/material/styles'
import { brand, darkTokens, lightTokens, radius } from './tokens'

export default function createAppTheme(mode) {
  // Chọn bảng màu theo chế độ đang bật
  var c = mode === 'light' ? lightTokens : darkTokens

  return createTheme({
    palette: {
      // mode báo cho MUI biết nên tự sinh màu phái sinh theo hướng sáng hay tối
      mode: mode,
      primary: {
        main: brand.primary,
        dark: brand.primaryDark,
      },
      // Giữ đúng sắc đỏ đang dùng trong CSS Module cho các hành động nguy hiểm
      // (xoá bài, chặn user, đăng xuất). Mặc định của MUI là #d32f2f, lệch tông
      error: {
        main: brand.danger,
        dark: brand.dangerDark,
      },
      background: {
        default: c.bg,
        paper: c.surface,
      },
      text: {
        primary: c.text,
        secondary: c.textMuted,
      },
      divider: c.border,
    },

    shape: {
      borderRadius: radius.base,
    },

    // Nâng toàn bộ lớp nổi của MUI lên trên CSS Module cũ.
    // Lý do: MUI mặc định modal ở 1300, trong khi các overlay viết tay trong
    //   dự án đang dùng tới 20000 → Dialog của MUI sẽ bị chính modal cha che.
    //   Giữ nguyên thứ tự tương đối của MUI (modal < snackbar < tooltip)
    // Đây là biện pháp cho giai đoạn chuyển tiếp; khi CSS Module được thay hết
    //   thì trả về mặc định của MUI
    zIndex: {
      modal: 20010,
      snackbar: 20020,
      tooltip: 20030,
    },

    typography: {
      // Giữ đúng font và cỡ chữ gốc, nếu không component MUI sẽ to hơn
      // phần CSS Module xung quanh (MUI mặc định 16px, app dùng 14px)
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 14,
      button: {
        // Bỏ viết hoa toàn bộ — mặc định của MUI, không hợp phong cách Instagram
        textTransform: 'none',
        fontWeight: 600,
      },
    },

    components: {
      // Nút: bỏ shadow mặc định cho phẳng giống UI hiện tại
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
      },
      // Thẻ và popup dùng bo góc lớn 12px như --ig-radius-lg
      MuiPaper: {
        styleOverrides: {
          rounded: {
            borderRadius: radius.large,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: radius.large,
          },
        },
      },
    },
  })
}
