# unique-number

A tiny web page that hands out a **unique number that is never repeated**, starting at
**4000**. Anyone who opens it and taps the button gets the next number in one shared
sequence, on any device, with no login.

- **The page** (`index.html`) is a single static file, served by GitHub Pages.
- **The counter** is one small online service the page calls. It holds "the next number"
  and increments it atomically, so the same number can never go out twice.

The page and the counter are separate because GitHub Pages only serves static files, it
cannot remember a number between visitors. The counter's source still lives here, so
GitHub stays the home of record for all the code.

```
index.html                     the page (this is what GitHub Pages serves)
counter/apps-script/Code.gs    the counter  (main option: Google Apps Script)
counter/cloudflare/worker.js   the counter  (backup option: Cloudflare Worker)
```

Every copy of the page points at the **same** counter URL, which is what makes it one
shared sequence no matter how many people or sites use it.

---

## Setup

### 1. Publish the page (GitHub Pages)

1. Put these files in a GitHub repo.
2. **Settings -> Pages -> Source: Deploy from a branch**, branch `main`, folder `/ (root)`.
3. The page goes live at `https://<owner>.github.io/<repo>/`. Until the counter URL is
   filled in (step 2) it shows a yellow **"Demo mode"** banner and uses practice numbers,
   which is expected and safe.

### 2. Deploy the counter (Google Apps Script)

1. [script.google.com](https://script.google.com) -> **New project**, paste in
   `counter/apps-script/Code.gs`.
2. **Deploy -> New deployment -> Web app**: Execute as **Me**, Who has access **Anyone**.
3. Copy the web app URL (ends in `/exec`) and paste it into `index.html`:
   ```js
   const ENDPOINT = "https://script.google.com/macros/s/AKfy.../exec";
   ```
4. Commit. The banner disappears and the tool is live.

> Visiting the `/exec` URL in a browser shows the current status and does **not** use up a
> number, only the page's button does.

---

## Changing things

- **Different starting number:** change `START` in `index.html` and `START_AT` in the
  counter, before anyone uses it. To reset later, run `resetCounterTo()` in the Apps Script
  editor.
- **Wording / colours:** all in `index.html`. Palette is the RDP softened brand
  (forest `#004238`, lime `#AADB1E`).
- **Backup counter:** if Apps Script ever misbehaves, deploy the Cloudflare Worker in
  `counter/cloudflare/` and point `ENDPOINT` at it instead. Nothing else changes.

## Why it never repeats

The counter increments under a lock, so requests are handled one at a time. If a
connection drops mid-request, the page refuses to show a number rather than guess, so a
blip can never cause a duplicate. The counter is the single source of truth.
