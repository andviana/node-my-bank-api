import {toMoney} from '../helpers/helper.js';
import * as service from '../services/accountService.js';

/**
 * Lista todas as contas do banco
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
const listAccounts = async (req, res) => {
    try {
        const accounts = await service.buscarTudo();
        if (!accounts) {
            res.status(404).send({errorMessage: 'Contas não localizadas'});
        }
        res.send(accounts);
    } catch (e) {
        res.status(500).send({error: e.message});
    }
};

/**
 * realiza a busca pelo numero da conta e/ou agencia
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
const findAccount = async (req, res) => {
    try {
        const {conta} = req.params;
        const account = await service.buscarConta(conta);
        if (!account) {
            res.status(404).send({errorMessage: `Conta ${conta} não localizada`});
        }
        res.send(account);
    } catch (e) {
        res.status(500).send({error: e.message});
    }
};

/**
 * realiza deposito em uma conta
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
const realizarDeposito = async (req, res) => {
    try {
        const {agencia, conta, valor} = req.body;
        const account = await service.depositar(agencia, conta, valor);
        if (!account) {
            res.status(404).send({errorMessage: `Conta ${conta} não localizada`});
        }
        res.status(200).send({
            mensagem: 'Depósito realizado com sucesso!',
            valorDeposito: toMoney(valor),
            saldoAnterior: toMoney(account.balance - valor),
            conta: conta,
            agencia: agencia,
            nome: account.name,
            saldoAtual: toMoney(account.balance),
        });
    } catch (e) {
        res.status(500).send({error: e.message});
    }
};

/**
 * realiza saque de uma conta
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
const realizarSaque = async (req, res) => {
    try {
        const {agencia, conta, valor} = req.body;
        const comprovante = await service.sacar(agencia, conta, valor);
        if (!comprovante) {
            res.status(404).send({errorMessage: `Conta ${conta} não localizada`});
        }
        const {account, tarifa} = comprovante;
        const {name: nome, balance: saldoAtual} = account;
        const retorno = {
            mensagem: 'Saque realizado com sucesso!',
            conta,
            agencia,
            nome,
            saldoAnterior: toMoney(saldoAtual + valor + tarifa),
            valorSaque: toMoney(valor),
            tarifa: toMoney(tarifa),
            saldoAtual: toMoney(saldoAtual),
        }
        res.status(200).send(retorno);
    } catch (e) {
        res.status(500).send({error: e.message});
    }
};

/**
 * realiza a transferencia de valores entre contas
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
const realizarTransferencia = async (req, res) => {
    try {
        const {contaOrigem, contaDestino, valor} = req.body;
        const origem = await service.buscarConta(contaOrigem);
        const destino = await service.buscarConta(contaDestino);
        if (!destino || !origem) {
            res
                .status(404)
                .send({errorMessage: 'Um das contas não foi localizada'});
            return;
        }
        const transferencia = await service.transferirSaldo(origem, destino, valor);
        if (!transferencia) {
            res
                .status(500)
                .send({errorMessage: `Ocorreu um erro ao realizar a transferencia`});
            return;
        }
        const {debitado, creditado, tarifa} = transferencia;
        res.status(200).send({
            detalhes: {
                mensagem: 'Transferência realizada com sucesso!',
                contaDestino: {
                    nome: creditado.name,
                    conta: creditado.conta,
                    agencia: creditado.agencia,
                    saldoAtual: toMoney(creditado.balance),
                },
                valorTransferencia: toMoney(valor),
                tarifa: toMoney(tarifa),
                totalDebitadoOrigem: toMoney(valor + tarifa),
                totalCreditadoDestino: toMoney(valor),
            },
            contaOrigem: {
                nome: debitado.name,
                conta: debitado.conta,
                agencia: debitado.agencia,
                saldoAtual: toMoney(debitado.balance),
            },
        });
    } catch (e) {
        res.status(500).send({error: e.message});
    }
};

/**
 * Consultar saldo de uma conta informadas
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
const consultarSaldo = async (req, res) => {
    try {
        const {agencia, conta} = req.params;
        const account = await service.buscarConta(conta, agencia);
        const {name: nome, balance: saldo} = account;
        res.status(200).send({
            nome,
            conta,
            agencia,
            saldoAtual: toMoney(saldo),
        });
    } catch (e) {
        res.status(500).send({error: e.message});
    }
};

/**
 * retorna dados de somatorio, media de saldos e qtd
 * de contas da agencia informada
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
const agenciaInfo = async (req, res) => {
    try {
        const {agencia} = req.params;
        const media = await service.getAvgBalanceByAgencia(agencia);
        const somatorio = await service.getSumBalanceByAgencia(agencia);
        const totalClientes = await service.getCountClientesByAgencia({agencia});
        res.send({
            agencia,
            totalClientes: totalClientes,
            SomatorioSaldosClientes: toMoney(somatorio.total),
            MediaSaldosCliente: toMoney(media.media),
        });
    } catch (e) {
        res.status(500).send({error: e.message});
    }
};

/**
 * consulta asa agencias de menores saldos em ordem crescente de saldo
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
const consultarMenoresSaldos = async (req, res) => {
    try {
        const limit = Number(req.params.limit);
        const sort = {balance: 1};
        let accounts = await service.buscarContasLimited(limit, sort);
        accounts = accounts.map((account) => {
            const {agencia, conta, name, balance} = account;
            return {agencia, conta, nome: name, saldo: toMoney(balance)};
        });
        res.send(accounts);
    } catch (e) {
        res.status(500).send({error: e.message});
    }
};

/**
 * consulta agencias de maiores saldos em ordem decrescente de saldo
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
const consultarMaioresSaldos = async (req, res) => {
    try {
        const limit = Number(req.params.limit);
        const sort = {balance: -1, name: 1};
        let accounts = await service.buscarContasLimited(limit, sort);
        accounts = accounts.map((account) => {
            const {agencia, conta, name, balance} = account;
            return {agencia, conta, nome: name, saldo: toMoney(balance)};
        });
        res.send(accounts);
    } catch (e) {
        res.status(500).send({error: e.message});
    }
};

/**
 * realiza a transferencia dos cliente
 * com maior saldo para a agencia prime 99
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
const transferirClientesPrime = async (req, res) => {
    try {
        let agencias = await service.getListDistinctAgencias();
        agencias = agencias.filter((agencia) => agencia !== 99);
        const primeList = [];
        const originList = [];
        const sort = {balance: -1, name: 1};
        for (const agencia of agencias) {
            const cliente = await service.buscarContasLimited(1, sort, true, {agencia});
            const {_id, conta, name, balance} = cliente[0];
            const dados = {_id, conta, agencia, name, balance: toMoney(balance)};
            primeList.push(Object.assign({}, dados));
            originList.push(Object.assign({}, dados));
        }
        const comprovante = await service.transferirCliente(primeList, 99);
        const {accountList, resultado} = comprovante
        res.send({listaOriginal: originList, listaAtualizada: accountList, resultado});
    } catch (e) {
        res.status(500).send({error: e.message});
    }
};

/**
 * exclui conta passada nos parametros
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
const excluirConta = async (req, res) => {
    try {
        const {agencia, conta} = req.body;
        const resultado = await service.removerConta(agencia, conta);
        const {
            account,
            totalContasAgenciaInicio,
            totalContasAgenciaFinal,
        } = resultado;
        const {name: nome, balance} = account;
        res.status(200).send({
            detalhes: {
                mensagem: 'conta excluida com sucesso!',
                totalContasAgenciaInicio,
                totalContasAgenciaFinal,
                conta,
                agencia,
                nome,
                saldo: toMoney(balance),
            },
            contasAtivasAgencia: totalContasAgenciaFinal
        });
    } catch (e) {
        res.status(500).send({error: e.message});
    }
};

export {
    listAccounts,
    findAccount,
    realizarDeposito,
    realizarSaque,
    realizarTransferencia,
    consultarSaldo,
    agenciaInfo,
    consultarMenoresSaldos,
    consultarMaioresSaldos,
    transferirClientesPrime,
    excluirConta,
};
