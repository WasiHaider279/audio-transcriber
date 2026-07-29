import fs from 'fs';
import http from 'http';
import path from 'path';

const filePath = process.argv[2] || 'samples/test.wav';
const fileData = fs.readFileSync(filePath);
const fileName = path.basename(filePath);

const boundary = '----FormBoundary' + Date.now();

const header = Buffer.from(
  `--${boundary}\r\nContent-Disposition: form-data; name="audio"; filename="${fileName}"\r\nContent-Type: audio/wav\r\n\r\n`,
  'utf-8',
);
const footer = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
const payload = Buffer.concat([header, fileData, footer]);

const req = http.request(
  {
    hostname: 'localhost',
    port: 3000,
    path: '/api/transcribe',
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': payload.length,
    },
  },
  (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      console.log(JSON.stringify(JSON.parse(data), null, 2));
    });
  },
);

req.write(payload);
req.end();
