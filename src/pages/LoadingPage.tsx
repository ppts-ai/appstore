import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Command } from '@tauri-apps/plugin-shell';
import { useEnv } from "@/hooks/EnvContext";
import { platform } from '@tauri-apps/plugin-os';
import { Link } from 'react-router-dom';


const LoadingPage = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const doneRef = useRef(true);
  const runningRef = useRef(false);
  const foundRef = useRef(false);
  const navigate = useNavigate();
  const { env, envs } = useEnv();
  const currentPlatform = platform();

  const startVM = async () => {
    const sidecar_command = Command.sidecar('bin/podman',["machine","start"]);  
    sidecar_command.on('close', async (data) => {
      setMessages((prevMessages) => [...prevMessages, `command finished with code ${data.code} and signal ${data.signal}`]);
      if(data.code === 0 || data.code === 125) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        if(doneRef.current) {
          navigate("home");
        }
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
    setMessages([]);

            try {
              // create a new store or load the existing one
              const sidecar_command = Command.sidecar('bin/podman', ["machine","ls"]);
              sidecar_command.on('close', async (data) => {
                setMessages((prevMessages) => [...prevMessages, `command finished with code ${data.code} and signal ${data.signal}`]);
                if(data.code === 0 || data.code === 125) {
                  if(runningRef.current) {
                    if(doneRef.current) {
                      navigate("home")
                    }
                  }else if(foundRef.current){
                    startVM();
                  }else {
                    setMessages((prevMessages) => [...prevMessages, `wait 2 sec before go to next page`]);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    if(doneRef.current) {
                      navigate("init");
                    }
                  }
      
                }
              });
              sidecar_command.on('error', error =>setMessages((prevMessages) => [...prevMessages, `command error: "${error}"`])); 
              sidecar_command.stdout.on('data', line => {
                if(line.indexOf("podman-machine-default") >= 0) {
                  foundRef.current = true
                }
                if(line.indexOf("Currently running") >= 0) {
                  runningRef.current = true
                }
                setMessages((prevMessages) => [...prevMessages, line.replace(/\x00/g, '')])
              });
              sidecar_command.stderr.on('data', line => setMessages((prevMessages) => [...prevMessages, line.replace(/\x00/g, '')]));
              sidecar_command.spawn().catch((err)=>{
                setMessages((prevMessages) => [...prevMessages, err as string])
              });
              
      
            } catch (error) {
              console.error('Error loading messages:', error);
            } finally {
     

    }
  }, [env, envs]);

  const checkWSL = async () =>{

    setMessages((prevMessages) => [...prevMessages, "Windows环境，检测WSL虚拟化工具是否已经安装"]);
    const status_command = Command.create('wsl', ["--status"]);
    status_command.stdout.on('data', line => setMessages((prevMessages) => [...prevMessages, line]));
    status_command.stderr.on('data', line => setMessages((prevMessages) => [...prevMessages, line]));
    const statusResult = await status_command.execute();
    setMessages((prevMessages) => [...prevMessages, `status result ${JSON.stringify(statusResult)}`]);

  };

    return (
      <div>
        <h1>Loading {env}</h1>
        {envs.length == 0 &&
        <div>
        <div>The application uses podman, which relies on virtual machine to run containers. 
          So after the application installed, it needs to initialize virtual machine first.
        </div>
        {currentPlatform === "windows" && (
          <div>on windows, it uses WSL (Windows Subsysem Linux), make sure WSL 2.0 is installed and configured properly 
          <button onClick={checkWSL}> Check WSL</button>
          <br />
          <a target="_blank" href="https://wslstorestorage.blob.core.windows.net/wslblob/wsl_update_x64.msi">Download WSL update here </a>
          </div>
        ) }
        {currentPlatform === "macos" && (
          <div>mac</div>
        ) }
        <Link to="/init">Setup Local</Link>
        <br />
        <Link to="/addRemote">Add Remote</Link>

        <br />
        <br />
        </div>
        }
        {messages.map((msg: any,index: number) => (
          <div key={index}>{msg} </div>
        ))}
        <button  onClick={()=>doneRef.current = false}>Stop</button>
      </div>
    );
  }
  
  export default LoadingPage;
  