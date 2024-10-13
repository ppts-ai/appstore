import { useSearchParams } from "react-router-dom";
import { Command } from '@tauri-apps/plugin-shell';
import { useEffect, useState } from "react";

const AppPage = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const [searchParams] = useSearchParams();
  const name = searchParams.get("name"); // Replace with your query parameter name

  useEffect(() => {
    // Fetch the JSON file (replace 'path/to/schema.json' with your actual file path)
    const sidecar_command = Command.sidecar('bin/podman', ["machine","start"]);
    
    sidecar_command.stdout.on('data', line => setMessages((prevMessages) => [...prevMessages, line.replace(/\x00/g, '')]));
    sidecar_command.stderr.on('data', line => setMessages((prevMessages) => [...prevMessages, line.replace(/\x00/g, '')]));
    sidecar_command.spawn();


  }, []);

    return (
      <div>
        <h1>{name}</h1>
        {messages.map((msg: any,index: number) => (
        <div key={index}>{msg} </div>
      ))}
      </div>
    );
  }
  
  export default AppPage;
  