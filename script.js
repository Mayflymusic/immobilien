const SUPABASE_URL = "https://kplrgraosnsdcfnpyuiw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwbHJncmFvc25zZGNmbnB5dWl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2MzczNDUsImV4cCI6MjA2NTIxMzM0NX0.1wSk7rQnFkdNuY4WA3KM0_rdF6a8lwVrYoxVFi-ei6E";

document.getElementById("uploadBtn").addEventListener("click", async () => {
  const fileInput = document.getElementById("fileInput");
  const status = document.getElementById("status");

  if (!fileInput.files.length) {
    status.innerText = "❗ Bitte eine Datei auswählen.";
    return;
  }

  const file = fileInput.files[0];
  const text = await file.text();
  const links = text.split('\n').map(line => line.trim()).filter(Boolean);

  status.innerText = `🔄 ${links.length} Links werden gespeichert ...`;

  for (const link of links) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/immobilien`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ link })
      });
    } catch (error) {
      console.error(`Fehler beim Speichern des Links ${link}:`, error);
    }
  }

  status.innerText = "✅ Alle Links wurden gespeichert.";
});

document.getElementById("exportBtn").addEventListener("click", async () => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/immobilien?select=*`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });

  const data = await res.json();

  const csv = [
    ["Link", "Ort", "Preis", "Wohnfläche", "Grundfläche", "Baujahr", "Effizienzklasse"],
    ...data.map(row => [
      row.link || "",
      row.ort || "",
      row.preis || "",
      row.wohnflaeche || "",
      row.grundflaeche || "",
      row.baujahr || "",
      row.effizienzklasse || ""
    ])
  ].map(e => e.join(";")).join("\n");

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "LinkRadar_Export.csv";
  a.click();
});
