import { useSearchParams } from "react-router-dom";
import { Command } from '@tauri-apps/plugin-shell';
import { useEffect, useState } from "react";
import { readFile } from '@tauri-apps/plugin-fs';
import * as path from '@tauri-apps/api/path';
import ReactMarkdown from 'react-markdown';

const tabs = [
  { name: 'Read Me', href: '#'},
  { name: 'Logs', href: '#'},
  { name: 'Argument', href: '#'},
  { name: 'History', href: '#'}
]

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

const AppPage = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const [searchParams] = useSearchParams();
  const name = searchParams.get("name"); // Replace with your query parameter name
  const [markdown, setMarkdown] = useState<string>('');
  const [currentTab, setCurrentTab] = useState<string>('Read Me');
  const [running, setRunning] = useState<boolean>(false);

  const toggle = ()=> {
    path.appDataDir().then((value) => {
      path.join(value, `apps/${name}/templates/docker-compose.yaml`).then((text) => {
        const sidecar_command = Command.sidecar('bin/podman', ["compose","-f",text,running?"down":"up"]);
  
        sidecar_command.stdout.on('data', line => setMessages((prevMessages) => [...prevMessages, line.replace(/\x00/g, '')]));
        sidecar_command.stderr.on('data', line => setMessages((prevMessages) => [...prevMessages, line.replace(/\x00/g, '')]));
        sidecar_command.spawn();
        setRunning(!running);
      });
      
    });

  }
  useEffect(() => {
    // Fetch the JSON file (replace 'path/to/schema.json' with your actual file path)


    path.appDataDir().then((value) => {
      path.join(value, `apps/${name}/README.MD`).then((path) => {
        readFile(path).then((text)=>{
          var string = new TextDecoder().decode(text);
          setMarkdown(string);
        });
      });

      path.join(value, `apps/${name}/templates/docker-compose.yaml`).then((text) => {
          Command.sidecar('bin/podman', ["compose","ls"]).execute().then((child)=> {
            if (child.stdout.indexOf(text) > 0) {
              setRunning(true);
            }
          })
      });
      
    });

  }, []);

    return (
      <div className="p-4">

<div className="relative border-b border-gray-200 pb-5 sm:pb-0">
      <div className="md:flex md:items-center md:justify-between">
        <h3 className="text-base font-semibold leading-6 text-gray-900">{name}</h3>
        <div className="mt-3 flex md:absolute md:right-0 md:top-3 md:mt-0">
          <button
            type="button"
            disabled={!running}
            className={classNames(
              running
                ? ''
                : 'bg-gray-500',
              'inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"',
            )}
          >
            Open
          </button>
          <button
            type="button"
            onClick={toggle}
            className="ml-3 inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            {running?"Stop": "Start"}
          </button>
        </div>
      </div>
      <div className="mt-4">
        <div>
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <a
                key={tab.name}
                href={tab.href}
                onClick={()=>setCurrentTab(tab.name)}
                aria-current={tab.name === currentTab ? 'page' : undefined}
                className={classNames(
                  tab.name === currentTab
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                  'whitespace-nowrap border-b-2 px-1 pb-4 text-sm font-medium',
                )}
              >
                {tab.name}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </div>
      {"Read Me" === currentTab && 
        <ReactMarkdown>{markdown}</ReactMarkdown>
      }

        {"Logs" === currentTab && 
          messages.map((msg: any,index: number) => (
            <div key={index}>{msg} </div>
          ))
        }
               {"Argument" === currentTab && 
        <div>Argument</div>
      } 
       {"History" === currentTab && 
        <div>History</div>
      } 
      </div>
    );
  }
  
  export default AppPage;
  