/*

actions:
send commit
vote on commit

 */

export class Participant {

    clientId;

    constructor(id) {
        this.clientId = id;
    }

    handleMessage() {
        return true;
    }

}