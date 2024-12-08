import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useEffect, useState } from "react";
import { EnvType, useEnv } from "@/hooks/EnvContext";
import { Command } from "@tauri-apps/plugin-shell";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";


type ParsedObject = {
  Name: string;
  VirtualIp: string;
  Status: string;
  P2PRelay: string;
  Rt: number;
};

const formSchema = z.object({
  name: z.coerce.string(),
  host: z.coerce.string(),
  key: z.coerce.string(),
})
const AddRemotePage = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const [devices, setDevices] = useState<ParsedObject[]>([]);
  const navigate = useNavigate();
  

  const { addEnv } = useEnv();

  const parseTable = (table: string): ParsedObject[] => {
    const lines = table.trim().split("\n");
    
    // Parse the remaining lines
    const data = lines.slice(1).map(line => {
      const columns = line.split(/\s{2,}/).map(col => col.trim());
      
      const obj: ParsedObject = {Name: columns[0], VirtualIp: columns[1], Status: columns[2], P2PRelay: columns[3], Rt: parseInt(columns[4])};
      
      return obj;
    });
  
    return data;
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: 'remote',
      host: '',
      key: ''
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    addEnv({name: values.name, type: EnvType.remote, username: 'core', password: '', key: values.key, host: values.host, port: 22}).then(()=>{
      invoke("activateEnv",{env: values.name})
      navigate("/");
  })
  }

    // Save the locale to localStorage on change
    useEffect(() => {
      Command.sidecar('bin/podman', ["machine", "ssh", "vnt-cli --list"]).execute().then((result) => {
        setMessages((prevMessages) => [...prevMessages, `inspect finished with code ${result.code} and signal ${result.signal}`]);
        if(result.code  === 0 ) {
          console.log(result.stdout);
          const parsedData = parseTable(result.stdout);
          setDevices(parsedData)
        }
      })
    }, []);
  
    return (
      <>
      <h1>本程序中的应用运行于虚拟容器环境，使用前需要先初始化。该过程可能需要若干分钟</h1>
      <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mx-auto max-w-7xl sm:px-6 lg:px-8">

      <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="sm:col-span-4" >
              <FormLabel className="block text-sm font-medium leading-6 text-gray-900">Env name</FormLabel>
              <FormControl className="flex w-full rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
                <input type="text" className="block flex-1 border-0 bg-transparent py-1.5 pl-1 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6" placeholder="username@host" {...field} />
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
          name="host"
          render={({ field }) => (
            <FormItem className="sm:col-span-4" >
              <FormLabel className="block text-sm font-medium leading-6 text-gray-900">远程设备</FormLabel>
              <FormControl className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="select a device" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>蓝牙设备</SelectLabel>
                      {devices.map((item) => (
                        <SelectItem key={item.Name} value={item.VirtualIp!}>{item.Name}({item.Status})</SelectItem>
                      ))}
                      
                    </SelectGroup>
                  </SelectContent>
                </Select>
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
              <FormLabel className="block text-sm font-medium leading-6 text-gray-900">Key</FormLabel>
              <FormControl className="flex w-full  rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
                <input type="text" className="block flex-1 border-0 bg-transparent py-1.5 pl-1 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6" placeholder="xxxx" {...field} />
              </FormControl>
              <FormDescription>
              从远程电脑的设置中Copy Key取得.
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
  
  export default AddRemotePage;
