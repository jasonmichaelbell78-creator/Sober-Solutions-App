<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/10c7h-nM31bIo1VTmttgEWKE9MvVDlUaO

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Adding Background Images

To add a custom background image to your app:

1. Place your image file (JPG, PNG, or any web-compatible format) in the `/public` folder
2. Name it `background.jpg` (or update the CSS in `index.css` to match your filename)
3. The background will automatically appear with a subtle overlay for readability

**Tips:**
- Use high-quality images (1920x1080 or larger)
- Consider subtle, calming images that won't distract from content
- The CSS includes an overlay to maintain text readability
- You can adjust opacity in `index.css` under `.bg-pattern-subtle`

## PWA Installation

This app is installable as a Progressive Web App (PWA):

**On Mobile (Android/iOS):**
1. Open the app in your mobile browser
2. Tap the menu (⋮ or share icon)
3. Select "Add to Home Screen" or "Install App"
4. The app will appear on your home screen like a native app

**On Desktop (Chrome/Edge):**
1. Open the app in your browser
2. Click the install icon in the address bar
3. Click "Install" in the prompt

Once installed, the app works offline and provides a native app-like experience.
