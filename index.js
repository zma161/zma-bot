const http = require('http');
const https = require('https');
const { URL } = require('url');

const BOT_TOKEN = process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN';
const MINI_APP_URL = process.env.MINI_APP_URL || 'https://zma24.ru/tg-app/';
const DEV_MINI_APP_URL = process.env.DEV_MINI_APP_URL || 'https://zma24.ru/tg-app-dev/';
const DEVELOPER_TELEGRAM_ID = String(process.env.DEVELOPER_TELEGRAM_ID || '277046374');
const BITRIX_BIND_URL = process.env.BITRIX_BIND_URL || 'https://zma24.ru/local/tools/tg_bind_phone_from_bot.php';
const BIND_SECRET = process.env.BIND_SECRET || 'YOUR_SHARED_SECRET';
const PORT = process.env.PORT || 3000;

function normalizePhone(phone) {
  let value = String(phone || '').replace(/\D+/g, '');
  if (value.length === 11 && value[0] === '8') value = '7' + value.slice(1);
  if (value.length === 10) value = '7' + value;
  return value;
}

function isDeveloperTelegramId(telegramId) {
  return String(telegramId || '') === DEVELOPER_TELEGRAM_ID;
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
        { text: 'рџ“± РџРѕРґРµР»РёС‚СЊСЃСЏ РЅРѕРјРµСЂРѕРј', request_contact: true }
      ]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  };

  await tgApi('sendMessage', {
    chat_id: String(chatId),
    text: 'РќР°Р¶РјРёС‚Рµ РєРЅРѕРїРєСѓ РЅРёР¶Рµ Рё РѕС‚РїСЂР°РІСЊС‚Рµ РєРѕРЅС‚Р°РєС‚ СЃ С‚РµРј Р¶Рµ РЅРѕРјРµСЂРѕРј, РєРѕС‚РѕСЂС‹Р№ СѓРєР°Р·Р°РЅ Сѓ РІР°СЃ РІ РјР°РіР°Р·РёРЅРµ.',
    reply_markup: keyboard
  });
}

async function removeReplyKeyboard(chatId) {
  await tgApi('sendMessage', {
    chat_id: String(chatId),
    text: 'вњ… РќРѕРјРµСЂ СѓСЃРїРµС€РЅРѕ РїСЂРёРІСЏР·Р°РЅ!',
    reply_markup: {
      remove_keyboard: true
    }
  });
}

async function setNativeTelegramMiniAppButton(chatId, telegramId = '') {
  const isDeveloper = isDeveloperTelegramId(telegramId || chatId);

  await tgApi('setChatMenuButton', {
    chat_id: String(chatId),
    menu_button: {
      type: 'web_app',
      text: isDeveloper ? 'DEV РїСЂРёР»РѕР¶РµРЅРёРµ' : 'РћС‚РєСЂС‹С‚СЊ РїСЂРёР»РѕР¶РµРЅРёРµ',
      web_app: {
        url: isDeveloper ? DEV_MINI_APP_URL : MINI_APP_URL
      }
    }
  });
}

async function sendDeveloperMiniAppButton(chatId) {
  await setNativeTelegramMiniAppButton(chatId, DEVELOPER_TELEGRAM_ID);

  await tgApi('sendMessage', {
    chat_id: String(chatId),
    text: 'рџ›  DEV-РєРЅРѕРїРєР° РІРєР»СЋС‡РµРЅР° С‚РѕР»СЊРєРѕ РґР»СЏ СЂР°Р·СЂР°Р±РѕС‚С‡РёРєР°. РћР±С‹С‡РЅС‹Рµ РїРѕР»СЊР·РѕРІР°С‚РµР»Рё РїСЂРѕРґРѕР»Р¶Р°СЋС‚ РѕС‚РєСЂС‹РІР°С‚СЊ СЃС‚Р°Р±РёР»СЊРЅСѓСЋ РІРµСЂСЃРёСЋ РїСЂРёР»РѕР¶РµРЅРёСЏ.',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'РћС‚РєСЂС‹С‚СЊ DEV Mini App',
            web_app: {
              url: DEV_MINI_APP_URL
            }
          }
        ],
        [
          {
            text: 'РћС‚РєСЂС‹С‚СЊ РѕР±С‹С‡РЅСѓСЋ РІРµСЂСЃРёСЋ',
            web_app: {
              url: MINI_APP_URL
            }
          }
        ]
      ]
    }
  });
}

