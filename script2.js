(async function udemySkipper() {
  console.log("🚀 Udemy Skipper started (resilient mode)");

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  async function handleLecture() {
    const video = document.querySelector("video");

    // 🎥 VIDEO HANDLING
    if (video && isFinite(video.duration)) {
      const duration = video.duration;
      const watchTime = Math.floor(Math.random() * 9) + 2; // random 2–10s

      if (Math.random() < 0.6) {
        video.currentTime = Math.max(0, duration - watchTime);
        console.log(`🎬 Watching last ${watchTime}s of ${Math.floor(duration)}s`);
      } else {
        let mid = Math.floor(duration / 3 + Math.random() * duration / 3);
        video.currentTime = Math.min(duration - 2, mid);
        console.log(`🎯 Skimming middle at ${mid}s for ~${watchTime}s`);
      }

      await new Promise(resolve => {
        const handler = () => {
          video.removeEventListener("ended", handler);
          console.log("✅ Video ended, marking complete");
          resolve();
        };
        video.addEventListener("ended", handler);
        video.play().catch(() => resolve());
      });
      return true;
    }

    // 📖 ARTICLE HANDLING
    if (document.querySelector(".article-asset--content")) {
      console.log("📖 Article detected → skipping");
      await sleep(1000);
      return true;
    }

    // ❓ QUIZ HANDLING
    let quizBtn = [...document.querySelectorAll("button")].find(b =>
      /Quiz|Assignment|Test/i.test(b.innerText)
    );
    if (quizBtn) {
      console.log("❓ Quiz detected");
      let skipBtn = [...document.querySelectorAll("button")].find(b =>
        /Skip/i.test(b.innerText)
      );
      if (skipBtn) {
        skipBtn.click();
        console.log("➡️ Clicked Skip Quiz");
        await sleep(1500);
      }
      return true;
    }

    console.log("🤔 Nothing found in this lecture type");
    return false;
  }

  async function handleNavigation(retries = 3) {
    for (let i = 0; i < retries; i++) {
      let nextBtn = [...document.querySelectorAll("button")].find(b =>
        /Continue|Next|Complete/i.test(b.innerText)
      );
      if (nextBtn) {
        nextBtn.click();
        console.log("➡️ Moving to next lecture...");
        await sleep(2000);
        return true;
      }

      console.log(`🔄 Retry ${i + 1}/${retries}: No Next button, re-checking lecture...`);
      let handled = await handleLecture();
      if (handled) {
        await sleep(1500);
      }
    }
    return false;
  }

  // --- MAIN LOOP ---
  while (true) {
    try {
      let handled = await handleLecture();
      let moved = await handleNavigation(3);

      if (!handled && !moved) {
        console.log("🎉 No actions possible → Course likely finished");
        break;
      }

    } catch (err) {
      console.log("⚠️ Error:", err);
      break;
    }
  }
})();
