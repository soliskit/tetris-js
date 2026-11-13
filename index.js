import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const PORT = process.env.PORT || 4000;

// Source testing is explicit and separate from the default built delivery.
const directory = process.argv.includes('--source-test') ? 'public' : 'dist';
app.use(express.static(path.join(__dirname, directory)));

app.listen(PORT, () => {
  console.log(`Server is running on port ${String(PORT)}`);
});
