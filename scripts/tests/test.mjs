
const urls = [
  'https://www.tiktok.com/@tiktok',
  'https://www.tiktok.com/@charlidamelio',
  'https://www.tiktok.com/@khaby.lame'
];

async function probe() {
  for (const url of urls) {
    try {
      console.log(\Probing \...\);
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
      const text = await res.text();
      console.log(\Status: \\);
      if (text.includes('captcha') || text.includes('verify')) {
        console.log('Detected captcha/verification challenge');
      } else if (text.length < 50000) {
        console.log(\Body seems very small: \ bytes. Possibly blocked.\);
      } else {
        console.log(\Body size: \ bytes. Appears loaded.\);
      }
      console.log('---');
    } catch (err) {
      console.error(\Error fetching \:\, err);
    }
  }
}
probe();

