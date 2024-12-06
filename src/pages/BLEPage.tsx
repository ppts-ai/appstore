import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useState } from "react";

const formSchema = z.object({
  device: z.coerce.string(),
  ssid: z.coerce.string(),
  password: z.coerce.string(),
})
import { useEffect } from "react";
import { invoke } from '@tauri-apps/api/core';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";

const BLEPage = () => {

  const [messages, setMessages] = useState<string[]>([]);
  const [devices, setDevices] = useState<string[]>([]);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      device: '',
      ssid: '',
      password: ''
    },
  })

      // Save the locale to localStorage on change
      useEffect(() => {
        invoke("scanBLE").then((result) =>setDevices(result as string[]));
      }, []);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    invoke("shareWIFI", values).then(() =>setMessages((prevMessages) => [...prevMessages, `send WIFI crediential to device`]));
    //addEnv({name: values.device, type: EnvType.remote, username: values.username, password: values.password, host: values.host, port: 22})
  }
  
    return (
      <>
      <h1>本程序中的应用运行于虚拟容器环境，使用前需要先初始化。该过程可能需要若干分钟</h1>
      <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mx-auto max-w-7xl sm:px-6 lg:px-8">

      <FormField
          control={form.control}
          name="device"
          render={({ field }) => (
            <FormItem className="sm:col-span-4" >
              <FormLabel className="block text-sm font-medium leading-6 text-gray-900">蓝牙设备</FormLabel>
              <FormControl className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="select a device" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>蓝牙设备</SelectLabel>
                      {devices.map((item) => (
                        <SelectItem key={item} value={item}>{item}</SelectItem>
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
          name="ssid"
          render={({ field }) => (
            <FormItem className="sm:col-span-4" >
              <FormLabel className="block text-sm font-medium leading-6 text-gray-900">SSID</FormLabel>
              <FormControl className="flex w-full rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
                <input type="text" className="block flex-1 border-0 bg-transparent py-1.5 pl-1 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6" placeholder="Some WIFI" {...field} />
              </FormControl>
              <FormDescription>
                
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
              <FormLabel className="block text-sm font-medium leading-6 text-gray-900">Password</FormLabel>
              <FormControl className="flex w-full  rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
                <input type="text" className="block flex-1 border-0 bg-transparent py-1.5 pl-1 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6" placeholder="xxxx" {...field} />
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
  
  export default BLEPage;
