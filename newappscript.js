/************** CONFIG *****************/
const PIXEL_ID = '31576639681951470';
const ACCESS_TOKEN = 'EAAOBldxg4tIBPucIFJ5EB9ZAIPCMTiX4fbZCqBjPZBpGLfYk5FCN8cI5l6n8jrHZA4GdjIp1PBim0LzOeDE9Sx6YZAJ26Dei7bchcbFh6DjEY78T8A2nYy7jcRE0PFiX9tctTqsEa4YWIguFCazeyMSq8U46fP0yWdS9cR54oZCutOUJtmRmBPZCRM0ZB4ETrwZDZD';
const FB_ENDPOINT = `https://graph.facebook.com/v17.0/${PIXEL_ID}/events`;
const SPREADSHEET_ID = '1FTdW514DZqYaQsftNVRC1zAzd-WjVX2c3Uoldv4Apsc';
const DATA_SHEET_NAME = 'Sheet1';
const LOG_SHEET_NAME = 'Logs';
/****************************************/

// Helper function for logging to a sheet
function logToSheet(message) {
  try {
    const logSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(LOG_SHEET_NAME);
    logSheet.appendRow([new Date(), message]);
  } catch (e) {
    // Failsafe in case logging to sheet fails, log to default logger
    Logger.log(`Failed to log to sheet: ${e.toString()}. Original message: ${message}`);
  }
}

function doPost(e) {
  try {
    logToSheet('Request received. Parameter: ' + JSON.stringify(e.parameter));
    if (e.postData) {
        logToSheet('Request received. Post Data: ' + e.postData.contents);
    }

    const data = e.parameter;
    logToSheet('Data object being used: ' + JSON.stringify(data));

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(DATA_SHEET_NAME);
    const row = [ new Date(), data['First Name'] || '', data['Last Name'] || '', data['Email'] || '', data['Phone'] || '', data['City'] || '', data['Event Type'] || '', data['Event Time'] || '', data['Event Source URL'] || '' ];
    for (let i = 1; i <= 20; i++) {
      row.push(data[`Q${i}`] || '');
    }
    sheet.appendRow(row);
    logToSheet('Row appended successfully to data sheet.');

    if (data['Email'] || data['Phone']) {
      const cleanUserData = {};
      const fieldsToProcess = { em: data['Email'], ph: data['Phone'], fn: data['First Name'], ln: data['Last Name'], ct: data['City'] };
      for (const key in fieldsToProcess) {
          const value = fieldsToProcess[key];
          if (value && typeof value === 'string' && value.trim() !== '') {
              cleanUserData[key] = [sha256(value)];
          }
      }

      const event = {
        data: [{
          event_name: data['Event Type'] || 'Lead',
          event_time: Math.floor(Date.now() / 1000),
          action_source: "website",
          event_source_url: data['Event Source URL'] || '',
          user_data: cleanUserData
        }],
        test_event_code: 'TEST78713'
      };

      logToSheet('Facebook CAPI Payload: ' + JSON.stringify(event, null, 2));

      const options = { method: "post", contentType: "application/json", payload: JSON.stringify(event), muteHttpExceptions: true };

      try {
        const response = UrlFetchApp.fetch(`${FB_ENDPOINT}?access_token=${ACCESS_TOKEN}`, options);
        const responseCode = response.getResponseCode();
        const responseBody = response.getContentText();
        
        logToSheet('Facebook CAPI Response Code: ' + responseCode);
        logToSheet('Facebook CAPI Response Body: ' + responseBody);

      } catch (error) {
        logToSheet('Facebook CAPI Fetch Error: ' + error.toString());
      }
    }

    return ContentService.createTextOutput(JSON.stringify({status: "success"}))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    logToSheet('Error in doPost: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: "An internal error occurred. Please try again."}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function sha256(str) {
  if (!str) return "";
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str.trim().toLowerCase());
  return digest.map(b => ('0' + (b < 0 ? b + 256 : b).toString(16)).slice(-2)).join('');
}