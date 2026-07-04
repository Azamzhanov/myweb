let currentScreen = 'main-screen';
let selectedBankName = 'МБанк';
let historyData = [];

// Массив банков
const banks = [
  { name: "МБанк", logo: "📱" },
  { name: "Оптима Банк", logo: "💳" },
  { name: "РСК Банк", logo: "🏦" },
  { name: "Айыл Банк", logo: "🌾" },
  { name: "Бакай Банк", logo: "💎" }
];

document.addEventListener('DOMContentLoaded', () => {
  showScreen('main-screen');
  renderBanks();
});

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

function renderBanks(filtered = banks) {
  const container = document.getElementById('banks-list');
  if (!container) return;
  container.innerHTML = '';
  filtered.forEach(bank => {
    const div = document.createElement('div');
    div.className = 'bank-item';
    div.innerHTML = `<span style="font-size:20px">${bank.logo}</span><span>${bank.name}</span>`;
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

// СОЗДАНИЕ ЧЕКА С АВТОМАТИЧЕСКИМ ВРЕМЕНЕМ TRANSATION
function makeTransfer() {
  const amountInput = parseFloat(document.getElementById('amount-input').value);
  const phone = '+996 ' + document.getElementById('phone-input').value;
  const name = document.getElementById('name-input').value.trim().toUpperCase(); 
  const txId = Math.floor(100000000 + Math.random() * 900000000);
  
  // Рассчитываем текущие дату и время в момент нажатия
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  const formattedDateTime = `${day}.${month}.${year}, ${hours}:${minutes}:${seconds}`;
  const formattedAmount = amountInput.toFixed(2).replace('.', ',');

  // Запись действия в историю
  historyData.unshift({
    date: formattedDateTime,
    recipient: name,
    amount: formattedAmount,
    bank: selectedBankName
  });

  // Заполнение HTML структуры квитанции данными
  document.getElementById('rec-name').textContent = name;
  document.getElementById('rec-phone').textContent = '996' + document.getElementById('phone-input').value.replace(/\s+/g, '');
  document.getElementById('rec-amount').textContent = formattedAmount;
  document.getElementById('receipt-date').textContent = formattedDateTime;
  document.getElementById('tx-id').textContent = txId;
  document.getElementById('rec-description').textContent = `${selectedBankName} - пополнение по номеру телефона`;

  showScreen('receipt-screen');
}

function renderHistory() {
  const container = document.getElementById('history-list');
  if (!container) return;
  container.innerHTML = '';
  if (historyData.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:#8c8c8c;margin-top:40px;">История пуста</p>';
    return;
  }
  historyData.forEach(item => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
        <strong style="color:#fff">${item.bank}</strong>
        <span style="color:#e30613; font-weight:bold;">-${item.amount} KGS</span>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:12px; color:#8c8c8c;">
        <span>${item.recipient}</span>
        <span>${item.date}</span>
      </div>
    `;
    container.appendChild(div);
  });
}

// ЭКСПОРТ ЧЕКА В ИЗОБРАЖЕНИЕ ОДИН В ОДИН ДЛЯ СМАРТФОНОВ
function shareReceiptOnIphone() {
  const txId = document.getElementById('tx-id').textContent;
  const date = document.getElementById('receipt-date').textContent;
  const name = document.getElementById('rec-name').textContent;
  const phone = document.getElementById('rec-phone').textContent;
  const amount = document.getElementById('rec-amount').textContent;
  const desc = document.getElementById('rec-description').textContent;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = 600;
  canvas.height = 900;

  // Белая подложка
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Круглый логотип db
  ctx.strokeStyle = '#e30613';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(60, 65, 22, 0, 2 * Math.PI);
  ctx.stroke();

  ctx.fillStyle = '#e30613';
  ctx.font = 'bold 20px Arial';
  ctx.fillText('db', 49, 72);

  // Текст бренда
  ctx.fillStyle = '#e30613';
  ctx.font = 'bold 26px Arial';
  ctx.fillText('DemirBank', 95, 68);

  // Номер квитанции справа
  ctx.fillStyle = '#2b2b2b';
  ctx.font = 'bold 26px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(`№:${txId}`, 550, 68);
  ctx.textAlign = 'left';

  // Поля данных
  const fields = [
    { label: 'Дата и время транзакции', val: date, bold: true },
    { label: 'Способ отправки', val: 'Smart payments', bold: false },
    { label: 'Плательщик', val: 'ЛУТФИНИСО МАХАМАТСОЛИЕВНА ГУЛАМОВА', bold: true },
    { label: 'Реквизиты плательщика', val: '1180000048110691', bold: true },
    { label: 'Банк плательщика', val: 'ЗАО "Демир Кыргыз Интернэшнл Банк"', bold: false },
    { label: 'Получатель', val: name, bold: true },
    { label: 'Реквизиты получателя', val: phone, bold: true },
    { label: 'Сумма', val: `${amount} KGS`, bold: true },
    { label: 'Комиссия', val: '0,00 KGS', bold: true }
  ];

  let y = 140;
  fields.forEach(f => {
    ctx.fillStyle = '#8c8c8c';
    ctx.font = '15px Arial';
    ctx.fillText(f.label, 50, y);
    y += 22;
    
    ctx.fillStyle = '#1a1a1a';
    ctx.font = f.bold ? 'bold 18px Arial' : '500 18px Arial';
    ctx.fillText(f.val, 50, y);
    y += 38;
  });

  // Пунктирный разделитель
  ctx.strokeStyle = '#dcdcdc';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(50, y - 10);
  ctx.lineTo(550, y - 10);
  ctx.stroke();

  // Блок описания
  ctx.fillStyle = '#8c8c8c';
  ctx.font = '15px Arial';
  ctx.fillText('Описание', 50, y);
  y += 22;
  ctx.fillStyle = '#1a1a1a';
  ctx.font = '18px Arial';
  ctx.fillText(desc, 50, y);

  // СИНЯЯ БАНКОВСКАЯ ПЕЧАТЬ ПОД УГЛОМ
  ctx.save();
  ctx.translate(430, 480);
  ctx.rotate(-12 * Math.PI / 180);

  ctx.strokeStyle = '#29b3e7';
  ctx.lineWidth = 3;
  ctx.strokeRect(-90, -35, 180, 70);

  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(-60, 0, 12, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.fillStyle = '#29b3e7';
  ctx.font = 'bold 11px Arial';
  ctx.fillText('db', -66, 4);

  ctx.font = 'bold 10px Arial';
  ctx.fillText('ЗАО «ДЕМИР КЫРГЫЗ', -40, -5);
  ctx.fillText('ИНТЕРНЭШНЛ БАНК»', -40, 12);
  ctx.restore();

  // Подвал
  y = 830;
  ctx.strokeStyle = '#eeeeee';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(50, y);
  ctx.lineTo(550, y);
  ctx.stroke();

  y += 30;
  ctx.fillStyle = '#8c8c8c';
  ctx.font = '15px Arial';
  ctx.fillText('Лицензия НБКР № 035', 50, y);
  
  ctx.textAlign = 'right';
  ctx.fillText('+996 (312) 610 610, 2222', 550, y);

  // Вызов системного меню «Поделиться» картинкой
  canvas.toBlob(blob => {
    const file = new File([blob], `receipt_${txId}.png`, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({
        files: [file],
        title: 'Квитанция DemirBank',
        text: 'Электронный чек перевода'
      }).catch(err => console.log('Отмена шаринга'));
    } else {
      // Фолбек скачивания файла на ПК
      const link = document.createElement('a');
      link.download = `receipt_${txId}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  }, 'image/png');
}
  