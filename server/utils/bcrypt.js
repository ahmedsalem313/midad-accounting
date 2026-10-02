import bcrypt from 'bcryptjs'

export async function hashPassword(password) {
  return bcrypt.hash(password, 10)
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash)
}

export function hashPasswordSync(password) {
  return bcrypt.hashSync(password, 10)
}

export function comparePasswordSync(password, hash) {
  return bcrypt.compareSync(password, hash)
}