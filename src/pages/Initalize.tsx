import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Command } from '@tauri-apps/plugin-shell';
import { useState } from "react";
 
const formSchema = z.object({
  cpu: z.number().min(1, {
    message: "at least asign 1 cpu core",
  }).max(10,{
    message: "at most asign 10 cpu core",
  }),
  memory: z.number().min(2, {
    message: "at least asign 2G memory",
  }).max(128,{
    message: "at most asign 128G memory",
  }),
})
const InitalizePage = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cpu: 2,
      memory: 4
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Do something with the form values.
    console.log(values)
    const sidecar_command = Command.sidecar('bin/podman', ["machine","init"]);
    
    sidecar_command.stdout.on('data', line => setMessages((prevMessages) => [...prevMessages, line]));
    sidecar_command.stderr.on('data', line => setMessages((prevMessages) => [...prevMessages, line]));
    sidecar_command.spawn();
  }
  
    return (
      <>
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
                please asgin number of cpus to virtual machine.
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
              <FormLabel className="block text-sm font-medium leading-6 text-gray-900">CPU</FormLabel>
              <FormControl className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
                <input type="number" className="block flex-1 border-0 bg-transparent py-1.5 pl-1 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6" placeholder="shadcn" {...field} />
              </FormControl>
              <FormDescription>
                please asgin memories to virtual machine.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
    
    {messages.map((msg: any,index: number) => (
      <div key={index}>{msg} </div>
    ))}
    </>
    );
  }
  
  export default InitalizePage;
