const http = require('http');
const https = require('https');
const { URL } = require('url');

const BOT_TOKEN = process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN';
const MINI_APP_URL = process.env.MINI_APP_URL || 'https://zma24.ru/tg-app/';
const BITRIX_BIND_URL = process.env.BITRIX_BIND_URL || 'https://zma24.ru/local/tools/tg_bind_phone_from_bot.php';
const BIND_SECRET = process.env.BIND_SECRET || 'YOUR_SHARED_SECRET';
const PORT = process.env.PORT || 3000;

function normalizePhone(phone) {
  let value = String(phone || '').replace(/\D+/g, '');
  if (value.length === 11 && value[0] === '8') value = '7' + value.slice(1);
  if (value.length === 10) value = '7' + value;
  return value;
}

function tgApi(method, data) {
  return new Promise((resolve) => {
    const body = new URLSearchParams();

    Object.entries(data || {}).forEach(([key, value]) => {
      if (typeof value === 'string') {
        body.append(key, value);
      } else {
        body.append(key, JSON.stringify(value));
      }
    });

    const req = https.request(
      {
        hostname: 'api.telegram.org',
        path: `/bot${BOT_TOKEN}/${method}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body.toString()),
        },
        timeout: 15000,
      },
      (res) => {
        let raw = '';

        res.on('data', (chunk) => {
          raw += chunk;
        });

        res.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch {
            resolve(null);
          }
        });
      }
    );

    req.on('error', () => resolve(null));

    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });

    req.write(body.toString());
    req.end();
  });
}

function postJson(targetUrl, payload) {
  return new Promise((resolve) => {
    const u = new URL(targetUrl);
    const body = JSON.stringify(payload);

    const req = https.request(
      {
        hostname: u.hostname,
        path: `${u.pathname}${u.search}`,
        method: 'POST',
        port: u.port || 443,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 20000,
      },
      (res) => {
        let raw = '';

        res.on('data', (chunk) => {
          raw += chunk;
        });

        res.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch {
            resolve(null);
          }
        });
      }
    );

    req.on('error', () => resolve(null));

    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });

    req.write(body);
    req.end();
  });
}

async function sendBindKeyboard(chatId) {
  const keyboard = {
    keyboard: [
      [
        { text: '📱 Поделиться номером', request_contact: true }
      ]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  };

  await tgApi('sendMessage', {
    chat_id: String(chatId),
    text: 'Нажмите кнопку ниже и отправьте контакт с тем же номером, который указан у вас в магазине.',
    reply_markup: keyboard
  });
}

async function removeReplyKeyboard(chatId) {
  await tgApi('sendMessage', {
    chat_id: String(chatId),
    text: '✅ Номер успешно привязан!',
    reply_markup: {
      remove_keyboard: true
    }
  });
}

async function setNativeTelegramMiniAppButton(chatId) {
  await tgApi('setChatMenuButton', {
    chat_id: String(chatId),
    menu_button: {
      type: 'web_app',
      text: 'Личный кабинет',
      web_app: {
        url: MINI_APP_URL
      }
    }
  });
}

async function sendSuccessMessage(chatId) {
  await tgApi('sendMessage', {
    chat_id: String(chatId),
    text: '💜 Личный кабинет теперь доступен через кнопку в нижнем левом углу.'
  });
}

async function sendError(chatId, text) {
  await tgApi('sendMessage', {
    chat_id: String(chatId),
    text
  });
}

async function handleMessage(message) {
  const chatId = message?.chat?.id;
  if (!chatId) return;

  const text = String(message?.text || '');
  const from = message?.from || {};
  const telegramId = String(from.id || '');
  const username = String(from.username || '');
  const firstName = String(from.first_name || '').trim();
  const lastName = String(from.last_name || '').trim();

  if (text === '/start' || text === '/start bind_phone') {
    await sendBindKeyboard(chatId);
    return;
  }

  if (!message.contact) {
    await sendError(chatId, 'Для привязки используйте кнопку «📱 Поделиться номером».');
    return;
  }

  const contact = message.contact;
  const contactUserId = String(contact.user_id || '');

  if (contactUserId && telegramId && contactUserId !== telegramId) {
    await sendError(chatId, 'Пожалуйста, отправьте именно свой номер через системную кнопку Telegram.');
    return;
  }

  const phone = normalizePhone(contact.phone_number || '');

  if (!phone) {
    await sendError(chatId, 'Не удалось прочитать номер. Попробуйте ещё раз.');
    return;
  }

  const bindResult = await postJson(BITRIX_BIND_URL, {
    secret: BIND_SECRET,
    telegram_id: telegramId,
    username,
    first_name: firstName,
    last_name: lastName,
    phone
  });

  if (!bindResult) {
    await sendError(chatId, 'Не удалось связаться с сервером магазина. Попробуйте ещё раз позже.');
    return;
  }

  if (!bindResult.ok) {
    await sendError(chatId, String(bindResult.message || 'Не удалось привязать номер. Попробуйте ещё раз позже.'));
    return;
  }

  await removeReplyKeyboard(chatId);
  await setNativeTelegramMiniAppButton(chatId);
  await sendSuccessMessage(chatId);
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, service: 'zma-telegram-bot' }));
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, message: 'Method not allowed' }));
    return;
  }

  let raw = '';

  req.on('data', (chunk) => {
    raw += chunk;
  });

  req.on('end', () => {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true }));

    let update = null;

    try {
      update = JSON.parse(raw);
    } catch {
      update = null;
    }

    if (!update || !update.message) return;

    handleMessage(update.message).catch(async () => {
      const chatId = update?.message?.chat?.id;
      if (!chatId) return;

      await sendError(chatId, 'Произошла ошибка. Попробуйте ещё раз.');
    });
  });
});

server.listen(PORT, () => {
  console.log(`Bot server started on port ${PORT}`);
});
