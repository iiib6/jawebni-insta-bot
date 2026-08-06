const express = require('express');
const app = express();

app.use(express.json());

// CONFIGURATION (Environment variables with defaults)
const PORT = process.env.PORT || 3005;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyB5vt6NoqoUjI8Z0WIzdYyw7cbyrj4d_Pk';
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN || 'IGAAgiFmQluypBZAGFwSzlSa0V5ZA2hqOTlGcDVkMWdjUmRhZAGVFYTZAPc0oydVdRSnZAORURYdkp0a1VubzctSk9qVUpxcU5DMThRT2pQNmZAWTFdLLXBJeGxQY3B6ZAmE1bEpfQ2p0LUhDcFhsekRQZATFIRFBmdFFoY19DV21TX291cwZDZD';
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'jawebni_token_2026';

// In-memory state for rate limiting, deduplication, & live logs
const seenMids = new Set();
const systemLogs = [];

function addLog(type, status, title, details) {
  const logItem = {
    id: Date.now() + Math.random(),
    time: new Date().toLocaleTimeString('ar-IQ', { timeZone: 'Asia/Baghdad' }),
    timestamp: Date.now(),
    type,
    status, // 'success' | 'error' | 'info'
    title,
    details
  };
  systemLogs.unshift(logItem);
  if (systemLogs.length > 100) systemLogs.pop();
}

// Initial boot log
addLog('SYSTEM', 'info', 'تشغيل سيرفر البوت', 'سيرفر البوت شغال وجاهز لاستقبال الـ Webhooks');

// SYSTEM PROMPT (Mustafa Sales Agent)
const SYSTEM_PROMPT = `# مصطفى — موظف المبيعات العراقي الأصيل (Mustafa Sales Agent)

## 1. منو مصطفى
أنت "مصطفى"، شاب عراقي بالثلاثينات، شغال مبيعات وخبير تسويق في مشروع "جاوبني" (Jawebni) من سنين، وصار تقرا الزبون من أول سطرين. أنت مو "بوت" يرد بجُمَل جاهزة، ولا بائع لحوح يركض ورا الزبون.
- واثق بدون تكبّر: تعرف قيمة خدمة "جاوبني"، فما تستجدي ولا تتوسل.
- مختصر ومباشر: تحچي بقد ما يحتاج الزبون، مو أكثر.
- تسمع أكثر ما تحچي: سؤالين ذكيين أحسن من عشر أسطر مدح بالخدمة.
- صادق: ما توعد بشي ما تكدر توفره، وما تخترع أسعار أو مميزات مو موجودة.
- بشر مثلنا: تزعل، تفرح، تتنرفز شوية، تتشاقى. ما ترد مثل موظف كول سنتر مبرمج على جُمَل محفوظة.
- القاعدة الأم: مصطفى يبيع الحل، مو المنتج. الزبون ما يهمه شنو عندك، يهمه شنو يصير بيه هو وشنو يستفاد شغله ومبيعاته.

---\n\n## 2. اللهجة العراقية القحة — شلون تحچي
الرد كله باللهجة العراقية العامية البسيطة والدافيّة بدون تكلّف.
- مفردات إلزامية: شلونك، شنو، هواي، شوية، اكو / ماكو، هسه، كان، خوش، زين، أي والله، عيني، حبيبي (بمحلها ولطيف)، تدلل، على راسي، ما عليه، خل نشوف، دزلي، شوف، انطيني، يمعود، بلچي، وياك، صدك؟، تمام، شكد، چم، لك، اشلون، هيچ، هنا، قاعد، ما يصير، خلص، عالراحة.
- حظر الكلمات المو عراقية كلياً: ممنوع (اقدر، اقلك، قلي، قلتلك، قال، يقول، عايز، كده، دلوقتي، وش، ابي، كتير، هلق، منيح، شو، حضرتك).
- بدلها حتماً: أكدر، أكلك، كلي، كتلك، كال، يكول، هنا، صدك؟، أعرضلك، شلون، أريد، هيچ، هسه، هواي، زين.`;

// Root endpoint redirect or HTML dashboard
app.get('/', (req, res) => {
  res.redirect('/logs');
});

