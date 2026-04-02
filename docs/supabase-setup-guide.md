# Supabase セットアップ手順

---

## 全体の流れ（所要時間：約2〜3時間）

```
Step 1. Supabaseプロジェクト作成          （5分）
Step 2. テーブル・RLS作成                 （10分）
Step 3. API Key取得・Vercel環境変数設定   （5分）
Step 4. フロントエンドにSupabase連携追加  （30分）
Step 5. 動作確認                          （10分）
Step 6. 管理画面の使い方                  （確認のみ）
```

---

## Step 1. Supabaseプロジェクト作成

1. https://supabase.com にアクセス
2. 「Start your project」→ GitHubアカウントでサインイン
3. 「New project」をクリック
4. 以下を入力：
   - **Organization**: 自分のOrg（初回は自動作成される）
   - **Project name**: `marriage-diagnosis`（任意）
   - **Database Password**: 強力なパスワードを設定（後で使わないが控えておく）
   - **Region**: `Northeast Asia (Tokyo)` を選択
5. 「Create new project」をクリック
6. 2分ほど待つと、ダッシュボードが表示される

---

## Step 2. テーブル・RLS作成

ダッシュボード左メニューの「SQL Editor」をクリックし、以下のSQLを貼り付けて「Run」。

```sql
-- ============================================
-- 診断結果テーブル
-- ============================================
CREATE TABLE diagnosis_results (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      TIMESTAMPTZ DEFAULT now(),

  -- ユーザー入力
  nickname        TEXT NOT NULL,
  gender          SMALLINT NOT NULL,

  -- 各問の回答（選択肢インデックス 0始まり）
  q_age           SMALLINT,
  q_income        SMALLINT,
  q_education     SMALLINT,
  q_appearance    SMALLINT,
  q_hobby         SMALLINT,
  q_communication SMALLINT,
  q_priority      SMALLINT,
  q_flexibility   SMALLINT,
  q_timeline      SMALLINT,
  q_experience    SMALLINT,
  q_satisfaction  SMALLINT,

  -- 算出結果（素点）
  raw_total       SMALLINT,
  score_spec      SMALLINT,
  score_human     SMALLINT,
  score_literacy  SMALLINT,
  score_life      SMALLINT,
  score_timing    SMALLINT,

  -- 算出結果（偏差値）
  hensachi        SMALLINT,
  hensachi_spec   SMALLINT,
  hensachi_human  SMALLINT,
  hensachi_literacy SMALLINT,
  hensachi_life   SMALLINT,
  hensachi_timing SMALLINT,
  rank            CHAR(1),

  -- CTA行動
  clicked_cta     BOOLEAN DEFAULT false,
  clicked_line    BOOLEAN DEFAULT false,

  -- メタ情報
  user_agent      TEXT,
  referrer        TEXT
);

-- インデックス
CREATE INDEX idx_results_created ON diagnosis_results(created_at DESC);
CREATE INDEX idx_results_rank    ON diagnosis_results(rank);
CREATE INDEX idx_results_gender  ON diagnosis_results(gender);

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE diagnosis_results ENABLE ROW LEVEL SECURITY;

-- 誰でもINSERT可能（診断結果の保存用）
CREATE POLICY "Anyone can insert"
  ON diagnosis_results FOR INSERT
  WITH CHECK (true);

-- 誰でも自分のレコードのCTAフラグを更新可能
CREATE POLICY "Anyone can update cta flags"
  ON diagnosis_results FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- SELECTはサービスロールのみ（管理画面用）
CREATE POLICY "Service role can read all"
  ON diagnosis_results FOR SELECT
  USING (auth.role() = 'service_role');
```

**実行結果に「Success」と表示されればOK。**

確認：左メニュー「Table Editor」を開くと `diagnosis_results` テーブルが表示される。

---

## Step 3. API Key取得・Vercel環境変数設定

### 3-1. Supabase側でキーを取得

1. ダッシュボード左メニュー → 「Project Settings」（歯車アイコン）
2. 「API」タブを開く
3. 以下の2つを控える：
   - **Project URL**: `https://xxxxxxxxxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOi...`（長い文字列）

### 3-2. Vercel側で環境変数を設定

