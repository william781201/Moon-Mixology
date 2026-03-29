
const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// 提供打包後的靜態檔案
app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.static(__dirname));

// 所有請求導向 index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Mixology Server is running on port ${PORT}`);
});
