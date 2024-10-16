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
    let registries_conf_path = app_handle
        .path()
        .resolve("registries.conf", BaseDirectory::Resource)
        .unwrap();
    env::set_var("CONTAINERS_REGISTRIES_CONF", &registries_conf_path);

    Ok(())
}
fn replace_alias(command: &str) -> &str {
    if "docker" == command {
        return "podman";
    }
    return command;
}

#[tauri::command]
async fn open_window(app: tauri::AppHandle, name: &str, url: &str) -> Result<(), String> {
    println!("open new window {}", name);
    let webview_window = tauri::WebviewWindowBuilder::new(
        &app,
        name,
        tauri::WebviewUrl::External(url::Url::parse(url).unwrap()),
    )
    .inner_size(800.0, 600.0)
    .title(name)
    //.proxy_url(url::Url::parse("socks5://51.75.126.150:19353").unwrap())
    .build();
    Ok(())
}

#[tauri::command]
fn list_apps(app: tauri::AppHandle) -> String {
    let file_path = app.path().resolve("apps", BaseDirectory::AppData).unwrap();
    let mut subfolders = Vec::new();

    if file_path.exists() {
        if (file_path.is_dir()) {
            let dir = fs::read_dir(file_path).unwrap();
            for entry in dir {
                let entry = entry.unwrap(); // Unwrap the Result<DirEntry>
                let path = entry.file_name(); // Call .path() on the DirEntry
                let pathStr = path.to_string_lossy().to_string();
                if pathStr.starts_with('.') {
                } else {
                    subfolders.push(pathStr);
                }
            }
        }
    }

    return serde_json::to_string(&subfolders).unwrap();
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
        .register_uri_scheme_protocol("appdata", |_ctx, request| {
            let path = request.uri().to_string().replace("appdata://", "");
            let file_path = _ctx
                .app_handle()
                .path()
                .resolve(path, BaseDirectory::AppData)
                .unwrap();

            if file_path.exists() {
                let file_bytes = read(file_path).unwrap();
                let mime_type = "image/png";
                return tauri::http::Response::builder()
                    .header("Content-Type", mime_type.to_string())
                    .body(file_bytes.into())
                    .unwrap();
            }

            // Return 404 if file is not found
            tauri::http::Response::builder()
                .status(404)
                .body(vec![])
                .unwrap()
        })
        .setup(|app| {
            let app_handle = app.handle();
            create_containers_conf(app.handle())?;

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
            open_window
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