import { useEffect, useState } from "react";
import { invoke } from '@tauri-apps/api/core';
import { readFile } from '@tauri-apps/plugin-fs';
import * as path from '@tauri-apps/api/path';

/**
 *
 * 1) CopilotKit Integration
 *
 **/

import {
  useCopilotAction,
  useCopilotReadable,
} from "@copilotkit/react-core";
import { CopilotSidebar } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import validator from '@rjsf/validator-ajv8';
import Form, { getDefaultRegistry, IChangeEvent } from "@rjsf/core";
import { RJSFSchema, ObjectFieldTemplateProps } from "@rjsf/utils";
import { useSearchParams } from "react-router-dom";
const registry = getDefaultRegistry();

const ObjectFieldTemplate = registry.templates.ObjectFieldTemplate;
type AppDetailProps = {
  id: string
}

function AppDetail({pros}:AppDetailProps) {
  const [schema, setSchema] = useState<RJSFSchema>({
    type: 'object',
    title: "",
    version: '',
    description: "",
    instructions: 
      ""
    ,
    labels: {
      title: "",
      initial: "",
    },
    groups: [],
    properties: {}
  });
  const [searchParams] = useSearchParams();
  const name = searchParams.get("name"); // Replace with your query parameter name
  
  useEffect(() => {
    // Fetch the JSON file (replace 'path/to/schema.json' with your actual file path)
    const loadSchema = async () => {
      try {
        path.appDataDir().then((value) => {
          path.join(value, `apps/${name}/values.schema.json`).then((path) => {
            readFile(path).then((text)=>{
              var string = new TextDecoder().decode(text);
              const data = JSON.parse(string);
              console.log("schema",data);
              setSchema(data.schema); // Set the schema state with the fetched data
            });
          });
    
        });

      } catch (error) {
        console.error('Error loading schema:', error);
      }
    };

    loadSchema(); // Call the function to load the schema
  }, []);


  const getPropsForGroup = (
    group: any,
    props: ObjectFieldTemplateProps
  ): ObjectFieldTemplateProps => {
    // More filtering might be required for propper functionality, this is just a POC
    return {
      ...props,
      title: '', 
      description: undefined,
      properties: props.properties.filter((p) => group.fields.includes(p.name))
    };
  };  

  const ObjectFieldTemplateWrapper = (props: ObjectFieldTemplateProps) => {
    if(!schema.groups || schema.groups.length === 0) 
      return  (
          <div className="space-y-6">
            <div className="border-b border-gray-900/10 pb-12">
              <h2 className="text-base font-semibold leading-7 text-gray-900">{props.title}({schema.version})</h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">
              {props.description}
              </p>
            </div>
            <ObjectFieldTemplate {...props} />
            
          </div>
        );
    else
      return (
          <div className="space-y-6">
            <div className="border-b border-gray-900/10 pb-12">
              <h2 className="text-base font-semibold leading-7 text-gray-900">{props.title}({schema.version})</h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">
              {props.description}
              </p>
            </div>
          {schema.groups.map((group: any) => {
            const childProps = getPropsForGroup(group, props);
            return (
              <div key={group.name} className="divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow">
                <div className="px-4 py-5 sm:px-6 bg-slate-50">
                {group.name}
                </div>
                <div className="px-4 py-5 sm:p-6">
                  <ObjectFieldTemplate {...childProps} />
                </div>
              </div>
            );
          })}
          </div>
    );
  };



  return (
    <div className="container">
        <TodoList schema={schema} template={ObjectFieldTemplateWrapper} />
        <CopilotSidebar
          instructions={
           schema.instruction
          }
          defaultOpen={false}
          labels={schema.labels}
          clickOutsideToClose={false}
        />

    </div>
  );
}

interface TodoListProps {
  schema: RJSFSchema; // Define the type according to the structure of the schema
  template: any
}

const TodoList: React.FC<TodoListProps> = ({ schema, template }) => {
  const [formData, setFormData] = useState({});
  const formattedSchema = {
    ...schema,
    properties: Object.fromEntries(
      Object.entries(schema.properties).map(([key, value]) => [key, {...(value as any)}])
    )
  };
        
  const attributes =Object.entries(schema.properties).map(([key, value]) => ({
        name: key,
        type: (value as any).type,
        description: (value as any).description,
      }));
  const handleChange = ({ formData }: any) => {
    setFormData(formData);
    console.log("Real-time formData:", formData);
  };

  const handleSubmit =(data: IChangeEvent<any, any, any>) => {
    console.log("submit formData:", data.formData);
    invoke('call_lux', { url: data.formData.url});
  };



  /**
   *
   * 4) make the users todo list available with useCopilotReadable
   *
   **/
  useCopilotReadable({
    description: "This is a tool argument form",
    value: formData,
  });

  /**
   *
   * 5) Add the useCopilotAction to enable the copilot to interact with the todo list
   *
   **/

  useCopilotAction({
    name: "updateForm",
    description: "Update the argument form",
    parameters: [
      {
        name: "data",
        type: "object",
        description: "The new and updated argument form.",
        attributes: attributes,
      },
    ],
    handler: ({ data }) => {
      console.log(data);
    
      setFormData(data);
    },
    render: "Updating the todo list...",
  });

  /**
   *
   * 5) Add another useCopilotAction to enable the copilot to delete a todo item
   *
   **/
  useCopilotAction({
    name: "resetForm",
    description: "reset the form",
    parameters: [],
    handler: () => {
      setFormData({})
    },
    render: "Data clearing, reset the form",
  });

  const uiSchema = {
    "ui:submitButtonOptions": {
      norender: true, // Hide the submit button
    },
  };

 

  return (
    <div>
        <Form formData={formData} onSubmit={handleSubmit} uiSchema={uiSchema}
        onChange={handleChange} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4" schema={formattedSchema} validator={validator} templates={{ ObjectFieldTemplate: template }} />
    </div>
  );
};

export default AppDetail;
