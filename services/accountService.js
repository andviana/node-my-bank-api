import {accountModel} from "../models/account.js";

const TARIFA_SAQUE = 1;
const TARIFA_TRANSFERENCIA = 8;


/**
 * realiza deposito em uma account
 * @param agencia
 * @param conta
 * @param valor
 * @returns {Promise<*>}
 */
const depositar = async (agencia, conta, valor) => {
    try {
        if (valor < 0)
            throw new Error('Valor informado é inválido');
        const filter = {$and: [{agencia}, {conta}]};
        const update = {$inc: {balance: valor}};
        let account = await accountModel.findOneAndUpdate(filter, update, {
            new: true,
        });
        if(!account) throw new Error('Erro ao atualizar conta');
        return account;
    } catch (e) {
        throw new Error('Erro ao realizar depósito: ' + e.message);
    }
};

/**
 * realiza saque diminuindo o balance de uma account
 * @param agencia
 * @param conta
 * @param valor
 * @param usarTarifa
 * @returns {Promise<{tarifa: number, account: *}>}
 */
const sacar = async (agencia, conta, valor, usarTarifa = true) => {
    try {
        if (valor < 0)
            throw new Error('Valor informado é inválido');
        const tarifa = usarTarifa ? TARIFA_SAQUE : 0;
        const valorComTarifa = valor + tarifa;
        const validaSaldo = await validarSaldo(agencia, conta, valorComTarifa);
        if (!validaSaldo)
            throw new Error('Saldo insuficiente para realizar esta transação');
        const filter = {$and: [{agencia}, {conta}]};
        const update = {$inc: {balance: valorComTarifa * -1}};
        const account = await accountModel.findOneAndUpdate(filter, update, {
            new: true,
        });
        return {account, tarifa};
    } catch (e) {
        throw new Error('Erro ao realizar saque: ' + e.message);
    }
};

/**
 * transferencia de valores entre balances de 02 accounts
 * considera ainda valor de tarifa
 * @param origem
 * @param destino
 * @param valor
 * @returns {Promise<{tarifa: number, debitado: *, creditado: *}|*>}
 */
const transferirSaldo = async (origem, destino, valor) => {
    try {
        const tarifa =
            origem.agencia === destino.agencia ? 0 : TARIFA_TRANSFERENCIA;
        const valorTotal = valor + tarifa;
        const debitado = await sacar(
            origem.agencia,
            origem.conta,
            valorTotal,
            false
        );
        const creditado = await depositar(destino.agencia, destino.conta, valor);
        if (!creditado || !debitado) throw new Error ('Erro ao registrar movimentação');
        return {debitado: debitado.account, creditado, tarifa};
    } catch (e) {
        throw new Error('Erro ao realizar transferencia: ' + e.message);
    }
};

/**
 * retorna todos os accounts
 * @returns {Promise<Object>}
 */
const buscarTudo = async () => {
    try {
        return await accountModel.find({});
    } catch (e) {
        throw new Error('Erro ao fazer busca por accounts: ' + e.message);
    }
}

/**
 * Retorna uma account a partir de parametros informados
 * @param conta
 * @param agencia
 * @returns {Promise<*>}
 */
const buscarConta = async (conta, agencia = null) => {
    try {
        const filter = agencia ? {$and: [{agencia}, {conta}]} : {conta};
        const account = await accountModel.findOne(filter);
        if (!account)
            throw new Error(`Conta: ${conta} ${(agencia) ? 'Agencia: ' + agencia : ''} não encontrada`);
        return account;
    } catch (e) {
        throw new Error('Erro ao buscar conta: ' + e.message);
    }
};

/**
 * realiza a busca ordenada limitando os resultados
 * @param limit
 * @param sort
 * @param id
 * @param filter
 * @returns {Promise<void>}
 */
const buscarContasLimited = async (
    limit,
    sort = {},
    id = false,
    filter = {}
) => {
    try {
        if (limit < 1)
            throw new Error('Quantidade de resultados deve ser maior que zero');
        const isId = id ? 1 : 0;
        const project = {_id: isId, agencia: 1, conta: 1, name: 1, balance: 1};
        const accounts = await accountModel
            .find(filter, project)
            .sort(sort)
            .limit(limit);
        if (!accounts) {
            throw new Error('Contas não encontradas');
        }
        return accounts;
    } catch (e) {
        throw new Error('Erro ao buscar contas: ' + e.message);
    }
};

