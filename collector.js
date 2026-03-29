/**
 * X Bookmark Collector
 * x.com/i/bookmarks を開いた状態でブラウザのコンソールに貼り付けて実行してください。
 * ブックマークデータが bookmarks.json としてダウンロードされます。
 *
 * 注意: 個人利用・非商用目的でのみ使用してください。
 */

(async function collectBookmarks() {
  // x.com/i/bookmarks のページか確認
  if (!location.href.includes('x.com/i/bookmarks') && !location.href.includes('twitter.com/i/bookmarks')) {
    console.error('❌ このスクリプトは x.com/i/bookmarks で実行してください。');
    return;
  }

  console.log('📌 ブックマーク収集を開始します...');
  console.log('⏳ スクロールしながらデータを収集中です。しばらくお待ちください。');

  const collected = new Map();
  let lastCount = 0;
  let stableCount = 0;
  const MAX_STABLE_ROUNDS = 5;
  const SCROLL_INTERVAL_MS = 1500;

  function extractTweets() {
    // Xのレスポンシブデザイン対応: article タグからツイートを抽出
    const articles = document.querySelectorAll('article[data-testid="tweet"]');

    articles.forEach((article) => {
      try {
        // ツイートURLからIDを取得
        const linkEl = article.querySelector('a[href*="/status/"]');
        if (!linkEl) return;
        const match = linkEl.getAttribute('href').match(/\/status\/(\d+)/);
        if (!match) return;
        const id = match[1];

        if (collected.has(id)) return;

        // ユーザー情報
        const userNameEl = article.querySelector('[data-testid="User-Name"]');
        let author_name = '';
        let author_screen_name = '';

        if (userNameEl) {
          const spans = userNameEl.querySelectorAll('span');
          // 表示名は最初の非空スパン
          for (const span of spans) {
            const text = span.textContent.trim();
            if (text && !text.startsWith('@') && text !== '·') {
              author_name = text;
              break;
            }
          }
          // スクリーンネームは @ から始まる
          for (const span of spans) {
            const text = span.textContent.trim();
            if (text.startsWith('@')) {
              author_screen_name = text.slice(1);
              break;
            }
          }
        }

        // ツイート本文
        const textEl = article.querySelector('[data-testid="tweetText"]');
        const text = textEl ? textEl.innerText.trim() : '';

        // 日時
        const timeEl = article.querySelector('time');
        const created_at = timeEl ? timeEl.getAttribute('datetime') : '';

        // 画像URL
        const imgEls = article.querySelectorAll('[data-testid="tweetPhoto"] img, [data-testid="card.layoutLarge.media"] img');
        const media_urls = [];
        imgEls.forEach((img) => {
          const src = img.getAttribute('src');
          if (src && !media_urls.includes(src)) {
            // サムネイル→オリジナル画像URLに変換
            const originalSrc = src.replace(/&name=\w+$/, '&name=large').replace(/\?format=(\w+)&name=\w+/, '?format=$1&name=large');
            media_urls.push(originalSrc);
          }
        });

        collected.set(id, {
          id,
          text,
          author_name,
          author_screen_name,
          created_at,
          media_urls,
        });
      } catch (e) {
        // 個別ツイートの解析エラーは無視して続行
      }
    });
  }

  // スクロールしながらデータを収集
  const scrollTimer = setInterval(() => {
    extractTweets();

    const currentCount = collected.size;
    console.log(`📊 収集済み: ${currentCount} 件`);

    if (currentCount === lastCount) {
      stableCount++;
      if (stableCount >= MAX_STABLE_ROUNDS) {
        clearInterval(scrollTimer);
        finalize();
      }
    } else {
      stableCount = 0;
      lastCount = currentCount;
    }

    window.scrollBy(0, 1200);
  }, SCROLL_INTERVAL_MS);

  function finalize() {
    if (collected.size === 0) {
      console.error('❌ ブックマークが取得できませんでした。');
      console.error('   - x.com/i/bookmarks を開いているか確認してください。');
      console.error('   - ページを再読み込みしてから再度お試しください。');
      console.error('   - ブックマークが1件以上存在するか確認してください。');
      return;
    }

    const bookmarks = Array.from(collected.values());
    const output = JSON.stringify({ bookmarks }, null, 2);

    // ダウンロード
    const blob = new Blob([output], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bookmarks.json';
    a.click();
    URL.revokeObjectURL(url);

    console.log(`✅ 完了！ ${bookmarks.length} 件のブックマークを bookmarks.json として保存しました。`);
    console.log('   次に、X Bookmark Manager アプリを開いてファイルをインポートしてください。');
  }
})();
