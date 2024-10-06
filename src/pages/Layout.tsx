import { Outlet, Link } from "react-router-dom";
import { useLocale } from '@/hooks/LocaleContext';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";


function classNames(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}

const Layout = () => {
  const { locale, setLocale } = useLocale();
  return (


    <div>

        <nav aria-label="Tabs" className="flex space-x-4">

            <Link
             
              to={"/"}
              className={classNames(
                'rounded-md px-3 py-2 text-sm font-medium',
              )}
            >
              Home
            </Link>
            <Link
             
             to={"https://hub.ppts.ai/packages/search"}
             className={classNames(
               'rounded-md px-3 py-2 text-sm font-medium',
             )}
           >
             Explore
           </Link>
           
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
        </nav>

      <main className="px-4 py-16 sm:px-6 lg:flex-auto lg:px-0 lg:py-20">
      <Outlet />
      </main>
    </div>
  );
}

export default Layout;
