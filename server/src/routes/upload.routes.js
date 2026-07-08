import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import { auth, requireCanProcessPayments } from '../middleware/auth.js';
import { uploadReceipt } from '../middleware/upload.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();
const uploadDir = path.resolve(__dirname, '../../uploads/receipts');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

router.use(auth);

router.post('/receipt', uploadReceipt, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Không có file được upload' });
  }

  const protocol = req.protocol;
  const host = req.get('host');
  const baseUrl = process.env.BASE_URL || `${protocol}://${host}`;
  const fileUrl = `${baseUrl}/uploads/receipts/${req.file.filename}`;

  res.status(201).json({
    message: 'Upload thành công',
    file: {
      filename: req.file.filename,
      url: fileUrl,
      size: req.file.size,
      mimetype: req.file.mimetype
    }
  });
});

router.get('/receipt/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadDir, filename);

  res.sendFile(filePath, (err) => {
    if (err) {
      return res.status(404).json({ error: 'Không tìm thấy file' });
    }
  });
});

export default router;
