import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Command } from '@tauri-apps/plugin-shell';
import { useState } from "react";
import { platform } from '@tauri-apps/plugin-os';
import { createStore } from '@tauri-apps/plugin-store';
import { useNavigate } from "react-router-dom";
 
const formSchema = z.object({
  cpu: z.coerce.number().min(1, {
    message: "at least asign 1 cpu core",
  }).max(10,{
    message: "at most asign 10 cpu core",
  }),
  memory: z.coerce.number().min(2, {
    message: "at least asign 2G memory",
  }).max(128,{
    message: "at most asign 128G memory",
  }),
})
const SettingsPage = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cpu: 2,
      memory: 4
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    // Do something with the form values.
    const currentPlatform = platform();
    console.log(currentPlatform);
    console.log(values)
    let args = ["machine","init","--cpus",`${values.cpu}`,"--memory", `${values.memory*1024}`];
    
    if ("windows" === currentPlatform) {
      setMessages((prevMessages) => [...prevMessages, "Windows环境，检测WSL虚拟化工具是否已经安装"]);
      const wsl_command = Command.create('wsl', ["--install","--no-distribution"]);
    
      wsl_command.stdout.on('data', line => setMessages((prevMessages) => [...prevMessages, line]));
      wsl_command.stderr.on('data', line => setMessages((prevMessages) => [...prevMessages, line]));
      const result = await wsl_command.execute();
      setMessages((prevMessages) => [...prevMessages, result.stdout.replace(/\x00/g, '')]);  
      args.push("--image","docker://harbor.ppts.ai/podman/machine-os-wsl:5.3");
    }else {
      args.push("--image","docker://harbor.ppts.ai/podman/machine-os:5.3");
    }

    const sidecar_command = Command.sidecar('bin/podman', args);  
    sidecar_command.on('close', data => {
      setMessages((prevMessages) => [...prevMessages, `command finished with code ${data.code} and signal ${data.signal}`]);
      if(data.code === 0 || data.code === 125) {
        // save init status
        createStore('store.bin').then((store) => {
          store.set('podman',true).then(()=>store.save().then(()=>navigate("/")));
        })

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
      <h2>本程序中的应用运行于虚拟容器环境，使用前需要先初始化。该过程可能需要若干分钟</h2>
      <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mx-auto max-w-7xl sm:px-6 lg:px-8">
   
        <FormField
          control={form.control}
          name="cpu"
          render={({ field }) => (
            <FormItem className="sm:col-span-4" >
              <FormLabel className="block text-sm font-medium leading-6 text-gray-900">CPU</FormLabel>
              <FormControl className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
                <input type="number" className="block flex-1 border-0 bg-transparent py-1.5 pl-1 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6" placeholder="shadcn" {...field} />
              </FormControl>
              <FormDescription>
                设置该应用可以使用的CPU数.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="memory"
          render={({ field }) => (
            <FormItem className="sm:col-span-4" >
              <FormLabel className="block text-sm font-medium leading-6 text-gray-900">内存</FormLabel>
              <FormControl className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
                <input type="number" className="block flex-1 border-0 bg-transparent py-1.5 pl-1 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6" placeholder="shadcn" {...field} />
              </FormControl>
              <FormDescription>
              设置该应用可以使用的内存容量.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">提交</Button>
      </form>
    </Form>
    
    {messages.map((msg: any,index: number) => (
      <div key={index}>{msg} </div>
    ))}
    </>
    );
  }
  
  export default SettingsPage;
