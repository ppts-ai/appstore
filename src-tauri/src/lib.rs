// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
use futures_util::{SinkExt, StreamExt};
use once_cell::sync::Lazy;
use reqwest::get;
use serde_json::Value;
use std::collections::HashMap;
use std::env;
use std::error::Error;
use std::fs::read;
use std::fs::{self, File};
use std::path::Path;
use std::sync::Mutex;
use tauri::path::BaseDirectory;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle,
};
use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconEvent},
    Manager,
};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;
use tokio::net::TcpListener;
use tokio_tungstenite::accept_async;
use tokio_tungstenite::tungstenite::Message;
use url::Host;
use std::io::{copy, Cursor};
use std::io::{self, BufReader};
use flate2::read::GzDecoder;
use tar::Archive;
use base64::{encode};
use serde::Serialize;
use serde::Deserialize;
use std::path::PathBuf;
use std::process::Command;
use tauri_plugin_store::StoreExt;



use std::ffi::CString;
use std::os::raw::c_char;
use std::os::raw::c_int;
use std::os::raw::c_void;
use tauri::State;
use libloading::{Library, Symbol};
use std::sync::{Arc};

#[derive(Serialize)]
struct AppInfo {
    name: String,
    image: String,
}

#[derive(Debug, Deserialize)]
struct AppConfig {
    open_type: Option<String>,
    open_proxy: Option<String>,
    open_url: Option<String>,
}


#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn install(
    app: tauri::AppHandle,
    appName: &str,
    icon: &str,
    data: &str,
) -> Result<(), String> {
    println!("Key: {}, Value: {}", appName, icon);

    let app_path = app
        .path()
        .resolve(format!("apps/{}", appName), BaseDirectory::AppData)
        .unwrap();
    // Use result as needed
    let mut result = 0;
    let path = Path::new(&app_path);

    // Check if the directory exists, and create it if it doesn't
    if !path.exists() {
        fs::create_dir_all(path);
        println!("Directory created: {:?}", path);
    } else {
        println!("Directory already exists: {:?}", path);
    }


    let app_path2 = app
    .path()
    .resolve("apps", BaseDirectory::AppData)
    .unwrap();

    println!("First file: {:?} {:?}", data, app_path2);
    download_and_extract_zip(data,app_path2.as_path()).await;

    let logo_path = app
    .path()
    .resolve(format!("apps/{}/icon.png", appName), BaseDirectory::AppData)
    .unwrap();
println!("icon path: {:?}", logo_path);
download_image(icon, logo_path.as_path()).await;



    let webview_window = app.get_webview_window("main").unwrap();

    let urls = format!("http://localhost:9527/app?name={}", appName);
    let mut webview_window_clone = webview_window.clone();
    let _ = webview_window_clone.navigate(url::Url::parse(&urls).unwrap());

    Ok(())
}

async fn download_image(url: &str, path: &Path) -> Result<(), Box<dyn Error>> {
    // Send a GET request to download the image
    let response = get(url).await?;

    // Open a file at the specified path
    let mut file = File::create(path)?;

    // Copy the image from the response body into the file
    let mut content = response.bytes().await?;
    copy(&mut content.as_ref(), &mut file)?;

    Ok(())
}

fn create_env_file(app_handle: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // Step 1: Get the app data folder path

    println!("File does not exist.");
    let app_data_path = app_handle
        .path()
        .resolve("", BaseDirectory::AppData)
        .unwrap();
    fs::create_dir_all(app_data_path);

    let doc_path = app_handle
        .path()
        .resolve("", BaseDirectory::Document)
        .unwrap();

    let download_path = app_handle
        .path()
        .resolve("", BaseDirectory::Download)
        .unwrap();
    
    let desktop_path = app_handle
        .path()
        .resolve("", BaseDirectory::Desktop)
        .unwrap();

    env::set_var("DESKTOP", &desktop_path);
    env::set_var("DOCUMENT", &doc_path);
    env::set_var("DOWNLOAD", &download_path);


    Ok(())
}

fn create_containers_conf(app_handle: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // Step 1: Get the app data folder path
    let containers_conf_path = app_handle
        .path()
        .resolve("containers.conf", BaseDirectory::AppData)
        .unwrap();

    if containers_conf_path.exists() {
        println!("File exists!");
    } else {
        println!("File does not exist.");
        let app_data_path = app_handle
            .path()
            .resolve("", BaseDirectory::AppData)
            .unwrap();
        fs::create_dir_all(app_data_path);

        let mut podman_dir = app_handle
            .path()
            .resource_dir()
            .expect("Exec path not available");
        if cfg!(target_os = "windows") {
        } else if cfg!(target_os = "macos") {
            podman_dir = podman_dir.parent().unwrap().to_path_buf().join("MacOS");
        }

        // Step 4: Create the containers.conf content
        let containers_conf_content = format!(
            "[engine]\nhelper_binaries_dir = [\"{}\"]\n",
            podman_dir.to_string_lossy().replace("\\", "/")
        );
        println!(
            "File does not exist {}",
            containers_conf_path.to_string_lossy()
        );
        let mut file = File::create(&containers_conf_path)
            .map_err(|e| format!("File creation error: {}", e))?;
        fs::write(&containers_conf_path, containers_conf_content)?;
    }

    // Step 6: Set the environment variable CONTAINERS_CONF to point to the new file
    env::set_var("CONTAINERS_CONF", &containers_conf_path);
    Ok(())
}
fn replace_alias(command: &str) -> &str {
    if "docker" == command {
        return "podman";
    }
    return command;
}

