import {CommitHandler} from "../CommitHandler";

describe("Connect to socket", () => {

    let commitHandler = new CommitHandler();

    test("should connect", () => {

        commitHandler.connect();

    })

});