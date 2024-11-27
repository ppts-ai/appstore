import { useSearchParams } from "react-router-dom";
import { Command } from '@tauri-apps/plugin-shell';
import { useEffect, useState } from "react";
import { readFile } from '@tauri-apps/plugin-fs';
import * as path from '@tauri-apps/api/path';
import ReactMarkdown from 'react-markdown';
import yaml from 'js-yaml';
import { invoke } from '@tauri-apps/api/core';
import Settings from "./Settings";

type Tab = {
  name: string;
  href: string;
};

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

// Function to process annotations and remove the 'ppts.ai/' prefix
function processAnnotations(annotations: Record<string, any>): Record<string, any> {
  const processedAnnotations: Record<string, any> = {};
  for (const key in annotations) {
    if (key.startsWith('ppts.ai/')) {
      const newKey = key.replace('ppts.ai/', '').replace('-', '_');
      processedAnnotations[newKey] = annotations[key];
    } 
  }
  return processedAnnotations;
}

const AppPage = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const [searchParams] = useSearchParams();
  const name = searchParams.get("name"); // Replace with your query parameter name
  const [markdown, setMarkdown] = useState<string>('');
  const [currentTab, setCurrentTab] = useState<string>('Read Me');
  const [appConfig, setAppConfig] = useState({});
  const [execLabel, setexecLabel] = useState("Start");
  const [running, setRunning] = useState<boolean>(false);
  const [tabs, setTabs] = useState<Tab[]>([]);

  const toggle = ()=> {
    if("command" === (appConfig as any).type) {
      path.appDataDir().then((value) => {
        path.join(value, `apps/${name}/templates/docker-compose.yaml`).then((text) => {
          const sidecar_command = Command.sidecar('bin/podman', ["compose","-f",text,"run","yt-dlp","-o","/downloads/test.mp4","https://www.youtube.com/watch?v=b91RBeQKGWE"]);
    
          sidecar_command.stdout.on('data', line => setMessages((prevMessages) => [...prevMessages, line.replace(/\x00/g, '')]));
          sidecar_command.stderr.on('data', line => setMessages((prevMessages) => [...prevMessages, line.replace(/\x00/g, '')]));
          sidecar_command.spawn();
          setRunning(!running);
        });
        
      });
    }else {
      path.appDataDir().then((value) => {
        path.join(value, `apps/${name}/templates/docker-compose.yaml`).then((text) => {
          const sidecar_command = Command.sidecar('bin/podman-compose', ["-f",text,running?"down":"up"]);
    
          sidecar_command.stdout.on('data', line => setMessages((prevMessages) => [...prevMessages, line.replace(/\x00/g, '')]));
          sidecar_command.stderr.on('data', line => setMessages((prevMessages) => [...prevMessages, line.replace(/\x00/g, '')]));
          sidecar_command.spawn();
          setRunning(!running);
        });
        
      });
    }


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

      path.join(value, `apps/${name}/Chart.yaml`).then((path) => {
        readFile(path).then((text)=>{
          var yamlContent = new TextDecoder().decode(text);
          const yamlData = yaml.load(yamlContent) as Record<string, any>;

        // Process the annotations
        if (yamlData.annotations) {
          const config = processAnnotations(yamlData.annotations);
          setAppConfig(config);
        }

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

  useEffect(() => {
    // Fetch the JSON file (replace 'path/to/schema.json' with your actual file path)
    switch((appConfig as any).type) {
      case "command":
        setexecLabel("Execute");
        setTabs([
          { name: 'Read Me', href: '#'},
          { name: 'Logs', href: '#'},
          { name: 'Settings', href: '#'},
        ])
        break;
      case "service":
        if(running) {
          setexecLabel("Stop");
        }else {
          setexecLabel("Start");
        }
        setTabs([
          { name: 'Read Me', href: '#'},
          { name: 'Logs', href: '#'},
          { name: 'Settings', href: '#'}
        ])
        break;
      case "app":
        setTabs([
          { name: 'Read Me', href: '#'},
          { name: 'Logs', href: '#'},
          { name: 'Settings', href: '#'}
        ])
        break;
    }
  }, [appConfig, running]);

    return (
      <div className="p-4">

<div className="relative border-b border-gray-200 pb-5 sm:pb-0">
      <div className="md:flex md:items-center md:justify-between">
        <h3 className="text-base font-semibold leading-6 text-gray-900">{name}</h3>
        <div className="mt-3 flex md:absolute md:right-0 md:top-3 md:mt-0">
          <button
            type="button"
            disabled={!running}
            onClick={()=>invoke("open",{configStr: JSON.stringify(appConfig)})}
            className={classNames(
              running
                ? ''
                : 'hidden',
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
            {execLabel}
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
      {"Settings" === currentTab && 
        <Settings />
      } 
      </div>
    );
  }
  
  export default AppPage;
  