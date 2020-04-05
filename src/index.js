import * as React from 'react';
import {Route, BrowserRouter} from 'react-router-dom';
import ReactDOM from 'react-dom';
import {createBrowserHistory} from "history";

import {MainPage} from "./mainpage";

const history = createBrowserHistory();
const root = document.getElementById('root');
if (root) {
    ReactDOM.render(
        <BrowserRouter history={history}>

            <Route path="/" component={MainPage}/>

        </BrowserRouter>,
        root
    );
}