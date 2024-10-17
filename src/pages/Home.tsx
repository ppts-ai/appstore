/*
  This example requires some changes to your config:
  
  ```
  // tailwind.config.js
  module.exports = {
    // ...
    plugins: [
      // ...
      require('@tailwindcss/forms'),
      require('@tailwindcss/aspect-ratio'),
    ],
  }
  ```
*/
import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Link } from 'react-router-dom';

export default function Home() {
  const [products, setProducts] = useState<any>([]);
  useEffect(() => {
    invoke('list_apps', {}).then((value) => {
      const data = JSON.parse(value as string);
      console.log(data);
      let items = (data as any[]).map((item,index) => {
        return {
          id: index,
          name: item.name,
          imageSrc: item.image,
          href: `/app?name=${item.name}`
        };
      })
      console.log(items);
      if(items.length == 0) window.location.href = "https://hub.ppts.ai/packages/search";
        setProducts(items);
      });
   

  }, []);


  return (
    <div className="bg-white">



      <main className="pb-24">
        <div className="px-4 py-16 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">Apps</h1>
        </div>



        {/* Product grid */}
        <section aria-labelledby="products-heading" className="mx-auto max-w-7xl overflow-hidden sm:px-6 lg:px-8">
          <h2 id="products-heading" className="sr-only">
            Products
          </h2>

          <div className="-mx-px grid grid-cols-2 border-l border-gray-200 sm:mx-0 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product: any) => (
              <div key={product.name} className="group relative border-b border-r border-gray-200 p-4 sm:p-6">
                <div className="aspect-h-1 aspect-w-1 overflow-hidden rounded-lg bg-gray-200 group-hover:opacity-75">
                <Link to={product.href}>
                  <img
                    alt={product.imageAlt}
                    src={product.imageSrc}
                    className="h-full w-full object-cover object-center"
                  />
                  </Link>
                </div>
                <div className="pb-4 pt-10 text-center">
                  <h3 className="text-sm font-medium text-gray-900">
                  <Link to={product.href}>
                      <span aria-hidden="true" className="absolute inset-0" />
                      {product.name}
                    </Link>
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </section>

        
      </main>

    </div>
  )
}
