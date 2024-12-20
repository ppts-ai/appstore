import { platform } from '@tauri-apps/plugin-os';
import { Command } from '@tauri-apps/plugin-shell';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const IntroPage = () => {
  const currentPlatform = platform();
  const [messages, setMessages] = useState<string[]>([]);

  const checkWSL = async () =>{

    setMessages((prevMessages) => [...prevMessages, "Windows环境，检测WSL虚拟化工具是否已经安装"]);
    const status_command = Command.create('wsl', ["--status"]);
    status_command.stdout.on('data', line => setMessages((prevMessages) => [...prevMessages, line]));
    status_command.stderr.on('data', line => setMessages((prevMessages) => [...prevMessages, line]));
    const statusResult = await status_command.execute();
    setMessages((prevMessages) => [...prevMessages, `status result ${JSON.stringify(statusResult)}`]);

  };
    return (
      <div>
        <h1>Intro</h1>
        <div>The application uses podman, which relies on virtual machine to run containers. 
          So after the application installed, it needs to initialize virtual machine first.
        </div>
        {currentPlatform === "windows" && (
          <div>on windows, it uses WSL (Windows Subsysem Linux), make sure WSL 2.0 is installed and configured properly 
          <button onClick={checkWSL}> Check WSL</button>
          <br />
          <a target="_blank" href="https://wslstorestorage.blob.core.windows.net/wslblob/wsl_update_x64.msi">Download WSL update here </a>
          </div>
        ) }
        {currentPlatform === "macos" && (
          <div>mac</div>
        ) }
        <Link to="/init">Setup Local</Link>
        <br />
        <Link to="/addRemote">Add Remote</Link>

        <br />
        <br />
        {messages.map((msg: any,index: number) => (
      <div key={index}>{msg} </div>
    ))}
      </div>
    );
  }
  
  export default IntroPage;
  