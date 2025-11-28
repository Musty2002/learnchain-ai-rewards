# LearnChain - Capacitor Mobile App Setup Guide

This guide will help you set up and run LearnChain as a native mobile app on iOS and Android using Capacitor.

## Prerequisites

### For iOS Development:
- macOS computer
- Xcode 14 or later installed
- iOS Simulator or physical iOS device
- Apple Developer account (for physical device testing)

### For Android Development:
- Android Studio installed
- Android SDK (API level 22 or higher)
- Android Emulator or physical Android device
- Java Development Kit (JDK) 11 or later

## Setup Instructions

### 1. Export and Clone Your Project

1. Click the "Export to Github" button in Lovable
2. Clone your repository to your local machine:
   ```bash
   git clone <your-github-repo-url>
   cd <your-project-name>
   ```

### 2. Install Dependencies

```bash
npm install
```

### 3. Initialize Capacitor

The Capacitor configuration is already set up in `capacitor.config.ts`. 

**Important**: Before building for production, update the `server.url` in `capacitor.config.ts` to point to your production URL or remove it entirely to use the built app.

### 4. Build Your Web App

```bash
npm run build
```

This creates an optimized production build in the `dist` folder.

### 5. Add Platform(s)

#### For iOS:
```bash
npx cap add ios
```

#### For Android:
```bash
npx cap add android
```

You can add both platforms if needed.

### 6. Sync Your Project

After adding platforms, sync your web code to the native projects:

```bash
npx cap sync
```

**Important**: Run `npx cap sync` every time you:
- Make changes to your web code and rebuild
- Install new Capacitor plugins
- Update native configuration

### 7. Open and Run Your App

#### For iOS:
```bash
npx cap open ios
```

This opens Xcode. Then:
1. Select your target device or simulator
2. Click the "Play" button to build and run

#### For Android:
```bash
npx cap open android
```

This opens Android Studio. Then:
1. Wait for Gradle sync to complete
2. Select your target device or emulator
3. Click the "Run" button

Alternatively, you can run directly from the command line:

```bash
# For Android
npx cap run android

# For iOS (requires Xcode)
npx cap run ios
```

## Native Features Enabled

LearnChain uses the following Capacitor plugins for native functionality:

### 📷 Camera (`@capacitor/camera`)
- Native camera access for Math Solver
- Photo gallery picker
- Automatic image compression
- Works seamlessly on both web and mobile

### 📁 Filesystem (`@capacitor/filesystem`)
- Local file storage
- Offline course content
- Cache management

### 🌐 Network (`@capacitor/network`)
- Network status detection
- Automatic sync when online
- Offline mode indicators

### 📱 Status Bar (`@capacitor/status-bar`)
- Customized status bar colors
- Light/dark mode support
- Immersive experience

### 🎨 Splash Screen (`@capacitor/splash-screen`)
- Professional loading screen
- Smooth app launch experience

### ⌨️ Keyboard (`@capacitor/keyboard`)
- Smart keyboard management
- Automatic scroll adjustment
- Native keyboard interactions

## Development Tips

### Live Reload During Development

For faster development, you can use live reload:

1. Start your dev server:
   ```bash
   npm run dev
   ```

2. Update `capacitor.config.ts` to point to your local dev server:
   ```typescript
   server: {
     url: 'http://YOUR_LOCAL_IP:8080',
     cleartext: true
   }
   ```
   
   Replace `YOUR_LOCAL_IP` with your computer's local IP (find it using `ipconfig` on Windows or `ifconfig` on Mac/Linux)

3. Run `npx cap sync` and reopen the native project

### Debugging

#### iOS:
- Use Safari's Web Inspector (Develop menu)
- View native logs in Xcode's console

#### Android:
- Use Chrome DevTools (chrome://inspect)
- View native logs in Android Studio's Logcat

### Building for Production

#### iOS:
1. Open the project in Xcode: `npx cap open ios`
2. Select "Any iOS Device" as the target
3. Product → Archive
4. Follow the App Store submission process

#### Android:
1. Open Android Studio: `npx cap open android`
2. Build → Generate Signed Bundle/APK
3. Follow the Google Play Store submission process

## Permissions Required

### iOS (Info.plist)
The following permissions are automatically configured:
- Camera access (NSCameraUsageDescription)
- Photo library access (NSPhotoLibraryUsageDescription)

### Android (AndroidManifest.xml)
The following permissions are automatically configured:
- Camera
- Read/Write External Storage
- Internet
- Network State

## Troubleshooting

### Common Issues:

1. **"npx cap" command not found**
   - Run `npm install` to ensure all dependencies are installed

2. **Build errors after sync**
   - Clean the build: 
     - iOS: Clean Build Folder in Xcode
     - Android: Build → Clean Project in Android Studio
   - Run `npx cap sync` again

3. **Camera not working on device**
   - Check that camera permissions are granted in device settings
   - Ensure your app has the necessary permission declarations

4. **White screen on app launch**
   - Make sure you've run `npm run build` before `npx cap sync`
   - Check browser console for errors

5. **Plugin not working**
   - Ensure the plugin is installed: `npm install @capacitor/[plugin-name]`
   - Run `npx cap sync` after installing plugins

## Additional Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Capacitor iOS Guide](https://capacitorjs.com/docs/ios)
- [Capacitor Android Guide](https://capacitorjs.com/docs/android)
- [Capacitor Camera Plugin](https://capacitorjs.com/docs/apis/camera)

## Support

For issues specific to LearnChain, please check the project repository or contact support.

For Capacitor-related issues, visit the [Capacitor GitHub Discussions](https://github.com/ionic-team/capacitor/discussions).
