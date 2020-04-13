import {Component} from "react-simplified";
import {CommitHandler} from "./commitHandler";
import {BankPage2} from "./BankPage2";
import React from "react";

export class BankParent extends Component {

    constructor(props) {
        super(props);

        this.state = {

        };
    }

    render() {
        return(
            <div>
                <BankPage2 state={this.state}/>
                <CommitHandler state={this.state}/>
            </div>
        )
    }
}