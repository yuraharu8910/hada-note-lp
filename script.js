/* =========================================================
   hada note LP ｜ script.js（10/22 追加案 C・D・E 共通）
   ページに無い部品の処理は、要素が見つからなければ何もしない作りなので、
   3案とも同じファイルで動きます
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  // 「動きを減らす」設定（OSのアクセシビリティ設定）が有効かどうか
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------
     1. 素材の仮置き：画像・動画が無いときは「素材を差し替え」の箱を出す
     --------------------------------------------------------- */
  const markMissing = (el) => el.closest(".ph")?.classList.add("is-missing");
  document.querySelectorAll(".ph img").forEach((img) => {
    if (img.complete && img.naturalWidth === 0) markMissing(img);
    img.addEventListener("error", () => markMissing(img));
  });
  document.querySelectorAll(".ph video").forEach((video) => {
    video.querySelector("source")?.addEventListener("error", () => {
      const test = new Image();
      test.onerror = () => markMissing(video);
      test.src = video.getAttribute("poster") || "";
    });
  });

  /* ---------------------------------------------------------
     2. スクロールで浮かび上がる演出
     IntersectionObserver＝要素が画面に入ったかを見張る仕組み
     --------------------------------------------------------- */
  const fadeObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);   // 1回表示したら見張りをやめる
      }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll(".fade-in").forEach((el) => fadeObserver.observe(el));

  /* ---------------------------------------------------------
     3. 画面に入ったら1回だけ動かす、の共通関数
     --------------------------------------------------------- */
  const onceVisible = (el, callback, threshold = 0.4) => {
    if (!el) return;
    new IntersectionObserver(([entry], observer) => {
      if (!entry.isIntersecting) return;
      callback();
      observer.disconnect();
    }, { threshold }).observe(el);
  };

  /* 案C：結果画面のバーを data-value の割合まで伸ばす */
  onceVisible(document.getElementById("resultPhone"), () => {
    document.querySelectorAll(".bars i").forEach((bar, i) => {
      setTimeout(() => bar.style.setProperty("--w", `${bar.dataset.value}%`), i * 150);
    });
  });

  /* 案D・E：記録のグラフの線を描く（CSSの stroke-dashoffset を 0 にする） */
  onceVisible(document.getElementById("recordGraph"), () => {
    document.getElementById("recordGraph").classList.add("is-drawn");
  });

  /* ---------------------------------------------------------
     4. 案E：FVのスマホ画面で、AI肌カルテの会話を自動で流す
     .chat-demo の中の [data-step] を順番に表示 → 最後まで来たら少し待って最初から
     --------------------------------------------------------- */
  const chat = document.querySelector(".chat-demo");
  if (chat) {
    const items = chat.querySelectorAll("[data-step]");
    if (reduceMotion) {
      items.forEach((item) => item.classList.add("is-show")); // 動きを減らす人には全部表示
    } else {
      let step = 0;
      const next = () => {
        if (step >= items.length) {
          // 全部出たら4秒待って、消してから最初に戻る
          setTimeout(() => {
            items.forEach((item) => item.classList.remove("is-show"));
            step = 0;
            setTimeout(next, 600);
          }, 4000);
          return;
        }
        const item = items[step];
        item.classList.add("is-show");
        // 選択肢が出たら、0.7秒後に1つが「タップされた」ように色が変わる
        const pick = item.querySelector(".is-pick");
        if (pick) {
          pick.classList.remove("is-tapped");
          setTimeout(() => pick.classList.add("is-tapped"), 700);
        }
        step++;
        setTimeout(next, 1300);
      };
      next();
    }
  }

  /* ---------------------------------------------------------
     5. ヘッダー：FVを過ぎたら背景をつける（案D・E）
     --------------------------------------------------------- */
  const header = document.getElementById("header");
  const fv = document.getElementById("fv");
  if (header && fv) {
    new IntersectionObserver(([entry]) => {
      header.classList.toggle("is-scrolled", !entry.isIntersecting);
    }, { rootMargin: "-56px 0px 0px 0px" }).observe(fv);
  }

  /* ---------------------------------------------------------
     6. 追従CTA：FVと最終CTAが見えている間は隠す
     --------------------------------------------------------- */
  const sticky = document.getElementById("stickyCta");
  const visible = new Set();
  const stickyObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
    });
    sticky.classList.toggle("is-show", visible.size === 0);
  }, { threshold: 0.1 });
  [fv, document.querySelector(".fv-cta-area"), document.getElementById("reserve")]
    .forEach((el) => el && stickyObserver.observe(el));

  /* ---------------------------------------------------------
     7. AI肌カルテのチャット画面を開く／閉じる（<dialog>）
     --------------------------------------------------------- */
  const dialog = document.getElementById("karteDialog");
  document.querySelectorAll(".js-open-karte").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else location.hash = "karte";   // 古いブラウザはセクションへ移動
    });
  });
  document.getElementById("karteClose").addEventListener("click", () => dialog.close());
  // 黒い背景部分をタップしても閉じる
  dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
});
