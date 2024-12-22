import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Command } from '@tauri-apps/plugin-shell';
import { useState } from "react";
import { platform } from '@tauri-apps/plugin-os';
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as path from '@tauri-apps/api/path';
import {  useEnv } from "@/hooks/EnvContext";


 
const formSchema = z.object({
  cpu: z.coerce.number().min(1, {
    message: "at least asign 1 cpu core",
  }).max(30,{
    message: "at most asign 30 cpu core",
  }),
  memory: z.coerce.number().min(2, {
    message: "at least asign 2G memory",
  }).max(128,{
    message: "at most asign 128G memory",
  }),
  region: z.coerce.string(),
})
const InitalizePage = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const navigate = useNavigate();
  const { refreshEnv } = useEnv();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cpu: 2,
      memory: 4,
      region: "asia"
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    // Do something with the form values.
    const currentPlatform = platform();
    console.log(currentPlatform);
    console.log(values)
    let args = ["machine","init","--cpus",`${values.cpu}`,"--memory", `${values.memory*1024}`];
    
    if ("windows" === currentPlatform) {
      const resourceDir =  await path.resourceDir();
      args.push("--username","core","--image",`${resourceDir}/libs/5.3-rootfs-amd64.tar.zst`);
    }else {
      args.push("--image","docker://harbor.ppts.ai/podman/machine-os:5.3");
    }

    const sidecar_command = Command.sidecar('bin/podman', args);  
    sidecar_command.on('close', data => {
      setMessages((prevMessages) => [...prevMessages, `command finished with code ${data.code} and signal ${data.signal}`]);
      if(data.code === 0 || data.code === 125) {
        // save init status
        if (currentPlatform == "windows") {
          refreshEnv().then(()=>navigate("/patch"));
        }else {
          refreshEnv().then(()=>navigate("/"));
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

        <FormField
          control={form.control}
          name="region"
          render={({ field }) => (
            <FormItem className="sm:col-span-4" >
              <FormLabel className="block text-sm font-medium leading-6 text-gray-900">区域</FormLabel>
              <FormControl className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select a fruit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>区域</SelectLabel>
                      <SelectItem value="asia">亚洲</SelectItem>
                      <SelectItem value="europe">欧洲</SelectItem>
                      <SelectItem value="amercia">北美</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormDescription>
              所在区域，会使用附近的服务器加速下载
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
  
  export default InitalizePage;
