# ✅ To-Do Tasks Integration with Google Sheets

This project allows you to integrate a to-do list with a Google Sheet using Google Apps Script and a simple web endpoint.

---

## 📋 Setup Instructions

Follow these steps to set up the Google Sheet and deploy the web app:

### 1. **Create a Google Sheet**
- Open [Google Sheets](https://sheets.google.com).
- Create a new sheet for storing your to-do tasks.
- Note down the **Sheet ID** from the URL:  
  Format: `https://docs.google.com/spreadsheets/d/**<your-sheet-id>**/edit`

## 🗂️ Google Sheet Structure

Make sure your Google Sheet contains the following **columns** in this exact order for the integration to work properly:

| Timestamp         | Title          | Description        | Priority | Category       | Deadline        | Submitter      |
|------------------|----------------|--------------------|----------|----------------|-----------------|----------------|
| Auto-generated   | Task title     | Task details       | High/Med/Low | Deployment,Design/etc. | YYYY-MM-DD      | Name or Email  |

### 📌 Notes:
- **Timestamp** will be auto-generated using the Apps Script (e.g., `new Date()`).
- **Title** and **Description** describe the task clearly.
- **Priority** can be values like `High`, `Medium`, or `Low`.
- **Category** can be any tag or group like `Work`, `Personal`, etc.
- **Deadline** should follow the format `YYYY-MM-DD`.
- **Submitter** can be the name or email of the person submitting the task.


### 2. **Copy the Google Apps Script**
- Open the script editor: `Extensions > Apps Script`
- Paste the provided Apps Script code.
- Replace:
  - `YOUR_SHEET_ID_HERE` with the Sheet ID
  - `"Sheet1"` with your actual sheet name (if different)

```js
function doGet(e) {
  if (e.parameter.action === 'fetch') {
    return fetchTasks();
  }
  return ContentService.createTextOutput('Invalid request');
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.action === 'submit') {
      return submitTask(data);
    } else {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Unknown action'
      })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}


function submitTask(data) {
  const sheet = SpreadsheetApp.openById('YOUR_SHEET_ID').getSheetByName('SHEET_NAME');
  
  sheet.appendRow([
    data.timestamp,
    data.title,
    data.description,
    data.priority,
    data.category,
    data.deadline,
    data.submitter
  ]);
  
  return ContentService
    .createTextOutput(JSON.stringify({success: true}))
    .setMimeType(ContentService.MimeType.JSON);
}

function fetchTasks() {
  const sheet = SpreadsheetApp.openById('YOUR_SHEET_ID').getSheetByName('SHEET_NAME');
  const data = sheet.getDataRange().getValues();
  
  const tasks = data.slice(1).map(row => ({
    timestamp: row[0],
    title: row[1],
    description: row[2],
    priority: row[3],
    category: row[4],
    deadline: row[5],
    submitter: row[6]
  })).reverse();
  
  return ContentService
    .createTextOutput(JSON.stringify({success: true, tasks: tasks}))
    .setMimeType(ContentService.MimeType.JSON);
}
```

### 3. **Deploy as a Web App**
- Go to `Deploy > Manage deployments`
- Click **"New deployment"**
- Select **"Web app"**
- Set the following:
  - **Description**: Anything (e.g., "To-Do App Script")
  - **Execute as**: `Me`
  - **Who has access**: `Anyone`
- Click **Deploy** and **authorize** the permissions.
- Copy the **Web App URL** after deployment.

### 4. **Integrate with Your Code**
- In your application code:
  - Paste the **Web App URL**
  - Set your desired **password** for secure access

---

## 🔐 Example Code Snippet

```javascript
const CONFIG = {
   GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
   ADMIN_PASSWORD: 'your-admin-password'
};
```
# 🛡️ Notes

- Keep your password **secret** and use **HTTPS** for secure communication.
- Do **not** share the **script URL** publicly if sensitive data is involved.
- You can add basic **password verification** inside the Apps Script for added security.

<div align="center">
  Made by MTCode01, when i wanted something to track my tasks, and when i was bored!
</div>
