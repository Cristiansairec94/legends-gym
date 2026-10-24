const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
// Make sure the folder exists (in a fresh container it may not) — else multer errors.
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // Never trust the original filename — generate a safe one.
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = crypto.randomBytes(12).toString('hex');
    cb(null, `${Date.now()}-${safe}${ext}`);
  },
});

const ALLOWED = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED.includes(ext)) return cb(null, true);
  const err = new Error('Only image files are allowed (jpg, png, webp, gif, heic)');
  err.status = 400;
  return cb(err);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB — phone/PC photos are often > 3 MB
});

module.exports = upload;
