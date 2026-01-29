import Groq from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const GROQ_API_KEY = process.env.GROQ_API_KEY;

async function listModels() {
    try {
        const groq = new Groq({ apiKey: GROQ_API_KEY });
        const models = await groq.models.list();
        console.log(JSON.stringify(models.data.map(m => m.id), null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

listModels();
