import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useEnv } from "@/hooks/EnvContext";
import { useNavigate } from "react-router-dom";
import { create, BaseDirectory } from '@tauri-apps/plugin-fs';
import * as path from '@tauri-apps/api/path';



const formSchema = z.object({
  name: z.coerce.string(),
  username: z.coerce.string(),
  password: z.coerce.string(),
  host: z.coerce.string(),
  key: z.coerce.string(),
})
const AddRemotePage = () => {
  const navigate = useNavigate();
  

  const { addEnv } = useEnv();


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: 'remote',
      username: 'core',
      password: '',
      host: '',
      key: ''
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if(values.key === "") {
      addEnv({
        name: values.name,
        host: values.host,
        uri: `ssh://${values.username}@127.0.0.1:2222`,
        isDefault: false,
        readWrite: true
      }).then(()=>{
        navigate("/");
      })
    }else {
      const file = await create(`.local/share/containers/podman/machine/env-${values.name}`, { baseDir: BaseDirectory.Home });
      await file.write(new TextEncoder().encode(atob(values.key)));
      await file.close();
      const home = await path.homeDir();
      const filePath = `${home}/.local/share/containers/podman/machine/env-${values.name}`;

      // create pod to forward port number for the uri
      addEnv({
        name: values.name,
        host: values.host,
        uri: `ssh://${values.username}@127.0.0.1:2222`,
        identity: filePath,
        isDefault: false,
        readWrite: true
      }).then(()=>{
        navigate("/");
      })
    }
  }

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
          name="username"
          render={({ field }) => (
            <FormItem className="sm:col-span-4" >
              <FormLabel className="block text-sm font-medium leading-6 text-gray-900">Username</FormLabel>
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

        <FormField
          control={form.control}
          name="host"
          render={({ field }) => (
            <FormItem className="sm:col-span-4" >
              <FormLabel className="block text-sm font-medium leading-6 text-gray-900">远程设备</FormLabel>
              <FormControl className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
              <input type="text" className="block flex-1 border-0 bg-transparent py-1.5 pl-1 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6" placeholder="xxxx" {...field} />
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

    </>
    );
  }
  
  export default AddRemotePage;
