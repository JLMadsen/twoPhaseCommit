# Two Phase Commit

This project contains a react project and a [class](src/components/CommitHandler.js) for the actual two phase commit protocol.

The webpage serves as an example of how to use the class.

## Introduction

Two Phase Commit protocol is a version control based around voting. In a group of clients which have shared data and want to change it, we can commit a change. But in this case all the clients vote on each commit, if all agree on the change it will be committed, if not it will be aborted. 

we can designate one node to be a coordinator, this client is in charge of requesting votes and counting them.

The protocol has several phases, the first being an initial commit by either a participant or the coordinator.
During this phase the coordinator will request a vote on this commit from all participants.

The next phase starts when all clients have voted. Then the coordinator will count them, if all clients voted yes it will succeed, if one or more clients vote no it will fail.

Depending on the vote the coordinator will send out a success or abort message, if it succeeded all clients will write the new commit data to local storage. If the vote failed the coordinator will send an abort message, when clients receive this they will rollback the commit data.

After both of these phases the participants will answer with an acknowledgement message to indicate they are ready for a new commit.

![Communication diagram](https://i.imgur.com/8SP0Ahf.png)

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

In some cases I changed the concept and therefore I want to highlight the choices I made which may not be obvious.

- Instead direct client to client communication I use socket server which relays all messages to all other clients. In the original concept individual clients could communicate with each other, but because I chose to send it to all. I believe since this is already as system based upon voting, everyone should have access to the vote results.

- Added additional check to see if onPhaseChange is implemented. Due to how the protocol writes data we need to check if the user has implemented the method. Another way i could have done this was to write the data to a file, but i chose not to.

## Tech stack

For this implementation i chose to write in javascript since it allowed me easy usage of websocket and React.

In javascript all assignments are atomic meaning there is less chance of getting write errors when committing.

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
- more configurability
- Extra security against pretending to be coordinator and sending false success.
- Synchronize new clients with global balance.

## Api

Using default configuration
```js
let commitHandler = new CommitHandler();
```
Using custom configuration. See section below for further information about config and the default values.
```js
let commitHandler = new CommitHandler({
    host: "ws://mySocketServer.com:3000",
});
```

To handle changes there are several methods that you can implement.
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
  
  // array of votes
  // each vote contains result and client id
  // let exampleVote = {yes: true, id: 1}
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
  }
};
```
You should implement the above methods before connecting.
Socket host can be changed in config.
```js
commitHandler.connect();
```
Updating balance:
```ja
commitHandler.setBalance(balance);
```
To commit balance:
```js
commitHandler.execCommit();
```
If the config value "overwrite" is false and there have been made locale changes the client will vote no when there in an incoming commit. To reset the back to the global balance use this method.
```js
commitHandler.resetBalance();
```

## Config

| Name         	| Default               	| Description                                                             	|
|---------------|---------------------------|---------------------------------------------------------------------------|
| overwrite    	| false                 	| Client will vote yes even if there are local changes.                     |
| alwaysVoteYes | false                 	| Forces client to vote yes on all commits. Overwrites local changes 	    |
| timedAnswer  	| true                  	| Sets timeout on sending vote.                                           	|
| requireWrite 	| true                  	| Client will vote no if onPhaseChange method has not been implemented.   	|
| host         	| "ws://localhost:4001" 	| Host for socket connection.                                             	|
| timeout       | 8000                     	| Time before coordinator aborts vote.                                      |
| key*         	|                        	| Key used for P2P encryption.                                            	| 

(* Not yet implemented)

## Demo

![Demo gif](https://i.imgur.com/WQ0CmXM.gif)

## Installation
In root dir: 
```sh
npm install
```

### Client
In root dir: 
```sh
npm start
```

### Server
In server dir:
```sh
node socketServer
```
