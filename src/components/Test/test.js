import {CommitHandler} from "../CommitHandler";

describe("Test CommitHandler", () => {

    let commitHandler = new CommitHandler();

    test("Update balance", () => {

        let balance = 420;
        commitHandler.setBalance(balance);

        expect(commitHandler.localBalance).toEqual(balance);
    })

});