/**
 * valida existencia de saldo para realizar operação
 * @param agencia
 * @param conta
 * @param valor
 * @returns {Promise<boolean>}
 */
const validarSaldo = async (agencia, conta, valor) => {
    try {
        const account = await buscarConta(conta, agencia);
        if (!account)
            throw new Error('Conta não localizada');
        return (account.balance - valor) >= 0;
    } catch (e) {
        throw new Error('Erro ao validar saldo: ' + e.message);
    }
};

/**
 * altera a agencia de uma account
 * @param accountList
 * @param agencia
 * @returns {Promise<{resultado: *, accountList: *}>}
 */
const transferirCliente = async (accountList, agencia) => {
    try {
        accountList = accountList.map((account) => {
            account.agencia = agencia;
            return account;
        });
        const bulkList = accountList.map((account) => {
            return {
                updateOne: {
                    filter: {_id: account._id},
                    update: {$set: {agencia}},
                },
            };
        });
        const resultado = await accountModel.bulkWrite(bulkList);
        if (!resultado)
            throw new Error('Ocorreu um errro ao tentar transferir os clientes');

        return {
            accountList,
            resultado,
        };
    } catch (e) {
        throw new Error('Erro ao transferir cliente de agencia ' + e.message);
    }
};

/**
 * remove account
 * @param agencia
 * @param conta
 * @returns {Promise<{totalContasAgenciaFinal: *, totalContasAgenciaInicio: *, account: *}>}
 */
const removerConta = async (agencia, conta) => {
    try {
        const totalContasAgenciaInicio = await getCountClientesByAgencia({
            agencia,
        });
        if (!totalContasAgenciaInicio > 0)
            throw new Error('Não foram encontradas contas para esta agência');
        const filter = {$and: [{agencia}, {conta}]};
        const account = await accountModel.findOneAndRemove(filter);
        if (!account)
            throw new Error('Conta não localizada');
        const totalContasAgenciaFinal = await getCountClientesByAgencia({
            agencia,
        });
        return {account, totalContasAgenciaInicio, totalContasAgenciaFinal};
    } catch (e) {
        throw new Error('Erro ao remover conta: ' + e.message);
    }
};

/**
 * retorna a médias dos balances de uma agencia
 * @param agencia
 * @returns {Promise<*|number>}
 */
const getAvgBalanceByAgencia = async (agencia) => {
    try {
        const match = {$match: {agencia: Number(agencia)}};
        const group = {$group: {_id: {agencia}, media: {$avg: '$balance'}}};
        const media = await accountModel.aggregate([match, group]);
        return media[0] || 0;
    } catch (e) {
        throw new Error('Erro ao calcular média de saldos da agencia: ' + e.message);
    }
};

/**
 * retorna o somatorio dos balances de uma agencia
 * @param agencia
 * @returns {Promise<*|number>}
 */
const getSumBalanceByAgencia = async (agencia) => {
    try {
        const match = {$match: {agencia: Number(agencia)}};
        const group = {$group: {_id: {agencia}, total: {$sum: '$balance'}}};
        const sum = await accountModel.aggregate([match, group]);
        return sum[0] || 0;
    } catch (e) {
        throw new Error('Erro ao calcular somatório de saldos: ' + e.message);
    }
};

/**
 * retorna o total de contas ativas em uma agencia
 * @param filter
 * @returns {Promise<*>}
 */
const getCountClientesByAgencia = async (filter) => {
    try {
        return await accountModel.countDocuments(filter);
    } catch (e) {
        throw new Error('Erro ao buscar total de contas da agência: ' + e.message);
    }
};

/**
 * retorna uma lista com o numero das agencias
 * @returns {Promise<*>}
 */
const getListDistinctAgencias = async () => {
    try {
        const lista = await accountModel.distinct('agencia');
        if (!lista)
            throw new Error('Nenhuma agencia foi localizada');
        return lista;
    } catch (e) {
        throw new Error('Erro ao buscar lista de agências: ' + e.message);
    }
};

export {
    depositar,
    sacar,
    transferirSaldo,
    buscarTudo,
    buscarConta,
    buscarContasLimited,
    validarSaldo,
    transferirCliente,
    removerConta,
    getAvgBalanceByAgencia,
    getSumBalanceByAgencia,
    getCountClientesByAgencia,
    getListDistinctAgencias,
}