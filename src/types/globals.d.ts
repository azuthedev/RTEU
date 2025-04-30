// Global TypeScript definitions
interface Window {
  gtag: (
    command: string,
    action: string,
    params?: {
      [key: string]: any;
    }
  ) => void;
  
  dataLayer: any[];
  
  voiceflow?: {
    chat: {
      load: (config: any) => void;
      open: () => void;
      close: () => void;
      hide: () => void;
      show: () => void;
    }
  };
  
  // Feature flag system
  setFeatureFlag?: (key: string, value: boolean) => boolean;
}