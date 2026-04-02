# データベース・管理画面 技術選定提案

---

## 要件整理

| 要件 | 内容 |
|---|---|
| 記録対象 | 診断の全回答（12問）＋結果スコア＋ニックネーム＋タイムスタンプ |
| 管理画面 | 回答一覧の閲覧・検索・CSV出力、基本的な集計ダッシュボード |
| ホスティング | Vercel（フロントエンド確定済み） |
| 認証 | 管理画面のみパスワード保護 |
| 規模感 | 初期は月数百〜数千件。広告出稿時に数万件/月の可能性 |
| 予算 | できれば無料枠内でスタート、スケール時に有料化 |

---

## 候補3案の比較

### ◎ 推奨：Supabase

| 項目 | 評価 |
|---|---|
| DB種別 | PostgreSQL（フルマネージド） |
| 管理画面 | **Table Editor が標準搭載（コーディング不要で即利用可能）** |
| 認証 | Supabase Auth 標準搭載。管理画面のログインに利用可 |
| 無料枠 | 500MB DB / 1GB ファイルストレージ / 月5万 MAU |
| Vercel連携 | Vercel Integration あり。環境変数の自動注入に対応 |
| クライアント | `@supabase/supabase-js` でフロントからも直接書き込み可 |
| リアルタイム | WebSocket経由でデータ変更をリアルタイム監視可能 |
| スケーラビリティ | Pro ($25/月) で 8GB DB / 100k MAU。十分なスケール性 |

**推奨理由：**
1. Table Editorが管理画面を実質ゼロ工数で提供する。これが最大のメリット。回答データのフィルタ・ソート・CSV出力が即座に可能
2. PostgreSQLなので、後からSQLで高度な集計・分析が可能（「年代別の平均偏差値」「最も多い回答パターン」等）
3. Row Level Security（RLS）により、フロントから直接INSERT可能かつ安全。API Routeを書く必要がない
4. Vercelとの公式連携あり

---

### ○ 次点：Vercel Postgres（Neon）

| 項目 | 評価 |
|---|---|
| DB種別 | PostgreSQL（Neon基盤） |
| 管理画面 | なし（自作 or Neonコンソールで直接SQL） |
| 認証 | 別途実装が必要 |
| 無料枠 | 256MB DB / 月100時間のコンピュート |
| Vercel連携 | **ネイティブ連携（最も緊密）** |
| クライアント | `@vercel/postgres` でサーバーサイドから利用 |

**評価：**
Vercelエコシステム内で完結するのが最大の利点。ただし管理画面を自分で作る必要があるため、初期工数がSupabaseより大幅に多い。SQLを直接叩ける人がチームにいれば、Neonコンソール＋自作APIで対応可能。

---

### △ 参考：Firebase Firestore

| 項目 | 評価 |
|---|---|
| DB種別 | NoSQL（ドキュメント型） |
| 管理画面 | Firebaseコンソール（基本的な閲覧は可能だが検索・集計が弱い） |
| 認証 | Firebase Auth |
| 無料枠 | 1GB DB / 5万読取/日 / 2万書込/日 |
| Vercel連携 | 特になし（自前で連携） |

**評価：**
セットアップは最も簡単だが、NoSQLのため「年代別集計」「条件フィルタ」等の分析クエリが非効率。診断データのように構造が明確なデータにはRDB（PostgreSQL）のほうが適している。

---

## 推奨構成：Supabase

### テーブル設計

```sql
-- 診断結果テーブル
CREATE TABLE diagnosis_results (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    TIMESTAMPTZ DEFAULT now(),

  -- ユーザー入力
  nickname      TEXT NOT NULL,
  gender        SMALLINT NOT NULL,       -- 0:男性, 1:女性

  -- 各問の回答（選択肢のインデックス）
  q_age         SMALLINT,
  q_income      SMALLINT,
  q_education   SMALLINT,
  q_appearance  SMALLINT,
  q_hobby       SMALLINT,
  q_communication SMALLINT,
  q_priority    SMALLINT,
  q_flexibility SMALLINT,
  q_timeline    SMALLINT,
  q_experience  SMALLINT,
  q_satisfaction SMALLINT,

  -- 算出結果
  raw_total     SMALLINT,
  hensachi      SMALLINT,
  rank          CHAR(1),                 -- S/A/B/C/D
  score_spec    SMALLINT,
  score_human   SMALLINT,
  score_literacy SMALLINT,
  score_life    SMALLINT,
  score_timing  SMALLINT,

  -- CTA行動追跡
  clicked_cta   BOOLEAN DEFAULT false,   -- アドバイザー相談ボタン押下
  clicked_line  BOOLEAN DEFAULT false,   -- LINE友だち追加押下

  -- メタ情報
  user_agent    TEXT,
  referrer      TEXT
);

-- 高速検索用インデックス
CREATE INDEX idx_results_created ON diagnosis_results(created_at DESC);
CREATE INDEX idx_results_rank    ON diagnosis_results(rank);
CREATE INDEX idx_results_gender  ON diagnosis_results(gender);
```

