import * as React from 'react';
import {Route, BrowserRouter} from 'react-router-dom';
import ReactDOM from 'react-dom';
import {createBrowserHistory} from "history";

import {BankPage2} from "./components/BankPage2";

const history = createBrowserHistory();
const root = document.getElementById('root');
if (root) {
    ReactDOM.render(
        <BrowserRouter history={history}>

            <Route exact path="/" component={BankPage2}/>

        </BrowserRouter>,
        root
    );
}