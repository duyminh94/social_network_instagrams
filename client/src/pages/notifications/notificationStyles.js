// pages/notifications/notificationStyles.js
// Các object sx của trang Thông báo — thay cho Notifications.module.css
//
// Trang này chạy ở 2 chế độ: trang đầy đủ (/notifications) và panel hẹp trượt ra
//   từ sidebar. Bản CSS cũ xử lý bằng cách thêm class .panelPage rồi ghi đè
//   từng thuộc tính; ở đây gom lại thành hàm makeStyles(isPanel) trả về đúng
//   bộ kích thước của chế độ đang dùng — đọc một chỗ là thấy cả 2 giá trị

// Bản CSS cũ chỉ thu nhỏ chữ ở chế độ trang đầy đủ, panel vốn đã nhỏ sẵn
var MOBILE = '@media (max-width:768px)'

export default function makeStyles(isPanel) {
  // Chỉ áp dụng cụm thu nhỏ cho mobile khi KHÔNG ở chế độ panel
  function onMobile(rules) {
    return isPanel ? {} : { [MOBILE]: rules }
  }

  return {
    page: isPanel
      ? {
          maxWidth: 'none',
          width: '100%',
          height: '100vh',
          minHeight: 0,
          m: 0,
          overflowY: 'auto',
          pt: 3.5, px: 2.75, pb: 5.5,
          color: 'text.primary',
          boxSizing: 'border-box',
        }
      : {
          maxWidth: 820,
          minHeight: '100vh',
          mx: 'auto',
          pt: 5.25, px: 4.25, pb: 10,
          color: 'text.primary',
          boxSizing: 'border-box',
          [MOBILE]: { pt: 3.5, px: 2.5, pb: 11.25 },
        },

    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 2,
    },

    headerTitle: {
      m: 0,
      fontSize: isPanel ? 24 : 34,
      fontWeight: 800,
      ...onMobile({ fontSize: 30 }),
    },

    closeBtn: {
      width: isPanel ? 34 : 44,
      height: isPanel ? 34 : 44,
      border: 'none',
      borderRadius: '50%',
      background: 'transparent',
      color: 'text.primary',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      '&:hover': { bgcolor: 'action.hover' },
      ...(isPanel ? { '& svg': { width: 22, height: 22 } } : {}),
    },

    tabs: {
      display: 'flex',
      gap: isPanel ? 1 : 1.5,
      overflowX: 'auto',
      pt: isPanel ? 2.5 : 4.25,
      pb: isPanel ? 1.75 : 2.25,
      '&::-webkit-scrollbar': { display: 'none' },
    },

    markAllBtn: {
      border: 'none',
      background: 'transparent',
      color: 'primary.main',
      fontSize: 14,
      fontWeight: 700,
      cursor: 'pointer',
      p: 0,
      mb: 2.25,
    },

    sectionTitle: {
      m: 0,
      mb: isPanel ? 2 : 2.75,
      fontSize: isPanel ? 17 : 24,
      fontWeight: 800,
    },

    notificationItem: {
      display: 'flex',
      alignItems: 'center',
      gap: isPanel ? 1.5 : 2,
      minHeight: isPanel ? 56 : 72,
      py: isPanel ? 1 : 1.25,
      cursor: 'pointer',
      '&:hover': { bgcolor: 'rgba(255,255,255,.04)' },
    },

    postThumb: {
      width: 48,
      height: 48,
      borderRadius: 1.5,
      objectFit: 'cover',
      flexShrink: 0,
    },

    deleteBtn: {
      border: 'none',
      background: 'transparent',
      color: 'text.secondary',
      fontSize: 16,
      cursor: 'pointer',
      p: .75,
    },

    securityItem: {
      display: 'flex',
      alignItems: 'center',
      gap: isPanel ? 1.75 : 2.75,
      py: isPanel ? 1.5 : 2.25,
    },

    securityIcon: {
      width: isPanel ? 48 : 72,
      height: isPanel ? 48 : 72,
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #ffd2f0, #9fffea)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      ...(isPanel ? { '& svg': { width: 22, height: 22 } } : {}),
    },

    securityText: {
      m: 0,
      fontSize: isPanel ? 14 : 21,
      fontWeight: 700,
      lineHeight: 1.35,
      ...onMobile({ fontSize: 16 }),
      '& span': { color: 'text.secondary', fontWeight: 600 },
    },

    emptyCard: {
      mt: isPanel ? 0 : 1,
      borderRadius: 2,
      bgcolor: 'rgba(255,255,255,.035)',
      textAlign: 'center',
      pt: isPanel ? 2.25 : 4.25,
      px: isPanel ? 2.25 : 3,
      pb: isPanel ? 2.75 : 5,
    },

    emptyIcon: {
      width: isPanel ? 62 : 92,
      height: isPanel ? 62 : 92,
      border: '2px solid',
      borderColor: 'text.primary',
      borderRadius: '50%',
      color: 'text.primary',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      mx: 'auto',
      mb: isPanel ? 2 : 3,
      ...(isPanel ? { '& svg': { width: 42, height: 42 } } : {}),
    },

    emptyTitle: {
      maxWidth: isPanel ? 290 : 540,
      mx: 'auto',
      mb: isPanel ? 1.25 : 2.25,
      fontSize: isPanel ? 24 : 34,
      lineHeight: 1.15,
      fontWeight: 800,
      ...onMobile({ fontSize: 28 }),
    },

    emptyDesc: {
      maxWidth: isPanel ? 330 : 620,
      mx: 'auto',
      m: 0,
      color: 'text.primary',
      fontSize: isPanel ? 14 : 20,
      lineHeight: 1.35,
      ...onMobile({ fontSize: 17 }),
    },

    suggestions: {
      mt: isPanel ? 4.25 : 8,
    },

    suggestionItem: {
      display: 'flex',
      alignItems: 'center',
      gap: isPanel ? 1.5 : 2.25,
      py: isPanel ? 1 : 1.5,
    },

    suggestionProfile: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      alignItems: 'center',
      gap: isPanel ? 1.5 : 2.25,
      border: 'none',
      background: 'transparent',
      color: 'text.primary',
      cursor: 'pointer',
      textAlign: 'left',
      p: 0,
      '& > span': { minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' },
      '& strong': { fontSize: isPanel ? 14 : 20, lineHeight: 1.15 },
      '& small': {
        color: 'text.secondary',
        fontSize: isPanel ? 13 : 18,
        lineHeight: 1.15,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      },
    },

    followBtn: {
      minWidth: isPanel ? 96 : 144,
      height: isPanel ? 34 : 52,
      border: 'none',
      borderRadius: isPanel ? 2 : 2.5,
      bgcolor: '#4f5df7',
      color: 'white',
      fontSize: isPanel ? 14 : 20,
      fontWeight: 800,
      cursor: 'pointer',
      '&:hover:not(:disabled)': { bgcolor: '#4352e8' },
      '&:disabled': { opacity: .65, cursor: 'not-allowed' },
      ...onMobile({ minWidth: 112, height: 46, fontSize: 17 }),
    },

    suggestionEmpty: {
      color: 'text.secondary',
      fontSize: 16,
      py: 1,
    },
  }
}

