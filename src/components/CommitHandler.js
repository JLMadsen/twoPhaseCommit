import {action, Vote} from "./Action";
import {config} from "../config";

export class CommitHandler {
    websocket;

    // overridable methods
    onLog;
    onError;
    onSetup;
    onNewBalance;
    onPhaseChange;
    onVote;

    // log with all network packets
    log;
    clientId;

    globalBalance;
    localBalance;
    oldBalance; // holds the value while voting.
    WriteAheadLog;

    isCoordinator;
    isVoting;
    isSender; // sender does not need to compare local changes
    isFresh;  // fresh client does not need to compare local changes
    votes;
    amountOfClients;


    constructor() {
        this.log = "";
        this.clientId = 0;

        this.globalBalance = 0;
        this.localBalance = 0;
        this.oldBalance = 0;
        this.WriteAheadLog = [];

        this.isCoordinator = false;
        this.isVoting = false;
        this.isSender = false;
        this.isFresh = true;
        this.votes = [];
        this.amountOfClients = 0;
    }

    connect() {
        console.log('connecting to socket');

        this.websocket = new WebSocket("ws://localhost:4001");

        this.websocket.onopen = () => {
            this.appendLog("Connected to socket");
        };

        this.websocket.onerror = (err) => {
            this.appendLog("Socket error!");
            console.log(err);
        };

        this.websocket.onmessage = (event) => {
            let data = event.data.split(',');
            let opcode = data[0];
            this.appendLog(data);

            switch (opcode) {
                case action.setup:
                    console.log('SETUP: ' + data);
                    this.handleSetup(data);
                    break;
                case action.commit:
                    console.log('COMMIT: ' + data);
                    this.handleCommit(data);
                    break;
                case action.requestVote:
                    console.log('REQUESTVOTE: ' + data);
                    this.handleRequestVote(data);
                    break;
                case action.vote:
                    console.log('VOTE: ' + data);
                    this.handleVote(data);
                    break;
                case action.success:
                    console.log('SUCCESS: ' + data);
                    this.handleSuccess(data);
                    break;
                case action.rollback:
                    console.log('ROLLBACK: ' + data);
                    this.handleRollback(data);
                    break;
                default:
                    if(this.onError) this.onError("Unrecognized opcode", "warning");
            }
        }
    }

    resetBalance() {
        this.localBalance = this.globalBalance;
        if(this.onNewBalance) this.onNewBalance(this.localBalance)
    }

    setBalance(balance){
        this.localBalance = balance;
    }

    execCommit() {

        this.isSender = true;
        this.isVoting = true;
        this.votes = [];

        // reset visual error, could move this out
        if(this.onError) this.onError('', 'primary');

        let commit =
            action.commit +','+
            this.clientId +','+
            this.localBalance;

        this.websocket.send(commit);
    }

    handleSetup(data) {

        if(data[1] === action.newClient) {
            this.amountOfClients = parseInt(data[2]);
            if(this.onSetup) this.onSetup(this.amountOfClients, this.isCoordinator);
            return;
        }

        if(data[2].includes("coordinator")) {
            this.isCoordinator = true;
        }

        this.clientId = parseInt(data[1]);
    }

    handleCommit(data) {

        if(this.onPhaseChange) this.onPhaseChange(action.commit, parseInt(data[2]));

        if(this.isCoordinator) {

            let request =
                action.requestVote +','+
                this.clientId  +','+
                data[2];

            this.websocket.send(request);
        }
    }

    handleRequestVote(data) {

        /*console.log("Response to vote");
        console.log("local: " + this.localBalance);
        console.log("global: " + this.globalBalance);
        console.log("old: " + this.oldBalance);
        console.log("WAL: " + this.WriteAheadLog);*/

        this.isVoting = true;
        let commitBalance = parseInt(data[2]);

        this.WriteAheadLog.push(commitBalance);
        this.oldBalance = this.localBalance;
        this.localBalance = commitBalance;

        let ok = true;
        let desc;

        if(!config.alwaysTrue && !this.isSender) {
            // if client has local changes
            // this can be disabled in config
            if(!config.overwrite) {
                if(!this.isFresh) {
                    console.log(this.oldBalance !== this.globalBalance);
                    if(this.oldBalance !== this.globalBalance) {
                        ok = false;
                        desc = action.dataMismatch;
                    }
                }
            }

            // this checks if the newBalance method has been implemented
            if(config.requireWrite) {
                if (!this.onPhaseChange) {
                    ok = false;
                    desc = action.writeError;
                }
            }
        }

        let vote =
            action.vote +','+
            this.clientId +',';

        if(ok){
            vote += action.voteYes;
        } else {
            vote += action.voteNo;
        }

        // if voted no we have error message
        if(desc) vote += ","+ desc;

        // slow down system to see communication
        if(config.timedAnswer) {

            let timeout = Math.random() * (7000 - 2500) + 2500;
            setTimeout(() => {this.websocket.send(vote);}, timeout);

        } else {

            this.websocket.send(vote);
        }
    }

    handleVote(data) {
        let res = new Vote();
        res.id = parseInt(data[1]);
        res.yes = (data[2] === action.voteYes);

        this.votes.push(res);
        if(this.onVote) this.onVote(this.votes);

        console.log("isCoordinator: "+ this.isCoordinator);
        if(this.isCoordinator) {
            if(this.votes.length === this.amountOfClients) {


                let successes = 0;
                for(let i=0; i<this.votes.length; i++){
                    if(this.votes[i].yes){
                        successes++;
                    }
                }

                console.log(successes);

                if(successes === this.amountOfClients) {
                    this.websocket.send(action.success +','+ this.clientId);
                } else {
                    this.websocket.send(action.rollback +','+ this.clientId);
                }
            }
        }
    }

    handleSuccess(data) {
        this.isVoting = false;
        this.isFresh = false;
        this.localBalance = this.WriteAheadLog[this.WriteAheadLog.length -1];
        this.globalBalance = this.localBalance;

        if(this.onPhaseChange) this.onPhaseChange(action.success, this.localBalance);
        if(this.onError) this.onError("Commit successful!", "success");

        this.votes = [];
    }

    handleRollback(data) {
        this.isVoting = false;
        this.isFresh = false;
        this.localBalance = this.oldBalance;

        if(this.onPhaseChange) this.onPhaseChange(action.abort, this.oldBalance);
        if(this.onError) this.onError("Commit failed.", "danger");

        this.votes = [];
    }

    appendLog(content){
        this.log += content + "\n";
        if(this.onLog) this.onLog(this.log);
    }
}