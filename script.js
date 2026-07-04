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
  phoneInput.value = phoneInput.value.replace(/\D/g, ''); 

  const phoneLen = phoneInput.value.length;
  const nameLen = document.getElementById('name-input').value.trim().length;
  const amount = parseFloat(document.getElementById('amount-input').value || 0);

  document.getElementById('continue-btn').disabled = !(phoneLen === 9 && nameLen > 0 && amount > 0);
}

// --- ОТПРАВКА И ЧЕК ---
function makeTransfer() {
  const amount = parseFloat(document.getElementById('amount-input').value);
  const phone = '+996 ' + document.getElementById('phone-input').value;
  const name = document.getElementById('name-input').value.trim().toUpperCase(); 
  const txId = Math.floor(100000000 + Math.random() * 900000000);
  const now = new Date();

  history.unshift({
    date: now,
    recipient: name,
    amount: amount,
    bank: selectedBankName
  });

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

// --- ГЕНЕРАЦИЯ И ОТПРАВКА ФОТО ЧЕКА ЧЕРЕЗ CANVAS ---
function shareReceiptPhoto() {
  const txId = document.getElementById('tx-id').textContent;
  const date = document.getElementById('receipt-date').textContent;
  const name = document.getElementById('rec-name').textContent;
  const phone = document.getElementById('rec-phone').textContent;
  const amount = document.getElementById('rec-amount').textContent;
  const desc = document.getElementById('rec-description').textContent;

  // Создаем чистый холст программно
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = 600;
  canvas.height = 850;

  // Белый фон чека
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Шапка (Красная линия)
  ctx.fillStyle = '#e30613';
  ctx.fillRect(30, 95, 540, 3);

  // Логотип "db" и текст "DemirBank"
  ctx.fillStyle = '#e30613';
  ctx.font = 'bold 44px Arial';
  ctx.fillText('db', 40, 70);

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 22px Arial';
  ctx.fillText('DemirBank', 105, 52);
  ctx.fillStyle = '#555555';
  ctx.font = '14px Arial';
  ctx.fillText('bank for your life', 105, 72);

  // Номер транзакции в шапке праворуч
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(`№ ${txId}`, 560, 62);
  ctx.textAlign = 'left';

  // Функция для рисования полей чека
  let currentY = 140;
  function drawRow(label, value, isBoldValue = false) {
    ctx.fillStyle = '#555555';
    ctx.font = '14px Arial';
    ctx.fillText(label, 40, currentY);
    
    currentY += 22;
    ctx.fillStyle = '#000000';
    ctx.font = isBoldValue ? 'bold 18px Arial' : '16px Arial';
    ctx.fillText(value, 40, currentY);
    
    // Пунктирная разделительная линия
    currentY += 15;
    ctx.strokeStyle = '#cccccc';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(40, currentY);
    ctx.lineTo(560, currentY);
    ctx.stroke();
    currentY += 30;
  }

  // Отрисовываем строки с данными
  drawRow('Дата и время транзакции', date);
  drawRow('Способ отправки', 'Smart payments');
  drawRow('Плательщик', 'ЛУТФИНИСО МАХАМАТСОЛИЕВНА ГУЛАМОВА');
  drawRow('Реквизиты плательщика', '1180000048110691');
  drawRow('Банк плательщика', 'ЗАО "Демир Кыргыз Интернэшнл Банк"');
  drawRow('Получатель', name);
  drawRow('Реквизиты получателя', phone);
  drawRow('Сумма', `${amount} KGS`, true);
  drawRow('Комиссия', '0,00 KGS');
  drawRow('Описание', desc);

  // Отрисовка синей печати
  ctx.save();
  ctx.translate(430, 480);
  ctx.rotate(-12 * Math.PI / 180);
  ctx.strokeStyle = '#00aaff';
  ctx.lineWidth = 3;
  ctx.setLineDash([]); // Сброс пунктира
  ctx.strokeRect(0, 0, 140, 50);
  ctx.fillStyle = '#00aaff';
  ctx.font = 'bold 10px Arial';
  ctx.fillText('ЗАО «ДЕМИР КЫРГЫЗ', 12, 22);
  ctx.fillText('ИНТЕРНЭШНЛ БАНК»', 12, 37);
  ctx.restore();

  // Футер чека
  ctx.fillStyle = '#555555';
  ctx.font = '13px Arial';
  ctx.fillText('Лицензия НБКР № 035', 40, 800);
  ctx.textAlign = 'right';
  ctx.fillText('+996 (312) 610 610, 2222', 560, 800);
  ctx.textAlign = 'left';

  // Превращаем нарисованный холст в Blob-файл (настоящую картинку)
  canvas.toBlob((blob) => {
    if (!blob) {
      alert('Ошибка генерации фото чека.');
      return;
    }

    const file = new File([blob], `Chek_No${txId}.png`, { type: 'image/png' });

    // Проверяем, может ли устройство поделиться файлом-картинкой
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({
        files: [file],
        title: `Чек №${txId}`,
        text: `Чек перевода в ${selectedBankName}`
      })
      .then(() => console.log('Успешно отправлено!'))
      .catch((err) => console.log('Отмена отправки:', err));
    } else {
      // ЗАПАСНОЙ ЖЕЛЕЗОБЕТОННЫЙ ВАРИАНТ ДЛЯ ОСТАЛЬНЫХ ТЕЛЕФОНОВ:
      // Переводим в строку base64 и открываем оверлей, откуда картинку можно сохранить
      const dataUrl = canvas.toDataURL('image/png');
      showMobileOverlay(dataUrl);
    }
  }, 'image/png');
}

// Модальное окно, если системное "Поделиться картинкой" не поддерживается браузером
function showMobileOverlay(imageSrc) {
  let overlay = document.getElementById('mobile-receipt-overlay');
  
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'mobile-receipt-overlay';
    Object.assign(overlay.style, {
      position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.95)', zIndex: '10000',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px'
    });
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = `
    <p style="color: #fff; text-align: center; font-family: Arial, sans-serif; margin-bottom: 15px; font-size: 16px; line-height: 1.4;">
      Фото чека готово!<br><b>Зажмите пальцем картинку ниже</b>,<br>чтобы сохранить или отправить её.
    </p>
    <img src="${imageSrc}" style="width: 100%; max-width: 360px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.6);" />
    <button onclick="document.getElementById('mobile-receipt-overlay').style.display='none'" 
            style="margin-top: 25px; padding: 14px 40px; background: #e30613; color: white; border: none; border-radius: 10px; font-weight: bold; font-size: 16px; cursor: pointer; width: 100%; max-width: 360px;">
      Вернуться назад
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
