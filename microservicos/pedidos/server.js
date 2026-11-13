require("dotenv").config();

const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
const connectDB = require("./db");

const app = express();

const PRODUTOS_URL =
    process.env.PRODUTOS_URL || "http://localhost:3001";

const CLIENTES_URL =
    process.env.CLIENTES_URL || "http://localhost:3003";

app.use(express.json());

connectDB();

const itemPedidoSchema = new mongoose.Schema({
    produto_id: Number,
    nome_produto: String,
    preco_unitario: Number,
    quantidade: Number,
    subtotal: Number
}, { _id: false });

const pedidoSchema = new mongoose.Schema({
    cliente_id: Number,
    produtos: [itemPedidoSchema],
    total: Number
});

const Pedido = mongoose.model("Pedido", pedidoSchema);

app.get("/pedidos", async (req, res) => {
    try {
        const resultado = await Pedido.find().sort({ _id: 1 });

        res.json(resultado);
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

        const pedido = await Pedido.create({
            cliente_id,
            produtos: itens,
            total
        });

        res.status(201).json(pedido);
    } catch (erro) {
        if (erro.response?.status === 404) {
            return res.status(400).json({
                erro: "Produto não encontrado"
            });
        }

        if (erro.code === "ECONNREFUSED" || erro.code === "ECONNABORTED") {
            return res.status(503).json({
                erro: "Serviço de Produtos indisponível"
            });
        }

        return res.status(500).json({
            erro: "Erro ao criar pedido"
        });
    }
});

app.get("/pedidos/:id", async (req, res) => {
    try {
        const pedido = await Pedido.findById(req.params.id);

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

app.listen(3002, () => {
    console.log("Pedidos rodando na porta 3002");
});