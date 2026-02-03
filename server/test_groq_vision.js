import Groq from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const GROQ_API_KEY = process.env.GROQ_API_KEY;

async function testVision() {
    if (!GROQ_API_KEY) {
        console.error('❌ NO GROQ_API_KEY FOUND');
        return;
    }
    console.log('🔑 Testing with Key:', GROQ_API_KEY.substring(0, 10) + '...');

    const groq = new Groq({ apiKey: GROQ_API_KEY });

    try {
        console.log('👀 Testing Vision Model: meta-llama/llama-4-scout-17b-16e-instruct');
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: 'What is in this image? Reply simply "An image".' },
                        {
                            type: 'image_url',
                            image_url: {
                                url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg'
                            }
                        }
                    ]
                }
            ],
            model: 'meta-llama/llama-4-scout-17b-16e-instruct',
            temperature: 0.5,
            max_tokens: 100
        });

        console.log('✅ Extension Success! Response:', chatCompletion.choices[0].message.content);
    } catch (error) {
        console.error('❌ Failed:', error.status, error.code, error.message);
        if (error.error) console.error('Details:', error.error);
    }
}

testVision();
