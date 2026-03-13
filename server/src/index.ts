import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import routes from './routes';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api', (req, res) => {
  res.json({ message: 'Server API ready - routes coming soon' });
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});