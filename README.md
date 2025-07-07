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

| Timestamp         | Title          | Description        | Priority | Category       | Deadline        | Submitter      | Status
|------------------|----------------|--------------------|----------|----------------|-----------------|----------------|----------------|
| Auto-generated   | Task title     | Task details       | High/Med/Low | Deployment,Design/etc. | YYYY-MM-DD      | Name or Email  | new

### 📌 Notes:
- **Timestamp** will be auto-generated using the Apps Script (e.g., `new Date()`).
- **Title** and **Description** describe the task clearly.
- **Priority** can be values like `High`, `Medium`, or `Low`.
- **Category** can be any tag or group like `Work`, `Personal`, etc.
- **Deadline** should follow the format `YYYY-MM-DD`.
- **Submitter** can be the name or email of the person submitting the task.
- **Status** can be values like `new`, `in progress`, `on hold`, `rejected`, `completed`, `testing`.

### 2. **Copy the Google Apps Script**
- Open the script editor: `Extensions > Apps Script`
- Paste the provided Apps Script code.
- Replace:
  - `your-admin-password` with your desired admin password
  - `<your-sheet-id>` with the Sheet ID
  - `"Sheet1"` with your actual sheet name (if different)

```js
// App Script Configuration
const CONFIG = {
  ADMIN_PASSWORD: 'your-admin-password', // Store your admin password here
  SPREADSHEET_ID: '<your-sheet-id>', // Replace with your actual sheet ID
  SHEET_NAME: 'Sheet1' // Replace with your actual sheet name
};

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
    } else if (data.action === 'authenticate') {
      return authenticateAdmin(data);
    } else if (data.action === 'updateStatus') {
      return updateTaskStatus(data);
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
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEET_NAME);
    
    // Validate required fields
    if (!data.title || !data.description) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Title and description are required'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Check if this is the first row (add headers)
    const lastRow = sheet.getLastRow();
    if (lastRow === 0) {
      sheet.appendRow([
        'Timestamp',
        'Title',
        'Description',
        'Priority',
        'Category',
        'Deadline',
        'Submitter',
        'Status'
      ]);
    }
    
    // Add the task with default status 'new'
    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.title,
      data.description,
      data.priority || 'medium',
      data.category || 'general',
      data.deadline || '--',
      data.submitter || 'Anonymous',
      'new'
    ]);
    
    return ContentService
      .createTextOutput(JSON.stringify({success: true}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Failed to submit task: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Function to update task status
function updateTaskStatus(data) {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEET_NAME);
    
    // Validate required fields
    if (!data.timestamp || !data.newStatus) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Timestamp and new status are required'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Get all data from the sheet
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    // Find the row with matching timestamp (assuming timestamp is in column A)
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) { // Start from 1 to skip header
      if (values[i][0] === data.timestamp) {
        rowIndex = i + 1; // +1 because sheet rows are 1-indexed
        break;
      }
    }
    
    if (rowIndex === -1) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Task not found'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Update the status column (column H, index 8)
    sheet.getRange(rowIndex, 8).setValue(data.newStatus);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Status updated successfully'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Failed to update status: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function authenticateAdmin(data) {
  try {
    // Check if password is provided
    if (!data.password) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Password is required'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Compare password with stored admin password
    if (data.password === CONFIG.ADMIN_PASSWORD) {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'Authentication successful'
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Invalid password'
      })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Authentication failed: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function fetchTasks() {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    
    // Check if there's data beyond the header row
    if (data.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({
        success: true, 
        tasks: []
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const tasks = data.slice(1).map(row => ({
      timestamp: row[0],
      title: row[1],
      description: row[2],
      priority: row[3],
      category: row[4],
      deadline: row[5],
      submitter: row[6],
      status: row[7] || 'new' // Include status column with default value
    })).reverse(); // Show newest tasks first
    
    return ContentService
      .createTextOutput(JSON.stringify({success: true, tasks: tasks}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Failed to fetch tasks: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Optional: Function to change admin password (call this manually in the script editor if needed)
function changeAdminPassword(newPassword) {
  // This function can be used to change the password
  // You would need to manually update the CONFIG.ADMIN_PASSWORD value
  // or implement a more sophisticated password management system
  Logger.log('To change password, update CONFIG.ADMIN_PASSWORD in the script');
  Logger.log('Current password hash or encrypted version could be stored here');
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
  GOOGLE_SCRIPT_URL:
    "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec",
};
```
# 🛡️ Notes

- Keep your password **secret** and use **HTTPS** for secure communication.
- Do **not** share the **script URL** publicly unless you want to be spammed with tasks.
- You can change the password for **password verification** inside the Apps Script for added security.

<div align="center">
  Made by MTCode01, when i wanted something to track my tasks, also when i was bored!
</div>
