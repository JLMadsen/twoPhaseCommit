# Two Phase Commit - 2PC

## Introduction

Two Phase Commit protocol is a version control based around voting. In a group of clients which have shared data and want to change it, we can commit a change. But in this case all the clients vote on each commit, if all agree on the change it will be commited, if not it will be aborted. 

we can designate one node to be a coordinator, this client is in charge of requesting votes and counting them.

The protocal has several phases, the first being an initial commit by either a participant or the coordinator.
During this phase the coordinator will request a vote on this commit from all participants.

The next phase starts when all clients have voted. Then the coordinator will count them, if all clients voted yes it will succeed, if one or more clients vote no it will fail.

Depeding on the vote the coordinator will send out a success or abort message, if it succeeded all clients will write the new commit data to local storage. If the vote failed the coordinator will send an abort message, when clients recieve this they will rollback the commit data.

After both of these phases the participants will answer with an akcnowledgement message to indicate they are ready for a new commit.

![Communication diagram](https://i.imgur.com/CaciI3z.png)

## Implementation

The first client that connects to the socket server will be assigned the coordinator role, the rest are participants.

When any client commits a new balance the coordinator will forward this commit to all clients with a requestVote message.
After a client reviews the commit it will either vote yes or no.

The coordinator will count the votes and if any client voted no it will send an abort message to all clients, and they will rollback their local data. If all clients voted yes the coordinator will send a success message and all clients will write this new data to the local data.

In this implementation participants only communicate with the coordinator.

## Techstack

- Javascript
- Websocket
- React

## Future work

- More testing

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
