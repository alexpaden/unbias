import express from 'express';
import { fetchThreadData, formatThreads, getThreadSummary } from '../services/threadSummaryService';
import { getExistingSummary, saveSummaryToDB, updateSummaryInDB } from '../models/threadSummaryModel';

const router = express.Router();

router.get('/', async (req: express.Request, res: express.Response) => {
    const threadHash = req.query.hash as string;
    let summaryLength = req.query.length as string;
    let refresh = req.query.refresh === 'true';

    if (!summaryLength) {
        summaryLength = '0';
    }
    if (!threadHash) {
        return res.status(400).send('Thread hash is required');
    }

    try {
        let summary;
        const existingSummary = await getExistingSummary(threadHash, summaryLength);
        if (existingSummary && !refresh) {
            summary = existingSummary.openai_response;
        } else {
            const threadData = await fetchThreadData(threadHash);
            if (!threadData || !threadData.result || !Array.isArray(threadData.result.casts)) {
                return res.status(400).send('Invalid thread hash or unexpected response from Neynar API');
            }
            const formattedThreads = formatThreads(threadData.result.casts);
            summary = await getThreadSummary(formattedThreads, summaryLength);
            if (existingSummary) {
                await updateSummaryInDB(threadHash, summaryLength, summary);
            } else {
                await saveSummaryToDB(threadHash, summaryLength, summary);
            }
        }
        res.send({ summary });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error processing request');
    }
});

export default router;
