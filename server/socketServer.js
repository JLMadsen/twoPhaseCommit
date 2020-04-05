/*
Simple echo socket server for relaying info

 */

let WebSocket = require('ws');
let ws_server = new WebSocket.Server({ port: 4001 });

let counter = 1;

ws_server.on('connection', (connection) => {
    console.log('Opened a connection');

    // setup client with id and role
    if(counter === 1) {
        connection.send(counter + ", coordinator |@");
    } else {
        connection.send(counter + ", participant |@");
    }
    counter++;


    connection.on('message', (message) => {
        console.log("message received from a client: " + message);

        ws_server.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                console.log("Send message to client");
                client.send(message);
            }
        });
    });

    connection.on('close', () => {
        console.log("Closed a connection");
    });

    connection.on('error', (error) => {
        console.error("Error: " + error.message);
    });
});
