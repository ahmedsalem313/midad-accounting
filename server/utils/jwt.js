import jwt from 'jsonwebtoken'
import { config } from '../config.js'

export function generateToken(payload) {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  })
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwt.secret)
  } catch (error) {
    return null
  }
}

export function decodeToken(token) {
  return jwt.decode(token)
}