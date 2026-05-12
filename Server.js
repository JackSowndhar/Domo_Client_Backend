require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`\n Embed Backend running on pory ${PORT}`);
  console.log(`   Env check: CLIENT_ID=${process.env.CLIENT_ID ? '✅' : '❌'}, EMBED_ID=${process.env.EMBED_ID ? '✅' : '❌'}`);
});