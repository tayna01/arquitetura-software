const express = require("express");
const axios = require("axios");
const db = require("./db");

const app = express();

const PRODUTOS_URL = "http://localhost:3001";

const CLIENTES_URL = "http://localhost:3003";

app.use(express.json());

app.get("/pedidos", async (req, res) => {
    try {
        const resultado = await db.query(
            "SELECT * FROM pedidos ORDER BY id"
        );

        res.json(resultado.rows);
    } catch (erro) {
        res.status(500).json({
            erro: "Erro ao buscar pedidos"
        });
    }
});

app.post("/pedidos", async (req, res) => {
    const { cliente_id, produtos } = req.body;

    if (!cliente_id || !Array.isArray(produtos) || produtos.length === 0) {
        return res.status(400).json({
            erro: "cliente_id e produtos são obrigatórios"
        });
    }

    if (
        produtos.some(p => !p.produto_id || !p.quantidade || p.quantidade <= 0)
    ) {
        return res.status(400).json({
            erro: "Cada produto deve ter produto_id e quantidade válida"
        });
    }

    try {
        await axios.get(
            `${CLIENTES_URL}/clientes/${cliente_id}`,
            {
                timeout: 3000
            }
        );
    } catch (erro) {
        if (erro.response?.status === 404) {
            return res.status(400).json({
                erro: "Cliente não encontrado"
            });
        }

        return res.status(503).json({
            erro: "Serviço de Clientes indisponível"
        });
    }

    try {
        const itens = [];
        let total = 0;

        for (const item of produtos) {
            const resposta = await axios.get(
                `${PRODUTOS_URL}/produtos/${item.produto_id}`,
                {
                    timeout: 3000
                }
            );

            const produto = resposta.data;
            const subtotal = produto.preco * item.quantidade;

            total += subtotal;

            itens.push({
                produto_id: produto.id,
                nome_produto: produto.nome,
                preco_unitario: produto.preco,
                quantidade: item.quantidade,
                subtotal
            });
        }

        const resultado = await db.query(
            `INSERT INTO pedidos (
        cliente_id,
        produtos,
        total
      )
      VALUES ($1, $2, $3)
      RETURNING *`,
            [cliente_id, JSON.stringify(itens), total]
        );

        res.status(201).json(resultado.rows[0]);
    } catch (erro) {
        if (erro.response?.status === 404) {
            return res.status(400).json({
                erro: "Produto não encontrado"
            });
        }

        return res.status(503).json({
            erro: "Serviço de Produtos indisponível"
        });
    }
});

app.get("/pedidos/:id", async (req, res) => {
    try {
        const resultado = await db.query(
            "SELECT * FROM pedidos WHERE id = $1",
            [req.params.id]
        );

        const pedido = resultado.rows[0];

        if (!pedido) {
            return res.status(404).json({
                erro: "Pedido não encontrado"
            });
        }

        res.json(pedido);
    } catch (erro) {
        res.status(500).json({
            erro: "Erro ao buscar pedido"
        });
    }
});

async function criarTabela() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS pedidos (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER NOT NULL,
        produtos JSONB NOT NULL,
        total NUMERIC(10, 2) NOT NULL
        )
    `);

    console.log("Tabela de pedidos pronta");
}

criarTabela();

app.listen(3002, () => {
    console.log("Pedidos rodando na porta 3002");
});