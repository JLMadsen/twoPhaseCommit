import * as React from 'react';
import {Route, BrowserRouter} from 'react-router-dom';
import ReactDOM from 'react-dom';
import {createBrowserHistory} from "history";

import {BankPage} from "./components/BankPage";

const history = createBrowserHistory();
const root = document.getElementById('root');
if (root) {
    ReactDOM.render(
        <BrowserRouter history={history}>

            <Route exact path="/" component={BankPage}/>

        </BrowserRouter>,
        root
    );
}