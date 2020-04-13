import {Component} from "react-simplified";
import * as React from "react";

import {action, getDesc, Vote} from "./action";
import {config} from "../config";

/*
Main class for handling the two phase commit protocol
 */

export class CommitHandler extends Component{
    websocket;

    constructor(props) {
        super(props);

        this.state = {
            // output log
            log: "",

            // visual state
            error: '',
            errorType: 'success',

            // role
            clientId: 0,
            isCoordinator: false,

            // data
            localData: 0,
            oldData: 0,
            WriteAheadLog: [],

            // communication
            isVoting: false,
            votes: [],
            amountOfClients: 0
        };

        this.websocketSetup();
    }

    websocketSetup() {
        console.log('connecting to socket');
        this.websocket = new WebSocket("ws://localhost:4001");

        this.websocket.onopen = () => {
            this.appendLog("Connected to socket");
        };

        this.websocket.onError = (err) => {
            this.appendLog("Socket error!");
            console.log(err);
        };

        this.websocket.onMessage = (event) => {
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
                    this.setState({error: "Unrecognized opcode", errorType: "warning"});
            }
            this.updateState();
        }
    }

    setBalance(bal){this.setState({localBalance: bal})}

    execCommit() {

        this.setState({isVoting: true, votes: []});
        this.setError('', 'primary');

        let commit =
            action.commit +','+
            this.state.clientId +','+
            this.state.localBalance;

        this.websocket.send(commit);
    }

    onSetup(data) {

        if(data[1] === action.newClient) {
            this.setState({amountOfClients: parseInt(data[2])});
            return;
        }

        if(data[2].includes("coordinator")) {
            this.setState({isCoordinator: true});
        }
        this.setState({clientId: parseInt(data[1])});
    }

    onCommit(data) {

        if(this.state.isCoordinator) {

            let request =
                action.requestVote +','+
                this.state.clientId  +','+
                data[2];

            this.websocket.send(request);
        }
    }

    onRequestVote(data) {

        this.setState({isVoting: true});
        let commitBalance = parseInt(data[2]);

        let WAL = this.state.writeAheadLog;
        WAL.push(commitBalance);
        this.setState({oldData: this.state.localData, localData: commitBalance, writeAheadLog: WAL});

        let vote = "";
        let ok = false;

        // check if localdata has been changed, dont overwrite unsaved changes.
        //if(this.state.localData === )

        // for testing
        if(config.alwaysTrue) {
            ok = true;
        }

        if(ok){
            vote =
                action.vote +','+
                this.state.clientId +','+
                action.voteYes;
        } else {
            vote =
                action.vote +','+
                this.state.clientId +','+
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

        let votes = this.state.votes;
        votes.push(res);
        this.setState({votes: votes});

        let successes = 0;
        for(let i=0; i<votes.length; i++){
            if(votes[i].yes){
                successes++;
            }
        }

        if(this.state.isCoordinator) {
            if(votes.length === this.state.amountOfClients) {
                if(successes === this.state.amountOfClients) {
                    this.websocket.send(action.success +','+ this.state.clientId);
                } else {
                    this.websocket.send(action.rollback +','+ this.state.clientId);
                }
            }
        }
    }

    onSuccess(data) {

        let WAL = this.state.writeAheadLog;
        let balance = WAL[WAL.length -1];
        this.setState({
            localData: balance,
            writeAheadLog: WAL
        });

        this.setState({error: "Commit successful!", errorType: "success"});
        this.resetVoteState();
    }

    onRollback(data) {

        this.setState({
            localData: this.state.oldData
        });

        this.setState({error: "Commit failed.", errorType: "danger"});
        this.resetVoteState();
    }

    resetVoteState() {
        this.setState({
            votedYes: 0,
            voted: 0,
            isVoting: false});
    }

    appendLog(content){

        if(this.state.log) {
            this.setState({log: this.state.log +"\n" + content})
        } else {
            this.setState({log: content})
        }
    }

    updateState() {
        this.props.updateState(this.state);
    }
    render() {return(<div/>);}

}