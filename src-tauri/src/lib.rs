// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
use futures_util::{SinkExt, StreamExt};
use once_cell::sync::Lazy;
use serde_json::Value;
use std::collections::HashMap;
use std::path::Path;
use std::io::copy;
use reqwest::blocking::get;
use std::error::Error;
use std::env;
use std::fs::{self, File};
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
use url::Url;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}



#[tauri::command]
fn install(app: tauri::AppHandle, appName: &str, icon: &str, data: &str) {
    println!("Key: {}, Value: {}", appName, icon);
    let map: HashMap<String, Value> = serde_json::from_str(data).unwrap();

    for (key, value) in &map {
        println!("Key: {}, Value: {}", key, value);
    }

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

        let logo_path = app
        .path()
        .resolve(format!("apps/{}/icon.png",appName), BaseDirectory::AppData)
        .unwrap();
        download_image(icon, logo_path.as_path());

        if let Some(form) = map.get("form") {
            // Serialize the struct to a JSON string
            let json_data = serde_json::to_string_pretty(&form).unwrap();

            let form_file = app
            .path()
            .resolve(format!("apps/{}/form.json",appName), BaseDirectory::AppData)
            .unwrap();

            // Write the JSON data to the file
            fs::write(&form_file, json_data);
        }

        if let Some(compose) = map.get("compose") {
            // Serialize the struct to a JSON string
            let yaml_data = serde_yaml::to_string(&compose).unwrap();

            let yaml_file = app
            .path()
            .resolve(format!("apps/{}/docker-compose.yaml",appName), BaseDirectory::AppData)
            .unwrap();

            // Write the JSON data to the file
            fs::write(&yaml_file, yaml_data);
        }


    
    let webview_window = app.get_webview_window("main").unwrap();
            
    let urls = format!("tauri://localhost/app?name={}", "app_name");
    let mut webview_window_clone = webview_window.clone();
    let _ = webview_window_clone.navigate(Url::parse(&urls).unwrap());

}


fn download_image(url: &str, path: &Path) -> Result<(), Box<dyn Error>> {
    // Send a GET request to download the image
    let response = get(url)?;

    // Open a file at the specified path
    let mut file = File::create(path)?;

    // Copy the image from the response body into the file
    let mut content = response.bytes()?;
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
            podman_dir = podman_dir.parent().unwrap().to_path_buf();
        } else if cfg!(target_os = "macos") {
            podman_dir = podman_dir.parent().unwrap().to_path_buf().join("MacOS");
        }

        // Step 4: Create the containers.conf content
        let containers_conf_content = format!(
            "[engine]\nhelper_binaries_dir = [\"{}\"]\n",
            podman_dir.to_string_lossy()
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|_app, argv, _cwd| {
          println!("a new app instance was opened with {argv:?} and the deep link event was already triggered");
          // when defining deep link schemes at runtime, you must also check `argv` here
        }))
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, Some(vec!["--flag1", "--flag2"]))) ;
    }

    builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_log::Builder::new()
        .target(tauri_plugin_log::Target::new(
          tauri_plugin_log::TargetKind::LogDir {
            file_name: Some("logs".to_string()),
          },
        ))
        .max_file_size(999_000 /* bytes */)
        .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepAll)
        .build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let app_handle = app.handle();
            create_containers_conf(app.handle())?;

            let webview_window = app.get_webview_window("main").unwrap();

            app.deep_link().on_open_url(move |event| {
                let url = &event.urls()[0];
                let host = url.host().unwrap();
                let path = url.path();
    
                if let Host::Domain(domain) = host {
                    let urls = format!("https://hub.ppts.ai/packages/{}{}", domain,path);
                    let mut webview_window_clone = webview_window.clone();
                    let _ = webview_window_clone.navigate(Url::parse(&urls).unwrap());
                }
            });

            // Get the autostart manager
            let autostart_manager = app.autolaunch();
            if let Ok(enabled) = autostart_manager.is_enabled() {
                if !enabled {
                    // Enable autostart
                    let _ = autostart_manager.enable();
                    // Check enable state
                    println!(
                        "registered for autostart? {}",
                        autostart_manager.is_enabled().unwrap()
                    );
                }
            } else {
                // handle the error case
            }

            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit_i])?;

            let tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .menu_on_left_click(true)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        println!("quit menu item was clicked");
                        app.exit(0);
                    }
                    _ => {
                        println!("menu item not handled");
                    }
                })
                .on_tray_icon_event(|tray, event| match event {
                    TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } => {
                        println!("left click pressed and released");
                        // in this example, let's show and focus the main window when the tray is clicked
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {
                        println!("unhandled event {event:?}");
                    }
                })
                .build(app)?;
            let app_handle = app.handle().clone();
            // Run the command in the async block
            tauri::async_runtime::spawn(async move {
                // Now app_handle can be safely used in this async block
                let sidecar = app_handle
                    .shell()
                    .sidecar("podman")
                    .expect("podman command not found");

                let output = sidecar
                    .args(["machine", "ls"])
                    .output()
                    .await
                    .expect("failed to run podman command");

                if output.status.success() {
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    println!("Command Output: {}", stdout);
                    let line_count = stdout.lines().count();
                    if line_count <= 2 {
                        println!("Output is a single line.");
                        if let Some(mut webview_window) = app_handle.get_webview_window("main") {
                            let _ = webview_window.navigate(
                                url::Url::parse("tauri://localhost/init").expect("parse url error"),
                            );
                        }
                    } else {
                        println!("Output has multiple lines. Line count: {}", line_count);
                        let line = stdout
                            .lines()
                            .nth(2)
                            .expect("line 2 not available")
                            .trim_end();
                        println!("current line. {}", line);
                        if line.is_empty() {
                            if let Some(mut webview_window) = app_handle.get_webview_window("main")
                            {
                                let _ = webview_window.navigate(
                                    url::Url::parse("tauri://localhost/init")
                                        .expect("parse url error"),
                                );
                            }
                        }
                    }
                } else {
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    println!("Command failed: {}", stderr);
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet,install])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
