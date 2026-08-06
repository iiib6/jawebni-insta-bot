const express = require('express');
const app = express();

app.use(express.json());

// CONFIGURATION (Environment variables with defaults)
const PORT = process.env.PORT || 3005;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyB5vt6NoqoUjI8Z0WIzdYyw7cbyrj4d_Pk';
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN || 'IGAAgiFmQluypBZAGFwSzlSa0V5ZA2hqOTlGcDVkMWdjUmRhZAGVFYTZAPc0oydVdRSnZAORURYdkp0a1VubzctSk9qVUpxcU5DMThRT2pQNmZAWTFdLLXBJeGxQY3B6ZAmE1bEpfQ2p0LUhDcFhsekRQZATFIRFBmdFFoY19DV21TX291cwZDZD';
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'jawebni_token_2026';

// In-memory state for rate limiting & deduplication
const seenMids = new Set();

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
- بدلها حتماً: أكدر، أكلك، كلي، كتلك، كال، يكول، هنا، صدك؟، أعرضلك، شلون، أريد، هيچ، هسه، هواي، زين.

---\n\n## 3. حفظ واستخراج البيانات
يجب أن تعيد إجابتك بصيغة JSON تحتوي الحقول التالية دائماً:
{
  "reply": "نص الرد الموجه للزبون باللهجة العراقية",
  "name": "اسم الزبون إذا ذكره أو فارغ",
  "phone": "رقم هاتف الزبون يبدأ بـ 0 إذا ذكره أو فارغ",
  "details_complete": true أو false
}`;

// Root endpoint for status
app.get('/', (req, res) => {
  res.send('🚀 Jawebni Instagram & Messenger AI Bot Server is Live 24/7!');
});

// Meta Webhook Verification (GET)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

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
    if (body.object !== 'instagram' && body.object !== 'page') return;

    const isInstagram = body.object === 'instagram';
    const messaging = body.entry?.[0]?.messaging?.[0];
    if (!messaging || messaging.message?.is_echo || messaging.read || messaging.delivery) return;

    const senderId = messaging.sender?.id;
    const mid = messaging.message?.mid;
    const messageText = messaging.message?.text || '';
    const attachment = messaging.message?.attachments?.[0];

    // Deduplication check
    if (mid) {
      if (seenMids.has(mid)) return;
      seenMids.add(mid);
      if (seenMids.size > 500) seenMids.clear();
    }

    // Send typing indicator
    await sendTyping(senderId, isInstagram);

    let userPrompt = messageText;

    // Handle Audio Message
    if (attachment && attachment.type === 'audio' && attachment.payload?.url) {
      const transcribedText = await transcribeAudio(attachment.payload.url);
      if (transcribedText) {
        userPrompt = transcribedText;
      } else {
        userPrompt = 'دزيت فويس، عذراً ما كدرت أسمعه أعد إرساله نصاً رجاءً.';
      }
    }

    if (!userPrompt && attachment && attachment.type === 'image') {
      userPrompt = 'دزيت صورة، شنو تحب أعرضلك عنها؟';
    }

    if (!userPrompt) return;

    // Call Gemini AI
    const aiResponse = await callGeminiAI(userPrompt);

    // Process & Clean AI reply
    let replyText = aiResponse.reply || 'تم استلام رسالتك، لحظة رجاءً.';
    replyText = replyText.replace(/\n{3,}/g, '\n\n').trim();

    // Send Direct Reply (Supports both Instagram & Messenger)
    await sendReply(senderId, replyText, isInstagram);

    console.log(`[BOT REPLY to ${senderId} (${isInstagram ? 'Instagram' : 'Messenger'})]: ${replyText}`);
  } catch (err) {
    console.error('Error processing webhook event:', err);
  }
});

// Helper: Send Typing Indicator
async function sendTyping(recipientId, isInstagram) {
  try {
    const url = isInstagram
      ? `https://graph.instagram.com/v26.0/me/messages?access_token=${INSTAGRAM_ACCESS_TOKEN}`
      : `https://graph.facebook.com/v19.0/me/messages?access_token=${INSTAGRAM_ACCESS_TOKEN}`;

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
        ],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });
    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return JSON.parse(rawText);
  } catch (e) {
    console.error('Gemini API error:', e.message);
    return { reply: 'أهلاً بك بـ جاوبني! شلون أقدر أساعدك اليوم؟' };
  }
}

// Helper: Send Reply
async function sendReply(recipientId, text, isInstagram) {
  try {
    const url = isInstagram
      ? `https://graph.instagram.com/v26.0/me/messages?access_token=${INSTAGRAM_ACCESS_TOKEN}`
      : `https://graph.facebook.com/v19.0/me/messages?access_token=${INSTAGRAM_ACCESS_TOKEN}`;

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: text }
      })
    });
  } catch (e) {
    console.error('Send reply error:', e.message);
  }
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