#[tauri::command]
async fn open(app: tauri::AppHandle, config_str: &str) -> Result<(), String> {
    match serde_json::from_str::<AppConfig>(config_str) {
        Ok(config) => {
            println!("Deserialized config: {:?}", config);
            let url = config.open_url.unwrap();
            let profile_dir = app
            .path()
            .resolve("user_data", BaseDirectory::Data)
            .unwrap();
            if let Some(open_proxy) = config.open_proxy {
                println!("has proxy configured");
                if cfg!(target_os = "windows") {
                    let output = Command::new("cmd") // or "chrome" depending on your OS
                        .arg("/c")
                        .arg(format!(
                            "start msedge --proxy-server={} --user-data-dir={} {}",
                            open_proxy,
                            profile_dir.display(),
                            url
                        ))
                        .spawn();
            
                    match output {
                        Ok(_) => println!("Opened Chrome with URL"),
                        Err(e) => eprintln!("Failed to open Chrome: {}", e),
                    }
                } else if cfg!(target_os = "macos") {
                    let output = Command::new("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome") // or "chrome" depending on your OS
                        .arg(format!("--proxy-server={}", open_proxy))
                        .arg(format!("--user-data-dir={}", profile_dir.display())) // Specify the custom profile directory
                        .arg(url)
                        .spawn();
            
                    match output {
                        Ok(_) => println!("Opened Chrome with URL"),
                        Err(e) => eprintln!("Failed to open Chrome: {}", e),
                    }
                };
            }
            else {
                println!("no proxy configured");
                if cfg!(target_os = "windows") {
                    let output = Command::new("cmd") // or "chrome" depending on your OS
                        .arg("/c")
                        .arg(format!(
                            "start msedge --user-data-dir={} {}",
                            profile_dir.display(),
                            url
                        ))
                        .spawn();
            
                    match output {
                        Ok(_) => println!("Opened Chrome with URL"),
                        Err(e) => eprintln!("Failed to open Chrome: {}", e),
                    }
                } else if cfg!(target_os = "macos") {
                    let output = Command::new("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome") // or "chrome" depending on your OS
                        .arg(format!("--user-data-dir={}", profile_dir.display())) // Specify the custom profile directory
                        .arg(url)
                        .spawn();
            
                    match output {
                        Ok(_) => println!("Opened Chrome with URL"),
                        Err(e) => eprintln!("Failed to open Chrome: {}", e),
                    }
                };
            }

        }
        Err(e) => {
            println!("Failed to deserialize: {}", e);
        }
    }
    Ok(())
}

#[tauri::command]
fn list_apps(app: tauri::AppHandle) -> String {
    let file_path = app.path().resolve("apps", BaseDirectory::AppData).unwrap();
    let mut apps: Vec<AppInfo> = Vec::new();

    if file_path.exists() {
        if (file_path.is_dir()) {
            let dir = fs::read_dir(file_path).unwrap();
            for entry in dir {
                let entry = entry.unwrap(); // Unwrap the Result<DirEntry>
                let path = entry.file_name(); // Call .path() on the DirEntry
                let pathStr = path.to_string_lossy().to_string();
                if pathStr.starts_with('.') {
                } else {

                    let image_path = app.path().resolve(format!("apps/{}/icon.png",pathStr), BaseDirectory::AppData).unwrap(); // Load the image data as bytes
                    println!("file path {:?}", image_path);
                    if (image_path.exists()) {
                        let image_data = fs::read(image_path).expect("Failed to read image file");
                        let encoded_image = encode(image_data); // Base64 encode the image
                        // Add the app information to the list
                        apps.push(AppInfo {
                            name: pathStr.to_string(),
                            image: format!("data:image/png;base64,{}",encoded_image),
                        });
                    }else {
                        // Add the app information to the list
                        apps.push(AppInfo {
                            name: pathStr.to_string(),
                            image: "".to_string(),
                        });
                    }

                    
                }
            }
        }
    }

    return serde_json::to_string(&apps).unwrap();
}


