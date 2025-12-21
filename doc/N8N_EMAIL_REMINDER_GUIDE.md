# Complete Guide: Email Reminder 24 Hours Before Show

## What We're Building

When a user purchases a show ticket, 24 hours before the show date, they will automatically receive an email with the message:
**"Your identity has been declared dead. Come bury what remains"**

The email will be sent to the same email address they used to register on your website.

---

## Part 1: Backend Setup (Already Done ✅)

The backend has been updated to:
- Save purchases to the database
- Get the user's email and show date
- Send data to n8n webhook when a ticket is purchased

**You don't need to do anything for Part 1 - it's already done!**

---

## Part 2: Get Your n8n Account

### Step 1: Sign Up for n8n

1. Go to **https://n8n.io** in your web browser
2. Click **"Sign Up"** or **"Get Started"**
3. Choose one of these options:
   - **Cloud (Recommended for beginners)**: Free tier available, hosted by n8n
   - **Self-hosted**: Install on your own server (more complex)

4. **For beginners, I recommend the Cloud option**
5. Sign up with your email and create an account
6. Verify your email if needed

### Step 2: Log In to n8n

1. Go to **https://app.n8n.io** (or your n8n instance URL)
2. Log in with your credentials
3. You should see the n8n dashboard

---

## Part 3: Create Your First Workflow

### Step 3: Create a New Workflow

1. In the n8n dashboard, click the **"+"** button or **"New Workflow"** button
2. You'll see a blank workflow canvas
3. On the left side, you'll see a panel with different "nodes" (these are the building blocks)

### Step 4: Add a Webhook Node

1. **In the left panel**, look for **"Webhook"** in the list of nodes
   - You can also use the search box at the top to type "webhook"
2. **Click and drag** the "Webhook" node onto the canvas (the big empty area in the middle)
3. **Click on the Webhook node** you just added (it should be highlighted/selected)
4. **On the right side**, you'll see the settings panel for this node

### Step 5: Configure the Webhook Node

In the settings panel on the right:

1. **HTTP Method**:
   - Click the dropdown menu
   - Select **"POST"**

2. **Path** (Optional but recommended):
   - Type: `show-reminder`
   - This makes your webhook URL easier to remember

3. **Response Mode**:
   - Click the dropdown menu
   - Select **"When Last Node Finishes"**

4. **Look for the "Webhook URL"**:
   - You should see **TWO URLs** displayed:
     - **Test URL**: For testing manually (starts with `/webhook-test/`)
     - **Production URL**: For actual use (starts with `/webhook/`)
   - **IMPORTANT: Use the PRODUCTION URL** (the one that starts with `/webhook/`, NOT `/webhook-test/`)
   - **COPY THE PRODUCTION URL** - you'll need it in the next step!
   - There should be a "Copy" button next to it, or you can manually select and copy it
   - The production URL will look like: `https://your-n8n-instance.com/webhook/show-reminder`

5. **Click "Listen for Test Event"** button:
   - This activates the webhook
   - The button should change to show "Listening..." or similar

---

## Part 4: Connect Your Backend to n8n

### Step 6: Add Webhook URL to Your Backend

