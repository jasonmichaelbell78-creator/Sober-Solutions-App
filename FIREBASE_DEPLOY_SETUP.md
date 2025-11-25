# Firebase Auto-Deploy Setup (Easiest Method)

## One-Time Setup (Web-Based - No Commands!)

### Step 1: Get Firebase Service Account Key
1. Go to: https://console.firebase.google.com/project/sober-solutions-app/settings/serviceaccounts/adminsdk
2. Click **"Generate New Private Key"**
3. Click **"Generate Key"** (downloads a JSON file)
4. Open the downloaded JSON file in a text editor
5. Copy the ENTIRE contents

### Step 2: Add Secret to GitHub
1. Go to: https://github.com/jasonmichaelbell78-creator/Sober-Solutions-App/settings/secrets/actions
2. Click **"New repository secret"**
3. Name: `FIREBASE_SERVICE_ACCOUNT`
4. Value: Paste the entire JSON content you copied
5. Click **"Add secret"**

### Step 3: Done! 🎉

That's it! Now every time you push code to this branch, GitHub will automatically:
- Build your app
- Deploy to Firebase Hosting
- Give you a URL to test

## How to See Your Deployed App

After pushing code:
1. Go to: https://github.com/jasonmichaelbell78-creator/Sober-Solutions-App/actions
2. Click on the latest workflow run
3. Wait for it to finish (green checkmark)
4. Your app will be live at: https://sober-solutions-app.web.app

## Alternative: Manual One-Time Deploy

If you want to deploy manually right now without GitHub Actions:

You would need Firebase CLI, but since you mentioned you don't run code, the GitHub Actions approach above is better for you.

## Deployment Branches

Auto-deploys on push to:
- `claude/testing-improvements-01BbbkLr5FrRhirV7oUzEYtd` (current testing branch)
- `development`
- `production`
