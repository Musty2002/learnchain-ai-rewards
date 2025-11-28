import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { Network } from '@capacitor/network';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform();

export const initializeCapacitor = async () => {
  if (!isNative) return;

  try {
    // Configure Status Bar
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: '#ffffff' });

    // Hide Splash Screen after app is ready
    await SplashScreen.hide();

    // Configure Keyboard
    Keyboard.setAccessoryBarVisible({ isVisible: true });

    // Listen to network status
    Network.addListener('networkStatusChange', status => {
      console.log('Network status changed', status);
    });

    console.log('Capacitor initialized successfully on', platform);
  } catch (error) {
    console.error('Error initializing Capacitor:', error);
  }
};

// Get network status
export const getNetworkStatus = async () => {
  const status = await Network.getStatus();
  return status;
};

// Check if device is online
export const isOnline = async () => {
  const status = await getNetworkStatus();
  return status.connected;
};
