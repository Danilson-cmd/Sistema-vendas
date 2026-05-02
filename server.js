const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use('/imagens', express.static(path.join(__dirname, 'imagens')));
app.use(express.static(__dirname));

app.get('/cliente', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// BANCO DE DADOS EM MEMÓRIA (Necessário para rodar na Vercel gratuita)
let db = {
    clientes: [], vendas: [],
    produtos: [
        {id: 1, nome: "Pavê", preco: 1500, stock: 20, imagem: "imagens/pave.jpg", categoria: "Comida", pontos: 100},
        {id: 2, nome: "Ressóis", preco: 500, stock: 50, imagem: "imagens/ressois.jpg", categoria: "Comida", pontos: 20},
        {id: 3, nome: "Bolas de Berlim", preco: 800, stock: 15, imagem: "imagens/bolas.jpg", categoria: "Comida", pontos: 50},
        {id: 4, nome: "Gelado Gourmet", preco: 2500, stock: 10, imagem: "imagens/gelados.jpg", categoria: "Comida", pontos: 150},
        {id: 5, nome: "Coxinha", preco: 600, stock: 40, imagem: "imagens/coxinhas.jpg", categoria: "Comida", pontos: 30},
        {id: 6, nome: "Canudos", preco: 700, stock: 25, imagem: "imagens/canudos.jpg", categoria: "Comida", pontos: 40},
        {id: 7, nome: "Queques", preco: 400, stock: 30, imagem: "imagens/queques.jpg", categoria: "Comida", pontos: 25},
        {id: 8, nome: "Churros", preco: 900, stock: 20, imagem: "imagens/churros.jpg", categoria: "Comida", pontos: 60}
    ]
};

// Funções de leitura e gravação agora apenas manipulam a variável 'db'
const ler = () => db;
const gravar = (d) => { db = d; };

// API: Buscar todos os dados
app.get('/api/dados', (req, res) => res.json(ler()));

// API: Buscar pontos de um cliente específico
app.get('/api/cliente/:nome', (req, res) => {
    const dados = ler();
    const cliente = dados.clientes.find(c => c.nome.toLowerCase() === req.params.nome.toLowerCase());
    res.json(cliente || { nome: req.params.nome, pontos: 0 });
});

// API: Processar novo pedido
app.post('/api/pedido', (req, res) => {
    const dados = ler();
    const { nome, itens, totalOriginal, usarPontos } = req.body;
    
    for (let i of itens) {
        const p = dados.produtos.find(prod => prod.id === i.id);
        if (!p || p.stock < i.qtd) return res.status(400).json({error: "Sem stock"});
    }

    let cliente = dados.clientes.find(c => c.nome.toLowerCase() === nome.toLowerCase());
    if (!cliente) { cliente = { nome, pontos: 0 }; dados.clientes.push(cliente); }

    let desconto = 0;
    if (usarPontos) {
        desconto = Math.min(cliente.pontos, totalOriginal * 0.30);
        cliente.pontos -= desconto;
    }

    let pontosGanhosNestaCompra = 0;
    itens.forEach(i => {
        const p = dados.produtos.find(prod => prod.id === i.id);
        p.stock -= i.qtd;
        pontosGanhosNestaCompra += (p.pontos || 0) * i.qtd;
    });
    
    cliente.pontos += pontosGanhosNestaCompra;
    
    dados.vendas.push({ 
        idPedido: Date.now(), 
        nome, 
        totalFinal: totalOriginal - desconto, 
        desconto, 
        status: "Pendente", 
        data: new Date().toLocaleString(), 
        itens 
    });
    
    gravar(dados);
    res.json({ success: true });
});

app.post('/api/status-pedido', (req, res) => {
    const dados = ler();
    const { idPedido, novoStatus } = req.body;
    const v = dados.vendas.find(vend => vend.idPedido === idPedido);
    if(v) { v.status = novoStatus; gravar(dados); res.json({success:true}); }
});

app.post('/api/atualizar-produto', (req, res) => {
    const dados = ler();
    const { id, preco, stock, pontos } = req.body;
    const p = dados.produtos.find(prod => prod.id === id);
    if(p) { 
        p.preco = Number(preco); 
        p.stock = Number(stock); 
        p.pontos = Number(pontos); 
        gravar(dados); 
        res.json({success:true}); 
    }
});

app.post('/api/novo-produto', (req, res) => {
    const dados = ler();
    const novo = { ...req.body, id: Date.now() };
    dados.produtos.push(novo);
    gravar(dados);
    res.json({ success: true });
});

app.post('/api/apagar-produto', (req, res) => {
    const dados = ler();
    const { id } = req.body;
    dados.produtos = dados.produtos.filter(p => p.id !== id);
    gravar(dados);
    res.json({ success: true });
});

// AJUSTE DE PORTA PARA VERCEL
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));

module.exports = app;
