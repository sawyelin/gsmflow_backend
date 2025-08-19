import { config } from '../config/env.js'

// Middleware to protect API endpoints from direct access (only allow frontend origins)
export const apiProtection = (req, res, next) => {
  const origin = req.get('Origin')
  const referer = req.get('Referer')

  // In production, only allow requests from allowed origins
  if (config.production || config.env === 'production') {
    const allowedOrigins = config.corsOrigins

    // Check if origin is in allowed list
    if (origin && allowedOrigins.includes(origin)) {
      return next()
    }

    // If no origin, check referer as fallback
    if (!origin && referer) {
      const refererOrigin = new URL(referer).origin
      if (allowedOrigins.includes(refererOrigin)) {
        return next()
      }
    }

    // If neither origin nor referer is allowed, block the request
    return res.status(403).json({ error: 'Direct API access not allowed' })
  }

  // In development, allow requests from localhost:8080 or from same origin
  if (!config.production && config.env === 'development') {
    const devOrigins = ['http://localhost:8080', 'http://localhost:8081', 'http://127.0.0.1:8080', 'http://localhost:5173', 'http://localhost:8085', 'https://gsmflow.yelin.xyz']

    // Allow requests from development origins
    if (origin && devOrigins.includes(origin)) {
      return next()
    }

    // Allow requests with no origin (like from same host)
    if (!origin) {
      return next()
    }

    // Log blocked requests
    console.log(`Blocked API Request: ${req.method} ${req.path} from ${origin || referer || 'unknown'}`)
    return res.status(403).json({ error: 'Direct API access not allowed' })
  }

  // For any other environment, log and allow
  console.log(`API Request: ${req.method} ${req.path} from ${origin || referer || 'unknown'}`)
  next()
}
