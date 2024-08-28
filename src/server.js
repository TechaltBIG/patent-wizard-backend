// backend/server.js
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Set up multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });
const pdf = require("pdf-parse");

// Endpoint to upload PDF
app.post("/upload", upload.single("file"), async (req, res) => {
  const pdfBuffer = req.file.buffer;

  // Save PDF to a temporary file
  fs.writeFileSync("temp.pdf", pdfBuffer);

  // Extract text from the PDF
  try {
    const data = await pdf(pdfBuffer);
    const pdfText = data.text;
    // Send back the extracted text as response
    res
      .status(200)
      .send({ message: "PDF uploaded successfully!", text: pdfText });
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    res.status(500).send({ error: "Error extracting text from PDF" });
  }
});

// Endpoint to chat with PDF using Gemini API
// backend/server.js
app.post("/chat", async (req, res) => {
  try {
    const query = req.body.query;

    // Check if the PDF file exists before sending the request
    if (!fs.existsSync("temp.pdf")) {
      return res.status(400).send({ error: "PDF file not found." });
    }

    // Send PDF data as required by the Gemini API
    const pdfBase64 = fs.readFileSync("temp.pdf").toString("base64"); // Read PDF as base64

    const response = await axios.post(
      "https://api.gemini.com/v1/chat",
      {
        pdf: pdfBase64, // Sending PDF as base64 encoded string
        query: query,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GEMINI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Check if response contains expected data
    if (response.data && response.data.answer) {
      res.status(200).send({ answer: response.data.answer });
    } else {
      res.status(500).send({ error: "No answer returned from Gemini API" });
    }
  } catch (error) {
    console.error("Error in /chat endpoint:", error.message); // Log specific error message
    res.status(500).send({
      error: "Error communicating with Gemini API",
      details: error.message,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
