import { exec } from 'child_process';
import { platform } from 'os';

// Function to check if a process is running using `pgrep`
function isProcessRunning(command) {
  return new Promise((resolve, reject) => {
    const cmd = `pgrep -fl '${command}'`;
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        return reject(error);  // Return error if the process isn't found
      }
      resolve(stdout.trim() !== '');  // Process found if there's output
    });
  });
}

// Function to kill a process using `pkill` with `sudo` for permission
function killProcess(command) {
  return new Promise((resolve, reject) => {
    const cmd = `sudo pkill -f '${command}'`;  // Add sudo to ensure permissions
    exec(cmd, (error, stdout, stderr) => {
      if (error && error.code !== 1) {
        // If pkill failed with error other than 'process not found' (code 1)
        return reject(error);
      }
      resolve(stdout); // Successfully killed process, or no process was found
    });
  });
}

// Function to open a command in a new terminal window (works on Linux or Mac)
function openTerminalCommand(command) {
  const terminalCommand = platform() === 'darwin' 
    ? `osascript -e 'tell app "Terminal" to do script "${command}"'`
    : `gnome-terminal -- bash -c "${command}"`;  // Works on Linux with GNOME Terminal
  exec(terminalCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error opening terminal: ${error.message}`);
    }
    console.log(`Opened terminal for command: ${command}`);
  });
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { action } = req.body;

    if (action === 'start') {
      try {
        // Check if roscore and rosbridge are running and kill them
        const roscoreRunning = await isProcessRunning('roscore');
        const rosbridgeRunning = await isProcessRunning('roslaunch rosbridge_server rosbridge_websocket.launch');

        // Kill the roscore process if running
        if (roscoreRunning) {
          console.log('roscore is already running. Killing it...');
          try {
            await killProcess('roscore');
          } catch (error) {
            console.error('Error killing roscore:', error.message);
          }
        }

        // Kill the rosbridge process if running
        if (rosbridgeRunning) {
          console.log('rosbridge is already running. Killing it...');
          try {
            await killProcess('roslaunch rosbridge_server rosbridge_websocket.launch');
          } catch (error) {
            console.error('Error killing rosbridge:', error.message);
          }
        }

        // Run roscore in a new terminal window
        console.log('Starting roscore...');
        openTerminalCommand('/opt/ros/noetic/bin/roscore');

        // Run rosbridge in a new terminal window
        console.log('Starting rosbridge...');
        openTerminalCommand('/opt/ros/noetic/bin/roslaunch rosbridge_server rosbridge_websocket.launch');

        return res.status(200).json({ success: true, message: 'ROS processes started.' });
      } catch (error) {
        console.error(`Error during process management: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Error starting ROS processes.' });
      }
    } else {
      return res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } else {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
}
