require("dotenv").config();

const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
const connectDB = require("./db");

const app = express();

const PEDIDOS_URL =
    process.env.PEDIDOS_URL || "http://localhost:3002";

app.use(express.json());

connectDB();

const STATUS_VALIDOS = [
    "PREPARANDO",
    "ENVIADO",
    "EM_TRANSITO",
    "ENTREGUE",
    "CANCELADO"
];

const entregaSchema = new mongoose.Schema({
    pedido_id: {
        type: String,
        required: true
    },
    endereco: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: STATUS_VALIDOS,
        default: "PREPARANDO"
    },
    codigo_rastreio: {
        type: String,
        required: true,
        unique: true
    }
}, {
    timestamps: true
});

const Entrega = mongoose.model("Entrega", entregaSchema);

function gerarCodigoRastreio() {
    const parte = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `TRK-${parte}`;
}

app.get("/entregas", async (req, res) => {
    try {
        const entregas = await Entrega.find().sort({ _id: 1 });

        res.json(entregas);
    } catch (erro) {
        res.status(500).json({
            erro: "Erro ao listar entregas"
        });
    }
});

app.get("/entregas/pedido/:pedido_id", async (req, res) => {
    try {
        const entrega = await Entrega.findOne({
            pedido_id: req.params.pedido_id
        });

        if (!entrega) {
            return res.status(404).json({
                erro: "Entrega não encontrada para este pedido"
            });
        }

        res.json(entrega);
    } catch (erro) {
        res.status(500).json({
            erro: "Erro ao buscar entrega do pedido"
        });
    }
});

app.get("/entregas/:id", async (req, res) => {
    try {
        const entrega = await Entrega.findById(req.params.id);

        if (!entrega) {
            return res.status(404).json({
                erro: "Entrega não encontrada"
            });
        }

        res.json(entrega);
    } catch (erro) {
        res.status(500).json({
            erro: "Erro ao buscar entrega"
        });
    }
});

app.put("/entregas/:id/status", async (req, res) => {
    const { status } = req.body;

    if (!status || !STATUS_VALIDOS.includes(status)) {
        return res.status(400).json({
            erro: "Status inválido"
        });
    }

    try {
        const entrega = await Entrega.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!entrega) {
            return res.status(404).json({
                erro: "Entrega não encontrada"
            });
        }

        res.json(entrega);
    } catch (erro) {
        res.status(500).json({
            erro: "Erro ao atualizar status da entrega"
        });
    }
});

app.post("/entregas", async (req, res) => {
    const { pedido_id, endereco } = req.body;

    if (!pedido_id || !endereco) {
        return res.status(400).json({
            erro: "pedido_id e endereco são obrigatórios"
        });
    }

    try {
        await axios.get(
            `${PEDIDOS_URL}/pedidos/${pedido_id}`,
            {
                timeout: 3000
            }
        );
    } catch (erro) {
        if (erro.response?.status === 404) {
            return res.status(400).json({
                erro: "Pedido não encontrado"
            });
        }

        return res.status(503).json({
            erro: "Serviço de Pedidos indisponível"
        });
    }

    try {
        const entrega = await Entrega.create({
            pedido_id,
            endereco,
            status: "PREPARANDO",
            codigo_rastreio: gerarCodigoRastreio()
        });

        res.status(201).json(entrega);
    } catch (erro) {
        return res.status(500).json({
            erro: "Erro ao cadastrar entrega"
        });
    }
});

app.listen(3004, () => {
    console.log("Entregas rodando na porta 3004");
});