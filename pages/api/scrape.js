import chromium from 'chrome-aws-lambda';

const SUPABASE_URL = 'https://kplrgraosnsdcfnpyuiw.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  const fetchLinks = await fetch(`${SUPABASE_URL}/rest/v1/immobilien?status=eq.pending&select=id,link`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`
    }
  });

  const links = await fetchLinks.json();
  const browser = await chromium.puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
    headless: chromium.headless
  });
  const page = await browser.newPage();

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
          baujahr: getText('[data-qa="construction-year"]')?.replace(/[^\d]/g, '')
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
      console.error(`Fehler bei ${link}:`, err);
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
  res.status(200).json({ message: `Fertig: ${links.length} Links verarbeitet.` });
}
