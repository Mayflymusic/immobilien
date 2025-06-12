import chromium from 'chrome-aws-lambda';

const SUPABASE_URL = 'https://kplrgraosnsdcfnpyuiw.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  try {
    if (!SUPABASE_KEY) {
      console.error('❌ SUPABASE_SERVICE_KEY is missing.');
      throw new Error('SUPABASE_SERVICE_KEY is not defined in the environment variables.');
    }

    console.log('✅ Scraper started...');

    // Fetch pending links from Supabase
    const fetchLinks = await fetch(`${SUPABASE_URL}/rest/v1/immobilien?status=eq.pending&select=id,link`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!fetchLinks.ok) {
      const text = await fetchLinks.text();
      console.error('❌ Failed to fetch links from Supabase:', text);
      throw new Error('Could not fetch links from Supabase.');
    }

    const links = await fetchLinks.json();
    console.log(`🔍 Found ${links.length} pending links`);

    // Launch headless Chromium
    const browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless
    });

    const page = await browser.newPage();

    for (const { id, link } of links) {
      try {
        console.log(`🌐 Visiting: ${link}`);
        await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 30000 });

        const data = await page.evaluate(() => {
          const getText = (selector) =>
            document.querySelector(selector)?.textContent?.trim() || null;

          return {
            ort: getText('[data-qa="address-block"]'),
            preis: getText('[data-qa="price-primary"]')?.replace(/[^\d]/g, ''),
            wohnflaeche: getText('[data-qa="floor-space"]')?.replace(/[^\d]/g, ''),
            grundflaeche: getText('[data-qa="plot-area"]')?.replace(/[^\d]/g, ''),
            baujahr: getText('[data-qa="construction-year"]')?.replace(/[^\d]/g, ''),
            effizienzklasse: getText('[data-qa="energy-class"]') || null
          };
        });

        // Update Supabase with extracted data
        await fetch(`${SUPABASE_URL}/rest/v1/immobilien?id=eq.${id}`, {
          method: 'PATCH',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ...data, status: 'done' })
        });

        console.log(`✅ Scraped and updated: ${link}`);

      } catch (err) {
        console.error(`❌ Failed scraping ${link}:`, err);

        // Update status to failed
        await fetch(`${SUPABASE_URL}/rest/v1/immobilien?id=eq.${id}`, {
          method: 'PATCH',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'failed' })
        });
      }
    }

    await browser.close();
    console.log(`🎉 Done: ${links.length} links processed`);
    res.status(200).json({ message: `✅ Fertig: ${links.length} Links verarbeitet.` });

  } catch (err) {
    console.error('❌ Scraper failed:', err);
    res.status(500).json({ error: err.message || 'Unexpected server error.' });
  }
}
