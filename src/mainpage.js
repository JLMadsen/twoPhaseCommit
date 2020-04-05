import {Component} from "react-simplified";
import * as React from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import {Participant} from "./components/participant";
import {Coordinator} from "./components/coordinator";
import {CommitParser} from "./components/commitparser";
import {action} from "./components/action";

let ws;
let role;
let parser;

export class MainPage extends Component {

    constructor(props) {
        super(props);

        this.state = {
            log: "",
            localVersion: "",
            globalVersion: "",
            isVoting: false,
            role: "placeholder"


        };

        console.log('connecting to socket');
        ws = new WebSocket("ws://localhost:4001");

        ws.onmessage = (event) => {
            let content = event.data;
            this.appendLog(content);

            if(content.includes(" |@")){
                if(content.includes("participant")) {
                    role = new Participant();
                } else {
                    role = new Coordinator();
                }
                parser = new CommitParser(content.split(',')[0]);
            } else {
                role.handleMessage(content);
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
                            <div className="ml-2 text-center"><h1>Document</h1></div>

                            <Form.Control
                                as="textarea"
                                rows="20"
                                controlid="localver"
                                defaultValue={this.state.localVersion}
                            />

                            <Button
                            className="m-3"
                            variant="success"
                            onClick={this.handleCommit}
                            disabled={this.state.isVoting}
                            >
                                Commit

                                {this.state.isVoting?
                                        <Spinner
                                            className="mr-2"
                                            as="span"
                                            animation="border"
                                            size="sm"
                                            role="status"
                                            aria-hidden="true"/> : <div/>}

                            </Button>

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

    handleCommit(){
        ws.send(parser.encodeMessage(action.commit, this.state.localVersion))
    }


}