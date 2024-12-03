import { createStore } from '@tauri-apps/plugin-store';
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export enum EnvType { local, remote}
type Environment  = {
  name: string;
  type: EnvType;
  host: string;
  username: string;
  password: string;
}

// Define the shape of the context state
interface EnvContextProps {
  env: string;
  envs: string[];
  addEnv: (env: Environment) => void;
  removeEnv: (env: string) => void;
  setEnv: (env: string) => void;
  getEnv: (env: string) => Promise<Environment | null>;
}

// Create the context with default values
const EnvContext = createContext<EnvContextProps | undefined>(undefined);

// Define the provider's props (children will be React components)
interface EnvProviderProps {
  children: ReactNode;
}

// LocaleProvider component that manages the locale state
export const EnvProvider = ({ children }: EnvProviderProps) => {

  const [env, setEnv] = useState<string>(() => {
    // Optionally, load the locale from localStorage
    return localStorage.getItem('env') || '';
  });
  const [envs, setEnvs] = useState<string[]>([]);

    // Save the locale to localStorage on change
    useEffect(() => {
      localStorage.setItem('env', env);
    }, [env]);

  // Save the locale to localStorage on change
  useEffect(() => {
    createStore('store.bin').then((value) => {
      value.get<string[]>('envs').then((value1)=> {
        if(value1) {
          setEnvs(value1 as []);
        }else {
          setEnvs([]);
        }
      });
    })
  }, []);

  const addEnv = (value: Environment) => {
    if(envs.includes(value.name)) {
      console.log(`env ${value} already included`)
    }else {
      createStore('store.bin').then((store) => {
        store.set("envs", [...envs, value.name]).then(()=>store.save());
        store.set("env_" + value.name, value).then(()=>store.save());
        
      });
      setEnvs((prev) => [...prev, value.name]);
    }
  }
  const getEnv = async (value: string) => {
    const store = await createStore('store.bin');
    return await store.get<Environment>("env_"+value);

  }
  const removeEnv = (value: string) => {
    console.log(value);
  }

  return (
    <EnvContext.Provider value={{ env, envs, addEnv, getEnv, removeEnv, setEnv }}>
      {children}
    </EnvContext.Provider>
  );
};

// Custom hook to use the LocaleContext
export const useEnv = (): EnvContextProps => {
  const context = useContext(EnvContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
};
