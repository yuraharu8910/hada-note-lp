# hada note LP｜引き継ぎメモ（2026-10-26時点）

このフォルダは、Webデザインスクール案件②「新規商品企画〜LP制作」の成果物です。
架空のフェイシャルサロン「hada note（はだノート）」のLPと、AI肌カルテ（チャットボット）が入っています。

- 最終期限：**2026-10-27（火）**
- 公開方法：GitHub Pages（予定URL `https://yuraharu8910.github.io/hada-note-lp/`。リポジトリ名は hada-note-lp の前提）

## ファイル構成

| ファイル | 役割 |
|---|---|
| index.html | LP本体（スマホファースト。PCは style.css の後半の @media で対応） |
| style.css | LP本体の見た目。`:root` に色・フォントの変数あり |
| script.js | フェードイン、追従CTA、ヘッダー、ダイアログの開閉、記録グラフの線の演出 |
| chatbot.css / chatbot.js | AI肌カルテ（6問のタップ式＋日付から季節を自動判定→結果を文章で返す）。クラス名は `hnk-` で始まる |
| privacy.html | プライバシーポリシー（架空サロン向け） |
| images/ , videos/ | 素材（すべて半角英数字のファイル名） |
| ASSETS.md | 素材リスト |
| .gitignore | GitHubに上げないもの（_originals / proposals-1022 / バックアップ / .DS_Store） |

デザインは「案D」を採用しました（白地にぼかした色の玉・縦書き・明朝・線が描かれるグラフ。参考：花王 SOFINA 肌id）。
案A・案Bは `バックアップ/`、追加の案C〜Eは `proposals-1022/` にあります。どちらも公開しません。

## 守ること（変更するときのルール）

1. **ファイル名・パス：** すべて半角英数字＋相対パスにする（`/` から始まる絶対パスは使わない）。例外は canonical・og:url・og:image で、これらは `https://〜` の完全なURLで書く。
2. **薬機法・景表法に配慮した言葉づかい：**
   - 「改善・促進・回復・若返る・たるみ改善・小顔・根本改善・免疫アップ・ターンオーバーを整える・細胞の活性」は使わない。
   - 「診断」ではなく「肌チェック」「AI肌カルテ」と言う。
   - 「〜と言われています」「〜と関係していると考えられています」にとどめる。
   - 根拠の資料：Googleドライブ「hada note｜4つのつながりと肌の関係（調査メモ・10/24）」
3. **「22時〜2時の肌のゴールデンタイム」は使わない。** 根拠がないため。代わりに「眠り始めの3時間の深い眠り」と「寝る時刻がそろっているか」と書く。
4. **LPの「結果のイメージ」（index.html の `.result-card`）は、chatbot.js が実際に返す結果と同じ内容にしておく。** 回答例は「ハリが足りない／5時間以下／1〜2時間ずれる／1時間以上／おだやか／合っているか自信がない」＋秋。chatbot.js を変えたら、この見本も合わせて直す。
5. **アクセシビリティ：**
   - ボタン・リンクの高さは44px以上にする。
   - `prefers-reduced-motion`（動きを減らす設定）のときは、アニメーションを止める。
   - 文字は `textContent` で入れる（チャットに innerHTML で文章を入れない）。
6. **コード：** 動く状態を保ち、日本語の解説コメントを多めに書く（ユキさんの希望）。

## 未決定（ユキさんに確認してから直すこと）

- [ ] 担当者名：index.html の `（担当者名）` を架空の名前に変える
- [ ] LINEのURL：index.html の `https://line.me/` と chatbot.js の `CONFIG.lineUrl`
- [ ] noindex（検索結果に出さない設定）を入れるか（おすすめ：架空サロンなので入れる → `<meta name="robots" content="noindex, nofollow">`）
- [ ] 公開URL・リポジトリ名が `yuraharu8910/hada-note-lp` で合っているか（違えば canonical・og:url・og:image・privacy.html の canonical を直す）
- [ ] 文章の提案（反映するかどうか、ユキさんが決める）
  - 呼び方をそろえる：FVや約束の「肌・暮らし・心・季節」を「今のケア・暮らし・気持ち・季節」に
  - 見出しに言葉を足す：「AI肌カルテ」→「無料のAI肌カルテ（肌チェック）」、「初回体験」→「初回体験｜フェイシャル60分」
  - 色の玉の並び順を、結果のバーと同じ「暮らし→季節→今のケア→気持ち」にする

## 残りの作業

1. 上の未決定の項目を反映する
2. 最終確認：スマホ（390px）とPC（1440px）で表示、すべてのボタン・リンク、AI肌カルテを最後まで回答できるか
3. GitHubにリポジトリを作って push → GitHub Pagesを有効にする（Settings → Pages → Branch: main / root）
4. 公開URLでOGPを確認する（LINEやXでURLを送ってみる）
5. 計測を入れる（任意）：chatbot.js は `dataLayer` に `chat_open` / `chat_question` / `chat_result` / `chat_line_click` を送っている。GTM・GA4を入れればそのまま数えられる
6. 制作まとめをGoogleドライブ「案件応募②美容カウンセリング / 03_LP制作」に保存する
7. 片づけ：`バックアップ/_tmp_index7.html` と `_tmp_style7.css` は削除してよい

## 関連資料（Googleドライブ）

- 商品企画書：hada note 商品企画書（01_ヒアリング・リサーチ）
- 調査メモ：hada note｜4つのつながりと肌の関係（調査メモ・10/24）
- Figma：hada note｜OGP・ファビコン https://www.figma.com/design/Pinjn6nNIJi3xZpEYCvfED
