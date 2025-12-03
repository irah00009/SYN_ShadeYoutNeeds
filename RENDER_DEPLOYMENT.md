# Render Deployment Guide for SYN - Shade Your Needs

This guide will walk you through deploying your SYN application to Render as a Web Service.

## Prerequisites

1. A GitHub account
2. Your code pushed to a GitHub repository
3. A Render account (sign up at https://render.com if you don't have one)

## Step-by-Step Deployment Instructions

### Step 1: Push Your Code to GitHub

1. **Initialize Git** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Ready for Render deployment"
   ```

2. **Create a GitHub repository**:
   - Go to https://github.com/new
   - Create a new repository (e.g., `syn-shade-your-needs`)
   - **Do NOT** initialize with README, .gitignore, or license

3. **Push your code**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/syn-shade-your-needs.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy to Render

1. **Log in to Render**:
   - Go to https://dashboard.render.com
   - Sign up or log in with your GitHub account

2. **Create a New Web Service**:
   - Click the **"New +"** button in the top right
   - Select **"Web Service"**

3. **Connect Your Repository**:
   - Click **"Connect account"** if you haven't connected GitHub
   - Authorize Render to access your repositories
   - Select your repository: `syn-shade-your-needs`
   - Click **"Connect"**

4. **Configure Your Service**:
   
   **Basic Settings:**
   - **Name**: `syn-shade-your-needs` (or any name you prefer)
   - **Region**: Choose the closest region to your users (e.g., `Oregon (US West)`)
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: Leave empty (or `.` if you want to be explicit)
   - **Runtime**: `Node`
   - **Build Command**: `npm install` (Render will auto-detect this)
   - **Start Command**: `npm start`

   **Advanced Settings** (click "Advanced" to expand):
   - **Environment**: `Node`
   - **Node Version**: `18` or `20` (check your package.json engines)
   - **Auto-Deploy**: `Yes` (automatically deploys on every push to main)

5. **Environment Variables** (Optional):
   - You don't need any environment variables for this basic setup
   - The `PORT` environment variable is automatically set by Render

6. **Create Web Service**:
   - Click the **"Create Web Service"** button at the bottom
   - Render will start building and deploying your application

### Step 3: Wait for Deployment

1. **Monitor the Build**:
   - You'll see the build logs in real-time
   - The build typically takes 2-5 minutes
   - Watch for: "Build successful" message

2. **Check Deployment Status**:
   - Once built, Render will start your service
   - Look for: "Your service is live at https://your-app-name.onrender.com"

### Step 4: Access Your Application

1. **Get Your URL**:
   - Your app will be available at: `https://your-app-name.onrender.com`
   - Render provides a free HTTPS certificate automatically

2. **Test Your Application**:
   - Open the URL in your browser
   - Test all features:
     - Navigation
     - Frame selection
     - Camera/AR try-on (requires HTTPS - which Render provides)
     - Cart functionality
     - Responsive design on mobile/tablet/desktop

## Important Notes

### HTTPS Requirement
- **Camera access requires HTTPS** - Render provides this automatically
- Your app will work with camera features on Render's free tier

### Free Tier Limitations
- Render's free tier may spin down after 15 minutes of inactivity
- First request after spin-down may take 30-60 seconds to wake up
- For production, consider upgrading to a paid plan

### Custom Domain (Optional)
1. Go to your service settings
2. Click "Custom Domains"
3. Add your domain
4. Follow DNS configuration instructions

## Troubleshooting

### Build Fails
- Check build logs for errors
- Ensure `package.json` has correct dependencies
- Verify Node version compatibility

### App Doesn't Start
- Check that `server.js` exists and is correct
- Verify `npm start` command in package.json
- Check service logs in Render dashboard

### Camera Not Working
- Ensure you're accessing via HTTPS (Render provides this)
- Check browser console for errors
- Verify camera permissions in browser settings

### Assets Not Loading
- Ensure all asset paths are relative (e.g., `assets/logo.png`)
- Check that all files are committed to Git
- Verify file paths in your code

## Updating Your Application

1. **Make Changes Locally**:
   ```bash
   # Make your changes
   git add .
   git commit -m "Your update message"
   git push origin main
   ```

2. **Auto-Deploy**:
   - If auto-deploy is enabled, Render will automatically rebuild
   - Check the "Events" tab in Render dashboard to see deployment progress

## File Structure Reference

Your project should have this structure:
```
syn-shade-your-needs/
├── assets/
│   ├── logo.png
│   ├── SYN.png
│   ├── images.jpg
│   └── [other frame images]
├── index.html
├── styles.css
├── app.js
├── package.json
├── server.js
└── README.md
```

## Support

- Render Documentation: https://render.com/docs
- Render Support: support@render.com
- Check Render Status: https://status.render.com

---

**Congratulations!** Your SYN application is now live on Render! 🎉

