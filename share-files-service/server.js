const express = require('express');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const PORT = 3000;
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const METADATA_FILE = path.join(__dirname, 'metadata.json');


// Управляет метаданными: чтение, запись, обновление
class MetadataManager {
  constructor(metadataPath) {
    this.metadataPath = metadataPath;
  }

  async init() {
    if (!await fs.pathExists(this.metadataPath)) {
      await fs.writeJson(this.metadataPath, {});
    }
  }

  async read() {
    return await fs.readJson(this.metadataPath);
  }

  async write(data) {
    await fs.writeJson(this.metadataPath, data, { spaces: 2 });
  }

  async update(id, updates) {
    const data = await this.read();
    data[id] = { ...data[id], ...updates };
    await this.write(data);
    return data[id];
  }
}

// Управляет загрузкой, хранением и удалением файлов
class FileStorage {
  constructor(uploadDir) {
    this.uploadDir = uploadDir;
    // настройка Multer
    this.storage = multer.diskStorage({
      destination: uploadDir,
      filename: (req, file, cb) => {
        const originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, originalname);
      }
    });
    this.upload = multer({ storage: this.storage });
  }

  getUploadMiddleware() {
    return this.upload.single('file');
  }

  getFilePath(filename) {
    return path.join(this.uploadDir, filename);
  }
}


// Основной класс, который создаёт и настраивает сервер
class FileServer {
  constructor(port, uploadDir, metadataPath) {
    this.port = port;
    this.uploadDir = uploadDir;
    this.metadataPath = metadataPath;

    this.app = express();

    // Инициализируем зависимости
    this.fileStorage = new FileStorage(this.uploadDir);
    this.metadataManager = new MetadataManager(this.metadataPath);

    this.setupMiddlewares();
  }

  async start() {
    await this.metadataManager.init();
    this.setupRoutes();
    this.server = this.app.listen(this.port, () => {
      console.log(`Сервер запущен: http://localhost:${this.port}`);
    });

    this.setupCleanup();
  }
  // Middleware
  setupMiddlewares() {
    this.app.use((req, res, next) => {
      res.header('Content-Type', 'text/html; charset=utf-8');
      next();
    });

    this.app.use(express.static('public'));
    this.app.use(express.json());
  }

  setupRoutes() {
    const uploadMiddleware = this.fileStorage.getUploadMiddleware();

    // Загрузка файла
    this.app.post('/upload', uploadMiddleware, async (req, res) => {
      try {
        const originalname = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
        const id = uuidv4();

        const metadata = await this.metadataManager.read();

        metadata[id] = {
          filename: req.file.filename,
          originalname: originalname,
          path: `/download/${id}`,
          lastAccess: Date.now()
        };

        await this.metadataManager.write(metadata);

        res.json({ link: `/download/${id}`, filename: originalname });
      } catch (err) {
        console.error('Ошибка загрузки:', err);
        res.status(500).json({ error: 'Ошибка загрузки файла' });
      }
    });

    // Скачивание файла
    this.app.get('/download/:id', async (req, res) => {
      try {
        const metadata = await this.metadataManager.read();
        const { id } = req.params;

        if (!metadata[id]) {
          return res.status(404).send('Файл не найден');
        }

        const fileData = metadata[id];
        const filepath = this.fileStorage.getFilePath(fileData.filename);

        if (!await fs.pathExists(filepath)) {
          return res.status(404).send('Файл отсутствует');
        }

        // Обновляем время последнего доступа
        await this.metadataManager.update(id, { lastAccess: Date.now() });

        // Правильный заголовок для UTF-8
        const encodedFilename = encodeURIComponent(fileData.originalname);
        res.setHeader(
          'Content-Disposition',
          `attachment; filename*=UTF-8''${encodedFilename}`
        );

        res.sendFile(filepath);
      } catch (err) {
        console.error('Ошибка скачивания:', err);
        res.status(500).send('Ошибка скачивания файла');
      }
    });
  }

  setupCleanup() {
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    // обновление времени доступа
    setInterval(async () => {
      const metadata = await this.metadataManager.read();
      const now = Date.now();

      for (const id in metadata) {
        const fileData = metadata[id];
        const filePath = this.fileStorage.getFilePath(fileData.filename);

        if (now - fileData.lastAccess > THIRTY_DAYS) {
          if (await fs.pathExists(filePath)) {
            await fs.unlink(filePath);
          }
          delete metadata[id];
        }
      }

      await this.metadataManager.write(metadata);
    }, 24 * 60 * 60 * 1000); // раз в сутки
  }
}

// Точка входа
async function main() {
  const server = new FileServer(PORT, UPLOAD_DIR, METADATA_FILE);
  await server.start();
}

main();