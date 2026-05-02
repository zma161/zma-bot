const http = require('http');
const https = require('https');
const { URL } = require('url');

const BOT_TOKEN = process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN';
const MINI_APP_URL = process.env.MINI_APP_URL || 'https://zma24.ru/tg-app/index.php';
const BITRIX_BIND_URL = process.env.BITRIX_BIND_URL || 'https://zma24.ru/local/tools/tg_bind_phone_from_bot.php';
const BIND_SECRET = process.env.BIND_SECRET || 'YOUR_SHARED_SECRET';
const PORT = process.env.PORT || 3000;

function log() {
  try {
    console.log.apply(console, arguments);
  } catch (e) {}
}

function isConfigured() {
  return BOT_TOKEN && BOT_TOKEN !== 'YOUR_BOT_TOKEN' && BIND_SECRET && BIND_SECRET !== 'YOUR_SHARED_SECRET';
}

function normalizePhone(phone) {
  var value = String(phone || '').replace(/\D+/g, '');
  if (value.length === 11 && value[0] === '8') value = '7' + value.slice(1);
  if (value.length === 10) value = '7' + value;
  return value;
}

function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function tgApi(method, data) {
  return new Promise(function(resolve) {
    if (!BOT_TOKEN || BOT_TOKEN === 'YOUR_BOT_TOKEN') {
      log('[tgApi] BOT_TOKEN is not configured');
      resolve({ ok: false, description: 'BOT_TOKEN is not configured' });
      return;
    }

    var body = new URLSearchParams();
    var payload = data || {};

    Object.keys(payload).forEach(function(key) {
      var value = payload[key];
      if (typeof value === 'string') {
        body.append(key, value);
      } else {
        body.append(key, JSON.stringify(value));
      }
    });

    var bodyText = body.toString();

    var req = https.request(
      {
        hostname: 'api.telegram.org',
        path: '/bot' + BOT_TOKEN + '/' + method,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(bodyText)
        },
        timeout: 15000
      },
      function(res) {
        var raw = '';

        res.on('data', function(chunk) {
          raw += chunk;
        });

        res.on('end', function() {
          var json = safeJsonParse(raw);
          if (!json || json.ok !== true) {
            log('[tgApi error]', method, raw);
          }
          resolve(json || { ok: false, description: raw || 'Telegram API empty response' });
        });
      }
    );

    req.on('error', function(err) {
      log('[tgApi request error]', method, err && err.message ? err.message : err);
      resolve({ ok: false, description: err && err.message ? err.message : 'Telegram request error' });
    });

    req.on('timeout', function() {
      log('[tgApi timeout]', method);
      req.destroy();
      resolve({ ok: false, description: 'Telegram request timeout' });
    });

    req.write(bodyText);
    req.end();
  });
}

function postJson(targetUrl, payload) {
  return new Promise(function(resolve) {
    var u;
    try {
      u = new URL(targetUrl);
    } catch (e) {
      resolve({ ok: false, message: 'Некорректный BITRIX_BIND_URL' });
      return;
    }

    var body = JSON.stringify(payload || {});

    var req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: 'POST',
        port: u.port || 443,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(body)
        },
        timeout: 20000
      },
      function(res) {
        var raw = '';

        res.on('data', function(chunk) {
          raw += chunk;
        });

        res.on('end', function() {
          var json = safeJsonParse(raw);
          if (!json) {
            log('[bitrix raw response]', raw);
            resolve({ ok: false, message: raw || 'Пустой ответ сайта' });
            return;
          }
          resolve(json);
        });
      }
    );

    req.on('error', function(err) {
      log('[bitrix request error]', err && err.message ? err.message : err);
      resolve({ ok: false, message: 'Ошибка соединения с сайтом: ' + (err && err.message ? err.message : 'unknown') });
    });

    req.on('timeout', function() {
      log('[bitrix timeout]');
      req.destroy();
      resolve({ ok: false, message: 'Сайт долго не отвечает. Попробуйте позже.' });
    });

    req.write(body);
    req.end();
  });
}

async function sendBindKeyboard(chatId) {
  var keyboard = {
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
  return tgApi('setChatMenuButton', {
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

async function sendOpenMiniAppMessage(chatId) {
  var keyboard = {
    inline_keyboard: [
      [
        {
          text: '💜 Открыть личный кабинет',
          web_app: {
            url: MINI_APP_URL
          }
        }
      ],
      [
        {
          text: 'Открыть через ссылку',
          url: MINI_APP_URL
        }
      ]
    ]
  };

  await tgApi('sendMessage', {
    chat_id: String(chatId),
    text: '💜 Личный кабинет готов. На iPhone удобнее открывать через кнопку ниже.',
    reply_markup: keyboard
  });
}

async function sendError(chatId, text) {
  await tgApi('sendMessage', {
    chat_id: String(chatId),
    text: String(text || 'Произошла ошибка. Попробуйте ещё раз.')
  });
}

async function handleMessage(message) {
  if (!message || !message.chat || !message.chat.id) return;

  var chatId = message.chat.id;
  var text = String(message.text || '');
  var from = message.from || {};
  var telegramId = String(from.id || '');
  var username = String(from.username || '');
  var firstName = String(from.first_name || '').trim();
  var lastName = String(from.last_name || '').trim();

  if (text === '/start' || text === '/start bind_phone') {
    await sendBindKeyboard(chatId);
    return;
  }

  if (text === '/app' || text === '/open') {
    await sendOpenMiniAppMessage(chatId);
    return;
  }

  if (!message.contact) {
    await sendError(chatId, 'Для привязки используйте кнопку «📱 Поделиться номером». Если номер уже привязан, напишите /app.');
    return;
  }

  var contact = message.contact;
  var contactUserId = String(contact.user_id || '');

  if (contactUserId && telegramId && contactUserId !== telegramId) {
    await sendError(chatId, 'Пожалуйста, отправьте именно свой номер через системную кнопку Telegram.');
    return;
  }

  var phone = normalizePhone(contact.phone_number || '');

  if (!phone) {
    await sendError(chatId, 'Не удалось прочитать номер. Попробуйте ещё раз.');
    return;
  }

  var bindResult = await postJson(BITRIX_BIND_URL, {
    secret: BIND_SECRET,
    telegram_id: telegramId,
    username: username,
    first_name: firstName,
    last_name: lastName,
    phone: phone
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
  await sendOpenMiniAppMessage(chatId);
}

function sendJson(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

const server = http.createServer(function(req, res) {
  if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
    sendJson(res, 200, {
      ok: true,
      service: 'zma-telegram-bot',
      configured: isConfigured(),
      mini_app_url: MINI_APP_URL,
      bitrix_bind_url: BITRIX_BIND_URL
    });
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, message: 'Method not allowed' });
    return;
  }

  var raw = '';

  req.on('data', function(chunk) {
    raw += chunk;
  });

  req.on('end', function() {
    sendJson(res, 200, { ok: true });

    var update = safeJsonParse(raw);
    if (!update || !update.message) return;

    handleMessage(update.message).catch(async function(err) {
      log('[handleMessage error]', err && err.stack ? err.stack : err);
      var chatId = update && update.message && update.message.chat ? update.message.chat.id : null;
      if (!chatId) return;
      await sendError(chatId, 'Произошла ошибка. Попробуйте ещё раз.');
    });
  });
});

server.listen(PORT, function() {
  log('Bot server started on port ' + PORT);
});
