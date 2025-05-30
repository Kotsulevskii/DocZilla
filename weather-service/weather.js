const fetch = require('node-fetch');

// Кэширование данных
class WeatherCache {
  constructor() {
    this.cache = {};
    this.CACHE_TTL = 15 * 60 * 1000; // 15 минут
  }

  get(city) {
    const cached = this.cache[city.toLowerCase()];
    const now = Date.now();
    
    if (cached && now - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  set(city, data) {
    this.cache[city.toLowerCase()] = {
      timestamp: Date.now(),
      data
    };
  }
}

// Получение координат города
class GeoCodingService {
  async getCoordinates(city) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.results || !data.results.length) {
      throw new Error('Город не найден');
    }
    
    return {
      latitude: data.results[0].latitude,
      longitude: data.results[0].longitude
    };
  }
}

// Получение суточной температуры
class WeatherForecastService {
  constructor(geoService) {
    this.geoService = geoService;
  }

  async getForecast(city) {
    const { latitude, longitude } = await this.geoService.getCoordinates(city);
    
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m`;
    const response = await fetch(url);
    const data = await response.json();
    
    return {
      time: data.hourly.time.slice(0, 24),
      temperature_2m: data.hourly.temperature_2m.slice(0, 24)
    };
  }
}

// Обработка запросов
class WeatherController {
  constructor(cacheService, forecastService) {
    this.cacheService = cacheService;
    this.forecastService = forecastService;
  }

  async handleRequest(req, res) {
    try {
      const city = req.query.city;
      if (!city) {
        return res.status(400).json({ error: "Не указан город" });
      }

      // Проверяем кэш
      const cachedData = this.cacheService.get(city);
      if (cachedData) {
        return res.json(cachedData);
      }

      // Получаем свежие данные
      const forecast = await this.forecastService.getForecast(city);
      const result = {
        city,
        ...forecast
      };

      // Сохраняем в кэш
      this.cacheService.set(city, result);

      res.json(result);
    } catch (err) {
      console.error("Ошибка запроса прогноза:", err);
      if (err.message === 'Город не найден') {
        res.status(404).json({ error: err.message });
      } else {
        res.status(500).json({ error: "Ошибка сервера" });
      }
    }
  }
}

// Инициализация зависимостей
const cacheService = new WeatherCache();
const geoService = new GeoCodingService();
const forecastService = new WeatherForecastService(geoService);
const weatherController = new WeatherController(cacheService, forecastService);

// Экспорт обработчика для использования в Express
module.exports = (req, res) => weatherController.handleRequest(req, res);
