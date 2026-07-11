import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zcode.studio',
  appName: 'ZCode Studio',
  webDir: 'out',
  server: {
    // Point to your deployed backend URL
    // Change this to your VPS/domain URL after deploy
    url: 'https://your-domain.com',
    cleartext: true,
  },
  android: {
    backgroundColor: '#0a0a0a',
    allowMixedContent: true,
  },
  ios: {
    backgroundColor: '#0a0a0a',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0a0a0a',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1e1e1e',
    },
   NavigationBar: {
      backgroundColor: '#1e1e1e',
      style: 'DARK',
    },
  },
};

export default config;