async function sendSuccessMessage(chatId) {
  await tgApi('sendMessage', {
    chat_id: String(chatId),
    text: 'рџ§Ў РџСЂРёР»РѕР¶РµРЅРёРµ РјР°РіР°Р·РёРЅР° С‚РµРїРµСЂСЊ РґРѕСЃС‚СѓРїРЅР° С‡РµСЂРµР· РєРЅРѕРїРєСѓ РІ РЅРёР¶РЅРµРј Р»РµРІРѕРј СѓРіР»Сѓ.'
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

  if (text === '/dev') {
    if (!isDeveloperTelegramId(telegramId)) {
      await sendError(chatId, 'DEV-РєРЅРѕРїРєР° РґРѕСЃС‚СѓРїРЅР° С‚РѕР»СЊРєРѕ СЂР°Р·СЂР°Р±РѕС‚С‡РёРєСѓ.');
      return;
    }

    await sendDeveloperMiniAppButton(chatId);
    return;
  }

  if (text === '/start' || text === '/start bind_phone') {
    await sendBindKeyboard(chatId);
    return;
  }

  if (!message.contact) {
    await sendError(chatId, 'Р”Р»СЏ РїСЂРёРІСЏР·РєРё РёСЃРїРѕР»СЊР·СѓР№С‚Рµ РєРЅРѕРїРєСѓ В«рџ“± РџРѕРґРµР»РёС‚СЊСЃСЏ РЅРѕРјРµСЂРѕРјВ».');
    return;
  }

  const contact = message.contact;
  const contactUserId = String(contact.user_id || '');

  if (contactUserId && telegramId && contactUserId !== telegramId) {
    await sendError(chatId, 'РџРѕР¶Р°Р»СѓР№СЃС‚Р°, РѕС‚РїСЂР°РІСЊС‚Рµ РёРјРµРЅРЅРѕ СЃРІРѕР№ РЅРѕРјРµСЂ С‡РµСЂРµР· СЃРёСЃС‚РµРјРЅСѓСЋ РєРЅРѕРїРєСѓ Telegram.');
    return;
  }

  const phone = normalizePhone(contact.phone_number || '');

  if (!phone) {
    await sendError(chatId, 'РќРµ СѓРґР°Р»РѕСЃСЊ РїСЂРѕС‡РёС‚Р°С‚СЊ РЅРѕРјРµСЂ. РџРѕРїСЂРѕР±СѓР№С‚Рµ РµС‰С‘ СЂР°Р·.');
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
    await sendError(chatId, 'РќРµ СѓРґР°Р»РѕСЃСЊ СЃРІСЏР·Р°С‚СЊСЃСЏ СЃ СЃРµСЂРІРµСЂРѕРј РјР°РіР°Р·РёРЅР°. РџРѕРїСЂРѕР±СѓР№С‚Рµ РµС‰С‘ СЂР°Р· РїРѕР·Р¶Рµ.');
    return;
  }

  if (!bindResult.ok) {
    await sendError(chatId, String(bindResult.message || 'РќРµ СѓРґР°Р»РѕСЃСЊ РїСЂРёРІСЏР·Р°С‚СЊ РЅРѕРјРµСЂ. РџРѕРїСЂРѕР±СѓР№С‚Рµ РµС‰С‘ СЂР°Р· РїРѕР·Р¶Рµ.'));
    return;
  }

  await removeReplyKeyboard(chatId);
  await setNativeTelegramMiniAppButton(chatId, telegramId);
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

      await sendError(chatId, 'РџСЂРѕРёР·РѕС€Р»Р° РѕС€РёР±РєР°. РџРѕРїСЂРѕР±СѓР№С‚Рµ РµС‰С‘ СЂР°Р·.');
    });
  });
});

server.listen(PORT, () => {
  console.log(`Bot server started on port ${PORT}`);
});
