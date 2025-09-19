async function udemyAutoSkipper() {
    console.log("🚀 Udemy Auto-Skipper started");

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    while (true) {
        try {
            // --- CASE 1: VIDEO ---
            let video = document.querySelector("video");
            if (video) {
                let duration = video.duration;
                if (duration && duration > 20) {
                    let watchTime = Math.floor(Math.random() * 9) + 2; // 2–10 seconds
                    let skimEnd = Math.random() < 0.5; // 50% end, 50% middle

                    if (skimEnd) {
                        video.currentTime = duration - watchTime;
                        console.log(`⏩ Watching last ${watchTime}s of ${Math.floor(duration)}s video`);
                    } else {
                        let middlePoint = Math.floor(duration / 3 + Math.random() * duration / 3);
                        video.currentTime = middlePoint;
                        console.log(`🎯 Skimming middle (${middlePoint}s) for ~${watchTime}s`);
                    }

                    video.play();
                    await sleep((watchTime + 1) * 1000); // wait real watch time
                }

            // --- CASE 2: ARTICLE ---
            } else if (document.querySelector(".article-asset--content")) {
                console.log("📖 Article detected → skipping");
                await sleep(2000);

            // --- CASE 3: QUIZ / ASSIGNMENT ---
            } else if (document.querySelector("button:contains('Start Quiz'), button:contains('Skip Quiz')")) {
                console.log("❓ Quiz/assignment detected");
                let skipBtn = [...document.querySelectorAll("button")].find(b => b.innerText.includes("Skip Quiz"));
                if (skipBtn) {
                    skipBtn.click();
                    console.log("➡️ Skipped quiz");
                    await sleep(2000);
                }

            } else {
                console.log("🤔 Unknown lecture type, skipping...");
                await sleep(2000);
            }

            // --- HANDLE NAVIGATION ---
            let upNextBtn = [...document.querySelectorAll("button")].find(b => b.innerText.match(/Play Next|Continue/i));
            if (document.querySelector(".upnext--container") && upNextBtn) {
                console.log("⏭ Up Next popup → clicking");
                upNextBtn.click();
                await sleep(3000);

            } else {
                let contBtn = [...document.querySelectorAll("button")].find(b => b.innerText.includes("Complete and continue"));
                if (contBtn) {
                    contBtn.click();
                    console.log("➡️ Complete & Continue → moving next");
                    await sleep(3000);
                } else {
                    console.log("🎉 No Next button → course probably finished");
                    break;
                }
            }

        } catch (err) {
            console.log("⚠️ Error:", err);
            break;
        }
    }
}

udemyAutoSkipper();