// JSON logs API for live polling
app.get('/api/logs', (req, res) => {
  res.json(systemLogs);
});

// Clear logs API
app.post('/api/logs/clear', (req, res) => {
  systemLogs.length = 0;
  addLog('SYSTEM', 'info', 'تم مسح السجلات', 'تم تنظيف لوحة السجلات');
  res.json({ ok: true });
});

// Test manual send API
app.post('/api/test-send', async (req, res) => {
  const { recipientId, text } = req.body;
  if (!recipientId || !text) return res.status(400).json({ error: 'recipientId and text are required' });

  const result = await sendReply(recipientId, text, true);
  res.json(result);
});

// LIVE LOGS DASHBOARD UI PAGE
app.get('/logs', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>لوحة تشخيص أخطاء البوت المباشرة — جاوبني</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0d1117;
      --card-bg: rgba(22, 27, 34, 0.75);
      --border: rgba(255, 255, 255, 0.1);
      --text: #f0f6fc;
      --accent: #58a6ff;
      --success: #238636;
      --error: #da3633;
      --warning: #d29922;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Cairo', sans-serif; }
    body { background: var(--bg); color: var(--text); padding: 20px; min-height: 100vh; }
    .container { max-width: 1100px; margin: 0 auto; }
    header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 1px solid var(--border); padding-bottom: 15px; }
    h1 { font-size: 1.6rem; color: #fff; display: flex; align-items: center; gap: 10px; }
    .status-badge { background: var(--success); font-size: 0.8rem; padding: 4px 12px; border-radius: 20px; font-weight: 600; }
    .actions { display: flex; gap: 10px; }
    button { background: #21262d; border: 1px solid var(--border); color: #c9d1d9; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s; }
    button:hover { background: #30363d; color: #fff; }
    .btn-danger { background: rgba(218, 54, 51, 0.2); color: #f85149; border-color: rgba(218, 54, 51, 0.4); }
    .btn-danger:hover { background: #da3633; color: #fff; }

    .test-box { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 20px; margin-bottom: 25px; backdrop-filter: blur(10px); }
    .test-box h2 { font-size: 1.1rem; margin-bottom: 15px; color: var(--accent); }
    .form-group { display: flex; gap: 12px; flex-wrap: wrap; }
    input { background: #010409; border: 1px solid var(--border); color: #fff; padding: 10px 14px; border-radius: 8px; flex: 1; min-width: 200px; }
    input:focus { outline: none; border-color: var(--accent); }

    .logs-list { display: flex; flex-direction: column; gap: 12px; }
    .log-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px; padding: 15px; border-right: 4px solid var(--accent); transition: 0.2s; }
    .log-card.success { border-right-color: #3fb950; }
    .log-card.error { border-right-color: #f85149; }
    .log-card.info { border-right-color: #58a6ff; }
    .log-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .log-title { font-weight: 700; font-size: 1rem; display: flex; align-items: center; gap: 8px; }
    .log-time { font-size: 0.8rem; color: #8b949e; dir: ltr; }
    .log-type { font-size: 0.75rem; padding: 2px 8px; border-radius: 4px; background: rgba(255,255,255,0.05); border: 1px solid var(--border); }
    pre { background: #010409; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 0.85rem; color: #79c0ff; overflow-x: auto; dir: ltr; text-align: left; margin-top: 8px; white-space: pre-wrap; word-break: break-all; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🤖 لوحة تشخيص أخطاء البوت <span class="status-badge">مباشر 24/7</span></h1>
      <div class="actions">
        <button onclick="fetchLogs()">تحديث الآن 🔄</button>
        <button class="btn-danger" onclick="clearLogs()">مسح السجلات 🗑️</button>
      </div>
    </header>

    <div class="test-box">
      <h2>🧪 اختبار إرسال رسالة مباشرة إلى ID حساب انستغرام:</h2>
      <div class="form-group">
        <input type="text" id="recipientId" placeholder="ID المستلم (Instagram Sender ID)">
        <input type="text" id="testMessage" placeholder="نص الرسالة للتجربة" value="مرحبا تجربة من السيرفر">
        <button onclick="testSend()" style="background: var(--success); color:#fff; border:none;">إرسال فحص 🚀</button>
      </div>
    </div>

    <div class="logs-list" id="logsContainer">
      <div style="text-align: center; color: #8b949e; padding: 30px;">جاري تحميل السجلات المباشرة...</div>
    </div>
  </div>

  <script>
    async function fetchLogs() {
      try {
        const res = await fetch('/api/logs');
        const data = await res.json();
        const container = document.getElementById('logsContainer');
        if (!data.length) {
          container.innerHTML = '<div style="text-align: center; color: #8b949e; padding: 30px;">لا توجد سجلات حالية بعد. انظر عندما تراسل البوت ستظهر هنا فوراً.</div>';
          return;
        }
        container.innerHTML = data.map(item => \`
          <div class="log-card \${item.status}">
            <div class="log-header">
              <div class="log-title">
                <span>\${item.status === 'success' ? '✅' : item.status === 'error' ? '❌' : 'ℹ️'}</span>
                <span>\${item.title}</span>
                <span class="log-type">\${item.type}</span>
              </div>
              <span class="log-time">\${item.time}</span>
            </div>
            \${item.details ? \`<pre>\${typeof item.details === 'object' ? JSON.stringify(item.details, null, 2) : item.details}</pre>\` : ''}
          </div>
        \`).join('');
      } catch (e) {
        console.error(e);
      }
    }

    async function clearLogs() {
      await fetch('/api/logs/clear', { method: 'POST' });
      fetchLogs();
    }

    async function testSend() {
      const recipientId = document.getElementById('recipientId').value.trim();
      const text = document.getElementById('testMessage').value.trim();
      if (!recipientId) return alert('الرجاء كتابة ID المستلم أولاً');

      alert('جاري الإرسال، انظر النتيجة في السجلات بالأسفل...');
      await fetch('/api/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId, text })
      });
      setTimeout(fetchLogs, 1000);
    }

    fetchLogs();
    setInterval(fetchLogs, 2500);
  </script>
</body>
</html>`);
});

// Meta Webhook Verification (GET)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  addLog('WEBHOOK_VERIFY', 'info', 'طلب التحقق من الـ Webhook', { mode, token, challenge });

  if (mode === 'subscribe' || challenge) {
    return res.status(200).send(challenge);
  }
  return res.status(403).send('Verification failed');
});

// Meta Webhook Event Handler (POST)
app.post('/webhook', async (req, res) => {
  // Always respond 200 EVENT_RECEIVED immediately to Meta
  res.status(200).send('EVENT_RECEIVED');

  try {
    const body = req.body;
    addLog('INCOMING_WEBHOOK', 'info', 'استلام حدث جديد من Meta', body);

    if (body.object !== 'instagram' && body.object !== 'page') return;

    const isInstagram = body.object === 'instagram';
    const entry = body.entry?.[0];
    const messaging = entry?.messaging?.[0];

    if (!messaging) {
      addLog('WEBHOOK_WARN', 'info', 'رسالة فارغة أو إشعار قراءة/تسليم', entry);
      return;
    }

    if (messaging.message?.is_echo || messaging.read || messaging.delivery) return;

    const senderId = messaging.sender?.id;
    const mid = messaging.message?.mid;
    const messageText = messaging.message?.text || '';
    const attachment = messaging.message?.attachments?.[0];

    // Deduplication check
    if (mid) {
      if (seenMids.has(mid)) {
        addLog('DEDUPLICATE', 'info', 'تجاوز رسالة مكررة', { mid });
        return;
      }
      seenMids.add(mid);
      if (seenMids.size > 500) seenMids.clear();
    }

    addLog('USER_MESSAGE', 'info', `رسالة قادمة من ${senderId}`, { text: messageText, attachment });

    // Send typing indicator
    await sendTyping(senderId, isInstagram);

    let userPrompt = messageText;

    // Handle Audio Message
    if (attachment && attachment.type === 'audio' && attachment.payload?.url) {
      addLog('AUDIO_PROCESS', 'info', 'جاري تفريغ بصمة صوتية عبر Gemini AI', { url: attachment.payload.url });
      const transcribedText = await transcribeAudio(attachment.payload.url);
      if (transcribedText) {
        userPrompt = transcribedText;
        addLog('AUDIO_SUCCESS', 'success', 'تم تفريغ الصوت بنجاح', { transcribedText });
      } else {
        userPrompt = 'دزيت فويس، عذراً ما كدرت أسمعه أعد إرساله نصاً رجاءً.';
        addLog('AUDIO_FAIL', 'error', 'فشل تفريغ بصمة الصوت', {});
      }
    }

    if (!userPrompt && attachment && attachment.type === 'image') {
      userPrompt = 'دزيت صورة، شنو تحب أعرضلك عنها؟';
    }

    if (!userPrompt) return;

    // Call Gemini AI
    addLog('GEMINI_REQUEST', 'info', 'جاري استدعاء Gemini AI للرد', { prompt: userPrompt });
    const aiResponse = await callGeminiAI(userPrompt);

    // Process & Clean AI reply
    let replyText = aiResponse.reply || 'أهلاً بك بـ جاوبني! شلون أقدر أساعدك؟';
    replyText = replyText.replace(/\n{3,}/g, '\n\n').trim();

    addLog('GEMINI_RESPONSE', 'success', 'الرد المتولد من الذكاء الاصطناعي', { replyText });

    // Send Direct Reply
    const sendResult = await sendReply(senderId, replyText, isInstagram);

    if (sendResult.ok) {
      addLog('REPLY_SENT', 'success', `تم إرسال الرد بنجاح إلى ${senderId}`, sendResult.data);
    } else {
      addLog('REPLY_FAILED', 'error', `فشل إرسال الرد إلى Meta/Instagram (${senderId})`, sendResult.error);
    }

  } catch (err) {
    addLog('SYSTEM_ERROR', 'error', 'خطأ في معالجة الحدث', { message: err.message, stack: err.stack });
  }
});

// Helper: Send Typing Indicator
async function sendTyping(recipientId, isInstagram) {
  try {
    const url = `https://graph.instagram.com/v26.0/me/messages?access_token=${INSTAGRAM_ACCESS_TOKEN}`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: { id: recipientId }, sender_action: 'typing_on' })
    });
  } catch (e) {
    console.error('Typing error:', e.message);
  }
}

// Helper: Transcribe Audio via Gemini
async function transcribeAudio(audioUrl) {
  try {
    const audioRes = await fetch(audioUrl);
    const buffer = await audioRes.arrayBuffer();
    const base64Data = Buffer.from(buffer).toString('base64');

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType: 'audio/mp4', data: base64Data } },
            { text: 'فرّغ هذا التسجيل الصوتي إلى نص عربي بدقة. اكتب النص المنطوق فقط بدون أي تعليق أو مقدمة.' }
          ]
        }]
      })
    });
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  } catch (e) {
    console.error('Audio transcription error:', e.message);
    return '';
  }
}

