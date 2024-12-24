import { useEffect, useState } from "react";
import { Command } from '@tauri-apps/plugin-shell';
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { hostname, arch,platform } from '@tauri-apps/plugin-os';
import { useEnv } from "@/hooks/EnvContext";

const formSchema = z.object({
  name: z.coerce.string(),
  key: z.coerce.string(),
  password: z.coerce.string(),
})


const PatchPage = () => {
  
  const [messages, setMessages] = useState<string[]>([]);
  const { env} = useEnv();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      key: '',
      password: ''
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const sidecar_command = Command.sidecar('bin/podman',["machine","ssh",`curl https://ppts-ai.github.io/appstore/install-${platform()}-${arch()}.sh | sudo sh -s ${values.name} ${values.key} ${values.password}`]);  
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
    startVM(false)
    hostname().then((value: string | null) => {
      if(value)
        form.setValue("name",value);
    })
  }, []);

  const startVM = async (next:boolean) => {
    const sidecar_command = Command.sidecar('bin/podman',["machine","start",env]);  
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

      <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="sm:col-span-4" >
              <FormLabel className="block text-sm font-medium leading-6 text-gray-900">虚拟网络中的机器名</FormLabel>
              <FormControl className="flex w-full rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
                <input type="text" className="block flex-1 border-0 bg-transparent py-1.5 pl-1 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6" placeholder="username@host" {...field} />
              </FormControl>
              <FormDescription>
                
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="key"
          render={({ field }) => (
            <FormItem className="sm:col-span-4" >
              <FormLabel className="block text-sm font-medium leading-6 text-gray-900">虚拟网络唯一标识</FormLabel>
              <FormControl className="flex w-full rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
                <input type="text" className="block flex-1 border-0 bg-transparent py-1.5 pl-1 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6" placeholder="123456" {...field} />
              </FormControl>
              <FormDescription>
               虚拟网络标识为空，则不创建虚拟网络
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="sm:col-span-4" >
              <FormLabel className="block text-sm font-medium leading-6 text-gray-900">虚拟网络密码</FormLabel>
              <FormControl className="flex w-full  rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
                <input type="password" className="block flex-1 border-0 bg-transparent py-1.5 pl-1 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6" placeholder="xxxx" {...field} />
              </FormControl>
              <FormDescription>
              
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />


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
  