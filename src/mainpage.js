import {Component} from "react-simplified";
import * as React from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import {action, getDesc} from "./components/action";
import Badge from "react-bootstrap/Badge";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

let ws;
let parser;

export class MainPage extends Component {

    constructor(props) {
        super(props);

        this.state = {
            // output log
            log: "",

            // versions
            localBalance: 0,
            writeAheadLog: [],
            transactions: [],

            // status
            isVoting: false,
            voted: 0,
            votedYes: 0,

            // role
            clientId: 0,
            isCoordinator: false,
            amountOfClients: 0,
        };

        console.log('connecting to socket');
        ws = new WebSocket("ws://localhost:4001");

        ws.onmessage = (event) => {
            let content = event.data.split(',');
            this.appendLog(content);
            let opcode = parseInt(content[0]);
            let WAL = this.state.writeAheadLog;

            switch (opcode) {
                case action.setup:
                    console.log('switch - setup');

                    if(parseInt(content[1]) === action.newClient) {
                        this.setState({amountOfClients: parseInt(content[2])});
                    }

                    if(content[2].includes("coordinator")) {
                        this.setState({clientId: parseInt(content[1]), isCoordinator: true});
                    }

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

                    let vote = "";
                    let ok = true;

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
                    let timeout = Math.random() * (7000 - 2500) + 2500;
                    setTimeout(() => {ws.send(vote);}, timeout);

                    break;
                case action.vote:
                    console.log('switch - vote');

                    this.setState({voted: this.state.voted + 1});
                    let votedYes = parseInt(content[2]) === action.voteYes;

                    if(votedYes) {
                        this.setState({votedYes: this.state.votedYes +1});
                    }

                    if(this.state.isCoordinator) {
                        if(this.state.voted === this.state.amountOfClients) {
                            if(this.state.votedYes === this.state.amountOfClients) {
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
                            votedYes: 0,
                            voted: 0,
                            isVoting: false
                        });

                    break;
                case action.rollback:
                    console.log('switch - rollback');

                    this.setState({
                        votedYes: 0,
                        voted: 0,
                        isVoting: false
                    });

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

    render() {
        return(
            <Container >
                <Row className="justify-content-lg-center mt-4">
                    <Col className="col-lg-7">
                        <Card border="danger" className="p-2">
                            <div className="ml-2 text-center"><h1>Two Phase Commit Protocol</h1>

                                <OverlayTrigger
                                    placement="right"
                                    overlay={
                                        <Tooltip>
                                            {
                                                'isVoting '+ this.state.isVoting + '\n '+
                                                'voted '+     this.state.voted + '\n '+
                                                'votedYes '+     this.state.votedYes + '\n '+
                                                'isCoordinator '+    this.state.isCoordinator + '\n '+
                                                'nClients '+    this.state.amountOfClients + '\n '+
                                                'balance '+    this.state.localBalance
                                            }
                                        </Tooltip>
                                    }
                                >
                                    <Badge variant="secondary">State</Badge>
                                </OverlayTrigger>

                            </div>

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
                                                            placeholder={this.state.localBalance}
                                                            onChange={(event) => {this.setState({localBalance: event.target.value});}}
                                                        />

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

                                                    </div>
                                                </Form>
                                            </Card>
                                        </Col>
                                    </Row>
                                </Container>
                            </div>
                        </Card>
                    </Col>
                    <Col className="col-lg-4">
                        <Card border="danger" className="p-2">
                            <div className="ml-2 text-center"><h1>Network log</h1></div>

                            <Form.Control
                                readOnly
                                as="textarea"
                                rows="15"
                                controlid="networklog"
                                defaultValue={this.state.log}
                            />

                        </Card>

                        <Card border="danger" className="p-2 mt-4">
                            <div className="ml-2 text-center"><h1>Voting</h1></div>

                            { this.mapVotes().map(vote => {return <Badge className="m-1" pill variant={vote? "success" : "danger"}>{vote? "yes": "no"}</Badge>}) }

                        </Card>

                    </Col>
                </Row>
            </Container>
        );
    }

    appendLog(content){
        let output = "";

        for(let i=0; i<content.length; i++) {
            output += getDesc(content[i]) +', ';
        }

        if(this.state.log) {
            this.setState({log: this.state.log +"\n" + output})
        } else {
            this.setState({log: output})
        }
    }

    async handleCommit(){
        this.setState({isVoting: true});

        let commit =
            action.commit +','+
            this.state.clientId +','+
            this.state.localBalance;

        ws.send(commit);
    }

    mapVotes() {
        let clients = [];
        for(let i=0; i<this.state.amountOfClients; i++){
            if(i<this.state.votedYes){
                clients.push(true);
            } else {
                clients.push(false);
            }
        }
        return clients;
    }
}