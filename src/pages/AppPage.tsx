import { useSearchParams } from "react-router-dom";
import { Command } from '@tauri-apps/plugin-shell';
import { useEffect } from "react";
import { invoke } from '@tauri-apps/api/core';

const NoPage = () => {
  const [searchParams] = useSearchParams();
  const name = searchParams.get("name"); // Replace with your query parameter name
  const url = "https://www.youtube.com";
  useEffect(() => {
    // Fetch the JSON file (replace 'path/to/schema.json' with your actual file path)
    const sidecar_command = Command.sidecar('bin/podman', ["pod","ls"]);
    
    sidecar_command.stdout.on('data', line => console.log(`command stdout: "${line}"`));
    sidecar_command.stderr.on('data', line => console.log(`command stderr: "${line}"`));
    sidecar_command.spawn();
    invoke('open_window', {name,url}).then((value) => {
      console.log(value);
    });

  }, []);

    return (
      <div>
        <h1>{name}</h1>
        <p>Page not found!</p>
      </div>
    );
  }
  
  export default NoPage;
  