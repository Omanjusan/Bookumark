# 実装プラン / フェーズ分け

2026-07-20 策定。前提は [migration.md](migration.md) の決定事項(正本=公式DB、最小E2E=開く/並べる/削除・タイトル式1種・ドック無し)。

## 設計方針

### 言語

- **E2E疎通(Phase 1〜4)は素のJSで書く**。ビルド工程ゼロで `npm run experiment` の自動リロードを最速に保つ
- TypeScript化は疎通完了後に専用フェーズ(Phase 5)で行う。型を付ける対象が「動いているコード」なので移行コストが読める

### モジュール構成(E2E版)

```text
manifest.json
background.js            # 開発用: パネルのタブを開くだけ
panel/
  panel.html
  panel.css
  panel.js               # エントリ。以下の3モジュールを束ねる
  lib/
    bookmarks.js         # 正本アクセス: getTree→フラット化 / remove。公式DBに触るのはここだけ
    overlay.js           # storage.local: カスタム並び順(GUID配列) の load/save/reconcile
    view.js              # タイトル式リストのDOM生成・イベント(クリック/D&D/削除)
```

- 責務境界 = migration.md の3層に対応: `bookmarks.js`(コア層)/ `overlay.js`(オーバーレイ層)/ 利用実績層はE2Eでは未使用
- `overlay.js` の reconcile: ロード時に現在のブックマークGUID集合と突き合わせ、存在しないGUIDを並び順から即削除(孤児掃除のE2E実装)

### データモデル(E2E版)

- 表示対象: ブックマークツリーをフラット化した**ブックマークのみの1リスト**(フォルダは無視。フォルダ→タブは後続)
- 並び順: `storage.local` に `{ order: [guid, ...] }` を1本だけ持つ
  - order に無いGUID(新規追加分)は末尾に足す
  - D&Dで並べ替えたら order を全量保存(件数規模的に差分管理は不要)

## フェーズ分け

### Phase 1: 読み取り疎通(read-only)

- `bookmarks.getTree()` → フラット化 → タイトル式リストを描画(グリフバッジ+タイトル)
- 完了条件: `npm run experiment` で自分の実ブックマークが一覧表示される

### Phase 2: 開く

- 行クリック → `tabs.create()`。中クリック/Ctrl+クリックはバックグラウンドタブ
- 完了条件: パネルから任意のブックマークを開ける

### Phase 3: 並べる(オーバーレイ初導入)

- 行のD&D並べ替え → `overlay.js` に保存 → 再起動後も順序が復元される
- ロード時 reconcile で孤児GUIDを即削除
- 完了条件: 並べ替え→Firefox再起動→順序維持。外部でブックマーク削除→パネル再表示で行も並び順データも消えている

### Phase 4: 削除(書き戻し初導入)

- 行の削除ボタン → `bookmarks.remove()` → リスト・overlay から即除去
- 完了条件: パネルで削除→Firefox本体のブックマークメニューからも消えている。**ここでE2E成立**

### Phase 5: TypeScript化・土台整備

- tsc 導入(バンドラ無し・ES modules出力)、lib/ を .ts 化、web-ext との連携スクリプト整備
- 完了条件: `npm run build && npm run experiment` でPhase 4と同じ挙動

### Phase 6以降(順序は都度判断)

| フェーズ候補 | 内容 | 依存 |
| --- | --- | --- |
| 利用実績連携 | `history` から訪問回数・最終訪問日時を取得しソート軸に | P5 |
| 検索・ソートベイ | 検索ボックス+ソートUI(モックの案A/B決着後) | P5 |
| イベント購読 | `bookmarks.onRemoved` 等のevent page化(lazy reconcileの置き換え) | P4 |
| 初回フロー | フォルダ→タブ対応のユーザー選択ウィザード(migration.md 決定2) | P5 |
| 表示形式の拡充 | タイトル式の正式デザイン → パネル式(スロット定員制) → 他形式 | P5 |
| ドッキング | ベイ+レール機構(モックv0.2相当) | 検索・ソートベイ |
| テーマ/公式CSS | CSS Custom Properties トークン化・ライト/ダーク | 表示形式 |

## 刻み方の運用

- 1フェーズ=1コミット以上。フェーズ完了時に完了条件を実機(`npm run experiment`)で確認してから次へ
- 仕様変更・判断はその都度 features.md / migration.md に追記してから実装する
