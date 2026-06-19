export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ error: messages.join(', ') });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'ID không hợp lệ' });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ error: `${field} đã tồn tại` });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Token không hợp lệ' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token đã hết hạn' });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Lỗi server nội bộ'
  });
};
