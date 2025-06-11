import Head from 'next/head';
import { useState } from 'react';

export default function Home() {
  const [status, setStatus] = useState('');

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    const text = await file.text();
    const links = text.split('\n').map(l => l.trim()).filter(Boolean);

    setStatus(`Lade ${links.length} Links in Supabase hoch...`);

    for (const link of links) {
      await fetch('https://kplrgraosnsdcfnpyuiw.supabase.co/rest/v1/immobilien', {
        method: 'POST',
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_KEY,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({ link })
      });
    }
    setStatus('✅ Upload abgeschlossen');
  };

  const startScraper = async () => {
    const res = await fetch('/api/scrape');
    const result = await res.json();
    alert(result.message);
  };

  return (
    <>
      <Head>
        <title>LinkRadar</title>
      </Head>
      <main style={{ padding: '2rem' }}>
        <h1>🔗 LinkRadar</h1>
        <input type="file" accept=".txt" onChange={handleFileUpload} /><br /><br />
        <button onClick={startScraper}>🧠 Scraper jetzt starten</button>
        <p>{status}</p>
      </main>
    </>
  );
}
