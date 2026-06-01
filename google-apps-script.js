/* eslint-disable */

const SPREADSHEET_ID = "1wMA4IIuaBkYVHXMiIz9vLwiF2kjcmufxU2HElPsDH24";
const WEBHOOK_SECRET = "replace-with-the-same-long-random-secret-from-env";
const MAX_SIGNATURE_AGE_MS = 5 * 60 * 1000;

function doPost(event) {
  const payload = JSON.parse(event.postData.contents || "{}");
  const childName = String(payload.childName || "").trim();
  const yearLevel = String(payload.yearLevel || "").trim();
  const email = String(payload.email || "").trim();
  const timestamp = Number(payload.timestamp || 0);
  const signature = String(payload.signature || "");

  if (!childName || !yearLevel || !email) {
    return jsonResponse({ ok: false, error: "Missing signup details" });
  }

  if (!isValidYearLevel(yearLevel)) {
    return jsonResponse({ ok: false, error: "Invalid year level" });
  }

  if (!isValidSignature({ childName, yearLevel, email, timestamp, signature })) {
    return jsonResponse({ ok: false, error: "Unauthorized" });
  }

  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheets()[0];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Timestamp", "Child Name", "Email", "Year Level","Difficulty", "Days"]);
  }

  sheet.appendRow([new Date(), childName, email, yearLevel, 'Standard', 'Monday, Wednesday, Friday']);

  return jsonResponse({ ok: true });
}

function isValidYearLevel(yearLevel) {
  return /^(10|[1-9])$/.test(yearLevel);
}

function isValidSignature({ childName, yearLevel, email, timestamp, signature }) {
  if (!timestamp || Math.abs(Date.now() - timestamp) > MAX_SIGNATURE_AGE_MS) {
    return false;
  }

  const message = JSON.stringify([timestamp, childName, yearLevel, email]);
  const expectedSignature = bytesToHex(
    Utilities.computeHmacSha256Signature(message, WEBHOOK_SECRET),
  );

  return signature === expectedSignature;
}

function bytesToHex(bytes) {
  return bytes
    .map(function (byte) {
      const unsignedByte = byte < 0 ? byte + 256 : byte;
      return unsignedByte.toString(16).padStart(2, "0");
    })
    .join("");
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
