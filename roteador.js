const express = require('express');
const { 
    listarProdutos,
    detalharCarrinho,
    adicionarProduto,
    editarQuantidadeProduto,
    excluirProduto,
    limparCarrinho,
    finalizarCompra } = require('./controladores/checkout');

const roteador = express();

roteador.get("/produtos", listarProdutos);
roteador.get("/carrinho", detalharCarrinho);
roteador.post("/carrinho/produtos", adicionarProduto);
roteador.patch("/carrinho/produtos/:idProduto", editarQuantidadeProduto);
roteador.delete("/carrinho/produtos/:idProduto", excluirProduto);
roteador.delete("/carrinho", limparCarrinho);
roteador.post("/carrinho/finalizar-compra", finalizarCompra);

module.exports = roteador;