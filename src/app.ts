import express from 'express';
import threadSummaryRoute from './routes/threadSummary';
import './db';

const app = express();
const PORT = process.env.PORT || 3000;

const v1Router = express.Router();

v1Router.use('/thread_summary', threadSummaryRoute);

app.use(express.json());

app.use('/v1', v1Router);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
