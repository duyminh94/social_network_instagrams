export function adminNavState() {
  return { adminBack: true }
}

export function goAdmin(navigate, path) {
  navigate(path, { state: adminNavState() })
}

export function canGoAdminBack(location) {
  return Boolean(location?.state?.adminBack)
}
