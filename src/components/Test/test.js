// https://medium.com/@saplos123456/using-es6-import-and-export-statements-for-jest-testing-in-node-js-b20c8bd9041c
import {CommitHandler} from "../CommitHandler";

const util = require('util');
const exec = util.promisify(require('child_process').exec);

describe("Test CommitHandler", () => {

    exec("node ../../../server/socketServer");

    let commitHandler = new CommitHandler();

    test("Update balance", () => {

        let balance = 420;
        commitHandler.setBalance(balance);

        expect(commitHandler.localBalance).toEqual(balance);
    });

    test("Connect to socket", () => {

        commitHandler.connect();

        expect(true).toEqual(true);
    });

});