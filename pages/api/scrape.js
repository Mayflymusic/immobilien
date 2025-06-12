import chromium from 'chrome-aws-lambda';

const SUPABASE_URL = 'https://kplrgraosnsdcfnpyuiw.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  try {
    if (!SUPABASE_KEY) {
      throw new Error('SUPABASE_SERVICE_KEY is not defined. Please set it in your Vercel environment variables.');
    }

    // Fetch pending links
    const fetchLinks = await fetch(`${SUPABASE_URL}/rest/v1/immobilien?status=eq.pending&select=id,link`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!fetchLinks.ok) {
      const errorText = await fetchLinks.text();
      throw new Error(`Failed to fetch links: ${errorText}`);
    }

    const links = await fetchLinks.json();

    // Start Chromium browser
    const browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless
    });

    const page = await browser.newPage();

    // Process each link
    for (const item of links) {
      const { id, link } = item;

      try {
        await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 30000 });

        const data = await page.evaluate(() => {
          const getText = (sel) => document.querySelector(sel)?.textContent?.trim() || null;
          return {
            ort: getText('[data-qa="address-block"]'),
            preis: getText('[data-qa="price-primary"]')?.replace(/[^\d]/g, ''),
            wohnflaeche: getText('[data-qa="floor-space"]')?.replace(/[^\d]/g, ''),
            grundflaeche: getText('[data-qa="plot-area"]')?.replace(/[^\d]/g, ''),
            baujahr: getText('[data-qa="construction-year"]')?.replace(/[^\d]/g, ''),
            effizienzklasse: getText('[data-qa="energy-class"]') || null
          };
        });

        await fetch(`${SUPABASE_URL}/rest/v1/immobilien?id=eq.${id}`, {
          method: 'PATCH',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ...data, status: 'done' })
        });
      } catch (err) {
        console.error(`Error scraping ${link}:`, err);

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
    res.status(200).json({ message: `✅ Fertig: ${links.length} Links verarbeitet.` });

  } catch (err) {
    console.error('Scraper failed:', err);
    res.status(500).json({ error: err.message });
  }
}
