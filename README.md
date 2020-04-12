## Functionality

The first client that connects to the socket server will be assigned the coordinator role, the rest are participants.

When any client commits a new balance the coordinator will forward this commit to all clients with a requestVote message.
After a client reviews the commit it will either vote yes or no.

The coordinator will count the votes and if any client voted no it will send an abort message to all clients, and they will rollback their local data. If all clients voted yes the coordinator will send a success message and all clients will write this new data to the local data.

## Techstack

- Javascript
- Websocket
- React

## Demo

![Demo gif](https://i.imgur.com/25Gf5uq.gif)

## Installasion and usage
In root dir: 
`npm install`

In root dir: 
`npm start`

In server dir:
`node socketServer`

## Further reading

https://iajit.org/PDF/vol.3,no.1/4-Toufik.pdf

https://github.com/facebook/rocksdb/wiki/Two-Phase-Commit-Implementation

https://dzone.com/articles/distributed-transactions-with-two-phase-commit-pro
