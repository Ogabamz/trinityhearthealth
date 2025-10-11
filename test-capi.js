// test-capi.js

// 1. Import necessary modules
const crypto = require('crypto');

// 2. Configuration - Same as your Apps Script
const PIXEL_ID = '31576639681951470';
const ACCESS_TOKEN = 'EAAOBldxg4tIBPucIFJ5EB9ZAIPCMTiX4fbZCqBjPZBpGLfYk5FCN8cI5l6n8jrHZA4GdjIp1PBim0LzOeDE9Sx6YZAJ26Dei7bchcbFh6DjEY78T8A2nYy7jcRE0PFiX9tctTqsEa4YWIguFCazeyMSq8U46fP0yWdS9cR54oZCutOUJtmRmBPZCRM0ZB4ETrwZDZD'; // IMPORTANT: Keep this secure!
const FB_ENDPOINT = `https://graph.facebook.com/v17.0/${PIXEL_ID}/events`;

// 3. Helper function for SHA-256 hashing
function sha256(str) {
  if (!str) return "";
  return crypto.createHash('sha256').update(str.trim().toLowerCase()).digest('hex');
}

// 4. Main function to send the event
async function sendCapiEvent() {
  console.log('Preparing to send CAPI event...');

  // 5. Create a sample event payload
  // This mimics the data your form would collect
  const sampleUserData = {
    'First Name': 'Test',
    'Last Name': 'User',
    'Email': 'test.user@example.com',
    'Phone': '1234567890',
    'City': 'Testville',
    'Event Source URL': 'http://localhost/test-page'
  };

  const event = {
    data: [{
      event_name: 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      action_source: "website",
      event_source_url: sampleUserData['Event Source URL'],
      user_data: {
        em: [sha256(sampleUserData['Email'])],
        ph: [sha256(sampleUserData['Phone'])],
        fn: [sha256(sampleUserData['First Name'])],
        ln: [sha256(sampleUserData['Last Name'])],
        ct: [sha256(sampleUserData['City'])]
      }
    }],
    test_event_code: 'TEST78713'
  };

  console.log('Payload:', JSON.stringify(event, null, 2));

  // 6. Send the event using fetch
  try {
    const response = await fetch(`${FB_ENDPOINT}?access_token=${ACCESS_TOKEN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    });

    const responseBody = await response.json();

    console.log('-----------------------------------');
    console.log('Response Status:', response.status);
    console.log('Response Body:', JSON.stringify(responseBody, null, 2));
    console.log('-----------------------------------');

    if (response.status === 200) {
      console.log('✅ CAPI event sent successfully!');
    } else {
      console.error('❌ Error sending CAPI event.');
    }

  } catch (error) {
    console.error('❌ An error occurred during the fetch operation:', error);
  }
}

// 7. Run the main function
sendCapiEvent();
