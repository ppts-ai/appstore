import { useEffect, useState } from "react";
import { Command } from '@tauri-apps/plugin-shell';
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { arch,platform } from '@tauri-apps/plugin-os';
import { VirtualMachine } from "@/hooks/EnvContext";




const formSchema = z.object({
  name: z.coerce.string(),
  key: z.coerce.string(),
  password: z.coerce.string(),
})


const PatchPage = () => {
  
  const [messages, setMessages] = useState<string[]>([]);
  const [machines, setMachines] = useState<VirtualMachine[]>([]);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      key: '/ip4/64.176.227.5/tcp/4001/p2p/12D3KooWLzi9E1oaHLhWrgTPnPa3aUjNkM8vvC8nYZp1gk9RjTV1',
      password: ''
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const sidecar_command = Command.sidecar('bin/podman',["machine","ssh",`curl https://ppts-ai.github.io/appstore/install-${platform()}-${arch()}.sh | sudo sh`]);  
    sidecar_command.on('close', data => {
      setMessages((prevMessages) => [...prevMessages, `command finished with code ${data.code} and ${arch()} signal ${data.signal}`]);
      
      setMessages((prevMessages) => [...prevMessages, `restarting virtual machine, stopping`]);
      restartVM(true);

    });
    sidecar_command.on('error', error =>setMessages((prevMessages) => [...prevMessages, `command error: "${error}"`])); 
    sidecar_command.stdout.on('data', line => setMessages((prevMessages) => [...prevMessages, line.replace(/\x00/g, '')]));
    sidecar_command.stderr.on('data', line => setMessages((prevMessages) => [...prevMessages, line.replace(/\x00/g, '')]));
    sidecar_command.spawn().catch((err)=>{
      setMessages((prevMessages) => [...prevMessages, err as string])
    });
  }

  const [started, setStarted] = useState<boolean>(false);
  
  const navigate = useNavigate();
  useEffect(() => {
    //generateKeyPairAndPeerId(form).catch(console.error);
    //restartVM(false)
    startVM(false);
  
  }, []);

  const startVM = async (next:boolean) => {
    const sidecar_command = Command.sidecar('bin/podman',["machine","start"]);  
    sidecar_command.on('close', data => {
      setMessages((prevMessages) => [...prevMessages, `command finished with code ${data.code} and signal ${data.signal}`]);
      if(data.code === 0 || data.code === 125) {
        if(next) {
          navigate("/")
        }else {
          setStarted(data.code === 0 || data.code == 125)
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

  const restartVM = async (next:boolean) => {
    const sidecar_command = Command.sidecar('bin/podman',["machine","stop"]);  
    sidecar_command.on('close', data => {
      setMessages((prevMessages) => [...prevMessages, `command finished with code ${data.code} and signal ${data.signal}`]);
      if(data.code === 0 || data.code === 125) {
        setMessages((prevMessages) => [...prevMessages, `starting virtual machine`]);
        startVM(next)
      }
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
      <h1>安装英伟达显卡支持和虚拟网络</h1>
      <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mx-auto max-w-7xl sm:px-6 lg:px-8">




        <Button disabled={!started} type="submit">提交</Button>
      </form>
    </Form>
    
    {messages.map((msg: any,index: number) => (
      <div key={index}>{msg} </div>
    ))}
    </>
    );
  }
  

  export default PatchPage;
  