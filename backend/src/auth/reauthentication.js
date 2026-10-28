import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

// Destructive actions that accept a fresh Google sign-in instead of a password.
// Each one gets its own proof purpose: a proof issued to delete the account
// cannot close a company, and the other way around.
export const REAUTH_ACTIONS = Object.freeze({
  ACCOUNT_DELETION: 'account-deletion',
  COMPANY_CLOSURE: 'company-closure',
})

export const isReauthAction = (value) => Object.values(REAUTH_ACTIONS).includes(value)

export const verifyGoogleReauthentication = (token, userId, purpose) => {
  if (!token) return false
  try {
    const proof = jwt.verify(token, process.env.JWT_SECRET)
    return proof.purpose === purpose && proof.id_usuario === userId
  } catch {
    return false
  }
}

/**
 * True when the request proves the account holder is present: the current
 * password, or a Google proof for this user and this purpose.
 */
export const isReauthenticated = async ({ user, password, googleProof, purpose }) => {
  const hasPassword = user.password_hash
    ? await bcrypt.compare(password || '', user.password_hash)
    : false
  return hasPassword || verifyGoogleReauthentication(googleProof, user.id_usuario, purpose)
}
