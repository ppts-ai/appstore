import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

// Define the shape of the context state
interface LocaleContextProps {
  locale: string;
  setLocale: (locale: string) => void;
}

// Create the context with default values
const LocaleContext = createContext<LocaleContextProps | undefined>(undefined);

// Define the provider's props (children will be React components)
interface LocaleProviderProps {
  children: ReactNode;
}

// LocaleProvider component that manages the locale state
export const LocaleProvider = ({ children }: LocaleProviderProps) => {
  const [locale, setLocale] = useState<string>(() => {
    // Optionally, load the locale from localStorage
    return localStorage.getItem('locale') || 'en';
  });

  // Save the locale to localStorage on change
  useEffect(() => {
    localStorage.setItem('locale', locale);
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
};

// Custom hook to use the LocaleContext
export const useLocale = (): LocaleContextProps => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
};
