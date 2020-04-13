import {action, Vote} from "./action";
import {config} from "../config";

/*
Main class for handling the two phase commit protocol
 */

export class CommitHandler{
    websocket;

    // overridable methods
    onLog;
    onError;
    setup;
    newBalance;

    log;
    clientId;
    isCoordinator;
    localBalance;
    oldBalance;
    WriteAheadLog;
    isVoting;
    votes;
    amountOfClients;

    constructor() {
        // output log
        this.log = "";

        // role
        this.clientId = 0;
        this.isCoordinator = false;

        // data
        this.localBalance = 0;
        this.oldBalance = 0;
        this.WriteAheadLog = [];

        // communication
        this.isVoting = false;
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
                    this.onSetup(data);
                    break;
                case action.commit:
                    console.log('COMMIT: ' + data);
                    this.onCommit(data);
                    break;
                case action.requestVote:
                    console.log('REQUESTVOTE: ' + data);
                    this.onRequestVote(data);
                    break;
                case action.vote:
                    console.log('VOTE: ' + data);
                    this.onVote(data);
                    break;
                case action.success:
                    console.log('SUCCESS: ' + data);
                    this.onSuccess(data);
                    break;
                case action.rollback:
                    console.log('ROLLBACK: ' + data);
                    this.onRollback(data);
                    break;
                default:
                    if(this.onError) this.onError("Unrecognized opcode", "warning");
            }
        }
    }

    setBalance(balance){
        this.localBalance = balance;
    }

    execCommit() {

        this.isVoting = true;
        this.votes = [];
        if(this.onError) this.onError('', 'primary');

        let commit =
            action.commit +','+
            this.clientId +','+
            this.localBalance;

        this.websocket.send(commit);
    }

    onSetup(data) {

        if(data[1] === action.newClient) {
            this.amountOfClients = parseInt(data[2]);
            if(this.onSetup()) this.onSetup(parseInt(data[2]));
            return;
        }

        if(data[2].includes("coordinator")) {
            this.isCoordinator = true;
        }

        this.clientId = parseInt(data[1]);
    }

    onCommit(data) {

        if(this.isCoordinator) {

            let request =
                action.requestVote +','+
                this.clientId  +','+
                data[2];

            this.websocket.send(request);
        }
    }

    onRequestVote(data) {

        this.isVoting = true;
        let commitBalance = parseInt(data[2]);

        this.WriteAheadLog.push(commitBalance);
        this.oldBalance = this.localBalance;
        this.localBalance = commitBalance;

        let vote = "";
        let ok = false;

        if(config.alwaysTrue) {
            ok = true;
        } else {
            ok = false;
            //TODO check stuff
        }

        if(ok){
            vote =
                action.vote +','+
                this.clientId +','+
                action.voteYes;
        } else {
            vote =
                action.vote +','+
                this.clientId +','+
                action.voteNo;
        }

        // slow down system to see communication
        if(config.timedAnswer) {

            let timeout = Math.random() * (7000 - 2500) + 2500;
            setTimeout(() => {this.websocket.send(vote);}, timeout);

        } else {

            this.websocket.send(vote);
        }

    }

    onVote(data) {
        let res = new Vote();
        res.id = parseInt(data[1]);
        res.yes = (data[2] === action.voteYes);

        this.votes.push(res);
        if(this.onVote) this.onVote(this.votes);

        let successes = 0;
        for(let i=0; i<this.votes.length; i++){
            if(this.votes[i].yes){
                successes++;
            }
        }

        if(this.isCoordinator) {
            if(this.votes.length === this.amountOfClients) {
                if(successes === this.amountOfClients) {
                    this.websocket.send(action.success +','+ this.clientId);
                } else {
                    this.websocket.send(action.rollback +','+ this.clientId);
                }
            }
        }
    }

    onSuccess(data) {
        this.localBalance = this.WriteAheadLog[this.WriteAheadLog.length -1];

        if(this.onError) this.onError("Commit successful!", "success");
        this.resetVoteState();
    }

    onRollback(data) {
        this.localBalance = this.oldBalance;

        if(this.onError) this.onError("Commit failed.", "danger");
        this.resetVoteState();
    }

    resetVoteState() {
        this.votes = [];
        this.isVoting = false;

        if(this.onVote) this.onVote(this.votes);
    }

    appendLog(content){
        this.log += content + "\n";
        if(this.onLog) this.onLog(this.log);
    }
}