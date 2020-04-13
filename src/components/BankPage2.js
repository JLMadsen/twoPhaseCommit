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

import {Vote} from "./action";
import {CommitHandler} from "./commitHandler";

export class BankPage2 extends Component {

    commitHandler;

    constructor(props) {
        super(props);

        this.state = {
            // output log
            log: "",

            // visual state
            error: '',
            errorType: 'success',

            localBalance: 0,
            amountOfClients: 0,
            isVoting: false,
            votes: [],

        };

        this.commitHandler = new CommitHandler();

        this.commitHandler.onLog = (log) => {
            console.log("onLog " + log);
            this.setState({log: log})
        };

        this.commitHandler.onError = (message, color) => {
            console.log("onError " + message +" "+ color);
            this.setError(message, color);
        };

        this.commitHandler.setup = (nClients) => {
            console.log("setup "+ nClients);
            this.setState({amountOfClients: nClients});
        };

        this.commitHandler.newBalance = (balance) => {
            console.log("newBalance " + balance);
            this.setState({
                localBalance: balance,
                isVoting: false,
            });
        };

        this.commitHandler.onVote = (votes) => {
            this.setState({votes: votes});
        };

        this.commitHandler.connect();

    }

    handleCommit() {
        this.setState({isVoting: true});
        let balance = this.state.localBalance;
        this.commitHandler.execCommit(balance);
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
                                                            readOnly={this.state.isVoting? true: false}
                                                            type="number"
                                                            placeholder={this.state.localBalance}
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
                        <OverlayTrigger
                            placement="right"
                            overlay={
                                <Tooltip>
                                    {
                                        'isVoting '+ this.state.isVoting + '\n '+
                                        'votes '+    this.state.votes + '\n '+
                                        'nClients '+    this.state.amountOfClients + '\n '+
                                        'balance '+    this.state.localBalance
                                    }
                                </Tooltip>
                            }
                        >
                            <Badge variant="secondary">State</Badge>
                        </OverlayTrigger>
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

    // fill empty votes
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
}