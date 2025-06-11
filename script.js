document.getElementById("uploadBtn").addEventListener("click", async () => {
  const fileInput = document.getElementById("fileInput");
  const status = document.getElementById("status");

  if (!fileInput.files.length) {
    status.innerText = "Bitte eine Datei auswählen.";
    return;
  }

  const file = fileInput.files[0];
  const text = await file.text();
  const links = text.split('\n').map(line => line.trim()).filter(Boolean);

  status.innerText = "Sende Daten an Supabase...";

  for (const link of links) {
    await fetch('https://YOUR_PROJECT.supabase.co/rest/v1/immobilien', {
      method: 'POST',
      headers: {
        'apikey': 'YOUR_ANON_KEY',
        'Authorization': 'Bearer YOUR_ANON_KEY',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ link })
    });
  }

  status.innerText = "Alle Links wurden gespeichert.";
});

// Einfaches CSV-Export-Feature
document.getElementById("exportBtn").addEventListener("click", async () => {
  const res = await fetch('https://YOUR_PROJECT.supabase.co/rest/v1/immobilien?select=*', {
    headers: {
      'apikey': 'YOUR_ANON_KEY',
      'Authorization': 'Bearer YOUR_ANON_KEY',
    }
  });

  const data = await res.json();

  const csv = [
    ["Link", "Ort", "Preis", "Wohnfläche", "Grundfläche", "Baujahr", "Effizienzklasse"],
    ...data.map(row => [
      row.link, row.ort, row.preis, row.wohnflaeche, row.grundflaeche, row.baujahr, row.effizienzklasse
    ])
  ].map(e => e.join(";")).join("\n");

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "immobilien.csv";
  a.click();
});
