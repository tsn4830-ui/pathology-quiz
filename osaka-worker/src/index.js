// 大阪行記帳 — 共用後端 (Cloudflare Worker + D1)
//
// 提供:
//   GET    /api/expenses        取得全部花費 + 匯率
//   POST   /api/expenses        新增一筆花費
//   DELETE /api/expenses/:id    刪除一筆花費
//   PUT    /api/rate            設定匯率
//   POST   /api/recognize       代理 Anthropic API 做收據辨識(金鑰藏在後端)
//
// 所有人讀寫同一個 D1 資料庫,所以是「大家共用」的。

function cors(env) {
  const origin = (env && env.ALLOW_ORIGIN) || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(data, env, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors(env) },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(env) });
    }

    try {
      // ---- 取得全部花費 + 匯率 ----
      if (path === '/api/expenses' && method === 'GET') {
        const { results } = await env.DB
          .prepare('SELECT id,date,name,amt,cat,pay,note FROM expenses ORDER BY created_at ASC')
          .all();
        const rateRow = await env.DB
          .prepare("SELECT v FROM settings WHERE k='rate'")
          .first();
        return json({ items: results || [], rate: rateRow ? rateRow.v : '0.21' }, env);
      }

      // ---- 新增一筆 ----
      if (path === '/api/expenses' && method === 'POST') {
        const b = await request.json();
        const id = String(b.id || ('i' + Date.now()));
        const amt = parseInt(b.amt, 10) || 0;
        if (!b.name || amt <= 0) return json({ error: 'name/amt required' }, env, 400);
        await env.DB
          .prepare('INSERT OR REPLACE INTO expenses (id,date,name,amt,cat,pay,note,created_at) VALUES (?,?,?,?,?,?,?,?)')
          .bind(id, b.date || '', String(b.name), amt, b.cat || 'other', b.pay || 'taishin', b.note || '', Date.now())
          .run();
        return json({ ok: true, id }, env);
      }

      // ---- 刪除一筆 ----
      const delMatch = path.match(/^\/api\/expenses\/(.+)$/);
      if (delMatch && method === 'DELETE') {
        await env.DB.prepare('DELETE FROM expenses WHERE id=?').bind(delMatch[1]).run();
        return json({ ok: true }, env);
      }

      // ---- 設定匯率 ----
      if (path === '/api/rate' && method === 'PUT') {
        const b = await request.json();
        await env.DB
          .prepare("INSERT OR REPLACE INTO settings (k,v) VALUES ('rate',?)")
          .bind(String(b.rate))
          .run();
        return json({ ok: true }, env);
      }

      // ---- 收據辨識(代理 Anthropic,金鑰藏後端)----
      if (path === '/api/recognize' && method === 'POST') {
        if (!env.ANTHROPIC_API_KEY) {
          return json({ error: 'ANTHROPIC_API_KEY not configured' }, env, 500);
        }
        const b = await request.json();
        const mediaType = b.mediaType || 'image/jpeg';
        const prompt = `你是收據辨識助手。從這張收據圖片擷取資訊,只回傳一個 JSON 物件,不要任何說明文字、不要 markdown 圍欄。格式:
{"store":"店名(簡短)","date":"MM-DD","total":數字,"pay":"taishin|cash|icoca|suica|other","category":"food|trans|shop|hotel|other","items":"主要品項摘要(簡短,逗號分隔)"}
規則:
- date 取收據上的消費日期,格式 MM-DD(例 06-24);讀不到就回 ""。
- total 取「合計」含稅總金額,純數字、無逗號或符號;讀不到就回 0。
- pay:出現 クレジット/カード/信用卡/VISA/Master → taishin;現金/CASH → cash;IC/交通系IC/ICOCA → icoca;Suica → suica;其餘 → other。預設 taishin。
- category:餐廳/咖啡/食物 → food;計程車/電車/JR/地鐵/巴士/車票 → trans;藥妝/百貨/便利商店/商店/伴手禮 → shop;飯店/旅館 → hotel;其餘 → other。`;
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 1000,
            messages: [{
              role: 'user',
              content: [
                { type: 'image', source: { type: 'base64', media_type: mediaType, data: b.image } },
                { type: 'text', text: prompt },
              ],
            }],
          }),
        });
        const data = await resp.json();
        const text = (data.content || []).filter(i => i.type === 'text').map(i => i.text).join('\n');
        const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        let j = {};
        try { j = JSON.parse(clean); } catch (e) { return json({ error: 'parse failed', raw: text }, env, 502); }
        return json({
          date: j.date || '',
          name: j.store || '收據',
          amt: parseInt(j.total, 10) || 0,
          pay: j.pay || 'taishin',
          cat: j.category || 'other',
          note: j.items || '',
        }, env);
      }

      return json({ error: 'not found' }, env, 404);
    } catch (err) {
      return json({ error: String(err && err.message || err) }, env, 500);
    }
  },
};
