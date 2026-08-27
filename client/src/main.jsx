import React from 'react'
import ReactDOM from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './styles/index.css'
import './styles/components.css'
import ErrorBoundary from './components/common/ErrorBoundary'
import App from './App'

// ErrorBoundary bọc NGOÀI CÙNG để bắt được lỗi render của mọi thứ bên trong,
// kể cả lỗi phát sinh từ các Provider (GoogleOAuth, Query, Auth, Socket...)
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
        <App />
      </GoogleOAuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
