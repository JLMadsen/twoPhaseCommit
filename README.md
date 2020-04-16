# Two Phase Commit - 2PC

This project contains a react page and a class for the actual two phase commit protocol.

The webpage serves as an example of how to use the class.

## Introduction

Two Phase Commit protocol is a version control based around voting. In a group of clients which have shared data and want to change it, we can commit a change. But in this case all the clients vote on each commit, if all agree on the change it will be commited, if not it will be aborted. 

we can designate one node to be a coordinator, this client is in charge of requesting votes and counting them.

The protocal has several phases, the first being an initial commit by either a participant or the coordinator.
During this phase the coordinator will request a vote on this commit from all participants.

The next phase starts when all clients have voted. Then the coordinator will count them, if all clients voted yes it will succeed, if one or more clients vote no it will fail.

Depeding on the vote the coordinator will send out a success or abort message, if it succeeded all clients will write the new commit data to local storage. If the vote failed the coordinator will send an abort message, when clients recieve this they will rollback the commit data.

After both of these phases the participants will answer with an akcnowledgement message to indicate they are ready for a new commit.

![Communication diagram](https://i.imgur.com/0UsgsfH.png)

## Implementation

This implementation is based around a simple web bank. We have one account with a balance, we can change this balance and commit it.

For the communication I use a socket server, this acts as an intermediate for designating a coordinator and keeping count of clients. It also sends an echo of all incoming messages to all clients.

The first client that connects to the socket server will be assigned the coordinator role, the rest are participants.

When any client commits a new balance the coordinator will forward this commit to all clients with a requestVote message.
After a client reviews the commit it will either vote yes or no.

The coordinator will count the votes and if any client voted no it will send an abort message to all clients, and they will rollback their local data. If all clients voted yes the coordinator will send a success message and all clients will write this new data to the local data.

### Features

- Commit a new balance to the account
- Send commit to other clients
- Live voting
- Full network log

### Choices

In some cases I changed the concept and therefore I want to highlight the choices I made.

- Instead direct client to client communication I use socket server which relays all messages to all other clients. In the original concept individual clients could communicate with each other, but because I chose to send it to all. I believe since this is already as system based upon voting, everyone should have access to the vote results.

## Techstack

### Two phase commit protocol

- Javascript
- Websocket
- Node

### Webpage

- React
- React Simplified
- Bootstrap

## Future work

- Testing
  - Test connection
  - Test commit
  - Test vote yes/no
  - Test success/abort
  - Test store/rollback
- P2P encryption?
- Less name ambiguity
- more configurability

## Code example

Using default configuration
```js
let commitHandler = new CommitHandler();
```
Using custom configuration, see section below for further information about config.
```js
let commitHandler = new CommitHandler({
    host: "ws://mySocketServer.com:3000",
});
```

To handle changes coming there are several methods that you can implement.
```js
commitHandler.onLog = (log) => {

  // log contains whole network log
};

commitHandler.onError = (message, color) => {

  // message contains error message
  // color is based on bootstrap colors such as "success" and "danger"
};

commitHandler.onSetup = (nClients, isCoordinator) => {

  // method for getting general data
  // nClients is the amount of connected clients
  // isCoordinator is a bool
};

commitHandler.onVote = (votes) => {
  
  // votes is a list
  // example vote
  // vote = {yes: true, id: 1}
};

commitHandler.onPhaseChange = (phase, balance) => {
  // phase is an action object which is defined in components folder
  // if we have a bool isVoting and a account we can change this here.
  
  switch (phase) {
    case action.commit:
    
      isVoting = true;
      // do stuff ...
      
    case action.success:
   
      isVoting = false;
      account.balance = balance;
      // do stuff ...
      
    case action.rollback:
    
      isVoting = false;
      // do stuff ...
};
```
You should implement the above methods before connecting.
```js
commitHandler.connect();
```
To commit balance:
```js
commitHandler.setBalance(balance);
commitHandler.execCommit();
```
If the config value "overwrite" is false and there have been made locale changes the client will vote no when there in an incoming commit. To reset the back to the global balance use this method.
```js
commitHandler.resetBalance();
```

## Config

| Name         	| Default               	| Description                                                             	|   	|
|--------------	|-----------------------	|-------------------------------------------------------------------------	|---	|
| overwrite    	| false                 	| Client will vote no if there are local changes.                         	|   	|
| alwaysVoteYes   	| false                 	| Forces client to vote yes on all commits. Also overwrites local changes 	|   	|
| timedAnswer  	| true                  	| Sets timeout on sending vote.                                           	|   	|
| requireWrite 	| true                  	| Client will vote no if onPhaseChange method has not been implemented.   	|   	|
| host         	| "ws://localhost:4001" 	| Host for socket connection.                                             	|   	|

## Demo

![Demo gif](https://i.imgur.com/Yt2bqYl.gif)

## Installasion and usage
In root dir: 
`npm install`

### Client
In root dir: 
`npm start`

### Server
In server dir:
`node socketServer`