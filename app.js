import {connectDataBase} from './db/connection.js';
import express from 'express';
import {accountsRouter} from './routes/accountsRouter.js';

const app = express();

const startApi = () => {
    app.use(express.json());
    app.use(accountsRouter);
    app.listen(3000, () => console.log('server started on port: 3000'));
};

// Conect Mongo Atlas
connectDataBase();
// Start API Server
startApi();
