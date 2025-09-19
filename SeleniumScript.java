import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;
import java.util.concurrent.ThreadLocalRandom;

public class UdemyAutoSkipper {

    // --- Random sleep helper ---
    private static void randomSleep(int minSeconds, int maxSeconds) throws InterruptedException {
        int sleepTime = ThreadLocalRandom.current().nextInt(minSeconds, maxSeconds + 1);
        System.out.println("⏳ Waiting ~" + sleepTime + "s (randomized)");
        Thread.sleep(sleepTime * 1000L);
    }

    public static void main(String[] args) {
        // --- CONFIG ---
        String email = "your_email@example.com";
        String password = "your_password";
        String courseUrl = "https://www.udemy.com/course/your-course-id/learn/"; // Course main page

        // --- DRIVER SETUP ---
        System.setProperty("webdriver.chrome.driver", "chromedriver"); // adjust path if needed
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--start-maximized");
        WebDriver driver = new ChromeDriver(options);
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        try {
            // --- LOGIN ---
            driver.get("https://www.udemy.com/join/login-popup/");
            wait.until(ExpectedConditions.presenceOfElementLocated(By.name("email")));

            driver.findElement(By.name("email")).sendKeys(email);
            driver.findElement(By.name("password")).sendKeys(password);
            driver.findElement(By.name("password")).submit();
            System.out.println("✅ Logged in");

            // --- OPEN COURSE ---
            driver.get(courseUrl);
            randomSleep(4, 7);

            // --- MAIN LOOP ---
            while (true) {
                try {
                    // --- DETECT LECTURE TYPE ---
                    if (driver.findElements(By.tagName("video")).size() > 0) {
                        System.out.println("🎥 Video lecture detected");
                        WebElement video = driver.findElement(By.tagName("video"));

                        // Get video duration
                        double duration = (Double) ((org.openqa.selenium.JavascriptExecutor) driver)
                                .executeScript("return arguments[0].duration;", video);

                        if (duration > 20) {
                            // Pick random watch time (2–10s)
                            int watchTime = ThreadLocalRandom.current().nextInt(2, 11);

                            // Randomly choose strategy: 50% end, 50% middle
                            boolean skimEnd = ThreadLocalRandom.current().nextBoolean();

                            if (skimEnd) {
                                // Watch last X seconds
                                ((org.openqa.selenium.JavascriptExecutor) driver)
                                        .executeScript("arguments[0].currentTime = arguments[0].duration - arguments[1];",
                                                video, watchTime);
                                System.out.println("⏩ Watching last " + watchTime + "s of " + (int) duration + "s video");

                            } else {
                                // Watch in the middle
                                int middlePoint = ThreadLocalRandom.current().nextInt((int) (duration / 3), (int) (duration * 2 / 3));
                                ((org.openqa.selenium.JavascriptExecutor) driver)
                                        .executeScript("arguments[0].currentTime = arguments[1];", video, middlePoint);
                                System.out.println("🎯 Skimming middle (" + middlePoint + "s) for ~" + watchTime + "s");
                            }

                            ((org.openqa.selenium.JavascriptExecutor) driver).executeScript("arguments[0].play();", video);

                            Thread.sleep((watchTime + 1) * 1000L); // actually "watch"
                        }

                    } else if (driver.findElements(By.cssSelector(".article-asset--content")).size() > 0) {
                        System.out.println("📖 Article detected → skipping instantly");
                        randomSleep(2, 4);

                    } else if (driver.findElements(By.xpath("//button[contains(., 'Start Quiz') or contains(., 'Skip Quiz')]")).size() > 0) {
                        System.out.println("❓ Quiz/assignment detected");

                        if (driver.findElements(By.xpath("//button[contains(., 'Skip Quiz')]")).size() > 0) {
                            driver.findElement(By.xpath("//button[contains(., 'Skip Quiz')]")).click();
                            System.out.println("➡️ Skipped quiz");
                            randomSleep(2, 4);
                        }

                    } else {
                        System.out.println("🤔 Unknown lecture type, skipping...");
                        randomSleep(2, 4);
                    }

                    // --- HANDLE NAVIGATION ---
                    if (driver.findElements(By.cssSelector(".upnext--container")).size() > 0) {
                        System.out.println("⏭ Up Next popup detected");
                        WebElement upNextBtn = driver.findElement(
                                By.xpath("//button[contains(., 'Play Next') or contains(., 'Continue')]")
                        );
                        upNextBtn.click();
                        randomSleep(3, 6);

                    } else if (driver.findElements(By.xpath("//button[contains(., 'Complete and continue')]")).size() > 0) {
                        WebElement continueBtn = driver.findElement(
                                By.xpath("//button[contains(., 'Complete and continue')]")
                        );
                        continueBtn.click();
                        System.out.println("➡️ Moved to next lecture");
                        randomSleep(3, 6);

                    } else {
                        System.out.println("🎉 No Next button found → Course likely finished");
                        break;
                    }

                } catch (Exception e) {
                    System.out.println("⚠️ Error or reached end: " + e.getMessage());
                    break;
                }
            }

        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            driver.quit();
        }
    }
}
