import express from 'express';
import * as controller from '../controllers/accountsController.js';

const app = express();

app.get('/accounts', controller.listAccounts);
app.get('/accounts/:conta', controller.findAccount);
app.patch('/deposito', controller.realizarDeposito);
app.patch('/saque', controller.realizarSaque);
app.patch('/transferencia', controller.realizarTransferencia);
app.get('/saldo/:agencia/:conta', controller.consultarSaldo);
app.get('/agencia/info/:agencia', controller.agenciaInfo);
app.get('/agencia/menores_saldos/:limit', controller.consultarMenoresSaldos);
app.get('/agencia/maiores_saldos/:limit', controller.consultarMaioresSaldos);
app.patch('/transferencia/clientes_prime', controller.transferirClientesPrime);
app.delete('/excluir/conta/', controller.excluirConta);

export {app as accountsRouter};
