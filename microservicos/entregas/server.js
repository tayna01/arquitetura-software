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

app.listen(3004, () => {
    console.log("Entregas rodando na porta 3004");
});