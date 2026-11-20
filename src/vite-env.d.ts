/// <reference types="vite/client" />

declare const __GOOGLE_MAPS_API_KEY__: string;

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  __APP_RUNTIME_CONFIG__?: {
    googleMapsApiKey?: string;
  };
}

declare namespace google {
  namespace maps {
    interface LatLng {
      lat(): number;
      lng(): number;
    }

    namespace places {
      interface Place {
        id?: string;
        displayName?: string | null;
        formattedAddress?: string | null;
        location?: LatLng | null;
        nationalPhoneNumber?: string | null;
        fetchFields(options: { fields: string[] }): Promise<{ place: Place }>;
      }

      interface PlacePrediction {
        placeId?: string;
        text: { text: string };
        mainText?: { text: string };
        secondaryText?: { text: string };
        toPlace(): Place;
      }

      interface AutocompleteSuggestion {
        placePrediction?: PlacePrediction;
      }

      class AutocompleteSessionToken {}
    }
  }
}
