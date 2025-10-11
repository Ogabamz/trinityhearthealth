/************** CONFIG *****************/
const PIXEL_ID = '31576639681951470';
const ACCESS_TOKEN = 'EAAOBldxg4tIBPucIFJ5EB9ZAIPCMTiX4fbZCqBjPZBpGLfYk5FCN8cI5l6n8jrHZA4GdjIp1PBim0LzOeDE9Sx6YZAJ26Dei7bchcbFh6DjEY78T8A2nYy7jcRE0PFiX9tctTqsEa4YWIguFCazeyMSq8U46fP0yWdS9cR54oZCutOUJtmRmBPZCRM0ZB4ETrwZDZD';
const FB_ENDPOINT = `https://graph.facebook.com/v17.0/${PIXEL_ID}/events`;
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
      const event = {
        data: [{
          event_name: data['Event Type'] || 'Lead',
          event_time: Math.floor(Date.now() / 1000),
          action_source: "website",
          event_source_url: data['Event Source URL'] || '',
          user_data: {
            em: data['Email'] ? [sha256(data['Email'])] : [],
            ph: data['Phone'] ? [sha256(data['Phone'])] : [],
            fn: data['First Name'] ? [sha256(data['First Name'])] : [],
            ln: data['Last Name'] ? [sha256(data['Last Name'])] : [],
            ct: data['City'] ? [sha256(data['City'])] : []
          }
        }],
        test_event_code: 'TEST78713'
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

// Helper function for SHA-256 hashing
function sha256(str) {
  if (!str) return "";
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str.trim().toLowerCase());
  return digest.map(b => ('0' + (b < 0 ? b + 256 : b).toString(16)).slice(-2)).join('');
}
