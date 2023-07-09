const puppeteer = require('puppeteer');
const $ = require('jquery');

const URL = 'https://www.walgreens.com/';

async function run () {
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

  // loop through product product_links
  for(let i=0; i<product_links.length; i++) {
    // navigate to product
    await page.goto(product_links[i]);

    // find individual product data
    const data = await page.evaluate(() => {

      // format price & account for discount changes
      let formattedPrice = '';
      let price = $("span#regular-price span.product__price").text();
      if (price !== '') {
        formattedPrice = '$' + (parseInt(price.replace('$', '')) / 100).toString();
      } else {
        formattedPrice = $("span#sales-price-info").text();
      };

      // format name & account for brand link
      let name = $("span#productTitle").text();
      const brand = $("a.brand-title strong").text();
      if (brand !== '') {
        name = `${brand} ${name}`;
      };

      return {
        name,
        price: formattedPrice,
        description: $("li#prodDesc div.inner p").text(),
        dimensions: $("p.universal-product-inches").text(),
        img: $("img.productImg").prop("src"),
        upc: $("div#prodSpecCont table td").last().text()
      };
    });

    // build product obj
    results.push(data);
  }

  // close browser
  browser.close();

  console.log("results: ", results);
};

run();
