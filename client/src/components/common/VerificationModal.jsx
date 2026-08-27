// components/common/VerificationModal.jsx
// Luồng xin cấp tích xanh 3 bước:
//   step 'check'   — hiển thị checklist điều kiện, nút Gửi OTP
//   step 'otp'     — nhập mã OTP gửi về email
//   step 'success' — thông báo thành công

import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../i18n/LanguageContext'
import { checkVerifyEligibility, requestVerifyOtp, confirmVerifyOtp } from '../../features/verification/verificationAPI'
import styles from './VerificationModal.module.css'

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
    <div className={styles.overlay} onClick={function (e) { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.modal}>

        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>
            {step === 'success' ? ('✅ ' + vt.verifySuccessTitle) : ('🔵 ' + vt.verifyModalTitle)}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        {/* Step: loading */}
        {fetching && (
          <div className={styles.body}>
            <p className={styles.hint}>{vt.verifyChecking}</p>
          </div>
        )}

        {/* Step: check — checklist điều kiện */}
        {!fetching && step === 'check' && checks && (
          <>
            <div className={styles.body}>
              <p className={styles.hint}>{vt.verifyIntro}</p>
              <ul className={styles.checklist}>
                {Object.entries(checks).map(function ([key, c]) {
                  return (
                    <li key={key} className={c.pass ? styles.checkPass : styles.checkFail}>
                      <span className={styles.checkIcon}>{c.pass ? '✓' : '✗'}</span>
                      <span>{buildCheckLabel(key, c, vt)}</span>
                    </li>
                  )
                })}
              </ul>
              {!allPass && (
                <p className={styles.failNote}>{vt.verifyFailNote}</p>
              )}
            </div>
            <div className={styles.footer}>
              <button type="button" className={styles.cancelBtn} onClick={onClose}>{vt.verifyClose}</button>
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={!allPass || sendingOtp}
                onClick={handleRequestOtp}
              >
                {sendingOtp ? vt.verifySending : vt.verifySendOtp}
              </button>
            </div>
          </>
        )}

        {/* Step: otp — nhập mã */}
        {step === 'otp' && (
          <form onSubmit={handleConfirmOtp}>
            <div className={styles.body}>
              <p className={styles.hint}>{vt.verifyOtpHint}</p>
              <input
                className={styles.otpInput}
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder={vt.verifyOtpPlaceholder}
                value={otp}
                onChange={function (e) { setOtp(e.target.value.replace(/\D/g, '')) }}
                autoFocus
              />
              <div className={styles.resendRow}>
                {waitSeconds > 0 ? (
                  <span className={styles.waitText}>
                    {vt.verifyResendAfter.replace('{s}', waitSeconds)}
                  </span>
                ) : (
                  <button
                    type="button"
                    className={styles.resendBtn}
                    onClick={handleRequestOtp}
                    disabled={sendingOtp}
                  >
                    {sendingOtp ? vt.verifySending : vt.verifyResend}
                  </button>
                )}
              </div>
            </div>
            <div className={styles.footer}>
              <button type="button" className={styles.cancelBtn} onClick={onClose}>{vt.verifyCancel}</button>
              <button
                type="submit"
                className={styles.primaryBtn}
                disabled={otp.length !== 6 || confirming}
              >
                {confirming ? vt.verifyConfirming : vt.verifyConfirm}
              </button>
            </div>
          </form>
        )}

        {/* Step: success */}
        {step === 'success' && (
          <>
            <div className={styles.body}>
              <p className={styles.successText}>{vt.verifySuccessMsg}</p>
            </div>
            <div className={styles.footer}>
              <button type="button" className={styles.primaryBtn} onClick={onClose}>{vt.verifyClose}</button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