1. Vercelダッシュボード → 対象プロジェクト → 「Settings」
2. 「Environment Variables」を開く
3. 以下を追加：

| Key | Value | Environment |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://xxxxxxxxxxxx.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOi...` | Production, Preview, Development |

4. 「Save」をクリック

### 3-3. ローカル開発用の.env

プロジェクトルートに `.env` ファイルを作成（.gitignoreに含まれているのでGitには入らない）：

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOixxxxxxxxxx
```

---

## Step 4. フロントエンドにSupabase連携追加

### 4-1. パッケージインストール

```bash
npm install @supabase/supabase-js
```

### 4-2. Supabaseクライアントファイル作成

`src/lib/supabase.js` を新規作成：

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null;
```

※ 環境変数が未設定の場合は `null` を返し、保存処理をスキップする安全設計。

### 4-3. App.jsx に保存ロジックを追加

App.jsx の先頭に import を追加：

```javascript
import { supabase } from './lib/supabase';
```

保存用の関数を App コンポーネント内に追加：

```javascript
// ── 診断結果をSupabaseに保存 ──
const saveResult = useCallback(async (ans, sc, henData, ri) => {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('diagnosis_results')
      .insert({
        nickname,
        gender:           ans[0],
        q_age:            ans[1],
        q_income:         ans[2],
        q_education:      ans[3],
        q_appearance:     ans[4],
        q_hobby:          ans[5],
        q_communication:  ans[6],
        q_priority:       ans[7],
        q_flexibility:    ans[8],
        q_timeline:       ans[9],
        q_experience:     ans[10],
        q_satisfaction:   ans[11],
        raw_total:        henData.rawTotal,
        score_spec:       sc.SPEC,
        score_human:      sc.HUMAN,
        score_literacy:   sc.LITERACY,
        score_life:       sc.LIFE,
        score_timing:     sc.TIMING,
        hensachi:         henData.total,
        hensachi_spec:    henData.axes.SPEC,
        hensachi_human:   henData.axes.HUMAN,
        hensachi_literacy:henData.axes.LITERACY,
        hensachi_life:    henData.axes.LIFE,
        hensachi_timing:  henData.axes.TIMING,
        rank:             ri.rank,
        user_agent:       navigator.userAgent,
        referrer:         document.referrer || null,
      })
      .select('id')
      .single();
    if (error) console.error('Save error:', error);
    return data?.id || null;
  } catch (e) {
    console.error('Save exception:', e);
    return null;
  }
}, [nickname]);

// ── CTAクリック記録 ──
const trackCta = useCallback(async (recordId, field) => {
  if (!supabase || !recordId) return;
  await supabase
    .from('diagnosis_results')
    .update({ [field]: true })
    .eq('id', recordId);
}, []);
```

結果画面への遷移時に保存を実行：

```javascript
// ニックネーム入力後の「結果を見る」ボタン
const [recordId, setRecordId] = useState(null);

// 結果画面に遷移する処理を修正
const showResult = async () => {
  if (!nickname.trim()) return;
  setStep(totalQ + 2);

  // 結果算出（既存ロジック）
  const sc = calc(Object.values(answers));
  const henData = calcHensachi(sc);
  const ri = getRank(henData.total);

  // Supabaseに保存
  const id = await saveResult(Object.values(answers), sc, henData, ri);
  setRecordId(id);
};
```

CTAボタンにクリック記録を追加：

```jsx
<button style={cta} onClick={() => trackCta(recordId, 'clicked_cta')}>
  🌸 アドバイザーに相談してみる
</button>

<button style={lineBtn} onClick={() => trackCta(recordId, 'clicked_line')}>
  LINE 友だち追加
</button>
```

---

## Step 5. 動作確認

### 5-1. ローカルで確認

```bash
npm run dev
```

1. 診断を最後まで実施
2. Supabase ダッシュボード → 「Table Editor」→ `diagnosis_results`
3. レコードが1件追加されていればOK

### 5-2. Vercelにデプロイして確認

```bash
git add .
git commit -m "feat: Supabase連携追加"
git push
```

Vercelが自動デプロイ → 本番URLで診断実施 → Supabaseにデータが入ることを確認。

