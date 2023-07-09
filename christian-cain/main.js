const puppeteer = require('puppeteer');
const $ = require('jquery');

const URL = 'https://www.walgreens.com/';

// Defining Product class
class Product {
    constructor(obj) {
      this.id = obj.id;
      this.productName = obj.productName;
      this.listPrice = obj.listPrice;
      this.description = obj.description;
      this.productDimensions = obj.productDimensions;
      this.imageURLs = obj.imageURLs;
      this.productUPC = obj.productUPC;
      this.sourceURL = obj.sourceURL
    }
}

async function run () {
  try {
    let results = [];

    // open browser
    const browser = await puppeteer.launch();

    // navigate to page
    const page = await browser.newPage();
    await page.goto(URL);

    // find "Household Essentials" link
    const household_essentials_link = await page.evaluate(() => {
      let link = '';

      const categories = $("footer div.footer__bottom-section ul")[0];
      $(categories).find("li").each((i, obj) => {
        const a = $(obj).find("a")[0];
        if ($(a).html() === "Household Essentials") link = $(a).prop("href");
      })

      return link;
    });

    if (household_essentials_link === '') {
      throw new Error("Household Essentials not found!")
    }

    // navigate to "Household Essentials"
    await page.goto(household_essentials_link);

    // find 10 top selling products
    const product_links = await page.evaluate(() => {
      let links = [];

      const cards = $("div#tierRightComponents div#top_sellers div.slick-slide").slice(0, 10);
      cards.each((i, obj) => {
        const a = $(obj).find("a")[0];
        if (a) links.push($(a).prop("href"));
      });

      return links;
    });

    if (product_links.length === 0) {
      throw new Error("No products found!");
    }

    // loop through product product_links
    for(let i=0; i<product_links.length; i++) {
      // navigate to product
      await page.goto(product_links[i]);

      // find individual product data
      const data = await page.evaluate(() => {
        // format name & account for brand link
        let productName = $("span#productTitle").text();
        const brand = $("a.brand-title strong").text();
        if (brand !== '') {
          name = `${brand} ${name}`;
        };

        // format price & account for discount changes
        let listPrice = '';
        let price = $("span#regular-price span.product__price").text();
        if (price !== '') {
          listPrice = '$' + (parseInt(price.replace('$', '')) / 100).toString();
        } else {
          listPrice = $("span#sales-price-info").text();
        };

        // format image urls
        let imageURLs = [];
        imageURLs.push($("img#productImg").prop("src"));
        $("ul#thumbnailImages img").each((i, obj) => imageURLs.push($(obj).prop("src")));

        return {
          productName,
          listPrice,
          description: $("li#prodDesc div.inner p").text(),
          productDimensions: $("p.universal-product-inches").text(),
          imageURLs,
          productUPC: $("div#prodSpecCont table td").last().text()
        };
      });

      // build product obj
      const product = new Product({
        id: i,
        sourceURL: product_links[i],
        ...data
      });
      results.push(product);
    }

    // close browser
    browser.close();

    const json = JSON.stringify(results.map(el => ({ "product": el })));
    console.log(json); // note - for verification purposes

    return json;
  } catch (err) {
    console.log(err);
    return;
  }
};

run();
