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

const T = {
  sharePhoneButton: '\uD83D\uDCF1 \u041F\u043E\u0434\u0435\u043B\u0438\u0442\u044C\u0441\u044F \u043D\u043E\u043C\u0435\u0440\u043E\u043C',
  bindPrompt: '\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u043A\u043D\u043E\u043F\u043A\u0443 \u043D\u0438\u0436\u0435 \u0438 \u043E\u0442\u043F\u0440\u0430\u0432\u044C\u0442\u0435 \u043A\u043E\u043D\u0442\u0430\u043A\u0442 \u0441 \u0442\u0435\u043C \u0436\u0435 \u043D\u043E\u043C\u0435\u0440\u043E\u043C, \u043A\u043E\u0442\u043E\u0440\u044B\u0439 \u0443\u043A\u0430\u0437\u0430\u043D \u0443 \u0432\u0430\u0441 \u0432 \u043C\u0430\u0433\u0430\u0437\u0438\u043D\u0435.',
  bindSuccess: '\u2705 \u041D\u043E\u043C\u0435\u0440 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u043D!',
  openAppMenu: '\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435',
  devInlineButton: 'DEV',
  publicInlineButton: '\u041F\u0443\u0431\u043B\u0438\u0447\u043D\u0430\u044F',
  devReady: '\uD83D\uDEE0 \u0414\u043B\u044F \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A\u0430 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B \u0434\u0432\u0435 \u043A\u043D\u043E\u043F\u043A\u0438: DEV \u0438 \u043F\u0443\u0431\u043B\u0438\u0447\u043D\u0430\u044F \u0432\u0435\u0440\u0441\u0438\u044F. \u041D\u0438\u0436\u043D\u044F\u044F \u0441\u0438\u0441\u0442\u0435\u043C\u043D\u0430\u044F \u043A\u043D\u043E\u043F\u043A\u0430 \u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u0430 \u043F\u0443\u0431\u043B\u0438\u0447\u043D\u043E\u0439.',
  successPublic: '\uD83E\uDDE1 \u041F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u043C\u0430\u0433\u0430\u0437\u0438\u043D\u0430 \u0442\u0435\u043F\u0435\u0440\u044C \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0447\u0435\u0440\u0435\u0437 \u043A\u043D\u043E\u043F\u043A\u0443 \u0432 \u043D\u0438\u0436\u043D\u0435\u043C \u043B\u0435\u0432\u043E\u043C \u0443\u0433\u043B\u0443.',
  devOnly: 'DEV-\u043A\u043D\u043E\u043F\u043A\u0430 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u0442\u043E\u043B\u044C\u043A\u043E \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A\u0443.',
  publicEnabled: '\u041F\u0443\u0431\u043B\u0438\u0447\u043D\u0430\u044F \u043A\u043D\u043E\u043F\u043A\u0430 \u0432\u043A\u043B\u044E\u0447\u0435\u043D\u0430. \u0421\u0442\u0430\u0440\u0430\u044F \u043D\u0438\u0436\u043D\u044F\u044F \u043A\u043B\u0430\u0432\u0438\u0430\u0442\u0443\u0440\u0430 \u0443\u0431\u0440\u0430\u043D\u0430.',
  contactRequired: '\u0414\u043B\u044F \u043F\u0440\u0438\u0432\u044F\u0437\u043A\u0438 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u043A\u043D\u043E\u043F\u043A\u0443 \u00AB\uD83D\uDCF1 \u041F\u043E\u0434\u0435\u043B\u0438\u0442\u044C\u0441\u044F \u043D\u043E\u043C\u0435\u0440\u043E\u043C\u00BB.',
  ownPhoneRequired: '\u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u043E\u0442\u043F\u0440\u0430\u0432\u044C\u0442\u0435 \u0438\u043C\u0435\u043D\u043D\u043E \u0441\u0432\u043E\u0439 \u043D\u043E\u043C\u0435\u0440 \u0447\u0435\u0440\u0435\u0437 \u0441\u0438\u0441\u0442\u0435\u043C\u043D\u0443\u044E \u043A\u043D\u043E\u043F\u043A\u0443 Telegram.',
  phoneReadFailed: '\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C \u043D\u043E\u043C\u0435\u0440. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.',
  serverFailed: '\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u0432\u044F\u0437\u0430\u0442\u044C\u0441\u044F \u0441 \u0441\u0435\u0440\u0432\u0435\u0440\u043E\u043C \u043C\u0430\u0433\u0430\u0437\u0438\u043D\u0430. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437 \u043F\u043E\u0437\u0436\u0435.',
  bindFailed: '\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u0442\u044C \u043D\u043E\u043C\u0435\u0440. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437 \u043F\u043E\u0437\u0436\u0435.',
  genericError: '\u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.'
};

