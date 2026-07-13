let currentScreen = 'main-screen';
let selectedBankName = 'МБанк';
let historyData = [];
let html5QrCode; // Глобальная переменная для управления QR-сканером
let barcodeDetector;
let barcodeStream = null;
let barcodeVideo = null;
let barcodeLoopActive = false;

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
  stopQRScanner(); // Выключаем камеру при сбросе/выходе
}

function checkFormValid() {
  const phoneInput = document.getElementById('phone-input');
  phoneInput.value = phoneInput.value.replace(/\D/g, ''); 
  const phoneLen = phoneInput.value.length;
  const nameLen = document.getElementById('name-input').value.trim().length;
  const amount = parseFloat(document.getElementById('amount-input').value || 0);
  document.getElementById('continue-btn').disabled = !(phoneLen === 9 && nameLen > 0 && amount > 0);
}
// ФУНКЦИИ ДЛЯ СКАНИРОВАНИЯ QR-КОДА
function startQRScanner() {
  const container = document.getElementById('reader-container');
  if (container) container.style.display = 'block'; // ИСПРАВЛЕНО: убрали лишнее .style
  const reader = document.getElementById('reader');

  // Попытка использовать нативный BarcodeDetector (быстрее и не требует CDN)
  async function tryNativeBarcode() {
    if (!('BarcodeDetector' in window)) return false;
    try {
      // Попробуем создать детектор для QR
      barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
    } catch (e) {
      console.warn('BarcodeDetector creation failed:', e);
      barcodeDetector = null;
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      barcodeStream = stream;

      if (!barcodeVideo) {
        barcodeVideo = document.createElement('video');
        barcodeVideo.setAttribute('playsinline', '');
        barcodeVideo.style.width = '100%';
        barcodeVideo.style.height = 'auto';
        reader.appendChild(barcodeVideo);
      }

      barcodeVideo.srcObject = stream;
      await barcodeVideo.play();

      barcodeLoopActive = true;

      const scanLoop = async () => {
        if (!barcodeLoopActive) return;
        try {
          const barcodes = await barcodeDetector.detect(barcodeVideo);
          if (barcodes && barcodes.length > 0) {
            const value = barcodes[0].rawValue || barcodes[0].rawData || '';
            handleDecodedText(value);
            return;
          }
        } catch (e) {
          // detect may throw when video not ready; ignore
        }
        requestAnimationFrame(scanLoop);
      };
      requestAnimationFrame(scanLoop);
      return true;
    } catch (e) {
      console.warn('Native barcode start failed:', e);
      if (barcodeStream) {
        barcodeStream.getTracks().forEach(t => t.stop());
        barcodeStream = null;
      }
      return false;
    }
  }

  function handleDecodedText(decodedText) {
    if (!decodedText) return;
    // Простая попытка извлечь имя из текста QR (если структура известна, расширьте парсер)
    let name = decodedText;
    // Частые шаблоны: "NAME:ИМЯ", "N:ИМЯ", или JSON {"name":"..."}
    try {
      const maybeJson = JSON.parse(decodedText);
      if (maybeJson && maybeJson.name) name = maybeJson.name;
    } catch (e) {
      // не JSON
      const m1 = decodedText.match(/NAME[:=]\s*(.+)/i);
      const m2 = decodedText.match(/N[:=]\s*(.+)/i);
      if (m1) name = m1[1].trim();
      else if (m2) name = m2[1].trim();
    }

    document.getElementById('name-input').value = name;
    checkFormValid();
    stopQRScanner();
  }

  // Сначала попробуем нативный детектор
  tryNativeBarcode().then(ok => {
    if (ok) return; // запущено
    // иначе используем существующий CDN/html5-qrcode fallback
    loadWithFallback();
  });
  // Если библиотека не подключилась, подгружаем её динамически
  function initAndStart() {
    if (typeof Html5Qrcode === 'undefined') {
      alert('Библиотека сканера не загружена. Попробуйте обновить страницу.');
      console.error('Html5Qrcode is not available on window');
      return;
    }

    Html5Qrcode.getCameras().then(cameras => {
      if (cameras && cameras.length > 0) {
        const cameraId = cameras[0].id;
        html5QrCode = new Html5Qrcode("reader");

        html5QrCode.start(
          cameraId,
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            document.getElementById('name-input').value = decodedText;
            stopQRScanner();
            checkFormValid();
          },
          () => { /* Игнорируем ошибки кадра */ }
        ).catch(err => {
          console.error("Ошибка старта сканера:", err);
          alert('Не удалось запустить сканер: ' + err);
        });
      } else {
        alert("Камера не найдена");
      }
    }).catch(err => {
      console.error("Доступ к камере заблокирован:", err);
      alert("Разрешите доступ к камере в браузере.");
    });
  }

  const statusEl = document.getElementById('qr-status');
  function showStatus(text) {
    if (!statusEl) return;
    statusEl.style.display = 'block';
    statusEl.textContent = text;
  }
  function hideStatus() {
    if (!statusEl) return;
    statusEl.style.display = 'none';
  }

  async function loadScript(url) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      s.async = true;
      s.onload = () => resolve(url);
      s.onerror = () => reject(new Error('load error: ' + url));
      document.head.appendChild(s);
    });
  }

  async function loadWithFallback() {
    if (typeof Html5Qrcode !== 'undefined') {
      hideStatus();
      initAndStart();
      return;
    }

    const cdns = [
      'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/minified/html5-qrcode.min.js',
      'https://unpkg.com/html5-qrcode@2.3.8/minified/html5-qrcode.min.js',
      'https://cdn.jsdelivr.net/gh/mebjas/html5qrcode@master/minified/html5-qrcode.min.js'
    ];

    showStatus('Загрузка сканера...');
    for (let i = 0; i < cdns.length; i++) {
      const url = cdns[i];
      try {
        await loadScript(url);
        // краткая задержка, чтобы объект появился на window
        await new Promise(r => setTimeout(r, 50));
        if (typeof Html5Qrcode !== 'undefined') {
          hideStatus();
          initAndStart();
          return;
        }
      } catch (e) {
        console.warn('CDN failed:', url, e);
        // пробуем следующий
      }
    }

    showStatus('Не удалось загрузить сканер. Проверьте подключение.');
    console.error('Не удалось загрузить html5-qrcode с всех CDN');
  }

  loadWithFallback();
}

