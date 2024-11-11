use libloading::{Library, Symbol};
use std::sync::{Arc, Mutex};
use tauri::path::BaseDirectory;
use tauri::AppHandle;
use tauri::{Manager, State};
use std::collections::HashMap;

pub struct SharedLibrary {
    libs: HashMap<String, Arc<Library>>,
}

impl SharedLibrary {
    pub fn new() -> Self {
        SharedLibrary {
            libs: HashMap::new(),
        }
    }

    pub fn get_library(&mut self, handle: &AppHandle, app: &str) -> Option<Arc<Library>> {
        
        if self.libs.get(app).is_none() {
            unsafe {
                let library_extension = if cfg!(target_os = "macos") {
                    "dylib"
                } else {
                    "dll"
                };
                let lib_filename = format!(
                    "libs/{}/lib{}.{}",
                    app,
                    app,
                    library_extension
                );
                let path = handle
                    .path()
                    .resolve(lib_filename, BaseDirectory::AppData)
                    .unwrap();
                self.libs.insert(app.to_string(), Arc::new(Library::new(path).unwrap()));
            }
        }
        self.libs.get(app).cloned()
    }
}
