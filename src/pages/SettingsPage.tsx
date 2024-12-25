import { Command } from '@tauri-apps/plugin-shell';
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLocale } from '@/hooks/LocaleContext';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEnv, VirtualMachine } from '@/hooks/EnvContext';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { BaseDirectory, readFile } from '@tauri-apps/plugin-fs';
import * as path from '@tauri-apps/api/path';
import { createStore } from '@tauri-apps/plugin-store';



const SettingsPage = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const [machines, setMachines] = useState<VirtualMachine[]>([]);
  const navigate = useNavigate();
  const { locale, setLocale } = useLocale();
  const { reset } = useEnv();
  const [peerId, setPeerId] = useState<string>("");


  const copyFile = async (file: string) => {
    const home = await path.homeDir();
    const relativePath = file.replace(home + "/", '');
    const fileContent = await readFile(relativePath, {
      baseDir: BaseDirectory.Home,
    });
     // Convert the binary content to Base64
     const base64Content = btoa(String.fromCharCode(...new Uint8Array(fileContent)));
     setMessages((prevMessages) => [...prevMessages, `key: ${base64Content}`]);

  }

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

  const reset1 = async () => {
    await reset();
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

    Command.sidecar('bin/podman', ["machine", "inspect"]).execute().then((result) => {
      setMessages((prevMessages) => [...prevMessages, `inspect finished with code ${result.code} and signal ${result.signal}`]);
      if(result.code  === 0 ) {
        const vms: VirtualMachine[] = JSON.parse(result.stdout);
        setMachines(vms);
      }
    })
    createStore('store.bin').then((val) => val.get("peerId").then(value => setPeerId(value as string)))

  }, []);
  
    return (
      <>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
          <Select onValueChange={(value)=>setLocale(value)} value={locale}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select a fruit" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Language</SelectLabel>
          <SelectItem value="en">English</SelectItem>
          <SelectItem value="fr">Français</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
          </div>

      <div><span>peerId:</span><span>{peerId}</span></div>
          <Table>
  <TableCaption>List of virtual machines.</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead>Invoice</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>CPU</TableHead>
      <TableHead>Memory</TableHead>
      <TableHead>Disk</TableHead>
      <TableHead className="text-right"></TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {machines.map((vm) => (
    <TableRow key={vm.Name}>
    <TableCell className="font-medium">{vm.Name}</TableCell>
    <TableCell>{vm.State}</TableCell>
    <TableCell>{vm.Resources.CPUs}</TableCell>
    <TableCell>{vm.Resources.Memory/1024}G</TableCell>
    <TableCell>{vm.Resources.DiskSize}</TableCell>
    <TableCell className="text-right"><Button onClick={()=>copyFile(vm.SSHConfig.IdentityPath)}>Copy Key</Button></TableCell>
  </TableRow>
    ))}

  </TableBody>
</Table>

      <button onClick={reset1}>Reset</button>
  {messages.map((msg: any,index: number) => (
      <div key={index}>{msg} </div>
    ))}
    </>
    );
  }
  
  export default SettingsPage;
