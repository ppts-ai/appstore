import { Outlet, Link, useNavigate } from "react-router-dom";
import { useLocale } from '@/hooks/LocaleContext';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect } from "react";
import { Command } from '@tauri-apps/plugin-shell';

import { Store } from '@tauri-apps/plugin-store'
import {
  CopilotKit,
} from "@copilotkit/react-core";



function classNames(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}

const Layout = () => {
  const { locale, setLocale } = useLocale();
  const navigate = useNavigate();

  const checkPodmanInit = async () => {
    try {
      // create a new store or load the existing one
      const store = await Store.load('store.bin');

      // Get a value.
      const val = await store.get<{ value: boolean }>('podman');
      if(!val) {
        navigate("/init");
      }
      Command.sidecar('bin/podman', ["machine","start"]).spawn();

    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      
    }
  };

  useEffect(() => {
    checkPodmanInit();
  }, []);
  
  return (

    <CopilotKit
    runtimeUrl="https://ppts.ai/api/copilotkit"
  >
    <div>

        <nav aria-label="Tabs" className="flex space-x-4">

            <Link
             
              to={"/"}
              className={classNames(
                'rounded-md px-3 py-2 text-sm font-medium',
              )}
            >
              应用
            </Link>
            <Link
             
             to={"https://hub.ppts.ai/packages/search"}
             className={classNames(
               'rounded-md px-3 py-2 text-sm font-medium',
             )}
           >
             市场
           </Link>
           
           <Select onValueChange={(value)=>setLocale(value)} value={locale}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select a fruit" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Language</SelectLabel>
          <SelectItem value="en">English</SelectItem>
          <SelectItem value="fr">Français</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
        </nav>

      <main className="px-4 py-4 sm:px-6 lg:flex-auto lg:px-0 lg:py-4">
      <Outlet />
      </main>
    </div>
    </CopilotKit>
  );
}

export default Layout;
