import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import pool from '../db';

dotenv.config();

const router = express.Router();
const NEYNAR_API_KEY = process.env.NEYNAR_API;
const openai = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'], // This is the default and can be omitted
});

interface Author {
    username: string;
}

interface Cast {
    hash: string;
    parentHash: string | null;
    author: Author;
    text: string;
    timestamp: string;
}

router.get('/', async (req, res) => {
    const threadHash = req.query.hash as string;
    const summaryLength = req.query.length as string;
    const refresh = req.query.refresh === 'true';

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

async function fetchThreadData(threadHash: string) {
    const response = await axios.get('https://api.neynar.com/v1/farcaster/all-casts-in-thread', {
        params: { threadHash },
        headers: { 'accept': 'application/json', 'api_key': NEYNAR_API_KEY }
    });

    return response.data;
}

function formatThreads(casts: Cast[]): string[] {
    const castMap = new Map<string, Cast>(casts.map(cast => [cast.hash, cast]));
    const sortedCasts = casts.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return sortedCasts.map(cast => buildChain(cast.hash, castMap)).filter(chain => chain !== '');
}

function buildChain(hash: string, castMap: Map<string, Cast>): string {
    const cast = castMap.get(hash);
    if (!cast) return '';

    const currentText = `[@${cast.author.username}]: ${cast.text}`;

    if (!cast.parentHash) {
        return currentText;
    } else {
        const parentChain = buildChain(cast.parentHash, castMap);
        return `${parentChain}; ${currentText}`;
    }
}

async function getThreadSummary(threadData: string[], length: string): Promise<string> {
    let summaryLength = 'short (100 word)';
    switch(length) {
        case '1':
            summaryLength = 'medium (200 word)';
            break;
        case '2':
            summaryLength = 'long (300 word)';
            break;
    }

    const prompt = `Your job is to summarize social media threads into a ${summaryLength} context which includes the original post topic, the direction of conversation, and the major user participation toward any particular direction.\n\nPlease summarize this thread in a ${summaryLength} form:\n\`\`\`${threadData.join('\n')}\`\`\``;

    try {
          const chatCompletion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
          });

        return chatCompletion.choices[0].message.content || 'No summary generated';
    } catch (error) {
        console.error('Error generating summary:', error);
        throw error;
    }
}

async function getExistingSummary(threadHash: string, length: string) {
    const query = 'SELECT openai_response FROM thread_summary WHERE hash = $1 AND length = $2';
    try {
        const { rows } = await pool.query(query, [threadHash, length]);
        return rows[0]; // returns undefined if no summary exists
    } catch (err) {
        console.error('Error querying existing summary:', err);
        throw err;
    }
}

async function saveSummaryToDB(threadHash: string, length: string, summary: string) {
    const query = 'INSERT INTO thread_summary (hash, length, openai_response) VALUES ($1, $2, $3)';
    try {
        await pool.query(query, [threadHash, length, summary]);
    } catch (err) {
        console.error('Database insert error:', err);
        throw err;
    }
}

async function updateSummaryInDB(threadHash: string, length: string, summary: string) {
    const query = 'UPDATE thread_summary SET openai_response = $3, last_update = CURRENT_TIMESTAMP WHERE hash = $1 AND length = $2';
    try {
        await pool.query(query, [threadHash, length, summary]);
    } catch (err) {
        console.error('Database update error:', err);
        throw err;
    }
}


export default router;
