let currentScreen = 'main-screen';
let selectedBankName = 'МБанк';

document.addEventListener('DOMContentLoaded', () => {
  showScreen('main-screen');
  renderBanks();
});

// --- НАВИГАЦИЯ ---
function showScreen(id) {
  currentScreen = id;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const targetScreen = document.getElementById(id);
  if (targetScreen) targetScreen.classList.add('active');
}

function goToTransfers() { showScreen('transfers-screen'); }
function goBackToMain() { showScreen('main-screen'); }
function goToOtherBanks() { showScreen('banks-screen'); }
function goBackToBanks() { showScreen('banks-screen'); }
function goToHistory() { showScreen('history-screen'); renderHistory(); }

// --- БАНКИ ---
function renderBanks(filtered = banks) {
  const container = document.getElementById('banks-list');
  if (!container) return;
  container.innerHTML = '';
  filtered.forEach(bank => {
    const div = document.createElement('div');
    div.className = 'bank-item';
    div.innerHTML = `<span style="font-size:24px">${bank.logo}</span><span>${bank.name}</span>`;
    div.onclick = () => selectBank(bank);
    container.appendChild(div);
  });
}

function filterBanks() {
  const query = document.getElementById('search-input').value.toLowerCase();
  const filtered = banks.filter(b => b.name.toLowerCase().includes(query));
  renderBanks(filtered);
}

function selectBank(bank) {
  selectedBankName = bank.name;
  document.getElementById('bank-title').textContent = bank.name;
  resetTransferForm();
  showScreen('transfer-form-screen');
}

// --- ФОРМА ВВОДА ---
function resetTransferForm() {
  document.getElementById('phone-input').value = '';
  document.getElementById('name-input').value = '';
  document.getElementById('amount-input').value = '';
  document.getElementById('continue-btn').disabled = true;
}

function checkFormValid() {
  const phoneInput = document.getElementById('phone-input');
  phoneInput.value = phoneInput.value.replace(/\D/g, ''); // Удаляем не-цифры

  const phoneLen = phoneInput.value.length;
  const nameLen = document.getElementById('name-input').value.trim().length;
  const amount = parseFloat(document.getElementById('amount-input').value || 0);

  // Валидация: 9 цифр номера, имя заполнено, сумма больше 0
  document.getElementById('continue-btn').disabled = !(phoneLen === 9 && nameLen > 0 && amount > 0);
}

// --- ОТПРАВКА И ЧЕК ---
function makeTransfer() {
  const amount = parseFloat(document.getElementById('amount-input').value);
  const phone = '+996 ' + document.getElementById('phone-input').value;
  const name = document.getElementById('name-input').value.trim().toUpperCase(); // Имя большими буквами
  const txId = Math.floor(100000000 + Math.random() * 900000000);
  const now = new Date();

  // Добавляем запись в массив истории (в data.js)
  history.unshift({
    date: now,
    recipient: name,
    amount: amount,
    bank: selectedBankName
  });

  // Заполняем квитанцию данными из инпутов
  document.getElementById('rec-name').textContent = name;
  document.getElementById('rec-phone').textContent = phone;
  document.getElementById('rec-amount').textContent = amount.toFixed(2);
  document.getElementById('receipt-date').textContent = now.toLocaleString('ru-RU');
  document.getElementById('tx-id').textContent = txId;
  document.getElementById('rec-description').textContent = `${selectedBankName} - пополнение по номеру телефона`;

  showScreen('receipt-screen');
  generateQR(phone, amount, name);
}

function generateQR(phone, amount, name) {
  const container = document.getElementById('qr-code');
  container.innerHTML = '';
  const text = `DemirBank|${selectedBankName}|${phone}|${amount} KGS|${name}`;
  new QRCode(container, { text: text, width: 150, height: 150 });
}

// --- НАДЕЖНОЕ СКАЧИВАНИЕ ЧЕКА КАК КАРТИНКИ ---
function downloadReceipt() {
  const receiptElement = document.querySelector('.receipt');
  const txId = document.getElementById('tx-id').textContent;
  
  if (!receiptElement) {
    alert('Чек не найден!');
    return;
  }

  // Убираем тень перед созданием снимка, чтобы избежать багов отображения
  receiptElement.style.boxShadow = 'none';

  // Опции для html2canvas
  const options = {
    scale: 2, // Высокое качество
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false
  };

  html2canvas(receiptElement, options).then(canvas => {
    // Возвращаем тень обратно в интерфейс
    receiptElement.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
    
    // Превращаем canvas в PNG строку
    const image = canvas.toDataURL('image/png');

    // Проверяем среду. Если это мобильный мессенджер (Инста, ВК, Телеграм, Ватсап), 
    // скачивание по ссылке не сработает — сразу показываем картинку
    const isMobileWallet = /Telegram|WhatsApp|Instagram|FBAN|FBAV|VKMobile/i.test(navigator.userAgent);

    const link = document.createElement('a');
    if (typeof link.download !== 'undefined' && !isMobileWallet) {
      // Обычный браузер (Хром, Яндекс, Опера)
      link.download = `Chek_DemirBank_№${txId}.png`;
      link.href = image;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // НАДЕЖНЫЙ ВАРИАНТ ДЛЯ МОБИЛЬНЫХ: Выводим картинку в интерфейс приложения поверх всего
      showMobileOverlay(image);
    }
  }).catch(err => {
    console.error('Ошибка сохранения:', err);
    receiptElement.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
    alert('Не удалось сгенерировать чек. Сделайте скриншот экрана.');
  });
}

// Показ картинки поверх экрана для ручного сохранения на смартфонах
function showMobileOverlay(imageSrc) {
  let overlay = document.getElementById('mobile-receipt-overlay');
  
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'mobile-receipt-overlay';
    // Динамические стили, чтобы не менять файл style.css
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.9)',
      zIndex: '10000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    });
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = `
    <p style="color: #fff; text-align: center; font-family: Arial; margin-bottom: 15px; font-size: 16px;">
      Зажмите пальцем картинку чека,<br>чтобы <b>Сохранить</b> или <b>Поделиться</b>
    </p>
    <img src="${imageSrc}" style="width: 100%; max-width: 360px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.5);" />
    <button onclick="document.getElementById('mobile-receipt-overlay').style.display='none'" 
            style="margin-top: 20px; padding: 12px 30px; background: #e30613; color: white; border: none; border-radius: 8px; font-weight: bold; font-size: 15px; cursor: pointer;">
      Закрыть
    </button>
  `;
  
  overlay.style.display = 'flex';
}

// --- ОТРИСОВКА ИСТОРИИ ---
function renderHistory() {
  const container = document.getElementById('history-list');
  container.innerHTML = '';
  
  if (history.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:#aaa;padding:20px;">История операций пуста</p>';
    return;
  }

  history.forEach(item => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.style.display = 'flex';
    div.style.justify = 'space-between';
    div.style.alignItems = 'center';
    
    div.innerHTML = `
      <div style="flex: 1;">
        <small style="color: #888;">${item.date.toLocaleString('ru-RU')}</small>
        <p style="margin-top: 5px; font-weight: bold;">${item.bank} → ${item.recipient}</p>
      </div>
      <div style="color: #00ff9d; font-weight: bold;">-${item.amount.toFixed(2)} KGS</div>
    `;
    container.appendChild(div);
  });
}