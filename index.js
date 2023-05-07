const puppeteer = require("puppeteer");
const fs = require("fs");
const place =
  "Galeria de Binondo - Muelle dela Industria, Binondo, Manila, Metro Manila, NCR, 1006";

(async () => {
  const browser = await puppeteer.launch({
    protocolTimeout: 1000 * 3600,
    headless: "new",
  });
  let restaurants = [];
  try {
    const page = await browser.newPage();
    page.on("response", async (response) => {
      if (
        response.request().method() !== "OPTIONS" &&
        response.url() === "https://portal.grab.com/foodweb/v2/search"
      ) {
        restaurants.push(...extractData(await response.json()));
      }
    });
    await page.goto("https://food.grab.com/ph/en/");
    await page.$eval("#onetrust-accept-btn-handler", (element) =>
      element.click()
    );
    await delay(1000);
    await page.type("#location-input", place);
    await page.$eval(".submitBtn___2roqB", (element) => element.click());
    await delay(20000);
    await autoScroll(page);
    await delay(10000);
    const stream = fs.createWriteStream("data.json");
    stream.write("[\n");
    restaurants.forEach((obj, index) => {
      const comma = index === restaurants.length - 1 ? "" : ",";
      stream.write(JSON.stringify(obj) + comma + "\n");
    });
    stream.write("]");
  } catch (error) {
    console.log(error);
  } finally {
    await browser?.close();
  }
})();

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

function extractData({ searchResult }) {
  const restaurants = [];
  const { searchMerchants } = searchResult;
  searchMerchants.map((merchant) => {
    if (merchant.branchMerchants) {
      merchant.branchMerchants.map((branch) => {
        restaurants.push({
          id: branch.id,
          name: branch.address.name,
          latlng: branch.latlng,
        });
      });
    } else {
      restaurants.push({
        id: merchant.id,
        name: merchant.address.name,
        latlng: merchant.latlng,
      });
    }
  });
  return restaurants;
}
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      let distance = 200;
      let timer = setInterval(() => {
        let scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight - window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 2000);
    });
  });
}
