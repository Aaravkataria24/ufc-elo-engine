import puppeteer from 'puppeteer';
import fs from 'fs-extra';

(async () => {
    const browser = await puppeteer.launch({
        executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled"]
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    try {
        await page.goto('http://ufcstats.com/statistics/events/completed?page=all', { waitUntil: 'load', timeout: 0 });

        await page.waitForSelector("a.b-link.b-link_style_black");
        const eventList = await page.evaluate(() => {
            return Array.from(document.querySelectorAll("a.b-link.b-link_style_black")).map(event => ({
                eventName: event.innerText.trim(),
                eventUrl: event.href
            }));
        });

        console.log(eventList);
        const allFights = [];

        for (const event of eventList) {
            let eventName = event.eventName;
            let eventUrl = event.eventUrl.trim();
            console.log(`Navigating to: "${eventUrl}"`);

            try {
                await page.goto(eventUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
                await page.waitForSelector("table.js-fight-table tbody tr", { timeout: 30000 });
            } catch (error) {
                console.error(`Timeout waiting for fight table on: ${eventUrl}`);
                continue;
            }

            const fights = await page.evaluate((eventName) => {
                const fightTable = document.querySelector("tbody");
                if (!fightTable) return [];

                return Array.from(fightTable.querySelectorAll("tr")).map(row => {
                    const fightData = row.querySelectorAll("td");
                    if (fightData.length < 10) return null;

                    return {
                        event: eventName,
                        fighter_1: fightData[1].querySelectorAll("p")[0].innerText.trim(),
                        fighter_2: fightData[1].querySelectorAll("p")[1].innerText.trim(),
                        result: fightData[0].innerText.trim(),
                        method: fightData[7].innerText.trim(),
                        round: fightData[8].innerText.trim(),
                        time: fightData[9].innerText.trim()
                    };
                }).filter(fight => fight !== null);
            }, eventName);

            allFights.push(...fights);
        }

        console.log(`Scraped ${allFights.length} fights!`);
        fs.writeJsonSync('fights.json', allFights);
        console.log("Data saved to fights.json");

    } catch (error) {
        console.error("Error scraping:", error);
    } finally {
        await browser.close();
    }
})();