1. **Open your project folder** on your computer
2. **Navigate to the `backend` folder**
3. **Open the `.env` file** (if you don't see it, it might be hidden - make sure to show hidden files)
4. **Add this line** at the end of the file:
   ```
   N8N_WEBHOOK_URL=https://paste-your-webhook-url-here
   ```
   Replace `https://paste-your-webhook-url-here` with the webhook URL you copied in Step 5

5. **Save the file** (Ctrl+S or Cmd+S)

### Step 7: Restart Your Backend Server

1. **Stop your backend server** if it's running:
   - If it's running in a terminal window, press `Ctrl+C` to stop it
2. **Start it again**:
   - Open a terminal/command prompt
   - Navigate to your project: `cd path/to/lecture_project/backend`
   - Run: `npm start` or `node index.js`
3. **Check that it starts without errors**

---

## Part 5: Build the Rest of Your n8n Workflow

Now we need to add more nodes to calculate when to send the email and actually send it.

### Step 8: Add a Code Node (Calculate Reminder Time)

1. **In n8n**, go back to your workflow
2. **Click the "+" button** that appears when you hover over the right side of the Webhook node
   - OR drag a new node from the left panel
3. **Search for "Code"** in the node search box
4. **Add a "Code" node** (drag it to the canvas)
5. **Connect the Webhook node to the Code node**:
   - Click and drag from the small dot on the right side of the Webhook node
   - Drag it to the small dot on the left side of the Code node
   - You should see a line connecting them

6. **Click on the Code node** to configure it
7. **In the settings panel**, you'll see a code editor
8. **Delete any existing code** and paste this code:

```javascript
// Get the show date from the webhook data
const showDate = new Date($json.showDate);

// Assume the show is at 8:00 PM (20:00) - you can change this time if needed
showDate.setHours(20, 0, 0, 0);

// Calculate 24 hours before the show (24 hours = 24 * 60 * 60 * 1000 milliseconds)
const reminderTime = new Date(showDate.getTime() - (24 * 60 * 60 * 1000));

// Return all the original data plus the calculated reminder time
return {
  ...$json,
  reminderTime: reminderTime.toISOString(),
  showDateTime: showDate.toISOString()
};
```

9. **Click "Execute Node"** or the play button to test it (optional, for testing)

---

### Step 9: Add a Wait Node (Wait Until Reminder Time)

1. **Click the "+" button** on the right side of the Code node
2. **Search for "Wait"** in the node search
3. **Add a "Wait" node**
4. **Connect the Code node to the Wait node** (drag from Code to Wait)

5. **Click on the Wait node** to configure it
6. **In the settings panel**:
   - **Wait Type**: Select **"Until Specified Time"** from the dropdown
   - **Resume At**: Click in this field and type: `{{ $json.reminderTime }}`
     - This tells n8n to wait until the time we calculated in the Code node

---

### Step 10: Add an Email Node (Send the Email)

1. **Click the "+" button** on the right side of the Wait node
2. **Search for "Email"** or **"Gmail"** or **"SMTP"** in the node search
   - Choose based on what email service you want to use:
     - **Gmail**: If you want to use a Gmail account
     - **SMTP**: If you want to use any email service (more flexible)
     - **SendGrid**: If you have a SendGrid account

3. **For beginners, I recommend Gmail** (it's the easiest)
4. **Add the email node** (Gmail, SMTP, etc.)
5. **Connect the Wait node to the Email node**

6. **Click on the Email node** to configure it

#### If Using Gmail:

1. **First time setup - Connect your Gmail account**:
   - Click **"Create New Credential"** or **"Connect Account"**
   - You'll need to:
     - Enable 2-Factor Authentication on your Gmail account (if not already enabled)
     - Go to Google Account → Security → 2-Step Verification → App passwords
     - Create an app password for "Mail"
     - Use this app password (not your regular Gmail password) in n8n

2. **Configure the email**:
   - **To**: Click in this field and type: `{{ $json.userEmail }}`
     - This uses the email from the webhook data
   - **Subject**: Type: `Show Reminder`
   - **Message**: Type: `Your identity has been declared dead. Come bury what remains`
   - **From Email**: Your Gmail address

#### If Using SMTP:

1. **Create New Credential**:
   - **Host**: Your SMTP server (e.g., `smtp.gmail.com` for Gmail)
   - **Port**: Usually `587` (for TLS) or `465` (for SSL)
   - **User**: Your email address
   - **Password**: Your email password or app password
   - **Secure**: Enable TLS/SSL

2. **Configure the email** (same as Gmail above)

---

## Part 6: Activate and Test Your Workflow

### Step 11: Activate the Workflow

1. **Click the "Publish" button** at the top right of the n8n screen
   - It should show a checkmark (✓) after clicking it
   - This publishes and activates the workflow

2. **After clicking "Publish"**, look at the bottom of the screen:
   - **If you see "Waiting for trigger event"**: ✅ Your workflow is active and ready!
   - **If you see "Execute workflow" button**: The workflow might need to be saved first, or you're in test mode

3. **If you still see "Execute workflow"**:
   - Make sure you clicked "Publish" (it should have a checkmark)
   - Try clicking "Execute workflow" - this will manually test the workflow
   - After executing, it should change to "Waiting for trigger event"

4. **Important**: The workflow must show "Waiting for trigger event" (or be in "Active" state) to automatically receive webhooks from your backend

**What "Execute workflow" means**: This button lets you manually test the workflow. Once published and active, it should change to "Waiting for trigger event" to indicate it's listening for webhook calls from your backend.

### Step 12: Test Your Workflow

**IMPORTANT - How the Timing Works:**
- The workflow assumes shows are at **8:00 PM (20:00)**
- It calculates **24 hours before** that time
- **If the show is less than 24 hours away, the reminder time will be in the past and won't work!**

**To Test Properly, You Have Two Options:**

#### Option A: Test with a Future Show (Recommended)
1. **Create a show for tomorrow or later** (more than 24 hours away):
   - Go to your website admin panel
   - Add a new show with a date that's **at least 2 days from now**
   - For example: If today is Dec 22, create a show for Dec 24 or later
2. **Purchase that show** from a user account
3. **Wait 24 hours** before the show time
4. **Check your email** - it should arrive exactly 24 hours before 8:00 PM on the show date

#### Option B: Quick Test (1 Minute Wait)
For immediate testing, temporarily change the wait time to 1 minute:

1. **Click on the "Code in JavaScript" node** in your n8n workflow
2. **Find this line** in the code:
   ```javascript
   const reminderTime = new Date(showDate.getTime() - (24 * 60 * 60 * 1000));
   ```
3. **Change it to** (for 1 minute wait):
   ```javascript
   const reminderTime = new Date(new Date().getTime() + (1 * 60 * 1000)); // 1 minute from now
   ```
4. **Save/Publish the workflow** again
5. **Make a purchase** on your website
6. **Wait 1 minute**
7. **Check your email** - you should receive it!
8. **Remember to change it back** to 24 hours after testing:
   ```javascript
   const reminderTime = new Date(showDate.getTime() - (24 * 60 * 60 * 1000));
   ```

**Regular Testing Steps:**
1. **Make a test purchase** on your website:
   - Log in to your website
   - Go to the Shows section
   - Purchase a ticket for a show that's **more than 24 hours away**

2. **Check n8n**:
   - Go back to your n8n workflow
   - Click on the **"Executions"** tab at the top
   - You should see a new execution (a record of your workflow running)
   - Click on it to see the details

3. **Check if it's waiting**:
   - The workflow should be waiting at the Wait node
   - It will stay there until 24 hours before the show

4. **For faster testing** (optional):
   - You can temporarily change the Code node to wait only 1 minute instead of 24 hours
   - Change this line in the Code node:
     ```javascript
     const reminderTime = new Date(showDate.getTime() - (1 * 60 * 1000)); // 1 minute instead of 24 hours
     ```
   - Make a purchase
   - Wait 1 minute
   - Check your email!

---

## Part 7: Troubleshooting

### Problem: Webhook not receiving data

**Check:**
1. Is the webhook URL correct in your `.env` file?
2. Did you restart your backend after adding the URL?
3. Is the workflow activated in n8n?
4. Check your backend terminal/console for any error messages

**Solution:**
- Double-check the webhook URL matches exactly what n8n shows
- Make sure there are no extra spaces in the `.env` file
- Restart your backend server

### Problem: Email not sending

**Check:**
1. Are your email credentials correct?
2. For Gmail: Are you using an App Password (not your regular password)?
3. Is the email node configured correctly?
4. Check the n8n execution logs for errors

**Solution:**
- For Gmail, make sure 2-Factor Authentication is enabled and you're using an App Password
- Check the "To" field uses `{{ $json.userEmail }}`
- Make sure the workflow is activated

### Problem: Timing is wrong

**Check:**
1. The show date format in your database
2. The time zone settings

**Solution:**
- The code assumes shows are at 8:00 PM (20:00). If your shows are at a different time, change `setHours(20, 0, 0, 0)` to your show time
- For example, for 7:00 PM: `setHours(19, 0, 0, 0)`

---

## Summary Checklist

- [ ] Signed up for n8n account
- [ ] Created a new workflow
- [ ] Added Webhook node and configured it (POST method)
- [ ] Copied the webhook URL
- [ ] Added webhook URL to `backend/.env` file
- [ ] Restarted backend server
- [ ] Added Code node with reminder calculation code
- [ ] Added Wait node configured to wait until reminder time
- [ ] Added Email node (Gmail/SMTP) and configured it
- [ ] Connected all nodes: Webhook → Code → Wait → Email
- [ ] Activated the workflow
- [ ] Tested with a purchase

---

## What Happens Now?

1. **User purchases a ticket** → Backend saves it and calls n8n webhook
2. **n8n receives the data** → Calculates 24 hours before show
3. **n8n waits** → Until 24 hours before the show
4. **n8n sends email** → "Your identity has been declared dead. Come bury what remains"

The workflow will automatically handle every purchase - you don't need to do anything else!

---

## Need Help?

- **n8n Documentation**: https://docs.n8n.io
- **n8n Community**: https://community.n8n.io
- Check your backend console logs for webhook errors
- Check n8n execution logs for workflow errors

Good luck! 🎉

