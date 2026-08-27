// components/common/Spinner.jsx
// Component loading spinner dùng chung toàn app
//
// Props:
//   size     - 'sm' (16px) | 'md' (24px, default) | 'lg' (40px)
//   fullPage - true → căn giữa toàn trang (minHeight 200px)
//              false → căn giữa với padding nhỏ (dùng inline trong component)

export default function Spinner({ size = 'md', fullPage = false }) {
  // Ánh xạ tên size → pixel
  const sizeMap = { sm: 16, md: 24, lg: 40 }
  const px = sizeMap[size] || 24

  const spinner = (
    <div
      className="spinner-ig"
      style={{ width: px, height: px }}
    />
  )

  // fullPage: căn giữa chiều cao trang (dùng khi load toàn bộ trang)
  if (fullPage) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
        {spinner}
      </div>
    )
  }

  // Inline: căn giữa với padding nhỏ (dùng trong component nhỏ)
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
      {spinner}
    </div>
  )
}
