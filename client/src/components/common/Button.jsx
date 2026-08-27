// components/common/Button.jsx
// Thin wrapper của React Bootstrap Button với trạng thái loading
//
// Khi loading=true:
//   - Disable button tránh double-click
//   - Hiển thị spinner nhỏ phía trước text
//
// Dùng spread {...props} để pass thẳng variant, size, className, onClick... xuống BsButton

import { Button as BsButton, Spinner } from 'react-bootstrap'

export default function Button({ loading = false, children, disabled, ...props }) {
  return (
    <BsButton disabled={loading || disabled} {...props}>
      {/* Spinner chỉ hiện khi đang trong trạng thái loading */}
      {loading && <Spinner as="span" size="sm" animation="border" className="me-2" />}
      {children}
    </BsButton>
  )
}