function normalizePhone(phone) {
  let value = String(phone || '').replace(/\D+/g, '');
  if (value.length === 11 && value[0] === '8') value = '7' + value.slice(1);
  if (value.length === 10) value = '7' + value;
  return value;
}

function isDeveloperTelegramId(telegramId) {
  return String(telegramId || '') === DEVELOPER_TELEGRAM_ID;
}

function webAppUrl(baseUrl, branch) {
  const u = new URL(baseUrl);
  u.searchParams.set('zma_branch', branch);
  u.searchParams.set('v', '932');
  return u.toString();
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

    const bodyText = body.toString();

    const req = https.request(
      {
        hostname: 'api.telegram.org',
        path: `/bot${BOT_TOKEN}/${method}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Content-Length': Buffer.byteLength(bodyText),
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

    req.write(bodyText);
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

async function removeReplyKeyboard(chatId, text = '') {
  await tgApi('sendMessage', {
    chat_id: String(chatId),
    text: text || T.bindSuccess,
    reply_markup: {
      remove_keyboard: true
    }
  });
}

async function sendBindKeyboard(chatId) {
  const keyboard = {
    keyboard: [
      [
        { text: T.sharePhoneButton, request_contact: true }
      ]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  };

  await tgApi('sendMessage', {
    chat_id: String(chatId),
    text: T.bindPrompt,
    reply_markup: keyboard
  });
}

async function setPublicNativeMiniAppButton(chatId = null) {
  const payload = {
    menu_button: {
      type: 'web_app',
      text: T.openAppMenu,
      web_app: {
        url: webAppUrl(MINI_APP_URL, 'public')
      }
    }
  };

  if (chatId) payload.chat_id = String(chatId);

  await tgApi('setChatMenuButton', payload);
}

async function sendDeveloperMiniAppButtons(chatId) {
  await setPublicNativeMiniAppButton(chatId);

  await removeReplyKeyboard(chatId, T.devReady);

  await tgApi('sendMessage', {
    chat_id: String(chatId),
    text: T.devReady,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: T.devInlineButton,
            web_app: {
              url: webAppUrl(DEV_MINI_APP_URL, 'dev')
            }
          },
          {
            text: T.publicInlineButton,
            web_app: {
              url: webAppUrl(MINI_APP_URL, 'public')
            }
          }
        ]
      ]
    }
  });
}

async function sendSuccessMessage(chatId, telegramId = '') {
  if (isDeveloperTelegramId(telegramId)) {
    await sendDeveloperMiniAppButtons(chatId);
    return;
  }

  await tgApi('sendMessage', {
    chat_id: String(chatId),
    text: T.successPublic
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
      await setPublicNativeMiniAppButton(chatId);
      await sendError(chatId, T.devOnly);
      return;
    }

    await sendDeveloperMiniAppButtons(chatId);
    return;
  }

  if (text === '/public') {
    await setPublicNativeMiniAppButton(chatId);
    await removeReplyKeyboard(chatId, T.publicEnabled);
    return;
  }

  if (text === '/start' || text === '/start bind_phone') {
    await setPublicNativeMiniAppButton(chatId);
    await sendBindKeyboard(chatId);
    return;
  }

  if (!message.contact) {
    await setPublicNativeMiniAppButton(chatId);
    await sendError(chatId, T.contactRequired);
    return;
  }

  const contact = message.contact;
  const contactUserId = String(contact.user_id || '');

  if (contactUserId && telegramId && contactUserId !== telegramId) {
    await sendError(chatId, T.ownPhoneRequired);
    return;
  }

  const phone = normalizePhone(contact.phone_number || '');

  if (!phone) {
    await sendError(chatId, T.phoneReadFailed);
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
    await sendError(chatId, T.serverFailed);
    return;
  }

  if (!bindResult.ok) {
    await sendError(chatId, String(bindResult.message || T.bindFailed));
    return;
  }

  await removeReplyKeyboard(chatId, T.bindSuccess);
  await setPublicNativeMiniAppButton(chatId);
  await sendSuccessMessage(chatId, telegramId);
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

      await sendError(chatId, T.genericError);
    });
  });
});

server.listen(PORT, () => {
  console.log(`Bot server started on port ${PORT}`);
  setPublicNativeMiniAppButton().catch(() => {});
});
