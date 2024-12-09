import { Outlet, Link, useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Environment, useEnv } from "@/hooks/EnvContext";
import { Button } from "@/components/ui/button";
import { invoke } from "@tauri-apps/api/core";



function classNames(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}

const Layout = () => {
  const { env, envs, setEnv, getEnv } = useEnv();
  const navigate = useNavigate();
  return (

    <div>
        <nav aria-label="Tabs" className="bg-white shadow">

        <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
        <div className="relative flex h-16 justify-between">

          <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
            <div className="flex flex-shrink-0 items-center">
            <Link
             
             to={"/"}
             className={classNames(
               'rounded-md px-3 py-2 text-sm font-medium',
             )}>
              <img
                alt="Your Company"
                src="https://tailwindui.com/plus/img/logos/mark.svg?color=indigo&shade=600"
                className="h-8 w-auto"
              />
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {/* Current: "border-indigo-500 text-gray-900", Default: "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700" */}
              <Link
             
              to={"/home"}
              className={classNames(
                'inline-flex items-center border-b-2 border-indigo-500 px-1 pt-1 text-sm font-medium text-gray-900',
              )}
            >
                Apps
              </Link>
              <Link
              to={"https://hub.ppts.ai/packages/search"}
              className={classNames(
                'inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700',
              )}
            >
                Marketplace
              </Link>
              <Link
              to={"/settings"}
              className={classNames(
                'inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700',
              )}
            >
                Settings
              </Link>
              <Link
              to={"/ble"}
              className={classNames(
                'inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700',
              )}
            >
                BLE
              </Link>
            </div>
          </div>
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
          <Select onValueChange={async (value)=>{
            setEnv(value);
            invoke("activateEnv",{env: await getEnv(value)})
            }} value={env}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder={env} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Environment</SelectLabel>
          {envs?.map((item: Environment) => (
              <SelectItem key={item.name} value={item.name}>{item.name}</SelectItem>
          ))}
          <Button onClick={()=>navigate("intro")}>Add new</Button>
        </SelectGroup>
      </SelectContent>
    </Select>
          </div>
        </div>
      </div>


        </nav>

      <main className="px-4 py-4 sm:px-6 lg:flex-auto lg:px-0 lg:py-4">
      <Outlet />
      </main>
    </div>
  );
}

export default Layout;
