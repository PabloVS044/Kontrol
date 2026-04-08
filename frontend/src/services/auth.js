
const USE_MOCK = true

// ── Mock implementation (temporary) ──────
function mockLogin(email, password) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (email === 'test@test.com' && password === '123456') {
        resolve({ token: 'fake-jwt-token-abc123' })
      } else {
        reject(new Error('Invalid credentials'))
      }
    }, 900)
  })
}

function mockRegister(email, password, firstName, lastName) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (email === 'taken@test.com') {
        reject(new Error('This email is already registered'))
      } else {
        resolve({ message: 'Account created successfully' })
      }
    }, 900)
  })
}

// ── Real implementation (use when backend is ready) ────────────
async function realLogin(email, password) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Login failed')
  }

  return data
}

async function realRegister(email, password, firstName, lastName) {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, firstName, lastName })
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Registration failed')
  }

  return data
}

// ── Public exports (the rest of the application uses only these) ──
export function loginUser(email, password) {
  return USE_MOCK ? mockLogin(email, password) : realLogin(email, password)
}

export function registerUser(email, password, firstName, lastName) {
  return USE_MOCK
    ? mockRegister(email, password, firstName, lastName)
    : realRegister(email, password, firstName, lastName)
}