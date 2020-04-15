// https://medium.com/@saplos123456/using-es6-import-and-export-statements-for-jest-testing-in-node-js-b20c8bd9041c
import {CommitHandler} from "../CommitHandler";

describe("Test CommitHandler", () => {

    let commitHandler = new CommitHandler();

    test("Update balance", () => {

        let balance = 420;
        commitHandler.setBalance(balance);

        expect(commitHandler.localBalance).toEqual(balance);
    });

    // TODO write test
    // TODO run socket server during test
    test("Connect to socket", () => {

        expect(true).toEqual(true);
    });

});