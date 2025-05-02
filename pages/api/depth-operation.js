import { spawn } from 'child_process';

export default function handler(req, res) {
  if (req.method === 'GET') {
    const { depth } = req.query;

    // Check if 'depth' parameter is provided
    if (!depth) {
      return res.status(400).json({ error: 'Depth parameter is required' });
    }

    // Set response headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();  // Flush the headers immediately

    // Execute the Python script
    const pythonProcess = spawn('python3', [`/home/ranjitray/Desktop/aqua/scripts/depth-operation.py`, depth]);

    // Log when the process starts
    console.log(`Executing Python script with depth: ${depth}`);

    // Handle stdout data from Python script
    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`STDOUT: ${output}`);
      res.write(`data: ${output}\n\n`);  // Send data to the client
    });

    // Handle stderr data from Python script
    pythonProcess.stderr.on('data', (error) => {
      const errorMsg = error.toString();
      console.error(`STDERR: ${errorMsg}`);
      res.write(`data: ERROR: ${errorMsg}\n\n`);  // Send error data to the client
    });

    // Handle script completion
    pythonProcess.on('close', (code) => {
      console.log(`Script finished with code: ${code}`);
      res.write(`data: Process finished with code ${code}\n\n`);
      res.end();  // End the SSE connection
    });

    // Handle errors
    pythonProcess.on('error', (err) => {
      console.error(`Failed to start process: ${err.message}`);
      res.write(`data: ERROR: Failed to start process: ${err.message}\n\n`);
      res.end();  // End the SSE connection
    });
  } else {
    // Handle non-GET requests
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
