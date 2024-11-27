import { Command } from '@tauri-apps/plugin-shell';
import { useEffect, useState } from "react";
import { createStore, Store } from '@tauri-apps/plugin-store';
import { useNavigate } from "react-router-dom";

const SettingsPage = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const [store, setStore] = useState<Store | null>(null);
  const navigate = useNavigate();


  const deleteVM = async () => {
    const sidecar_command = Command.sidecar('bin/podman',["machine","reset", "-f"]);  
    sidecar_command.on('close', data => {
      setMessages((prevMessages) => [...prevMessages, `command finished with code ${data.code} and signal ${data.signal}`]);
      if(data.code === 0 || data.code === 125) {
        navigate("/init");
      }
    });
    sidecar_command.on('error', error =>setMessages((prevMessages) => [...prevMessages, `command error: "${error}"`])); 
    sidecar_command.stdout.on('data', line => setMessages((prevMessages) => [...prevMessages, line.replace(/\x00/g, '')]));
    sidecar_command.stderr.on('data', line => setMessages((prevMessages) => [...prevMessages, line.replace(/\x00/g, '')]));
    sidecar_command.spawn().catch((err)=>{
      setMessages((prevMessages) => [...prevMessages, err as string])
    });
  }

  const reset = async () => {
    await store?.clear();
    const sidecar_command = Command.sidecar('bin/podman',["machine","stop"]);  
    sidecar_command.on('close', data => {
      setMessages((prevMessages) => [...prevMessages, `command finished with code ${data.code} and signal ${data.signal}`]);
      if(data.code === 0 ) {
        setMessages((prevMessages) => [...prevMessages, `deleting virtual machine`]);
        deleteVM()
      }else if(data.code === 125) {
        navigate("/");
      }
    });
    sidecar_command.on('error', error =>setMessages((prevMessages) => [...prevMessages, `command error: "${error}"`])); 
    sidecar_command.stdout.on('data', line => setMessages((prevMessages) => [...prevMessages, line.replace(/\x00/g, '')]));
    sidecar_command.stderr.on('data', line => setMessages((prevMessages) => [...prevMessages, line.replace(/\x00/g, '')]));
    sidecar_command.spawn().catch((err)=>{
      setMessages((prevMessages) => [...prevMessages, err as string])
    });
  }


  useEffect(() => {
    const sidecar_command = Command.sidecar('bin/podman',["machine","ls"]);  
    sidecar_command.execute().then((output)=>{
      const args = output.stdout.replace(/\x00/g, '').split("\n");
      setMessages(args)
      // create a new store or load the existing one
      createStore('store.bin').then((val) => setStore(val))
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
