/*

actions:
send commit
vote on commit

decide vote
inform clients

 */

export class Coordinator {
    nclient = 0;
    clientId;

    constructor(id) {
        this.clientId = id;
    }

    newClient() { this.nclient++; return this.nclient; }

    handleMessage() {
        return true;
    }

}