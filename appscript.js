/************** CONFIG *****************/
const PIXEL_ID = '31576639681951470';
const ACCESS_TOKEN = 'EAAOBldxg4tIBPucIFJ5EB9ZAIPCMTiX4fbZCqBjPZBpGLfYk5FCN8cI5l6n8jrHZA4GdjIp1PBim0LzOeDE9Sx6YZAJ26Dei7bchcbFh6DjEY78T8A2nYy7jcRE0PFiX9tctTqsEa4YWIguFCazeyMSq8U46fP0yWdS9cR54oZCutOUJtmRmBPZCRM0ZB4ETrwZDZD';
const FB_ENDPOINT = `https://graph.facebook.com/v24.0/${PIXEL_ID}/events`;
/****************************************/

function doPost(e) {
  try {
    // Log the entire request for debugging
    Logger.log('Request received: ' + JSON.stringify(e));

    const data = e.parameter;

    // Log what we received
    Logger.log('Data received: ' + JSON.stringify(data));

    // Replace with your actual Spreadsheet ID and Sheet Name for reliability
    const SPREADSHEET_ID = '1FTdW514DZqYaQsftNVRC1zAzd-WjVX2c3Uoldv4Apsc';
    const SHEET_NAME = 'Sheet1';
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);

    // Build the row with all data
    const row = [
      new Date(),                           // Timestamp
      data['First Name'] || '',             // First Name
      data['Last Name'] || '',              // Last Name
      data['Email'] || '',                  // Email
      data['Phone'] || '',                  // Phone
      data['City'] || '',                   // City
      data['Event Type'] || '',             // Event Type
      data['Event Time'] || '',             // Event Time
      data['Event Source URL'] || ''        // Event Source URL
    ];

    // Add all 20 questions
    for (let i = 1; i <= 20; i++) {
      row.push(data[`Q${i}`] || '');
    }

    // Append to sheet
    sheet.appendRow(row);

    Logger.log('Row appended successfully');

    // Send to Facebook CAPI only if we have email or phone
    if (data['Email'] || data['Phone']) {
      // Parse event time if provided, fallback to now
      let eventTime = Math.floor(Date.now() / 1000);
      if (data['Event Time']) {
        const parsedTime = new Date(data['Event Time']);
        if (!isNaN(parsedTime.getTime())) {
          eventTime = Math.floor(parsedTime.getTime() / 1000);
        } else {
          Logger.log('Invalid Event Time format: ' + data['Event Time']);
        }
      }

      // Prepare user_data with normalized and hashed fields, omitting empty/invalid ones
      const userData = {};
      if (data['Email']) {
        const normalizedEm = normalizeEmail(data['Email']);
        if (normalizedEm && isValidEmail(normalizedEm)) {
          userData.em = [sha256(normalizedEm)];
        } else {
          Logger.log('Invalid email skipped: ' + data['Email']);
        }
      }
      if (data['Phone']) {
        const normalizedPh = normalizePhone(data['Phone']);
        if (normalizedPh && normalizedPh.length === 13) {  // Validate Nigeria: 234 + 10 digits
          userData.ph = [sha256(normalizedPh)];
        } else {
          Logger.log('Invalid phone skipped: ' + data['Phone'] + ' (normalized: ' + normalizedPh + ')');
        }
      }
      if (data['First Name']) {
        const normalizedFn = normalizeName(data['First Name']);
        if (normalizedFn) userData.fn = [sha256(normalizedFn)];
      }
      if (data['Last Name']) {
        const normalizedLn = normalizeName(data['Last Name']);
        if (normalizedLn) userData.ln = [sha256(normalizedLn)];
      }
      if (data['City']) {
        const normalizedCt = normalizeCity(data['City']);
        if (normalizedCt) userData.ct = [sha256(normalizedCt)];
      }

      // Add unhashed client identifiers if provided
      if (data['User Agent']) {
        userData.client_user_agent = data['User Agent'];
      }
      if (data['fbp']) {
        userData.fbp = data['fbp'];
      }
      if (data['fbc']) {
        userData.fbc = data['fbc'];
      }

      // Require at least one user_data key for good EMQ
      if (Object.keys(userData).length === 0) {
        Logger.log('Skipping CAPI: No valid user_data');
        return ContentService.createTextOutput(JSON.stringify({status: "success"}))
          .setMimeType(ContentService.MimeType.JSON);
      }

      const event = {
        data: [{
          event_name: data['Event Type'] || 'Lead',
          event_time: eventTime,
          action_source: "website",
          event_source_url: data['Event Source URL'] || '',
          user_data: userData,
          event_id: data['Event ID'] || ''  // For deduplication with pixel
        }],
        test_event_code: 'TEST78713'  // REMOVE this line for live production (test events may separate in some views)
      };

      Logger.log('Facebook CAPI Payload: ' + JSON.stringify(event, null, 2));

      const options = {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(event),
        muteHttpExceptions: true // Capture full error response
      };

      try {
        const response = UrlFetchApp.fetch(`${FB_ENDPOINT}?access_token=${ACCESS_TOKEN}`, options);
        const responseCode = response.getResponseCode();
        const responseBody = response.getContentText();
        
        Logger.log('Facebook CAPI Response Code: ' + responseCode);
        Logger.log('Facebook CAPI Response Body: ' + responseBody);

        // Enhanced error inspection
        if (responseCode !== 200) {
          Logger.log('CAPI Error Details: ' + responseBody);  // e.g., validation errors
        }

      } catch (error) {
        Logger.log('Facebook CAPI Fetch Error: ' + error.toString());
      }
    }

    return ContentService.createTextOutput(JSON.stringify({status: "success"}))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString()); // Log the detailed error for debugging
    // Return a generic error message to the user
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: "An internal error occurred. Please try again."}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Normalization functions based on Facebook requirements

function normalizeEmail(str) {
  if (!str) return '';
  return str.trim().toLowerCase();
}

function isValidEmail(em) {
  // Basic regex for validation (improves EMQ by skipping junk)
  return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(em);
}

function normalizePhone(ph) {
  if (!ph) return '';
  let cleaned = ph.replace(/\D/g, ''); // Remove non-digits
  if (cleaned.startsWith('0')) {
    cleaned = '234' + cleaned.slice(1);
  } else if (cleaned.length === 10) {
    // Assume local Nigerian number without leading 0
    cleaned = '234' + cleaned;
  } else if (cleaned.startsWith('234')) {
    // Already good
  } else if (cleaned.startsWith('2340')) {
    // Handle +2340... by removing extra 0
    cleaned = '234' + cleaned.slice(4);
  }
  return cleaned;
}

function normalizeName(str) {
  if (!str) return '';
  // Trim, lowercase, remove non-letters (punctuation, numbers, etc.), keep UTF-8 letters
  return str.trim().toLowerCase().replace(/[^\p{L}]/gu, '');
}

function normalizeCity(str) {
  if (!str) return '';
  // Trim, lowercase, remove non-letters (including spaces, punctuation), keep UTF-8 letters
  return str.trim().toLowerCase().replace(/[^\p{L}]/gu, '');
}

// Helper function for SHA-256 hashing
function sha256(str) {
  if (!str) return '';
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str);
  return digest.map(b => ('0' + (b < 0 ? b + 256 : b).toString(16)).slice(-2)).join('');
}