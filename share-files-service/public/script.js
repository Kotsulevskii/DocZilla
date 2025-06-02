document.querySelector('.uploadForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const fileInput = document.querySelector('.fileInput');
      const statusEl = document.querySelector('.status');
      const linkEl = document.querySelector('.link');
      
      if (!fileInput.files || fileInput.files.length === 0) {
        showStatus('Выберите файл для загрузки', 'error');
        return;
      }

      const file = fileInput.files[0];
      const formData = new FormData();
      formData.append('file', file);

      showStatus('Идет загрузка файла...', 'loading');
      linkEl.style.display = 'none';

      try {
        const response = await fetch('/upload', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error(`Ошибка сервера: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.link) {
          throw new Error('Не получили ссылку на файл');
        }

        showStatus('Файл успешно загружен!', 'success');
        showLink(data.link);
      } catch (error) {
        console.error('Ошибка загрузки:', error);
        showStatus(`Ошибка загрузки: ${error.message}`, 'error');
      }
    });

    function showStatus(message, type) {
      const statusEl = document.querySelector('.status');
      statusEl.textContent = message;
      statusEl.className = `status ${type}`;
      statusEl.style.display = 'block';
    }

    function showLink(link) {
      const linkEl = document.querySelector('.link');
      linkEl.innerHTML = `Ссылка для скачивания: <a href="${link}" target="_blank">${window.location.origin}${link}</a>`;
      linkEl.style.display = 'block';
    }