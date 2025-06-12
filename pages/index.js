import Head from 'next/head';
import { useState } from 'react';

export default function Home() {
  const [status, setStatus] = useState('');
  const [uploadCount, setUploadCount] = useState(0);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      setStatus("❗ Bitte eine Datei auswählen.");
      return;
    }

    const text = await file.text();
    const links = text.split('\n').map(line => line.trim()).filter(Boolean);

    if (links.length === 0) {
      setStatus("❗ Keine gültigen Links gefunden.");
      return;
    }

    setStatus(`🔄 ${links.length} Links werden gespeichert...`);
    setUploadCount(links.length);

    for (const link of links) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/immobilien`, {
          method: 'POST',
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_KEY,
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal'
          },
          body: JSON.stringify({ link, status: 'pending' })
        });
      } catch (error) {
        console.error(`Fehler beim Speichern von ${link}:`, error);
      }
    }

    setStatus("✅ Alle Links wurden gespeichert.");
  };

  const startScraper = async () => {
    try {
      const res = await fetch('/api/scrape');

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Fehler beim Scraper-Start:', errorText);
        alert("❌ Scraper konnte nicht gestartet werden.");
        return;
      }

      const result = await res.json();
      console.log('Antwort vom Scraper:', result);

      if (result.message) {
        alert(result.message);
      } else {
        alert("✅ Scraper abgeschlossen (keine Nachricht zurückgegeben).");
      }
    } catch (err) {
      console.error('Fehler im Frontend:', err);
      alert("❌ Unerwarteter Fehler beim Scraper.");
    }
  };

  return (
    <>
      <Head>
        <title>Immobilien LinkRadar</title>
      </Head>
      <main style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
        <h1>🏡 Immobilien LinkRadar</h1>

        <label htmlFor="fileInput">.txt-Datei mit Links hochladen:</label><br />
        <input
          id="fileInput"
          type="file"
          accept=".txt"
          onChange={handleFileUpload}
          style={{ marginTop: '10px' }}
        /><br /><br />

        <button onClick={startScraper}>🧠 Scraper jetzt starten</button>

        <p style={{ marginTop: '20px' }}>{status}</p>
      </main>
    </>
  );
}
