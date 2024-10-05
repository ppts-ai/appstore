import { Outlet, Link } from "react-router-dom";


function classNames(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}

const Layout = () => {

  return (


    <div>

      <div >
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
        
        </nav>
      </div>

      <Outlet />
    </div>
  );
}

export default Layout;
