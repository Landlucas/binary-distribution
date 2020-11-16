const net = require('net');
const fs = require('fs');
const path = require('path');

let connections = [
  {
    host: 'localhost',
    port: 11111,
    fileName: 'teste',
  },
  {
    host: 'localhost',
    port: 22222,
    fileName: 'teste',
  },
  {
    host: 'localhost',
    port: 33333,
    fileName: 'teste',
  },
  {
    host: 'localhost',
    port: 44444,
    fileName: 'teste',
  },
];

for (let connection of connections) {
  const server = net.createServer((socket) => {
    let filePathDir = path.resolve(__dirname, '..', 'temp', connection.port.toString());
    if (!fs.existsSync(filePathDir)) {
      fs.mkdirSync(filePathDir, { recursive: true });
      console.log(`Creating path dir ${filePathDir}`);
    }

    let fileName = '';
    socket.on('data', (chunk) => {
      if (!fileName) {
        fileName = chunk.toString();
        console.log(`Adding file ${fileName}!`);
      } else {
        let outputFile = fs.createWriteStream(path.resolve(__dirname, '..', 'temp', connection.port.toString(), fileName));
        outputFile.write(chunk);
        outputFile.end();
      }
    });

    socket.on('end', () => {
      console.log(`Socket stream ended.`);
    });

    socket.on('close', () => {
      console.log(`Socket stream closed.`);
    });

    socket.on('error', (error) => {
      console.log(`Socket got problems: ${error.message}`);
    });
  });

  server.on('error', (error) => {
    console.log(`Server got problems!: ${error.message}`);
  });

  server.listen(connection.port, () => {
    console.log(`Server listening at localhost:${connection.port}...`);
  });
}
