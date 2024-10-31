import { useEffect, useState } from "react";
import { readFile, exists } from '@tauri-apps/plugin-fs';
import * as path from '@tauri-apps/api/path';

/**
 *
 * 1) CopilotKit Integration
 *
 **/

import validator from '@rjsf/validator-ajv8';
import Form, { getDefaultRegistry } from "@rjsf/core";
import { RJSFSchema, ObjectFieldTemplateProps } from "@rjsf/utils";
import { useSearchParams } from "react-router-dom";
const registry = getDefaultRegistry();

const ObjectFieldTemplate = registry.templates.ObjectFieldTemplate;

function Settings() {
  const [schema, setSchema] = useState<RJSFSchema>(null);
  const [searchParams] = useSearchParams();
  const name = searchParams.get("name"); // Replace with your query parameter name

  const loadSchema = async () => {
    try {
      path.appDataDir().then((value) => {
        path.join(value, `apps/${name}/values.schema.json`).then((path) => {
          exists(path).then((exist)=> {
            if(exist) {
              readFile(path).then((text)=>{
                var string = new TextDecoder().decode(text);
                const data = JSON.parse(string);
                console.log("schema",data);
                setSchema(data); // Set the schema state with the fetched data
              });
            }
          });

        });
  
      });

    } catch (error) {
      console.error('Error loading schema:', error);
    }
  };
  
  useEffect(() => {
    // Fetch the JSON file (replace 'path/to/schema.json' with your actual file path)
    loadSchema(); // Call the function to load the schema
  }, []);

  const ObjectFieldTemplateWrapper = (props: ObjectFieldTemplateProps) => {
   
      return  (
          <div className="space-y-6">
            <div className="border-b border-gray-900/10 pb-12">
              <p className="mt-1 text-sm leading-6 text-gray-600">
              </p>
            </div>
            <ObjectFieldTemplate {...props} />
            
          </div>
        );

  };



  return (
    <div className="container">
      {schema ? (
  <TodoList schema={schema} template={ObjectFieldTemplateWrapper} />
):(<div>No settings available</div>)}
    </div>
  );
}

interface TodoListProps {
  schema: RJSFSchema; // Define the type according to the structure of the schema
  template: any;
}

const TodoList: React.FC<TodoListProps> = ({ schema, template }) => {
  const [formData, setFormData] = useState({});
  const formattedSchema = {
    ...schema,
    properties: Object.fromEntries(
      Object.entries(schema.properties).map(([key, value]) => [key, {...(value as any)}])
    )
  };

  const handleChange = ({ formData }: any) => {
    setFormData(formData);
    console.log("Real-time formData:", formData);
  };

 

  return (
    <div>
        <Form formData={formData}
        onChange={handleChange} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4" schema={formattedSchema} validator={validator} templates={{ ObjectFieldTemplate: template }} />
    </div>
  );
};

export default Settings;
