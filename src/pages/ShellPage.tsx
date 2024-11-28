import { Command } from '@tauri-apps/plugin-shell';
import { useState } from "react";
import { ArrowUpIcon } from "lucide-react"

const ShellPage = () => {
  const [messages, setMessages] = useState<string[]>([]);

  function splitWithQuotes(input: string): string[] {
    // Regular expression to match quoted text or unquoted words
    const regex = /"([^"]*)"|'([^']*)'|\S+/g;
    const result: string[] = [];
    let match: RegExpExecArray | null;
  
    while ((match = regex.exec(input)) !== null) {
      // Use the captured group or the whole match
      result.push(match[1] || match[2] || match[0]);
    }
  
    return result;
  }

  const runCommand = async () => {
    setMessages([]);
    const inputText = document.getElementById("command") as HTMLInputElement;
    const value = inputText.value;
    const args = splitWithQuotes(value);
    setMessages((prevMessages) => [...prevMessages, `shell>> podman ${value} `]);
    inputText.value = "";
    const sidecar_command = Command.sidecar('bin/podman',args);  
    sidecar_command.on('close', data => {
      setMessages((prevMessages) => [...prevMessages, `command finished with code ${data.code} and signal ${data.signal}`]);
    });
    sidecar_command.on('error', error =>setMessages((prevMessages) => [...prevMessages, `command error: "${error}"`])); 
    sidecar_command.stdout.on('data', line => setMessages((prevMessages) => [...prevMessages, line.replace(/\x00/g, '')]));
    sidecar_command.stderr.on('data', line => setMessages((prevMessages) => [...prevMessages, line.replace(/\x00/g, '')]));
    sidecar_command.spawn().catch((err)=>{
      setMessages((prevMessages) => [...prevMessages, err as string])
    });
  }

  
    return (
      <>
    <div>
      <label htmlFor="command" className="block text-sm/6 font-medium text-gray-900">
        Run podman command
      </label>
      <div className="relative mt-2 rounded-md shadow-sm">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <span className="text-gray-500 sm:text-sm">podman &nbsp;</span>
        </div>
        <input
          id="command"
          name="command"
          autoComplete="off" autoCorrect="off"
          type="text"
          placeholder="input your command here"
          className="block w-full rounded-mdborder-0 py-1.5 pl-20 pr-20 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm/6"
        />
        <div className="absolute inset-y-0 right-0 flex items-center">
        <button
          type="button" onClick={runCommand}
          className="relative -ml-px inline-flex items-center gap-x-1.5 rounded-r-md px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          <ArrowUpIcon aria-hidden="true" className="-ml-0.5 size-5 text-gray-400" />
          Run
        </button>
        </div>
      </div>
    </div>
  {messages.map((msg: any,index: number) => (
      <div key={index}>{msg} </div>
    ))}
    </>
    );
  }
  
  export default ShellPage;
