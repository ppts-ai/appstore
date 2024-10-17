import { useSearchParams } from "react-router-dom";
import { Command } from '@tauri-apps/plugin-shell';
import { useEffect, useState } from "react";
import { readFile } from '@tauri-apps/plugin-fs';
import * as path from '@tauri-apps/api/path';
import ReactMarkdown from 'react-markdown';

const tabs = [
  { name: 'Readme', href: '#', current: true },
  { name: 'Logs', href: '#', current: false },
  { name: 'Settings', href: '#', current: false },
]

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

const AppPage = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const [searchParams] = useSearchParams();
  const name = searchParams.get("name"); // Replace with your query parameter name
  const [markdown, setMarkdown] = useState<string>('');

  useEffect(() => {
    // Fetch the JSON file (replace 'path/to/schema.json' with your actual file path)
    const sidecar_command = Command.sidecar('bin/podman', ["machine","start"]);
    
    sidecar_command.stdout.on('data', line => setMessages((prevMessages) => [...prevMessages, line.replace(/\x00/g, '')]));
    sidecar_command.stderr.on('data', line => setMessages((prevMessages) => [...prevMessages, line.replace(/\x00/g, '')]));
    sidecar_command.spawn();


    path.appDataDir().then((value) => {
      path.join(value, `apps/${name}/README.MD`).then((path) => {
        readFile(path).then((text)=>{
          var string = new TextDecoder().decode(text);
          setMarkdown(string);
        });
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
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Share
          </button>
          <button
            type="button"
            className="ml-3 inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Create
          </button>
        </div>
      </div>
      <div className="mt-4">
        <div className="sm:hidden">
          <label htmlFor="current-tab" className="sr-only">
            Select a tab
          </label>
          <select
            id="current-tab"
            name="current-tab"
            defaultValue={tabs.find((tab) => tab.current)!.name}
            className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
          >
            {tabs.map((tab) => (
              <option key={tab.name}>{tab.name}</option>
            ))}
          </select>
        </div>
        <div className="hidden sm:block">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <a
                key={tab.name}
                href={tab.href}
                aria-current={tab.current ? 'page' : undefined}
                className={classNames(
                  tab.current
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

        <ReactMarkdown>{markdown}</ReactMarkdown>
        <h1>{name}</h1>
        {messages.map((msg: any,index: number) => (
        <div key={index}>{msg} </div>
      ))}
      </div>
    );
  }
  
  export default AppPage;
  