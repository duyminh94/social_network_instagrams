// components/common/VerificationModal.jsx
// Luồng xin cấp tích xanh 3 bước — dựng trên Dialog của MUI
//   step 'check'   — hiển thị checklist điều kiện, nút Gửi OTP
//   step 'otp'     — nhập mã OTP gửi về email
//   step 'success' — thông báo thành công
//
// Chỉ đổi phần giao diện sang MUI, toàn bộ logic gọi API, đếm ngược
//   và chuyển bước giữ nguyên như bản cũ

import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../i18n/LanguageContext'
import { checkVerifyEligibility, requestVerifyOtp, confirmVerifyOtp } from '../../features/verification/verificationAPI'
import Button from './Button'

// Xây dựng label cho từng điều kiện từ i18n + giá trị động
function buildCheckLabel(key, check, vt) {
  switch (key) {
    case 'fullName':       return vt.verifyCheckFullName
    case 'avatarUrl':      return vt.verifyCheckAvatarUrl
    case 'bio':            return vt.verifyCheckBio
    case 'postsCount':     return vt.verifyCheckPostsCount.replace('{n}', check.current ?? 0)
    case 'followersCount': return vt.verifyCheckFollowersCount.replace('{n}', check.current ?? 0)
    case 'notBanned':      return vt.verifyCheckNotBanned
    case 'accountAge':     return vt.verifyCheckAccountAge
    default:               return key
  }
}

export default function VerificationModal({ onClose }) {
  var { updateUser } = useAuth()
  var { t } = useLanguage()
  var vt = t.profile

  var [step, setStep] = useState('check') // 'check' | 'otp' | 'success'
  var [checks, setChecks] = useState(null)
  var [allPass, setAllPass] = useState(false)
  var [fetching, setFetching] = useState(true)
  var [sendingOtp, setSendingOtp] = useState(false)
  var [otp, setOtp] = useState('')
  var [confirming, setConfirming] = useState(false)
  var [waitSeconds, setWaitSeconds] = useState(0)
  var timerRef = useRef(null)

  useEffect(function () {
    checkVerifyEligibility()
      .then(function (res) {
        if (res.data.isTrusted) {
          setStep('success')
          return
        }
        setChecks(res.data.checks)
        setAllPass(res.data.allPass)
      })
      .catch(function () {
        toast.error(vt.verifyCheckError)
      })
      .finally(function () { setFetching(false) })
  }, [])

  // Đếm ngược thời gian chờ gửi lại OTP
  useEffect(function () {
    if (waitSeconds <= 0) return
    timerRef.current = setInterval(function () {
      setWaitSeconds(function (s) {
        if (s <= 1) {
          clearInterval(timerRef.current)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return function () { clearInterval(timerRef.current) }
  }, [waitSeconds])

  async function handleRequestOtp() {
    setSendingOtp(true)
    try {
      await requestVerifyOtp()
      setStep('otp')
      setWaitSeconds(60)
    } catch (err) {
      var data = err?.response?.data
      if (data?.waitSeconds) {
        setWaitSeconds(data.waitSeconds)
        setStep('otp')
      } else {
        toast.error(data?.message || vt.verifyOtpError)
      }
    } finally {
      setSendingOtp(false)
    }
  }

  async function handleConfirmOtp(e) {
    e.preventDefault()
    if (!otp.trim()) return
    setConfirming(true)
    try {
      await confirmVerifyOtp(otp.trim())
      updateUser({ isTrusted: true })
      setStep('success')
    } catch (err) {
      toast.error(err?.response?.data?.message || vt.verifyOtpInvalid)
    } finally {
      setConfirming(false)
    }
  }

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        <Typography component="span" sx={{ fontSize: 16, fontWeight: 600 }}>
          {step === 'success' ? ('✅ ' + vt.verifySuccessTitle) : ('🔵 ' + vt.verifyModalTitle)}
        </Typography>
        <IconButton onClick={onClose} size="small" aria-label={vt.verifyClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      {/* Bước: đang tải điều kiện */}
      {fetching && (
        <DialogContent dividers>
          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
            {vt.verifyChecking}
          </Typography>
        </DialogContent>
      )}

      {/* Bước: checklist điều kiện */}
      {!fetching && step === 'check' && checks && (
        <>
          <DialogContent dividers>
            <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
              {vt.verifyIntro}
            </Typography>

            <List dense sx={{ mt: 1 }}>
              {Object.entries(checks).map(function ([key, c]) {
                return (
                  <ListItem key={key} disableGutters sx={{ py: 0.25 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      {c.pass
                        ? <CheckCircleIcon color="success" fontSize="small" />
                        : <CancelIcon color="error" fontSize="small" />}
                    </ListItemIcon>
                    <ListItemText
                      primary={buildCheckLabel(key, c, vt)}
                      slotProps={{ primary: { sx: { fontSize: 14 } } }}
                    />
                  </ListItem>
                )
              })}
            </List>

            {!allPass && (
              <Typography sx={{ fontSize: 13, color: 'error.main', mt: 1 }}>
                {vt.verifyFailNote}
              </Typography>
            )}
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 2, gap: 1.25 }}>
            <Button variant="outline-secondary" fullWidth onClick={onClose}>
              {vt.verifyClose}
            </Button>
            <Button
              fullWidth
              disabled={!allPass}
              loading={sendingOtp}
              onClick={handleRequestOtp}
            >
              {sendingOtp ? vt.verifySending : vt.verifySendOtp}
            </Button>
          </DialogActions>
        </>
      )}

      {/* Bước: nhập mã OTP */}
      {step === 'otp' && (
        <Box component="form" onSubmit={handleConfirmOtp}>
          <DialogContent dividers>
            <Typography sx={{ fontSize: 14, color: 'text.secondary', mb: 1.5 }}>
              {vt.verifyOtpHint}
            </Typography>

            <TextField
              value={otp}
              onChange={function (e) { setOtp(e.target.value.replace(/\D/g, '')) }}
              placeholder={vt.verifyOtpPlaceholder}
              fullWidth
              autoFocus
              slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 6 } }}
              // Mã 6 số, giãn chữ và canh giữa cho dễ đọc từng ký tự
              sx={{ '& input': { textAlign: 'center', letterSpacing: 6, fontSize: 20, fontWeight: 600 } }}
            />

            <Box sx={{ mt: 1.5, textAlign: 'center' }}>
              {waitSeconds > 0 ? (
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                  {vt.verifyResendAfter.replace('{s}', waitSeconds)}
                </Typography>
              ) : (
                <Button
                  variant="outline-secondary"
                  size="sm"
                  loading={sendingOtp}
                  onClick={handleRequestOtp}
                >
                  {sendingOtp ? vt.verifySending : vt.verifyResend}
                </Button>
              )}
            </Box>
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 2, gap: 1.25 }}>
            <Button variant="outline-secondary" fullWidth onClick={onClose}>
              {vt.verifyCancel}
            </Button>
            <Button
              type="submit"
              fullWidth
              disabled={otp.length !== 6}
              loading={confirming}
            >
              {confirming ? vt.verifyConfirming : vt.verifyConfirm}
            </Button>
          </DialogActions>
        </Box>
      )}

      {/* Bước: thành công */}
      {step === 'success' && (
        <>
          <DialogContent dividers>
            <Typography sx={{ fontSize: 14, textAlign: 'center' }}>
              {vt.verifySuccessMsg}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button fullWidth onClick={onClose}>{vt.verifyClose}</Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  )
}