### Row Level Security（RLS）設定

```sql
-- RLS有効化
ALTER TABLE diagnosis_results ENABLE ROW LEVEL SECURITY;

-- 誰でもINSERT可能（診断結果の保存）
CREATE POLICY "Anyone can insert" ON diagnosis_results
  FOR INSERT WITH CHECK (true);

-- SELECTはサービスロール（管理画面）のみ
CREATE POLICY "Service role can read" ON diagnosis_results
  FOR SELECT USING (auth.role() = 'service_role');
```

### フロントエンドからのデータ保存（実装イメージ）

```javascript
// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

```javascript
// 結果画面表示時に呼び出し
async function saveResult(answers, scores, hen) {
  await supabase.from('diagnosis_results').insert({
    nickname:    nickname,
    gender:      answers[0],
    q_age:       answers[1],
    q_income:    answers[2],
    q_education: answers[3],
    q_appearance:answers[4],
    q_hobby:     answers[5],
    q_communication: answers[6],
    q_priority:  answers[7],
    q_flexibility:answers[8],
    q_timeline:  answers[9],
    q_experience:answers[10],
    q_satisfaction:answers[11],
    raw_total:   hen.rawTotal,
    hensachi:    hen.total,
    rank:        rankInfo.rank,
    score_spec:  scores.SPEC,
    score_human: scores.HUMAN,
    score_literacy:scores.LITERACY,
    score_life:  scores.LIFE,
    score_timing:scores.TIMING,
    user_agent:  navigator.userAgent,
    referrer:    document.referrer || null,
  });
}
```

### 管理画面

**Phase 1（即日対応可）：Supabase Table Editor をそのまま利用**
- Supabaseダッシュボードにログインするだけで全データを閲覧可能
- カラムごとのフィルタ・ソート・検索が標準搭載
- CSVエクスポートもワンクリック
- SQLエディタから集計クエリを直接実行可能

```sql
-- 日別の診断数
SELECT DATE(created_at) as date, COUNT(*) as cnt
FROM diagnosis_results GROUP BY 1 ORDER BY 1 DESC;

-- ランク別分布
SELECT rank, COUNT(*), ROUND(AVG(hensachi),1) as avg_hensachi
FROM diagnosis_results GROUP BY rank ORDER BY rank;

-- CTA押下率
SELECT
  COUNT(*) FILTER (WHERE clicked_cta) * 100.0 / COUNT(*) as cta_rate,
  COUNT(*) FILTER (WHERE clicked_line) * 100.0 / COUNT(*) as line_rate
FROM diagnosis_results;
```

**Phase 2（必要に応じて）：カスタム管理画面**
- Vercel上に `/admin` ページを追加
- Supabase Auth でログイン認証
- recharts 等でダッシュボードを構築
- 日別推移・ランク分布・CTA転換率等をグラフ表示

---

## 導入手順（Supabase）

```
1. https://supabase.com でプロジェクト作成（無料）
2. SQLエディタで上記のCREATE TABLE / RLS設定を実行
3. プロジェクト設定 → API からURL・anon keyを取得
4. Vercelの環境変数に設定
   - VITE_SUPABASE_URL=https://xxx.supabase.co
   - VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
5. npm install @supabase/supabase-js
6. App.jsxに保存ロジックを追加
7. デプロイ
```

推定作業時間：**2〜3時間**（テーブル作成・フロント連携・デプロイ込み）

---

## 結論

**Supabaseを推奨します。**
最大の理由は、Table Editor が管理画面をゼロ工数で提供する点です。カスタム管理画面は後から必要に応じて追加すれば良く、初期フェーズではTable Editor ＋ SQLエディタで運用上の要件は十分に満たせます。無料枠も月数万件の診断に耐えうる規模です。
