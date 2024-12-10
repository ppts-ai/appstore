import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Command } from "@tauri-apps/plugin-shell";


const parseTable = (table: string): Environment[] => {
  const lines = table.trim().split("\n");
  
  // Parse the remaining lines
  const data = lines.slice(1).map(line => {
    const columns = line.split(/\s{2,}/).map(col => col.trim());
    
    const obj: Environment = {name: columns[0], uri: columns[1], identity: columns[2], isDefault: columns[3] === 'true', readWrite: columns[4] === 'true'};
    
    return obj;
  });

  return data;
};


export interface VirtualMachine {
  ConfigDir: {
      Path: string;
  };
  ConnectionInfo: {
      PodmanSocket: {
          Path: string;
      };
      PodmanPipe: string | null;
  };
  Created: string; // ISO 8601 timestamp
  LastUp: string; // ISO 8601 timestamp
  Name: string;
  Resources: {
      CPUs: number;
      DiskSize: number; // in GB
      Memory: number; // in MB
      USBs: any[]; // Array of USB-related info, currently empty
  };
  SSHConfig: {
      IdentityPath: string;
      Port: number;
      RemoteUsername: string;
  };
  State: string; // Example: "running"
  UserModeNetworking: boolean;
  Rootful: boolean;
  Rosetta: boolean;
}

export enum EnvType { local, remote}
export type Environment  = {
  name: string;
  uri: string;
  host?: string;
  identity: string;
  isDefault: boolean;
  readWrite: boolean;
}

// Define the shape of the context state
interface EnvContextProps {
  env: string;
  envs: Environment[];
  addEnv: (env: Environment) => Promise<void>;
  removeEnv: (env: string) => void;
  refreshEnv: () => Promise<void>;
  setEnv: (env: string) => void;
  reset: () => Promise<void>;
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

  const [envs, setEnvs] = useState<Environment[]>([]);

    // Save the locale to localStorage on change
  useEffect(() => {
    localStorage.setItem('env', env);

    // update proxy
    const host = localStorage.getItem(`env-${env}`);
    if(host) {
      // update proxy
      console.log(host);
      const command = `sudo sed -i 's/\\(proxy_pass \\)[^:]*:\\([0-9]*\\);/\\1${host}:\\2;/g' /etc/podman/nginx.conf && sudo systemctl restart nginx`;

      Command.sidecar('bin/podman', ["machine","ssh",command]).execute().then((result)=>{
        console.log(result.stdout);
        console.log(result.stderr);
        console.log(result.code);
      });
    }
    Command.sidecar('bin/podman', ["system","connection","default",env]).execute();
  }, [env]);

  // Save the locale to localStorage on change
  useEffect(() => {
    refreshEnv();
  }, []);

  const addEnv = async (value: Environment) => {
    const result = await Command.sidecar('bin/podman', ["system","connection","add","--identity",value.identity,value.name,value.uri]).execute();
    if (value.host) {
      localStorage.setItem(`env-${value.name}`,value.host);
    }
    if(result.code  === 0 ) {
      console.log(result.stdout);
      refreshEnv();
    }else {
      console.log(result.stdout);
      console.log(result.stderr);
      
    }
  }

  const refreshEnv = async () => {
    const result = await Command.sidecar('bin/podman', ["system","connection","list"]).execute();

    if(result.code  === 0 ) {
      console.log(result.stdout);
      const connections = parseTable(result.stdout);
      setEnvs(connections)
    }
    
  }
  const getEnv = async (value: string) => {
    const env1 = envs.filter((item) => item.name === value);
    if(env1.length > 0) {
      const host = localStorage.getItem(`env-${value}`);
      if(host)
        env1[0].host = host;
      return env1[0];
    }
    return null;
  }
  const removeEnv = () => {

  }

  const reset = async () => {
    setEnv('')
    setEnvs([])
    
  }

  return (
    <EnvContext.Provider value={{ env, envs, reset, addEnv, getEnv, refreshEnv, removeEnv, setEnv }}>
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
