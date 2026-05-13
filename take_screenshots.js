const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  // Set viewport to a nice mobile size
  await page.setViewport({ width: 390, height: 844 });
  
  console.log("Navigating to app...");
  await page.goto('http://localhost:8080', { waitUntil: 'networkidle0', timeout: 60000 });
  
  // Give it some extra time to render the Flutter canvas
  console.log("Waiting for Flutter to render...");
  await new Promise(r => setTimeout(r, 10000));
  
  const artifactDir = 'C:\\Users\\ilyess\\.gemini\\antigravity\\artifacts';
  if (!fs.existsSync(artifactDir)){
      fs.mkdirSync(artifactDir, { recursive: true });
  }

  const screen1Path = path.join(artifactDir, '01_startup_screen.png');
  await page.screenshot({ path: screen1Path });
  console.log(`Saved ${screen1Path}`);
  
  // We can try to click on the Canvas but Flutter web renders everything on a canvas so clicking is hard without exact coordinates.
  // We'll just take the initial screen which is the EntryChoiceScreen (since there's no cached session by default).
  // Let's close it.
  
  await browser.close();
  console.log("Done.");
})();
