(async function udemyRobustSkipper() {
  console.log("🟢 Udemy Robust Skipper started");

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  // Utility: click element reliably
  function tryClick(el) {
    if (!el) return false;
    try { el.scrollIntoView({ block: "center" }); el.click(); return true; }
    catch (e) {
      try { el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); return true; }
      catch (_) { return false; }
    }
  }

  // Find an element by visible text (case-insensitive, regex)
  function findByText(regex) {
    const candidates = [...document.querySelectorAll('button, a, [role="button"], div, span')];
    return candidates.find(el => {
      const txt = (el.innerText || '').trim();
      return txt && regex.test(txt);
    });
  }

  // Try to find video element in page or same-origin iframes
  function findVideoSafe() {
    // direct videos
    const vids = Array.from(document.querySelectorAll('video')).filter(v => v && (typeof v.duration === 'number'));
    if (vids.length) return { video: vids[0], host: document };

    // try same-origin iframes (try/catch due to cross-origin)
    const iframes = Array.from(document.querySelectorAll('iframe'));
    for (const fr of iframes) {
      try {
        const idoc = fr.contentDocument || fr.contentWindow.document;
        if (!idoc) continue;
        const v = idoc.querySelector('video');
        if (v) return { video: v, host: idoc, frame: fr };
      } catch (e) {
        // cross-origin - cannot access
      }
    }
    return null;
  }

  // Get a simple lecture identity fingerprint (URL + title) so we can detect navigation
  function lectureKey() {
    const title = (document.querySelector('[data-purpose="lecture-title"], .udemy-title, h1') || {}).innerText || '';
    return location.href + '||' + title;
  }

  // Core: attempt to handle current lecture
  async function handleLecture() {
    // Prefer video handling if present
    const videoInfo = findVideoSafe();
    if (videoInfo && videoInfo.video) {
      const v = videoInfo.video;
      try {
        const duration = v.duration;
        if (isFinite(duration) && duration > 6) {
          // choose watch strategy
          const watchTime = rand(2, 10);                        // 2-10s watch
          const skimEnd = Math.random() < 0.6;                  // bias slightly to end
          if (skimEnd) {
            const target = Math.max(0, duration - watchTime);
            // If video is inside same-origin iframe, set on that video object
            v.currentTime = target;
            console.log(`🎥 Video: seeking to ${Math.round(target)}s (watch ${watchTime}s at end).`);
          } else {
            // middle point within 1/4..3/4 of video
            const start = Math.floor(duration * 0.25 + Math.random() * (duration * 0.5));
            v.currentTime = Math.min(duration - 1, start);
            console.log(`🎯 Video: skimming from ${Math.round(v.currentTime)}s for ${watchTime}s.`);
          }
          // attempt play
          try { v.play(); } catch (e) { console.warn("⚠️ play() failed:", e); }
          // wait the watch time (+ small buffer)
          await sleep((watchTime + 1) * 1000);
          return true;
        } else {
          // short or missing duration: try tiny seek to force completion
          try { v.currentTime = Math.max(0, (v.duration || 1) - 2); v.play(); } catch(_) {}
          await sleep(2500);
          console.log("🎥 Short/unknown video handled.");
          return true;
        }
      } catch (err) {
        console.warn("⚠️ Error controlling video:", err);
      }
    }

    // ARTICLE / TEXT: look for article container OR "mark complete" types
    const articleEl = document.querySelector('.article-asset--content, .curriculum-content, .lecture-text, [data-purpose="article-contents"]');
    if (articleEl) {
      console.log("📖 Article-like content detected.");
      // find "Mark as complete" or "Complete & continue" variants
      const markSelectors = [
        '[data-purpose="go-to-next-button"]',
        '[data-purpose="mark-as-complete"]',
        '#go-to-next-item',
        '.mark-complete, .complete-lecture',
      ];
      for (const sel of markSelectors) {
        const el = document.querySelector(sel);
        if (el) { tryClick(el); console.log("➡️ Clicked mark-as-complete selector:", sel); await sleep(rand(800, 1500)); return true; }
      }
      // fallback: find by visible text
      const contByText = findByText(/complete and continue|mark as complete|mark complete|go to next|next lecture|continue/i);
      if (contByText) { tryClick(contByText); console.log("➡️ Clicked by text:", contByText.innerText); await sleep(rand(800,1500)); return true; }
      // small wait then return (lecture might be resource-only)
      await sleep(1000);
      return true;
    }

    // QUIZ / ASSIGNMENT: search many button texts
    const quizButtonRegex = /(skip quiz|skip|start quiz|start assignment|start test|begin quiz|submit and continue|submit|finish attempt|save and continue|save and continue|finish)/i;
    const btn = findByText(quizButtonRegex);
    if (btn) {
      console.log("❓ Quiz/assignment control found:", (btn.innerText||'').trim());
      // Try to press "Skip Quiz" first if available
      const skipBtn = findByText(/skip quiz|skip question|skip/i);
      if (skipBtn && tryClick(skipBtn)) {
        console.log("➡️ Clicked Skip Quiz.");
        await sleep(rand(800, 1500));
        return true;
      }
      // Otherwise attempt to click the found control (Submit/Finish) to progress
      if (tryClick(btn)) {
        console.log("➡️ Clicked quiz control:", (btn.innerText||'').trim());
        await sleep(rand(800, 1500));
        return true;
      }
    }

    // FALLBACK: try several common next/continue selectors
    const fallbackSelectors = [
      '[data-purpose="go-to-next-button"]',
      '[data-purpose="go-to-next"]',
      '#go-to-next-item',
      'button[class*="go-to-next"]',
      'button[aria-label*="next"]',
    ];
    for (const sel of fallbackSelectors) {
      const el = document.querySelector(sel);
      if (el && tryClick(el)) { console.log("➡️ Clicked fallback selector:", sel); await sleep(rand(800,1500)); return true; }
    }

    // If nothing detected, small wait and return false so outer logic can try other handlers
    await sleep(800);
    return false;
  }

  // Navigation handler: Up Next or Complete & Continue
  async function handleNavigation() {
    // Up Next overlay: detect container or button text
    const upNextCandidate = findByText(/play next|play next lecture|autoplay next|up next|continue/i);
    if (document.querySelector('.upnext--container') || upNextCandidate) {
      if (upNextCandidate && tryClick(upNextCandidate)) {
        console.log("⏭ Clicked Up Next / play next button:", upNextCandidate.innerText.trim());
        await sleep(rand(1000, 2500));
        return true;
      }
    }

    // Complete and continue primary button
    const completeBtn = findByText(/complete and continue|complete & continue|complete lecture|mark as complete/i);
    if (completeBtn && tryClick(completeBtn)) {
      console.log("➡️ Clicked Complete & Continue");
      await sleep(rand(1200, 2500));
      return true;
    }

    // Another common next: "Go to next" / generic next buttons
    const genericNext = document.querySelector('[data-purpose="go-to-next-button"], #go-to-next-item') || findByText(/go to next|next lecture|next lesson|continue to next/i);
    if (genericNext && tryClick(genericNext)) {
      console.log("➡️ Clicked generic next button");
      await sleep(rand(1000, 2500));
      return true;
    }

    return false;
  }

  // Wait for lecture change (URL or title change) up to timeoutSeconds
  async function waitForLectureChange(prevKey, timeoutSeconds = 12) {
    const start = Date.now();
    while ((Date.now() - start) < timeoutSeconds * 1000) {
      await sleep(700);
      const key = lectureKey();
      if (key !== prevKey) return { changed: true, key };
    }
    return { changed: false, key: prevKey };
  }

  // Main loop
  let prev = lectureKey();
  let iterations = 0;
  const MAX_ITER = 1500; // safety cutoff

  while (iterations++ < MAX_ITER) {
    console.log(`\n--- Lecture attempt #${iterations} --- (at ${new Date().toLocaleTimeString()})`);
    const handled = await handleLecture();

    // After handling content, try navigation (Up Next or Continue buttons)
    const navClicked = await handleNavigation();

    // Wait for the lecture to actually change (by URL/title) with retries
    const res = await waitForLectureChange(prev, 12);
    if (res.changed) {
      console.log("🔁 Lecture changed → new key:", res.key);
      prev = res.key;
      // small human-like pause before processing next lecture
      await sleep(rand(800, 2000));
      continue;
    }

    // If no lecture change yet and we performed actions, try clicking nav again
    if (!res.changed && (handled || navClicked)) {
      console.log("⏳ No lecture change detected yet — retrying navigation attempts");
      // try navigation a couple more times
      let retried = false;
      for (let i = 0; i < 3; i++) {
        if (await handleNavigation()) { retried = true; break; }
        await sleep(800 + rand(0, 800));
      }
      const res2 = await waitForLectureChange(prev, 8);
      if (res2.changed) { prev = res2.key; continue; }
      if (!retried) {
        console.warn("⚠️ Couldn't move to next lecture after attempts. Trying fallback next button selectors...");
        // final fallback click
        const fallbackClick = document.querySelector('[data-purpose="go-to-next-button"], #go-to-next-item');
        if (fallbackClick && tryClick(fallbackClick)) {
          await sleep(1200);
          const res3 = await waitForLectureChange(prev, 8);
          if (res3.changed) { prev = res3.key; continue; }
        }
        console.warn("⚠️ No lecture change detected after fallback attempts. Likely course complete or blocked UI.");
        break;
      }
    }

    // If nothing handled and nothing clicked, try one last small wait, then stop
    if (!handled && !navClicked) {
      console.log("✅ No actionable elements found. Exiting loop — course probably finished or UI changed.");
      break;
    }
  }

  console.log("🟢 Udemy Robust Skipper finished (iterations:", iterations, ")");
})();