function stopQRScanner() {
  const container = document.getElementById('reader-container');
  if (container) container.style.display = 'none'; // ИСПРАВЛЕНО: убрали лишнее .style
  
  if (html5QrCode) {
    try {
      html5QrCode.stop().then(() => {
        console.log("Сканер остановлен");
        html5QrCode.clear();
        html5QrCode = null;
      }).catch(err => {
        console.error("Ошибка остановки сканера:", err);
      });
    } catch (e) {
      console.warn('Ошибка при остановке сканера (возможно уже остановлен):', e);
      html5QrCode = null;
    }
  }
  // Остановим нативный поток/видео, если он был
  try {
    barcodeLoopActive = false;
    if (barcodeStream) {
      barcodeStream.getTracks().forEach(t => t.stop());
      barcodeStream = null;
    }
    if (barcodeVideo) {
      barcodeVideo.pause();
      if (barcodeVideo.srcObject) barcodeVideo.srcObject = null;
      // удаляем видео из DOM
      if (barcodeVideo.parentNode) barcodeVideo.parentNode.removeChild(barcodeVideo);
      barcodeVideo = null;
    }
    barcodeDetector = null;
    const statusEl = document.getElementById('qr-status');
    if (statusEl) statusEl.style.display = 'none';
  } catch (e) {
    console.warn('Ошибка при остановке нативного сканера:', e);
  }
}

// СОЗДАНИЕ ЧЕКА С АВТОМАТИЧЕСКИМ ВРЕМЕНЕМ TRANSATION
function makeTransfer() {
  const amountInput = parseFloat(document.getElementById('amount-input').value);
  const phone = '+996 ' + document.getElementById('phone-input').value;
  const name = document.getElementById('name-input').value.trim().toUpperCase(); 
  const txId = Math.floor(100000000 + Math.random() * 900000000);
  
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  const formattedDateTime = `${day}.${month}.${year}, ${hours}:${minutes}:${seconds}`;
  const formattedAmount = amountInput.toFixed(2).replace('.', ',');

  historyData.unshift({
    date: formattedDateTime,
    recipient: name,
    amount: formattedAmount,
    bank: selectedBankName
  });

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

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#e30613';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(60, 65, 22, 0, 2 * Math.PI);
  ctx.stroke();

  ctx.fillStyle = '#e30613';
  ctx.font = 'bold 20px Arial';
  ctx.fillText('db', 49, 72);

  ctx.fillStyle = '#e30613';
  ctx.font = 'bold 26px Arial';
  ctx.fillText('DemirBank', 95, 68);

  ctx.fillStyle = '#2b2b2b';
  ctx.font = 'bold 26px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(`№:${txId}`, 550, 68);
  ctx.textAlign = 'left';

  const fields = [
    { label: 'Дата и время транзакции', val: date, bold: true },
    { label: 'Способ отправки', val: 'Smart payments', bold: false },
    { label: 'Плательщик', val: 'Махмуджанов Азиз Абдуллаевич', bold: true },
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

  ctx.strokeStyle = '#dcdcdc';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(50, y - 10);
  ctx.lineTo(550, y - 10);
  ctx.stroke();

  ctx.fillStyle = '#8c8c8c';
  ctx.font = '15px Arial';
  ctx.fillText('Описание', 50, y);
  y += 22;
  ctx.fillStyle = '#1a1a1a';
  ctx.font = '18px Arial';
  ctx.fillText(desc, 50, y);

  ctx.save();
  ctx.translate(430, 720);
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
  ctx.fillText('ЗАО «ДЕМИР КЫРГЫЗ', -40, -10);
  ctx.fillText('ИНТЕРНЭШНЛ БАНК»', -40, 5);
  ctx.restore();

  ctx.fillStyle = '#8c8c8c';
  ctx.font = '12px Arial';
  ctx.fillText('Лицензия НБКР № 035', 50, 840);
  ctx.textAlign = 'right';
  ctx.fillText('+996 (312) 610 610, 2222', 550, 840);
  ctx.textAlign = 'left';

  const link = document.createElement('a');
  link.download = `receipt-${txId}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}