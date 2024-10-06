import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./pages/Layout"
import Home from "./pages/Home";
import NoPage from "./pages/NoPage";
import { LocaleProvider, useLocale } from '@/hooks/LocaleContext';
import { useEffect, useState } from "react";
import { IntlProvider } from "react-intl";

// Define a type for the message files
type Messages = {
  [key: string]: string;
};

const messagesFiles = import.meta.glob('./lang/*.json');

// Main component that handles locale changes and dynamic message loading
const AppWithLocale = () => {
  const { locale } = useLocale(); // Get the current locale from context
  const [messages, setMessages] = useState<Messages | null>(null); // State to store loaded messages
  const [loading, setLoading] = useState<boolean>(true); // Loading state

  // Load the correct messages file based on the locale
  const loadMessages = async (locale: string) => {
    setLoading(true);
    try {
      const importFunction = messagesFiles[`./lang/${locale}.json`]; // Get the correct file using the locale
      if (importFunction) {
        const module = await importFunction();
        setMessages((module as any).default);
      } else {
        throw new Error(`No translations found for locale: ${locale}`);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages({}); // Fallback to empty messages
    } finally {
      setLoading(false);
    }
  };

  // Load messages whenever the locale changes
  useEffect(() => {
    loadMessages(locale);
  }, [locale]);

  // If messages are still loading, show a loader or fallback UI
  if (loading || !messages) {
    return <div>Loading translations...</div>;
  }

  return (
    <IntlProvider locale={locale} messages={messages}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="init" element={<NoPage />} />
            <Route path="*" element={<NoPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </IntlProvider>
  );
};

export default function App() {
  return (
    <LocaleProvider>
      <AppWithLocale />
    </LocaleProvider>
  );
}
