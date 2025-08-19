import jwt from 'jsonwebtoken'
import { config } from '../config/env.js'

export const createAccessToken = (payload) =>
  jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn })
