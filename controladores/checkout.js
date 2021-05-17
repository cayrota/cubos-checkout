const { addBusinessDays } = require('date-fns')
const estoqueObject = require('../data.json');
const estoque = estoqueObject.produtos;
const produtosEmEstoque = estoque.filter(produto => produto.estoque > 0);
const produtosCarrinho = [];
const carrinho = {
    subtotal: 0,
    dataDeEntrega: null,
    valorDoFrete: 0,
    totalAPagar: 0,
    produtos: produtosCarrinho,
};

function mensagem(mensagem) {
    return { mensagem: mensagem };
}

function atualizarCarrinho() {
    if (produtosCarrinho.length > 0) {
        const subtotalCarrinho = carrinho.produtos.map(produto => produto.quantidade * produto.preco).reduce((acc, cur) => acc + cur);
        carrinho.subtotal = subtotalCarrinho;
        carrinho.dataDeEntrega = addBusinessDays(new Date(), 15);
        carrinho.valorDoFrete = subtotalCarrinho > 20000 ? 0 : 5000;
        carrinho.totalAPagar = carrinho.subtotal + carrinho.valorDoFrete;
    } else {
        carrinho.subtotal = 0;
        carrinho.dataDeEntrega = null;
        carrinho.valorDoFrete = 0;
        carrinho.totalAPagar = 0;
    };
};

function verficarProdutoJaAdicionado(id) {
    const produtoJaAdd = produtosCarrinho.find(produto => produto.id === id);
    if (produtoJaAdd) {
        return produtoJaAdd.quantidade;
    } else {
        return false;
    }
}

function editarQuantidade(id, qtd) {
    const i = produtosCarrinho.findIndex(produto => produto.id === id);
    produtosCarrinho[i].quantidade += qtd;
}

function limparProduto(id) {
    const i = produtosCarrinho.findIndex(produto => produto.id === id);
    produtosCarrinho.splice(i, 1)
}

function produtoEmEstoque(id) {
    if (!produtosEmEstoque.find(produto => produto.id === id)) {
        return 0;
    } else {
        return produtosEmEstoque.find(produto => produto.id === id).estoque;
    }
}

function adicionarProdutoAoCarrinho(id, qtd) {
    const produtoAdd = produtosEmEstoque.find(produto => produto.id === id);
    if (produtoAdd) {
        produtosCarrinho.push({
            id: produtoAdd.id,
            quantidade: qtd,
            nome: produtoAdd.nome,
            preco: produtoAdd.preco,
            categoria: produtoAdd.categoria
        })
    }
}

function listarProdutos(req, res)  {
    const categoria = req.query.categoria;
    const precoInicial = Number(req.query.precoInicial) ? Number(req.query.precoInicial) : 0;
    const precoFinal = Number(req.query.precoFinal) ? Number(req.query.precoFinal) : Infinity;

    const produtosFiltrados = produtosEmEstoque.filter(produto =>
        categoria ?
            (produto.categoria.toLowerCase() === categoria.toLowerCase() && produto.preco >= precoInicial && produto.preco <= precoFinal)
            :
            (produto.preco >= precoInicial && produto.preco <= precoFinal)
    );

    res.status(200);
    res.json(produtosFiltrados);
};

function detalharCarrinho(req, res) {
    atualizarCarrinho();
    res.status(200);
    res.json(carrinho);
};

function adicionarProduto(req, res) {
    if (!req.body.id || !req.body.quantidade) {
        res.status(400);
        res.json(mensagem("O id e a quantidade do produto devem ser informados."));
    }

    const id = req.body.id;
    const qtd = req.body.quantidade;

    if (produtoEmEstoque(id) === 0) {
        res.status(404);
        res.json(mensagem("Esse produto não possui estoque."));
    } else if (qtd > produtoEmEstoque(id)) {
        res.status(404);
        res.json(mensagem("Esse produto não possui estoque suficiente."));
    } else {
        if (!verficarProdutoJaAdicionado(id)) {
            adicionarProdutoAoCarrinho(id, qtd)
        } else if (qtd > (produtoEmEstoque(id) - verficarProdutoJaAdicionado(id))) {
            res.status(404);
            res.json(mensagem("Esse produto não possui estoque suficiente."));
        } else {
            editarQuantidade(id, qtd);
        };
    };
    atualizarCarrinho()
    res.status(200);
    res.json(carrinho)
};

function editarQuantidadeProduto(req, res) {
    if (!req.body.quantidade) {
        res.status(400);
        res.json(mensagem("A quantidade deve ser informada."));
    }

    const id = Number(req.params.idProduto);
    const qtd = req.body.quantidade;
    const qtdEstoque = produtosEmEstoque.find(produto => produto.id === id).estoque ?? 0;

    if (!verficarProdutoJaAdicionado(id)) {
        res.status(404);
        res.json(mensagem("Esse produto não foi adicionado ao carrinho."));
    } else if (qtd > qtdEstoque || qtd > (qtdEstoque - verficarProdutoJaAdicionado(id))) {
        res.status(404);
        res.json(mensagem("Esse produto não possui estoque suficiente."));
    } else if ((qtd * -1) > verficarProdutoJaAdicionado(id)) {
        res.status(404)
        res.json(mensagem("Não existem produtos suficientes a serem retirados do carrinho."));
    } else {
        editarQuantidade(id, qtd);
        if (verficarProdutoJaAdicionado(id) === 0) {
            limparProduto(id);
        }
        atualizarCarrinho();
        res.status(200);
        res.json(carrinho)
    };
};

function excluirProduto(req, res) {
    const id = Number(req.params.idProduto);
    if (verficarProdutoJaAdicionado(id)) {
        limparProduto(id);
        atualizarCarrinho();
        res.status(200);
        res.json(carrinho);
    } else {
        res.status(404);
        res.json(mensagem("O produto não foi adicionado ao carrinho."))
    }
};

function limparCarrinho(req, res) {
    produtosCarrinho.splice(0);
    atualizarCarrinho();
    res.status(200);
    res.json(mensagem("Carrinho limpo."));
};

function finalizarCompra(req, res) {
    if (produtosCarrinho.length === 0) {
        res.status(404);
        res.json(mensagem("O carrinho está vazio."));
    }
    
    if (!produtosCarrinho.every(produto => produto.quantidade <= produtoEmEstoque(produto.id))) {
        res.status(404)
        res.json(mensagem("Carrinho contém produto sem estoque."));
    }

    const country = req.body.country;

    if (!country.length === 2) {
        res.status(400);
        res.json(mensagem("O campo country deve ter 2 dígitos"));
    }
    
    const type = req.body.type;

    if (!type === "individual") {
        res.status(400);
        res.json(mensagem('O campo type deve ter o valor "individual".'));
    }
    
    const name = req.body.name;
    const arrayName = name.trim().split(" ").filter(x => x);
    if (!name) {
        res.status(400);
        res.json(mensagem('O campo "name" é obrigatório'));
    } else if (arrayName.length < 2) {
        res.status(400);
        res.json(mensagem('O campo "name" deve ser preenchido com, pelo menos, um nome e um sobrenome'));
    }

    const documents = req.body.documents;

    if (documents.type === "cpf") {
        if (!Number(documents.number)) {
            res.status(400);
            res.json(mensagem("O CPF deve conter apenas números."))
        } else {
            if (documents.number.length !== 11) {
                res.status(400);
                res.json(mensagem("CPF deve conter 11 números."))
            }
        }
    }
    
    const estoqueAtualizado = estoqueObject.produtos.map(produto => {
        const i = produtosCarrinho.findIndex(produtCarrinho => produtCarrinho.id === produto.id);
        
        if (i !== -1) {
            produto.estoque = produto.estoque - produtosCarrinho[i].quantidade;
        }

        return produto;
    });

    estoqueObject.produtos = estoqueAtualizado;

    const carrinhoFinal = carrinho;
    
    
    const { mensagemFinal } = mensagem("Compra efetuada.");
    
    res.status(200);
    res.json({ mensagem: mensagemFinal, carrinho: carrinhoFinal });

    produtosCarrinho.splice(0);
};

module.exports = { 
    listarProdutos,
    detalharCarrinho,
    adicionarProduto,
    editarQuantidadeProduto,
    excluirProduto,
    limparCarrinho,
    finalizarCompra }