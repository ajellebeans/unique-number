/**
 * Unique number counter  --  Google Apps Script web app.
 *
 * Hands out a number that is never repeated, starting at 4000.
 * Uses LockService so two people clicking at the same instant can
 * never receive the same number (atomic increment).
 *
 * DEPLOY (one time):
 *   1. script.google.com  ->  New project  ->  paste this file.
 *   2. Deploy  ->  New deployment  ->  type "Web app".
 *        - Execute as:  Me
 *        - Who has access:  Anyone
 *   3. Copy the /exec web app URL it gives you.
 *   4. Paste that URL into ENDPOINT in index.html.
 *
 * After a code change you must Deploy -> Manage deployments -> Edit ->
 * "New version" for it to take effect.
 */

// SECURITY: this web app is public + unauthenticated by design. Apps Script does
// not expose the client IP, so there is no practical per-IP rate limit here. Abuse
// can only inflate the counter (recoverable via resetCounterTo); uniqueness never
// breaks. For a rate-limited public endpoint, prefer the Cloudflare Worker version
// or put Cloudflare Turnstile in front. See README "Security notes".
var START_AT = 4000;          // first number ever handed out
var KEY      = 'next_number'; // stored in Script Properties

/** The page POSTs here to claim the next number. */
function doPost(e) {
  return issueNumber();
}

/** Visiting the URL in a browser just shows status (does not burn a number). */
function doGet(e) {
  var props = PropertiesService.getScriptProperties();
  var next = parseInt(props.getProperty(KEY) || String(START_AT), 10);
  return json({ status: 'ok', next_number: next, hint: 'POST to claim a number' });
}

function issueNumber() {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000); // wait up to 20s for any in-flight request to finish
  try {
    var props = PropertiesService.getScriptProperties();
    var n = parseInt(props.getProperty(KEY) || String(START_AT), 10);
    props.setProperty(KEY, String(n + 1));
    return json({ number: n });
  } finally {
    lock.releaseLock();
  }
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ---- admin helpers: run these from the Apps Script editor when needed ---- */

/** Set / reset the counter to a specific value. Edit the number, then Run. */
function resetCounterTo() {
  var value = 4000; // <-- change, then press Run, to force the next number
  PropertiesService.getScriptProperties().setProperty(KEY, String(value));
  Logger.log('Next number is now ' + value);
}

/** Read the current value without changing it. */
function peek() {
  var v = PropertiesService.getScriptProperties().getProperty(KEY) || String(START_AT);
  Logger.log('Next number to be handed out: ' + v);
}
