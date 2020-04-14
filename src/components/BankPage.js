import {Component} from "react-simplified";
import * as React from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import Badge from "react-bootstrap/Badge";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import Alert from "react-bootstrap/Alert";

import {config} from "../config";
import {action, Vote} from "./action";

let ws;
let cardBorder = "warning";

export class BankPage extends Component {

    constructor(props) {
        super(props);

        this.state = {
            // output log
            log: "",

            // versions
            localBalance: 0, // data in input
            globalBalance: 0, // data from last commit
            oldBalance: 0, // holder data when evaluating commit
            writeAheadLog: [],

            // status
            isVoting: false,
            isNew: true, // if a new client connects we cannot compare localdata and globaldata
            isSender: false, // sender should not compare data
            votes: [],

            // role
            clientId: 0,
            isCoordinator: false,

            // visual state
            error: '',
            errorType: 'success',

            // debug
            lastVote: ""
        };

        console.log('connecting to socket');
        ws = new WebSocket("ws://localhost:4001");

        var commitHandler = new Commithandler();



        ws.onmessage = (event) => {
            let content = event.data.split(',');
            this.appendLog(content);
            let opcode = content[0];
            let WAL = this.state.writeAheadLog;

            switch (opcode) {
                case action.setup:
                    console.log('switch - setup');

                    if(content[1] === action.newClient) {
                        this.setState({amountOfClients: parseInt(content[2])});
                        break;
                    }

                    if(content[2].includes("coordinator")) {
                        this.setState({isCoordinator: true});
                    }
                    this.setState({clientId: parseInt(content[1])});

                    break;
                case action.commit:
                    console.log('switch - commit');

                    if(this.state.isCoordinator) {

                        let request =
                            action.requestVote +','+
                            this.state.clientId  +','+
                            content[2];

                        ws.send(request);
                    }

                    break;
                case action.requestVote:
                    console.log('switch - requestVote');
                    // evaluate commit

                    this.setState({isVoting: true});
                    let commitBalance = parseInt(content[2]);
                    WAL.push(commitBalance);
                    this.setState({oldbalance: this.state.localBalance, localBalance: commitBalance});

                    let vote = "";
                    let ok = false;
                    let desc = "";

                    if(config.alwaysTrue || this.state.isSender) {
                        ok = true;
                    } else {

                        let local = this.state.oldBalance;
                        let global = this.state.globalBalance;

                        console.log(local !== global);

                        if(local !== global) {
                            ok = false;
                            desc = action.dataMismatch;
                        } else {
                            ok = true;
                        }
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

                    if(desc) vote += "\n" + desc;

                    if(config.timedAnswer) {
                        // slow down system to see communication
                        let timeout = Math.random() * (7000 - 2500) + 2500;
                        setTimeout(() => {
                            ws.send(vote);
                        }, timeout);
                    } else {
                        ws.send(vote);
                    }

                    break;
                case action.vote:
                    console.log('switch - vote');

                    let res = new Vote;
                    res.id = parseInt(content[1]);
                    res.yes = (content[2] === action.voteYes);

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
                                ws.send(action.success +','+ this.state.clientId);
                            } else {
                                ws.send(action.rollback +','+ this.state.clientId);
                            }
                        }
                    }

                    break;
                case action.success:
                    console.log('switch - success');

                    let balance = WAL[WAL.length -1];
                    this.setState({
                            localBalance: balance,
                            globalBalance: balance,
                            isSender: false,
                            isNew: false,
                        });

                    this.resetVoteState();
                    this.setError('Commit successful!', 'success');

                    break;
                case action.rollback:
                    console.log('switch - rollback');

                    this.setState({
                        localBalance: this.state.globalBalance,
                        isSender: false,
                    });

                    this.resetVoteState();
                    this.setError('Commit aborted!', 'danger');

                    break;
                default:
                    console.log('switch - default');

            }
        };

        ws.onopen = () => {
            this.appendLog("Connected to socket");
        };

        ws.onerror = (err) => {
            this.appendLog("Socket error!");
        };
    }

    handleCommit(){
        this.setState({isVoting: true, votes: [], isSender: true});
        this.setError('', 'primary');

        let commit =
            action.commit +','+
            this.state.clientId +','+
            this.state.localBalance;

        ws.send(commit);
    }

    /*

    All code under here is only for visuals and not necessary for the two phase commit protocol.

     */

    render() {
        return(
            <Container >
                <Row className="justify-content-lg-center mt-4">
                    <Col className="col-lg-7">
                        <Card border={cardBorder} className="p-2">
                            <div className="ml-2 text-center"><h1>Two Phase Commit Protocol</h1></div>

                            {(this.state.error) ?
                                <Alert style={{height: '3em'}} variant={this.state.errorType}>{this.state.error}</Alert> :
                                <div style={{height: '3em'}}/>}

                            <div className="bankers">

                                <Container className="justify-content-lg-center" style={{marginTop: "38%", width: "40%"}}>
                                    <Row>
                                        <Col>
                                            <Card className="p-2">
                                                <Form>
                                                    <div className="text-center">
                                                        <Form.Label>Account balance</Form.Label>
                                                        <Form.Control
                                                            readOnly={this.state.isVoting? true: false}
                                                            type="number"
                                                            value={this.state.localBalance}
                                                            onChange={(event) => {this.setState({localBalance: event.target.value});}}
                                                        />

                                                        <Row className="ml-2">
                                                            <Button
                                                                className="mt-2 mr-2"
                                                                variant="danger"
                                                                disabled={this.state.isVoting}
                                                                onClick={this.resetBalance}>
                                                                reset
                                                            </Button>

                                                            <Button
                                                                className="mt-2"
                                                                variant="success"
                                                                onClick={this.handleCommit}
                                                                disabled={this.state.isVoting}
                                                            >
                                                                Commit

                                                                {this.state.isVoting?
                                                                    <Spinner
                                                                        className="ml-2"
                                                                        as="span"
                                                                        animation="border"
                                                                        size="sm"
                                                                        role="status"
                                                                        aria-hidden="true"/> : <div/>}

                                                            </Button>
                                                        </Row>


                                                    </div>
                                                </Form>
                                            </Card>
                                        </Col>
                                    </Row>
                                </Container>
                            </div>
                        </Card>
                        <OverlayTrigger
                            placement="right"
                            overlay={
                                <Tooltip>
                                    {
                                        'isVoting '+ this.state.isVoting + '\n '+
                                        ',votes '+    this.state.votes.map(v => v.yes).toString() + '\n '+
                                        ',isCoordinator '+    this.state.isCoordinator + '\n '+
                                        ',nClients '+    this.state.amountOfClients + '\n '+
                                        ',balance '+    this.state.localBalance
                                    }
                                </Tooltip>
                            }
                        >
                            <Badge variant="secondary">State</Badge>
                        </OverlayTrigger>
                    </Col>
                    <Col className="col-lg-4">
                        <Card border={cardBorder} className="p-2">
                            <div className="ml-2 text-center"><h1>Network log</h1></div>

                            <Form.Control
                                readOnly
                                as="textarea"
                                rows="15"
                                controlid="networklog"
                                defaultValue={this.state.log}
                            />

                        </Card>

                        <Card border={cardBorder} className="p-2 mt-4">
                            <div className="ml-2 text-center"><h1>Voting</h1></div>

                            { this.mapVotes().map(vote =>
                            {return(
                                        <Badge
                                            className="m-1"
                                            pill
                                            variant={vote.temp? "secondary" : vote.yes? "success" : "danger"}>
                                            client {vote.id}
                                        </Badge>
                            )})}

                        </Card>

                    </Col>
                </Row>
            </Container>
        );
    }

    appendLog(content){
        if(this.state.log) {
            this.setState({log: this.state.log +"\n" + content})
        } else {
            this.setState({log: content})
        }
    }

    resetVoteState() {
        this.setState({
            votedYes: 0,
            voted: 0,
            isVoting: false});
    }

    // fill empty votes aswell
    mapVotes() {
        let votes = Array.from(this.state.votes);
        for(let i=0; i<this.state.amountOfClients; i++){
            if(!votes.some((e) => {return e.id === (i+1)})){
                let tempVote = new Vote();
                tempVote.id = i+1;
                tempVote.temp = true;
                votes.push(tempVote)
            }
        }
        return votes;
    }

    setError(message, variant) {
        this.setState({error: message, errorType: variant});
        if(!message) {return;}
        setTimeout(() => {this.setState({error: '', errorType: 'primary'}); this.setState({votes: []});}, 5000);
    }

    resetBalance() {
        this.setState({localBalance: this.state.globalBalance});
    }
}