import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

/** Local Chrome. No bundled browser download; set CHROME_PATH to override. */
const CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter((p): p is string => !!p);

export function chromePath(): string {
  const p = CANDIDATES.find((c) => existsSync(c));
  if (!p) throw new Error('No Chrome found. Set CHROME_PATH.');
  return p;
}

/**
 * Prints the on-screen artifact route, so the PDF and the page cannot drift.
 * The route hides chrome under @media print.
 */
/** `cookies` carry the caller's session so the page can load private data. */
export async function renderPdf(url: string, cookies: { name: string; value: string }[] = []): Promise<Uint8Array> {
  const browser = await puppeteer.launch({ executablePath: chromePath(), headless: true });
  try {
    const page = await browser.newPage();
    if (cookies.length) await page.setCookie(...cookies.map((c) => ({ ...c, url })));
    const res = await page.goto(url, { waitUntil: 'networkidle0', timeout: 30_000 });
    if (!res?.ok()) throw new Error(`Artifact page returned ${res?.status() ?? 'nothing'}`);
    await page.emulateMediaType('print');
    return await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: { top: '0.6in', bottom: '0.6in', left: '0.6in', right: '0.6in' },
    });
  } finally {
    await browser.close();
  }
}
