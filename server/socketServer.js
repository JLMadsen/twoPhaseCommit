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
    setup: "Setup",
    newClient: "NewClient",

    // phases
    commit: "Commit",
    requestVote: "RequestVote",  // send to participants
    vote: "Vote",         // send to coordinator with answer

    // voting
    voteYes: "VoteYes",
    voteNo: "VoteNo",

    // commit
    success: "Success",
    rollback: "Rollback",
    acknowledge: "Acknowledge",

    // abort message
    dataMismatch: "DataMismatch",
    writeError: "WriteError"
};