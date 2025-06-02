const express = require('express');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const METADATA_FILE = path.join(__dirname, 'metadata.json');

// Подготовка директорий
fs.ensureDirSync(UPLOAD_DIR);
if (!fs.existsSync(METADATA_FILE)) {
  fs.writeJsonSync(METADATA_FILE, {});
}

// Настройка Multer 
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, originalname);
  }
});
const upload = multer({ storage });

// Middleware 
app.use((req, res, next) => {
  res.header('Content-Type', 'text/html; charset=utf-8');
  next();
});

app.use(express.static('public'));
app.use(express.json());

// Загрузка файла
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const originalname = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const id = uuidv4();
    const metadata = await fs.readJson(METADATA_FILE);

    metadata[id] = {
      filename: req.file.filename,
      originalname: originalname,
      path: `/download/${id}`,
      lastAccess: Date.now()
    };

    await fs.writeJson(METADATA_FILE, metadata, { spaces: 2 });
    res.json({ link: `/download/${id}`, filename: originalname });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Ошибка загрузки файла' });
  }
});

// Скачивание файла
app.get('/download/:id', async (req, res) => {
  try {
    const metadata = await fs.readJson(METADATA_FILE);
    const { id } = req.params;

    if (!metadata[id]) {
      return res.status(404).send('Файл не найден');
    }

    const fileData = metadata[id];
    const filepath = path.join(UPLOAD_DIR, fileData.filename);

    if (!await fs.pathExists(filepath)) {
      return res.status(404).send('Файл отсутствует');
    }

    // Обновление времени доступа
    metadata[id].lastAccess = Date.now();
    await fs.writeJson(METADATA_FILE, metadata, { spaces: 2 });

    // Правильные заголовки для UTF-8
    const encodedFilename = encodeURIComponent(fileData.originalname);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodedFilename}`
    );

    res.sendFile(filepath);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).send('Ошибка скачивания файла');
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});