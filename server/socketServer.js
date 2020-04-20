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

    /**
     * When we receive a new message we forward it to all clients
     */
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
        if(connection === coordinator) {
            assignNewCoordinator();
        }
        updateNClients();
    });

    connection.on('error', (error) => {
        console.error("Error: " + error.message);
    });
});


var BreakException = {};

/**
 * If the coordinator disconnects we need to assign a new one.
 */
const assignNewCoordinator = () => {
    let nClients = ws_server.clients.size;
    try {
        ws_server.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(action.setup + "," + nClients + ", coordinator");
                coordinator = client;
                throw BreakException
            }
        });
    }catch (e) {
        if (e !== BreakException) throw e;
    }
};

/**
 * Update client count and send to all clients
 */
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