import { Command } from '@tauri-apps/plugin-shell';
import { useEffect, useState } from "react";

const SettingsPage = () => {
  const [messages, setMessages] = useState<string[]>([]);

  const reset = async () => {
    await Command.sidecar('bin/podman',["machine","stop"]).execute();
    await Command.sidecar('bin/podman',["machine","rm"]).execute();
  }

  useEffect(() => {
    const sidecar_command = Command.sidecar('bin/podman',["machine","ls"]);  
    sidecar_command.execute().then((output)=>{
      const args = output.stdout.replace(/\x00/g, '').split("\n");
      setMessages(args)
    });

  }, []);
  
    return (
      <>
      <button onClick={reset}>Reset</button>
  {messages.map((msg: any,index: number) => (
      <div key={index}>{msg} </div>
    ))}
    </>
    );
  }
  
  export default SettingsPage;
