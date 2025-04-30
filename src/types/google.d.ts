declare namespace google.maps {
  namespace places {
    class PlaceAutocompleteElement extends HTMLElement {
      constructor(options?: any);
      addEventListener(type: string, listener: EventListener, options?: boolean | AddEventListenerOptions): void;
      removeEventListener(type: string, listener: EventListener, options?: boolean | EventListenerOptions): void;
    }
    
    interface PlacePrediction {
      toPlace(): Promise<Place>;
    }
    
    interface Place {
      id: string;
      formattedAddress?: string;
      displayName?: string;
      name?: string;
      location?: any;
      viewport?: any;
    }
  }
  
  function importLibrary(name: string): Promise<any>;
}

declare global {
  interface Window {
    google: typeof google;
  }
}

export {};