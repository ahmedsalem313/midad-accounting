export function errorHandler(err, req, res, next) {
  console.error('❌ Error:', err.message)
  console.error(err.stack)

  const status = err.status || err.statusCode || 500
  const message = err.message || 'حدث خطأ في السيرفر'

  res.status(status).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}

export function notFound(req, res, next) {
  res.status(404).json({
    success: false,
    error: `المسار غير موجود: ${req.originalUrl}`,
  })
}

export class AppError extends Error {
  constructor(message, status = 500) {
    super(message)
    this.status = status
    this.statusCode = status
  }
}