#[tauri::command]
async fn start_network_disk(models_path: PathBuf, mount_path: PathBuf, models_data_path: PathBuf, lib: Library) {
    env::set_var("SALT", "ai.ppts.appstore");
    #[cfg(target_os = "windows")]
    {
        if !models_data_path.exists() {
            fs::copy(&models_path, &models_data_path);
        }

        unsafe {
            let cstr_a = CString::new(format!("mount sqlite3://{}?_pragma_key=2DD29CA851E7B56E4697B0E1F08507293D761A05CE4D1B628663F411A8086D99&_pragma_cipher_page_size=4096 Z:",models_path.display())).expect("CString::new failed");
            let func: Symbol<unsafe extern "C" fn(input: *const c_char) -> c_int> =
            lib.get("RunMain".as_bytes()).unwrap();
            port = func(cstr_a.as_ptr());
            println!("Library is loaded!");
        }
    }

    #[cfg(target_os = "macos")]
    {
        // macOS: Start `juicefs` as a detached elevated process using `sudo`
        let _ = Command::new("juicefs")
            .env("SALT", "ai.ppts.appstore")
            .arg("mount")
            .arg(format!("sqlite3://{}?_pragma_key=2DD29CA851E7B56E4697B0E1F08507293D761A05CE4D1B628663F411A8086D99&_pragma_cipher_page_size=4096",models_path.display()))
            .arg(mount_path)
            .spawn(); // Detached process, ignore any errors or output
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let port: u16 = 9527;
    let mut builder =
        tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|_app, argv, _cwd| {
          println!("a new app instance was opened with {argv:?} and the deep link event was already triggered");
          // when defining deep link schemes at runtime, you must also check `argv` here
        }))
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, Some(vec!["--flag1", "--flag2"]))) ;
    }

    builder
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_localhost::Builder::new(port).build())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(
            tauri_plugin_log::Builder::new()
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::LogDir {
                        file_name: Some("logs".to_string()),
                    },
                ))
                .max_file_size(10_999_000 /* bytes */)
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepAll)
                .build(),
        )
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let app_handle = app.handle();
            
            let store = app.store("my-store");
            // Note that values must be serde_json::Value instances,
            // otherwise, they will not be compatible with the JavaScript bindings.
            let region = store.get("region").unwrap_or(Value::String("us".to_string()));
            let registries_conf_path = app_handle
            .path()
            .resolve(format!("registries_{}.conf",region), BaseDirectory::Resource)
            .unwrap();
            env::set_var("CONTAINERS_REGISTRIES_CONF", &registries_conf_path);

            let models_path = app_handle
                .path()
                .resolve("models.db", BaseDirectory::Resource)
                .unwrap();
            let models_data_path = app_handle
                .path()
                .resolve("models.db", BaseDirectory::AppData)
                .unwrap();            
            let mount_path = app_handle
                .path()
                .resolve("models", BaseDirectory::AppData)
                .unwrap();
            unsafe {
                let path = app_handle
                    .path()
                    .resolve("juicefs.dll", BaseDirectory::Resource)
                    .unwrap();
                let lib = Library::new(path).unwrap();
                tauri::async_runtime::spawn(async {
                    start_network_disk(models_path, mount_path,models_data_path,lib).await;
                });
            }

            create_containers_conf(app.handle())?;
            create_env_file(app.handle())?;
            env::set_var("PODMAN_COMPOSE_PROVIDER", "podman-compose");
            
            let mut podman_dir = app_handle
            .path()
            .resource_dir()
            .expect("Exec path not available");
            if cfg!(target_os = "windows") {
                let current_path = env::var("PATH").unwrap_or_default();
                let new_path = format!("{};{}", podman_dir.to_string_lossy().replace("\\", "/"), current_path);
                
                println!("new path: {}", new_path);
                env::set_var("PATH", new_path); // Set the PATH globally
            } else if cfg!(target_os = "macos") {
                podman_dir = podman_dir.parent().unwrap().to_path_buf().join("MacOS");
                let current_path = env::var("PATH").unwrap_or_default();
                let new_path = format!("{}:{}", podman_dir.to_string_lossy(), current_path);
                println!("new path: {}", new_path);
                env::set_var("PATH", new_path); // Set the PATH globally
            }


            let webview_window = app.get_webview_window("main").unwrap();

            app.deep_link().on_open_url(move |event| {
                let url = &event.urls()[0];
                let host = url.host().unwrap();
                let path = url.path();

                if let Host::Domain(domain) = host {
                    let urls = format!("https://hub.ppts.ai/packages/{}{}", domain, path);
                    let mut webview_window_clone = webview_window.clone();
                    let _ = webview_window_clone.navigate(url::Url::parse(&urls).unwrap());
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            install,
            list_apps,
            open
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}



async fn download_and_extract_zip(url: &str, destination: &Path) -> Result<(), Box<dyn std::error::Error>> {
    // Step 1: Download the ZIP file
    let response = get(url).await?;
    let mut cursor = Cursor::new(response.bytes().await?);

    
    // Create a GzDecoder to decompress the content
    let decoder = GzDecoder::new(cursor);
    
    // Create a tar Archive from the decompressed data
    let mut archive = Archive::new(decoder);
    
    // Extract all the files to the current directory
    archive.unpack(destination)?;

    Ok(())
}