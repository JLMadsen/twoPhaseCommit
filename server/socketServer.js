let WebSocket = require('ws');
let ws_server = new WebSocket.Server({ port: 4001 });
let coordinator;

ws_server.on('connection', (connection) => {
    console.log('Opened a connection');

    // setup client with id and role
    let nClients = ws_server.clients.size;
    if(nClients === 1) {
        connection.send(action.setup +","+ nClients + ", coordinator");
        coordinator = connection;
    } else {
        connection.send(action.setup +","+ nClients + ", participant,");
    }

    updateNClients();

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
        updateNClients();
    });

    connection.on('error', (error) => {
        console.error("Error: " + error.message);
    });
});

const updateNClients = () => {
    let nClients = ws_server.clients.size;
    ws_server.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(action.setup +','+ action.newClient +","+ nClients);
        }
    });
};

let action = {
    // startup
    setup: 100,
    newClient: 101,

    // phases
    commit: 102,
    requestVote: 103,  // send to participants
    vote: 104,         // send to coordinator with answer

    // voting
    voteYes: 201,
    voteNo: 202,

    // commit
    success: 301,
    rollback: 302
};