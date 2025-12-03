# Quick Start Guide - Running Locally

## Prerequisites

- Node.js (version 18 or higher)
- npm (comes with Node.js)

## Installation & Running

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start the Server**:
   ```bash
   npm start
   ```

3. **Open in Browser**:
   - The server will start on `http://localhost:3000`
   - Open this URL in your browser
   - **Note**: For camera features to work, you may need to use `http://localhost:3000` (some browsers allow camera on localhost)

## Testing Responsiveness

To test the responsive design:

1. **Chrome DevTools**:
   - Press `F12` to open DevTools
   - Click the device toolbar icon (or press `Ctrl+Shift+M`)
   - Test different device sizes:
     - iPhone SE (375px)
     - iPhone 12 Pro (390px)
     - iPad (768px)
     - iPad Pro (1024px)
     - Desktop (1920px)

2. **Test Features on Each Size**:
   - Navigation menu
   - Hero section
   - Frame cards
   - AR try-on section
   - Cart drawer
   - Modals
   - Footer

## Troubleshooting

### Port Already in Use
If port 3000 is already in use:
- Change the port in `server.js`:
  ```javascript
  const PORT = process.env.PORT || 3001; // Change to 3001 or any available port
  ```

### Camera Not Working
- Ensure you're using `http://localhost:3000` (not `file://`)
- Grant camera permissions when prompted
- Check browser console for errors

### Assets Not Loading
- Ensure all files are in the correct directories
- Check browser console for 404 errors
- Verify file paths in HTML/CSS/JS

## Development Tips

- The server auto-reloads when you make changes to `server.js`
- For HTML/CSS/JS changes, refresh your browser
- Check browser console (F12) for JavaScript errors

