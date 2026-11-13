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

// Schema e Model serão definidos na Fase 2

app.listen(3004, () => {
    console.log("Entregas rodando na porta 3004");
});