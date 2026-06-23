# 大阪行記帳 — 共用後端部署說明

讓 `osaka_expense_tracker.html` 變成「大家共用同一份帳本」,並讓拍收據辨識真正能用。
後端用 **Cloudflare Workers + D1**,免費額度對一趟旅行綽綽有餘。

## 你需要
- 一個免費的 [Cloudflare 帳號](https://dash.cloudflare.com/sign-up)
- 電腦上安裝 Node.js,然後安裝 wrangler:
  ```bash
  npm install -g wrangler
  wrangler login
  ```

## 一、建立 D1 資料庫
在 `osaka-worker/` 目錄下執行:
```bash
cd osaka-worker
wrangler d1 create osaka_tracker
```
它會印出一段 `database_id = "xxxxxxxx-..."`。把這個 ID 貼進 `wrangler.toml` 的 `database_id`。

接著建立資料表:
```bash
wrangler d1 execute osaka_tracker --remote --file=./schema.sql
```

## 二、設定 Anthropic API 金鑰(拍收據辨識用)
到 https://console.anthropic.com/ 取得一把 API key,然後:
```bash
wrangler secret put ANTHROPIC_API_KEY
```
貼上金鑰按 Enter。金鑰只存在 Cloudflare 後端,不會出現在網頁原始碼裡。
> 若暫時不用拍收據功能,可略過這步;手動記帳仍可正常共用。

## 三、部署 Worker
```bash
wrangler deploy
```
完成後會得到一個網址,例如:
```
https://osaka-tracker.你的帳號.workers.dev
```

## 四、把前端接上後端
打開 `osaka_expense_tracker.html`,找到這一行:
```js
const API_BASE = '';
```
改成你的 Worker 網址:
```js
const API_BASE = 'https://osaka-tracker.你的帳號.workers.dev';
```
存檔、重新上傳到 GitHub Pages(或你放網頁的地方)。

## 完成 🎉
- 任何人打開這個網頁,看到的都是**同一份帳本**,新增/刪除即時同步(每 6 秒自動刷新)。
- 不需密碼;知道網址的人就能用。想之後加密碼或登入再告訴我。

## 常見問題
- **改了金額別人沒更新?** 網頁每 6 秒自動拉一次;正在開新增視窗時會暫停刷新,關掉就會更新。
- **拍收據失敗?** 多半是 `ANTHROPIC_API_KEY` 沒設定,或 D1 的 `database_id` 沒填對。用 `wrangler tail` 看後端 log。
- **想限制只有自己的網站能呼叫?** 把 `wrangler.toml` 裡 `ALLOW_ORIGIN` 從 `"*"` 改成你的網頁網址再 `wrangler deploy`。
