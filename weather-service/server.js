const express = require('express');
const path = require('path');

class WeatherServer {
  constructor(port) {
    this.port = port;
    this.app = express();
    this.weatherRoute = require('./weather'); // получение данных
    
    this.initializeMiddlewares('public');
    this.initializeRoutes();
  }

  initializeMiddlewares(dir) {
    this.app.use(express.static(path.join(__dirname, dir)));
  }

  initializeRoutes() {
    this.app.get('/weather', this.weatherRoute);
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`Сервер запущен по адресу http://localhost:${this.port}`);
    });
  }
}

const server = new WeatherServer(3000)
server.start()