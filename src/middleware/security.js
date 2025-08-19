export const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  res.removeHeader('X-Powered-By')
  next()
}

const store = new Map()
const WINDOW_MS = 15 * 60 * 1000
// Rate limits: 100 requests per window in production, 1000 in development
const MAX_REQ = process.env.NODE_ENV === 'production' ? 100 : 1000

// Additional rate limiting for auth endpoints (stricter)
const AUTH_WINDOW_MS = 5 * 60 * 1000 // 5 minutes
const MAX_AUTH_REQ = process.env.NODE_ENV === 'production' ? 20 : 100 // 20 requests per 5 minutes in production

export const rateLimiter = (req, res, next) => {
  // Only apply rate limiting to auth endpoints
  const isAuthEndpoint = req.path.startsWith('/api/auth')

  if (isAuthEndpoint) {
    const key = req.ip || req.connection?.remoteAddress || 'anon'
    const now = Date.now()

    // Apply rate limiting
    if (!store.has(key)) {
      store.set(key, { count: 1, reset: now + WINDOW_MS })
    } else {
      const item = store.get(key)
      if (now > item.reset) {
        item.count = 1
        item.reset = now + WINDOW_MS
      } else {
        item.count += 1
      }

      // Allow more requests for register endpoint specifically
      const isRegisterEndpoint = req.path === '/api/auth/register'
      const maxRequests = isRegisterEndpoint ? MAX_REQ : MAX_AUTH_REQ

      if (item.count > maxRequests) {
        const errorMessage = isRegisterEndpoint
          ? 'Too many registration attempts. Please wait a few minutes before trying again.'
          : 'Too many requests'
        return res.status(429).json({ error: errorMessage })
      }
    }
  }

  next()
}