// Nút tab lọc thông báo — tách riêng vì phụ thuộc thêm trạng thái đang chọn
export function tabSx(isPanel, isActive) {
  return {
    height: isPanel ? 34 : 50,
    px: isPanel ? 2 : 3.5,
    border: (isPanel ? '1px' : '2px') + ' solid',
    borderColor: isActive ? 'transparent' : 'rgba(255,255,255,.28)',
    borderRadius: '999px',
    bgcolor: isActive ? '#2b2f35' : 'transparent',
    color: 'text.primary',
    fontSize: isPanel ? 13 : 18,
    fontWeight: 800,
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    ...(isPanel ? {} : { '@media (max-width:768px)': { height: 44, px: 2.75, fontSize: 16 } }),
  }
}

// Dòng chữ của một thông báo — chưa đọc thì sáng và đậm hơn để dễ phân biệt
export function notificationTextSx(isPanel, isUnread) {
  return {
    flex: 1,
    minWidth: 0,
    fontSize: isPanel ? 14 : 18,
    lineHeight: 1.35,
    color: isUnread ? 'text.primary' : 'text.secondary',
    fontWeight: isUnread ? 600 : 400,
    ...(isPanel ? {} : { '@media (max-width:768px)': { fontSize: 16 } }),
    '& .notifUsername': { fontWeight: isUnread ? 800 : 600 },
    '& .notifTime': { color: 'text.secondary' },
  }
}
