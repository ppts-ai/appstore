import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Command } from '@tauri-apps/plugin-shell';
import { EnvType, useEnv } from "@/hooks/EnvContext";

const LoadingPage = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const doneRef = useRef(true);
  const runningRef = useRef(false);
  const foundRef = useRef(false);
  const navigate = useNavigate();
  const { env, envs, getEnv } = useEnv();

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
    if(!envs || envs.length == 0 || !env) {
      setMessages((prevMessages) => [...prevMessages, `no environment found, go to setup`]);
      navigate("intro")
    }else {
      getEnv(env).then((value) => {
        console.log("env",value)
        if (value) {
          if(value.type === EnvType.local) {
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
                      navigate("intro");
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
          }else {
            setMessages((prevMessages) => [...prevMessages, `setup remote environment connection`]);
            navigate("home")
          }
        }else {
          setMessages((prevMessages) => [...prevMessages, `no environment found, go to setup`]);
          navigate("intro")
        }
      });


    }
  }, [env, envs]);

    return (
      <div>
        <h1>Loading {env}</h1>
        
        {messages.map((msg: any,index: number) => (
      <div key={index}>{msg} </div>
    ))}
    <button  onClick={()=>doneRef.current = false}>Stop</button>
      </div>
    );
  }
  
  export default LoadingPage;
  