const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());
// Permite que o navegador aceda às pastas de imagens e arquivos estáticos
app.use('/imagens', express.static(path.join(__dirname, 'imagens')));
app.use(express.static(__dirname));

// ROTAS PARA LINKS LIMPOS (Sem o .html no navegador)
app.get('/cliente', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

const DATA_FILE = 'data.json';
const ler = () => JSON.parse(fs.readFileSync(DATA_FILE));
const gravar = (d) => fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2));

// Estrutura inicial do banco de dados (Os 8 itens originais)
const inicial = {
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

if (!fs.existsSync(DATA_FILE)) { gravar(inicial); }

// API: Buscar todos os dados
app.get('/api/dados', (req, res) => res.json(ler()));

// API: Buscar pontos de um cliente específico
app.get('/api/cliente/:nome', (req, res) => {
    const db = ler();
    const cliente = db.clientes.find(c => c.nome.toLowerCase() === req.params.nome.toLowerCase());
    res.json(cliente || { nome: req.params.nome, pontos: 0 });
});

// API: Processar novo pedido
app.post('/api/pedido', (req, res) => {
    const db = ler();
    const { nome, itens, totalOriginal, usarPontos } = req.body;
    
    // Validar Stock
    for (let i of itens) {
        const p = db.produtos.find(prod => prod.id === i.id);
        if (!p || p.stock < i.qtd) return res.status(400).json({error: "Sem stock"});
    }

    let cliente = db.clientes.find(c => c.nome.toLowerCase() === nome.toLowerCase());
    if (!cliente) { cliente = { nome, pontos: 0 }; db.clientes.push(cliente); }

    let desconto = 0;
    if (usarPontos) {
        desconto = Math.min(cliente.pontos, totalOriginal * 0.30); // Teto de 30%
        cliente.pontos -= desconto; // 1 Ponto = 1 Kz
    }

    let pontosGanhosNestaCompra = 0;
    itens.forEach(i => {
        const p = db.produtos.find(prod => prod.id === i.id);
        p.stock -= i.qtd;
        pontosGanhosNestaCompra += (p.pontos || 0) * i.qtd;
    });
    
    cliente.pontos += pontosGanhosNestaCompra;
    
    db.vendas.push({ 
        idPedido: Date.now(), 
        nome, 
        totalFinal: totalOriginal - desconto, 
        desconto, 
        status: "Pendente", 
        data: new Date().toLocaleString(), 
        itens 
    });
    
    gravar(db);
    res.json({ success: true });
});

// API: Mudar status do pedido (Pendente -> Concluído)
app.post('/api/status-pedido', (req, res) => {
    const db = ler();
    const { idPedido, novoStatus } = req.body;
    const v = db.vendas.find(vend => vend.idPedido === idPedido);
    if(v) { v.status = novoStatus; gravar(db); res.json({success:true}); }
});

// API: Atualizar um produto existente (Preço, Stock, Pontos)
app.post('/api/atualizar-produto', (req, res) => {
    const db = ler();
    const { id, preco, stock, pontos } = req.body;
    const p = db.produtos.find(prod => prod.id === id);
    if(p) { 
        p.preco = Number(preco); 
        p.stock = Number(stock); 
        p.pontos = Number(pontos); 
        gravar(db); 
        res.json({success:true}); 
    }
});

// API: Adicionar novo produto
app.post('/api/novo-produto', (req, res) => {
    const db = ler();
    const novo = { ...req.body, id: Date.now() };
    db.produtos.push(novo);
    gravar(db);
    res.json({ success: true });
});

// API: Apagar produto do menu
app.post('/api/apagar-produto', (req, res) => {
    const db = ler();
    const { id } = req.body;
    db.produtos = db.produtos.filter(p => p.id !== id);
    gravar(db);
    res.json({ success: true });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Servidor Online em http://localhost:${PORT}/cliente`));