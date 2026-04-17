export async function finalizeAuthenticatedSession({
  authStore,
  token,
  user = null,
  joinedEmpresaId = null,
}) {
  authStore.setToken(token)

  if (user) {
    authStore.setUser(user)
  } else {
    await authStore.fetchMe()
  }

  await authStore.loadEmpresas()

  if (joinedEmpresaId) {
    authStore.selectEmpresaById(joinedEmpresaId)
  }

  await authStore.loadAccessContext()
}

export function getDefaultAuthenticatedRoute(authStore) {
  return authStore.empresaActual
    ? { name: 'dashboard' }
    : { name: 'onboarding' }
}