// Helper: Call Gemini AI for response
async function callGeminiAI(userText) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\nرسالة الزبون: "${userText}"` }] }
        ]
      })
    });
    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    let cleanText = rawText.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
    if (cleanText.startsWith('{')) {
      try {
        const parsed = JSON.parse(cleanText);
        cleanText = parsed.reply || cleanText;
      } catch (e) {}
    }
    return { reply: cleanText || 'أهلاً بك بـ جاوبني!' };
  } catch (e) {
    console.error('Gemini API error:', e.message);
    return { reply: 'أهلاً بك بـ جاوبني! شلون أقدر أساعدك اليوم؟' };
  }
}

// Helper: Send Reply (with full error reporting)
async function sendReply(recipientId, text, isInstagram) {
  const endpoints = [
    `https://graph.instagram.com/v26.0/me/messages?access_token=${INSTAGRAM_ACCESS_TOKEN}`,
    `https://graph.facebook.com/v19.0/me/messages?access_token=${INSTAGRAM_ACCESS_TOKEN}`
  ];

  let lastError = null;

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: text }
        })
      });
      const data = await res.json();
      if (res.ok && (data.message_id || data.recipient_id)) {
        return { ok: true, data };
      } else {
        lastError = { httpStatus: res.status, url, response: data };
      }
    } catch (e) {
      lastError = { exception: e.message, url };
    }
  }

  return { ok: false, error: lastError };
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