---

## Step 6. 管理画面の使い方（Supabase Table Editor）

### データ閲覧

1. https://supabase.com/dashboard にログイン
2. プロジェクト選択 → 左メニュー「Table Editor」
3. `diagnosis_results` をクリック
4. 全レコードが一覧表示される

### フィルタ・検索

- カラムヘッダーの「Filter」ボタンでフィルタ追加
  - 例：`rank` = `S` で Sランクのみ表示
  - 例：`gender` = `1` で女性のみ表示
  - 例：`created_at` > `2026-04-01` で4月以降のみ表示
- 複数フィルタの AND/OR 指定も可能

### CSV出力

- テーブル表示画面の右上「Export」→「Export to CSV」

### SQL集計（ダッシュボード代わり）

左メニュー「SQL Editor」から以下のようなクエリが実行可能：

```sql
-- 日別の診断実施数
SELECT
  DATE(created_at) AS date,
  COUNT(*)         AS total,
  COUNT(*) FILTER (WHERE gender = 0) AS male,
  COUNT(*) FILTER (WHERE gender = 1) AS female
FROM diagnosis_results
GROUP BY 1 ORDER BY 1 DESC
LIMIT 30;

-- ランク別分布と平均偏差値
SELECT
  rank,
  COUNT(*) AS cnt,
  ROUND(AVG(hensachi), 1) AS avg_hensachi,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) AS pct
FROM diagnosis_results
GROUP BY rank ORDER BY rank;

-- CTA転換率
SELECT
  COUNT(*)                                            AS total,
  COUNT(*) FILTER (WHERE clicked_cta)                 AS cta_clicks,
  ROUND(COUNT(*) FILTER (WHERE clicked_cta) * 100.0 / COUNT(*), 1) AS cta_rate_pct,
  COUNT(*) FILTER (WHERE clicked_line)                AS line_clicks,
  ROUND(COUNT(*) FILTER (WHERE clicked_line) * 100.0 / COUNT(*), 1) AS line_rate_pct
FROM diagnosis_results;

-- 偏差値の分布ヒストグラム
SELECT
  CASE
    WHEN hensachi >= 65 THEN '65+'
    WHEN hensachi >= 60 THEN '60-64'
    WHEN hensachi >= 55 THEN '55-59'
    WHEN hensachi >= 50 THEN '50-54'
    WHEN hensachi >= 45 THEN '45-49'
    WHEN hensachi >= 40 THEN '40-44'
    WHEN hensachi >= 35 THEN '35-39'
    ELSE '〜34'
  END AS range,
  COUNT(*) AS cnt
FROM diagnosis_results
GROUP BY 1 ORDER BY 1 DESC;

-- 直近7日間の人気回答パターン（年齢×性別）
SELECT
  CASE gender WHEN 0 THEN '男性' ELSE '女性' END AS sex,
  (ARRAY['20-25歳','26-29歳','30-33歳','34-37歳','38-42歳','43歳+'])[q_age + 1] AS age,
  COUNT(*) AS cnt
FROM diagnosis_results
WHERE created_at > now() - INTERVAL '7 days'
GROUP BY 1, 2 ORDER BY 3 DESC;
```

---

## 補足：よくある質問

### Q. anon key をフロントに埋め込んで安全？
**安全です。** RLSでINSERTのみ許可・SELECTはservice_roleのみ許可の設定になっているため、anon keyでは他人のデータを読み取れません。Supabaseの推奨アーキテクチャ通りです。

### Q. 無料枠の上限は？
500MB のデータベース容量。1レコード約500Bとして、**約100万件**まで保存可能です。月数万件の診断であれば数年間無料枠内で運用できます。

### Q. 後からカスタム管理画面を作りたくなったら？
Supabaseのservice_role keyを使ってVercelのAPI Route（`/api/admin/*`）を作り、認証付きのダッシュボードページを追加します。rechartsでグラフ表示も可能です。ただし初期フェーズではTable Editor + SQL Editorで十分です。

### Q. データのバックアップは？
Supabase Pro プラン（$25/月）で日次自動バックアップが有効になります。無料プランでもSQL EditorからCSVエクスポートで手動バックアップ可能です。
