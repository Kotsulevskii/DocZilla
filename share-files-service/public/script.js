class FileUploader {
  constructor(formSelector, inputSelector, statusSelector, linkSelector) {
    this.form = document.querySelector(formSelector);
    this.fileInput = document.querySelector(inputSelector);
    this.statusElement = document.querySelector(statusSelector);
    this.linkElement = document.querySelector(linkSelector);
    
    this.init();
  }

  init() {
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
  }

  async handleSubmit(event) {
    event.preventDefault();
    
    if (!this.validateInput()) {
      this.showStatus('Выберите файл для загрузки', 'error');
      return;
    }

    const formData = this.prepareFormData();
    this.showLoadingState();

    try {
      const response = await this.sendFile(formData);
      const data = await this.processResponse(response);
      this.handleSuccess(data);
    } catch (error) {
      this.handleError(error);
    }
  }

  validateInput() {
    return this.fileInput.files && this.fileInput.files.length > 0;
  }

  prepareFormData() {
    const formData = new FormData();
    formData.append('file', this.fileInput.files[0]);
    return formData;
  }

  showLoadingState() {
    this.showStatus('Идет загрузка файла...', 'loading');
    this.linkElement.style.display = 'none';
  }

  async sendFile(formData) {
    const response = await fetch('/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Ошибка сервера: ${response.status}`);
    }

    return response;
  }

  async processResponse(response) {
    const data = await response.json();
    
    if (!data.link) {
      throw new Error('Не получили ссылку на файл');
    }

    return data;
  }

  handleSuccess(data) {
    this.showStatus('Файл успешно загружен!', 'success');
    this.showDownloadLink(data.link);
  }

  handleError(error) {
    console.error('Ошибка загрузки:', error);
    this.showStatus(`Ошибка загрузки: ${error.message}`, 'error');
  }

  showStatus(message, type) {
    this.statusElement.textContent = message;
    this.statusElement.className = `status ${type}`;
    this.statusElement.style.display = 'block';
  }

  showDownloadLink(link) {
    this.linkElement.innerHTML = `Ссылка для скачивания: <a href="${link}" target="_blank">${window.location.origin}${link}</a>`;
    this.linkElement.style.display = 'block';
  }
}

// Использование
document.addEventListener('DOMContentLoaded', () => {
  new FileUploader(
    '.uploadForm',
    '.fileInput',
    '.status',
    '.link'
  );
});