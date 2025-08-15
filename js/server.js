const express = require("express");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`Request: ${req.method} ${req.url}`);
  next();
});

// Serve all static files from /public
app.use(express.static(path.join(__dirname, "public")));

// Fallback to index.html for client-side routing
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});