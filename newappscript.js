/************** CONFIG *****************/
const PIXEL_ID = '31576639681951470'; // Confirm this from Events Manager
const ACCESS_TOKEN = 'EAAOBldxg4tIBPucIFJ5EB9ZAIPCMTiX4fbZCqBjPZBpGLfYk5FCN8cI5l6n8jrHZA4GdjIp1PBim0LzOeDE9Sx6YZAJ26Dei7bchcbFh6DjEY78T8A2nYy7jcRE0PFiX9tctTqsEa4YWIguFCazeyMSq8U46fP0yWdS9cR54oZCutOUJtmRmBPZCRM0ZB4ETrwZDZD';
const FB_ENDPOINT = `https://graph.facebook.com/v18.0/${PIXEL_ID}/events`;
const SPREADSHEET_ID = '1FTdW514DZqYaQsftNVRC1zAzd-WjVX2c3Uoldv4Apsc';
const DATA_SHEET_NAME = 'Sheet1';
const LOG_SHEET_NAME = 'Logs';
/****************************************/

function sha256(str) {
  if (!str) return "";
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str.trim().toLowerCase());
  return digest.map(b => ('0' + (b < 0 ? b + 256 : b).toString(16)).slice(-2)).join('');
}

function logToSheet(message) {
  try {
    const logSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(LOG_SHEET_NAME);
    logSheet.appendRow([new Date(), message]);
  } catch (e) {
    Logger.log(`Log failed: ${e.toString()} | Original: ${message}`);
  }
}

function doPost(e) {
  try {
    const data = e.parameter;
    logToSheet('Raw POST: ' + JSON.stringify(data));

    // Save form submission to Sheet
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(DATA_SHEET_NAME);
    const row = [
      new Date(),
      data['First Name'] || '',
      data['Last Name'] || '',
      data['Email'] || '',
      data['Phone'] || '',
      data['City'] || '',
      data['Event Type'] || '',
      data['Event Time'] || '',
      data['Event Source URL'] || ''
    ];
    sheet.appendRow(row);

    // Hash user data
    const cleanUserData = {};
    const fields = { em: data['Email'], ph: data['Phone'], fn: data['First Name'], ln: data['Last Name'], ct: data['City'] };
    for (const key in fields) {
      if (fields[key] && fields[key].trim() !== '') cleanUserData[key] = [sha256(fields[key])];
    }

    // Build Facebook Event
    const event = {
      data: [{
        event_name: data['Event Type'] || 'Lead',
        event_time: Math.floor(Date.now() / 1000),
        event_id: data['Event ID'] || Utilities.getUuid(),
        action_source: "website",
        event_source_url: data['Event Source URL'] || '',
        user_data: {
          ...cleanUserData,
          client_user_agent: data['User Agent'] || "Mozilla/5.0"
        }
      }],
      test_event_code: data['test_event_code'] || 'TEST7995'
    };

    // Send to Facebook
    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(event),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(`${FB_ENDPOINT}?access_token=${ACCESS_TOKEN}`, options);
    const body = response.getContentText();

    logToSheet('FB CAPI Response: ' + body);
    return ContentService.createTextOutput(JSON.stringify({ status: "success", response: body }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    logToSheet('Error: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
