import { NextApiRequest, NextApiResponse } from 'next';
import httpProxy from 'http-proxy';

const proxy = httpProxy.createProxyServer();

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req, res) {
  return new Promise((resolve, reject) => {
    // Modify the target URL to match your camera's RTSP stream
    // Note: In production, you should use a proper RTSP-to-Web proxy
    proxy.web(req, res, { 
      target: 'http://localhost:3001', // This should point to your RTSP proxy server
      changeOrigin: true,
      selfHandleResponse: false,
    }, err => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}