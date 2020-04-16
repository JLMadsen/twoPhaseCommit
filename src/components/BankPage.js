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
import ListGroup from "react-bootstrap/ListGroup";
import {ListGroupItem} from "react-bootstrap";


import {CommitHandler, Action, Vote} from "./CommitHandler";


export class BankPage extends Component {

    commitHandler;

    constructor(props) {
        super(props);

        this.state = {
            // output log
            log: "",

            // visual state
            error: '',
            errorType: 'success',
            transactions: [],

            localBalance: 0,
            oldBalance: 0,

            amountOfClients: 0,
            isVoting: false,
            isCoordinator: false,
            votes: [],

        };

        this.commitHandler = new CommitHandler();

        this.commitHandler.onLog = (log) => {
            this.setState({log: log})
        };

        this.commitHandler.onError = (message, color) => {
            this.setError(message, color);
        };

        this.commitHandler.onSetup = (nClients, isCoordinator) => {
            this.setState({
                amountOfClients: nClients,
                isCoordinator: isCoordinator,
            });
        };

        this.commitHandler.onPhaseChange = (phase, balance) => {

            switch (phase) {
                case Action.commit:

                    this.setState({
                        isVoting: true,
                        localBalance: balance,
                        oldBalance: this.commitHandler.globalBalance
                    });
                    break;

                case Action.success:

                    // update transaction log
                    let trans = this.state.transactions;
                    let newTrans = new Transaction();
                    newTrans.id = trans.length + 1;

                    let today = new Date();
                    let time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
                    newTrans.time = time;

                    newTrans.change = balance - this.state.oldBalance;
                    newTrans.total = balance;
                    trans.push(newTrans);

                    this.setState({
                        isVoting: false,
                        localBalance: balance,
                        transactions: trans
                    });
                    break;

                case Action.rollback:

                    this.setState({
                        isVoting: false,
                        localBalance: balance,
                    });
                    break;

                default:
                    break;
            }
        };

        this.commitHandler.onVote = (votes) => {
            this.setState({votes: votes});
        };

        // start commitHandler connection after implementing methods
        this.commitHandler.connect();

    }

    handleCommit() {
        this.setState({isVoting: true});
        this.commitHandler.execCommit(this.state.localBalance);
    }

    render() {
        return(
            <Container >
                <Row className="justify-content-lg-center mt-4">
                    <Col className="col-lg-7">
                        <Card border="warning" className="p-2">
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
                                                            readOnly={!!this.state.isVoting}
                                                            type="number"
                                                            value={this.state.localBalance}
                                                            onChange={(event) => {
                                                                let newbalance = parseInt(event.target.value);
                                                                this.setState({localBalance: newbalance});
                                                                this.commitHandler.setBalance(newbalance);
                                                            }}
                                                        />

                                                        <Button
                                                            className="mt-2"
                                                            variant="success"
                                                            onClick={this.handleCommit}
                                                            disabled={!!this.state.isVoting}
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
                        <Row className="ml-0">
                            <a
                                target="_blank"
                                href={window.location.href}
                                rel="noopener noreferrer"
                            >
                                <Badge variant="secondary" className="mr-2">New session</Badge>
                            </a>
                            <a
                                target="_blank"
                                href="https://github.com/JLMadsen/twoPhaseCommit"
                                rel="noopener noreferrer"
                            >
                                <Badge variant="secondary" className="mr-2">Github</Badge>
                            </a>
                            <a>
                                <OverlayTrigger
                                    placement="right"
                                    overlay={
                                        <Tooltip>
                                            {
                                                'isVoting '+      this.state.isVoting + '\n,'+
                                                'votes '+         this.state.votes.map(e => e.yes) + '\n,'+
                                                'nClients '+      this.state.amountOfClients + '\n,'+
                                                'balance '+       this.state.localBalance  + '\n,'+
                                                'isCoordinator '+ this.state.isCoordinator
                                            }
                                        </Tooltip>
                                    }
                                >
                                    <Badge variant="secondary">State</Badge>
                                </OverlayTrigger>
                            </a>
                        </Row>
                        <Card border="warning" className="p-2 mt-1">
                            <div className="ml-2 text-center"><h1>Transaction log</h1></div>

                            <ListGroup variant="flush">

                                <ListGroupItem>
                                    <Row>
                                        <Col>#</Col>
                                        <Col>Time</Col>
                                        <Col>Total</Col>
                                        <Col>Change</Col>
                                    </Row>
                                </ListGroupItem>

                                {this.state.transactions.map(tr => {
                                    return (
                                        <ListGroupItem
                                            variant={(tr.change<0)? "danger" : "success"}
                                            key={tr.id}
                                        >
                                            <Row>
                                                <Col>{tr.id}</Col>
                                                <Col>{tr.time}</Col>
                                                <Col>{tr.total}</Col>
                                                <Col>{tr.change}</Col>
                                            </Row>
                                        </ListGroupItem>
                                    )
                                })}

                            </ListGroup>

                        </Card>
                    </Col>
                    <Col className="col-lg-4">
                        <Card border="warning" className="p-2">
                            <div className="ml-2 text-center"><h1>Network log</h1></div>

                            <Form.Control
                                readOnly
                                as="textarea"
                                rows="15"
                                controlid="networklog"
                                defaultValue={this.state.log}
                            />

                        </Card>

                        <Card border="warning" className="p-2 mt-4">
                            <div className="ml-2 text-center"><h1>Voting</h1></div>

                            { this.mapVotes().map(vote =>
                            {return(
                                        <Badge
                                            key={vote.id}
                                            className="m-1"
                                            pill
                                            variant={vote.voted? "secondary" : vote.yes? "success" : "danger"}>
                                            client {vote.id}
                                        </Badge>
                            )})}

                        </Card>

                    </Col>
                </Row>
            </Container>
        );
    }

    // fill empty votes
    mapVotes() {
        let votes = Array.from(this.state.votes);
        for(let i=0; i<this.state.amountOfClients; i++){
            if(!votes.some((e) => {return e.id === (i+1)})){
                let tempVote = new Vote();
                tempVote.id = i+1;
                tempVote.voted = true;
                votes.push(tempVote)
            }
        }
        return votes;
    }

    setError(message, variant) {
        this.setState({error: message, errorType: variant});
        if(!message) {return;}
        setTimeout(() => {
            this.setState({error: '', errorType: 'primary'});
            this.setState({votes: []});
            }, 5000);
    }
}

class Transaction {
    id;
    total;
    change;
    time;
}

/*
    "@babel/preset-env": "^7.9.5",
    "babel-jest": "^25.3.0"
    "jest": "^25.3.0",

 */