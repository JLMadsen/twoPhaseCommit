import {action} from "./action";

export class CommitParser {
    clientid;

    constructor(clientId_) {
        this.clientId = parseInt(clientId_, 10);



    }

    encodeMessage(action, content) {
        if(typeof content !== "undefined") {
            return this.clientid.toString() +'|'+ action.toString() +'|'+ content.toString();
        }
        return this.clientid.toString() +'|'+ action.toString() +'| ';
    }

    validateMessage(msg) {
        let message = msg.split('|');

        if(message.length !== 3) {
            return false;
        }
        return true;
    }

    voteYes(){return this.encodeMessage(action.vote, action.voteYes)}
    voteNo(){ return this.encodeMessage(action.vote, action.voteNo)}

    parseMessage(msg){
        let message = msg.split('|');
        let origin = message[0];
        let action = message[1];




    }


}