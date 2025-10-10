const SPREADSHEET_ID = '1FTdW514DZqYaQsftNVRC1zAzd-WjVX2c3Uoldv4Apsc';
const SHEET_NAME = 'Sheet1';

function doPost(e) {
  try {
    Logger.log('Request received: ' + JSON.stringify(e));

    const data = e.parameter;

    Logger.log('Data received: ' + JSON.stringify(data));

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);

    const row = [
      new Date(),                  // Timestamp
      data['First Name'] || '',    // First Name
      data['Last Name'] || '',     // Last Name
      data['Email'] || '',         // Email
      data['Phone'] || '',         // Phone
      data['City'] || '',          // City
      data['Event Type'] || '',    // Event Type
      data['Event Time'] || '',    // Event Time
      data['Event Source URL'] || '' // Event Source URL
    ];

    sheet.appendRow(row);

    Logger.log('Row appended successfully');

    return ContentService.createTextOutput(JSON.stringify({status: "success"}))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: "An internal error occurred. Please try again."}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
