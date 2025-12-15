import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Config
const GENYU_API = 'https://aisandbox-pa.googleapis.com/v1/projects/07c3d6ef-3305-4196-bcc2-7db5294be436/flowMedia:batchGenerateImages';
const VIDEO_API = 'https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoStartImage';

// --- Test Token Validation Endpoint ---
app.post('/api/test-token', async (req, res) => {
    const { token: rawToken, recaptchaToken } = req.body;

    console.log('\n=== 🔍 TOKEN VALIDATION TEST ===');

    // 1. Validate Session Token
    const token = rawToken?.includes('session-token=')
        ? rawToken.split('session-token=')[1].split(';')[0].trim()
        : rawToken;

    const tokenCheck = {
        provided: !!rawToken,
        format: token?.startsWith('ya29.') ? '✅ Valid OAuth2' : '❌ Invalid',
        length: token?.length || 0,
        preview: token?.substring(0, 30) + '...',
        valid: token?.length > 50 && token?.startsWith('ya29.')
    };

    // 2. Validate Recaptcha Token
    const recaptchaCheck = {
        provided: !!recaptchaToken,
        format: recaptchaToken?.startsWith('0cAF') ? '✅ Valid' : '❌ Invalid',
        length: recaptchaToken?.length || 0,
        fresh: recaptchaToken?.length > 1500,
        preview: recaptchaToken?.substring(0, 30) + '...'
    };

    const allGood = tokenCheck.valid && recaptchaCheck.provided && recaptchaCheck.fresh;

    console.log('Session Token:', tokenCheck.valid ? '✅ OK' : '❌ FAIL', `(${tokenCheck.length} chars)`);
    console.log('Recaptcha:', recaptchaCheck.fresh ? '✅ OK' : '❌ FAIL', `(${recaptchaCheck.length} chars)`);
    console.log('Result:', allGood ? '✅ READY FOR VIDEO!' : '❌ FIX TOKENS FIRST');
    console.log('===========================\n');

    res.json({
        ready: allGood,
        sessionToken: tokenCheck,
        recaptchaToken: recaptchaCheck,
        message: allGood
            ? '✅ All tokens valid! You can generate videos now!'
            : '❌ Please check the issues above',
        issues: [
            !tokenCheck.provided && 'Session token missing',
            !tokenCheck.valid && 'Session token invalid format',
            !recaptchaCheck.provided && 'Recaptcha token missing',
            !recaptchaCheck.fresh && 'Recaptcha token too short (expired?)',
        ].filter(Boolean)
    });
});

// --- Image Generation Proxy (Labs Google / Fx Flow) ---
app.post('/api/proxy/genyu/image', async (req, res) => {
    const { token: rawToken, prompt, aspect = "IMAGE_ASPECT_RATIO_LANDSCAPE", style, recaptchaToken } = req.body;
    console.log(`[Proxy] Genyu Image Req. Token: ${rawToken ? 'Yes' : 'No'}, Recaptcha: ${recaptchaToken ? 'Yes' : 'No'}`);

    const token = rawToken?.includes('session-token=') ? rawToken.split('session-token=')[1].split(';')[0].trim() : rawToken;

    if (!token) return res.status(401).json({ error: "Missing Token" });

    // Use provided Recaptcha or fallback
    const RECAPTCHA_TOKEN = recaptchaToken || "0cAFcWeA72-Q4udY92nSYo5u7IrOT_j0i95CNLsnp95Hd44041WFn15bVYwTLWS5HKeolnilFX1a0I90OQ1MTMDI31DlNl8d1yCBi8rGlPxyDIfAXDIzcoBj2j7dm8DFGldWYV7yaL0FhSIwWDUa8akadIFSefpdf6JNHgCdnoUgh3bP9zAmycGKhcQV1X8QSOGEz4OjU6HBBbpMqCozYtFVD8YIhb94ze6reOvjmcjPI9XaJXWyxbsYuHO6CPUd1ezZLQ6hHPbj0st3IPL1dsSaLeeltBzMifUA8QS5Ckw_0xemsOgk4ckJd7CRZIiF-x5fPgKlQtDMOtjba_zIxCh1UiltIBxwBe722koxfUm92G0Rl8D4-kp-q8Ja6J-KFGmIWm9Y82SlrmTLBD7sIsOmkUn6gNZjdw6maIA5dDxjdER99Wad3Uqyb-zagDLcZMBXsVfTozC2vTLTze1M2loblwQT_gFWKHMWTpPw2vZ9Msf1YU7HkyrPzJFizms8eUn3gclsPJj-wCzRRDlj7zWfaKyR3lFOFs8U8h_02vXPqsi7gCnBp8bGkoEgiekJCkIESdayQtWM0UK2Xn00jiWBWUQ-NMR_v-JRgHMrNKbucmogDUUTICPvVjbbdTnFjzgz2VUuOrpeEw8ivYrO3zksPXRdsEy_hhN1RYWd46VXfITnZvNfsCLvyJVOYkYoaaJa12j3UI4zaVfVDwxBzvU8r8EIszHVFkTFYhvVVp0dGJKEeV75bISm90Ba2KKr_-NBZC5gdQUebN_twYI2SmKitmO3CKU7ll0TgYykqc8JyR4jbbxBx-DeyopNbCkZa8rJovkA1JTHooyhxJ-kzmyikK7R_lKcL7KLoZNtPF1m9pdwArA0km-Un8nEzzUA42fDrdDtyIZ-lLvBLBT7qDTYitbHKi_8zdUsrH9ziUJgdo5HN3YI5eW4E-2dYAdvAiQwUhiJS0v98MP6c1VAbHfazwX0kUB-dL4KjPFLUKbxfYwuLGRjRPRyRriwcj5D5uivxrFWWVrgFBUHl3C11-DD31KlkiouExuM4ivadmtYeVgZV7hgwJECdGy5sdpzswh2hf10N-RFmuBuHo54UNQLEvScUlPVd9lfgWNojX_HyAgWFCRQnaHBn37fwvSkhkIwamjxDfbJCNNv-mbpqCejVsNyz3LPcUYF2vcRWZumt391u1iaewEKtWDwEIxoegznjaU34QzVAl0cCEfKVbftzkj91V53EZggNcfigFXhTpf2dCOHxW0TFPKCT3Ik4yfu4T2bW_PCvU9UpHPr3RPxmrOtmoZVHw97DlHQ9gVU7tjgJhvWIbVf_7VaneOD2pk9X3SgdkdsdCtA2lX4s-1iEeavQynj1c8NNTRaSenzBZXUFjJGv-H4OX682RW5ZyJZ40I65sLfBht40SeVfzIvld3Ufk4JER63mgo2R4ZRNbPQjvoXh5JkLIuS6EpN2ohfweorDl3Obcm3Cj1UqM8z5Cs6ih0vfQyn5uy6MBJFMSYPhrx4yEEnnAHEEVFzg9fHDmeH3Hw-w2-gFOFpl4tBI_MPKB2eMAdXeVFiHyFhx1XFpOmBbuGwxmor20FF8jXhwEYoX2KLxP";

    // Construct Image Inputs if provided
    const imageInputs = [];

    // Helper to clean base64
    const cleanBase64 = (str) => str.includes(',') ? str.split(',')[1] : str;

    if (req.body.image) {
        imageInputs.push({
            "imageInput": {
                "content": cleanBase64(req.body.image),
                "mimeType": "image/jpeg" // Assumption
            }
        });
    }

    if (req.body.mask) {
        // Assuming Pinhole expects the mask as a separate input or part of imageInput?
        // Based on similar APIs, usually it's a separate input mapped to 'mask' role or similar.
        // However, without exact docs, let's try pushing it as another input or check if 'maskInput' key exists.
        // Let's try appending to the first input if it supports it, OR separate input.
        // Given "imageInputs" is an array, let's try adding it as a second item for now, 
        // but logic suggests it might need to be paired.
        // Let's TRY generic approach:
        imageInputs.push({
            "imageInput": { // Using imageInput key for mask as well often works if they are just ordered inputs
                "content": cleanBase64(req.body.mask),
                "mimeType": "image/png"
            }
        });
    }

    // Process Props (Reference Images)
    if (req.body.props && Array.isArray(req.body.props)) {
        req.body.props.forEach(propBase64 => {
            if (propBase64) {
                imageInputs.push({
                    "imageInput": {
                        "content": cleanBase64(propBase64),
                        "mimeType": "image/jpeg"
                    }
                });
            }
        });
    }

    const googlePayload = {
        "clientContext": {
            "recaptchaToken": RECAPTCHA_TOKEN,
            "sessionId": `;${Date.now()}`,
            "projectId": "07c3d6ef-3305-4196-bcc2-7db5294be436",
            "tool": "PINHOLE"
        },
        "requests": [
            {
                "clientContext": {
                    "recaptchaToken": RECAPTCHA_TOKEN,
                    "sessionId": `;${Date.now()}`,
                    "projectId": "07c3d6ef-3305-4196-bcc2-7db5294be436",
                    "tool": "PINHOLE"
                },
                "seed": Math.floor(Math.random() * 1000000),
                "imageModelName": "GEM_PIX_2",
                "imageAspectRatio": aspect,
                "prompt": prompt,
                "imageInputs": imageInputs
            }
        ]
    };

    try {
        const response = await axios.post(GENYU_API, googlePayload, {
            headers: {
                'authorization': `Bearer ${token}`,
                'content-type': 'application/json',
                'origin': 'https://labs.google',
                'referer': 'https://labs.google/',
                'user-agent': req.headers['user-agent'] || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
                'x-browser-channel': 'stable',
                'x-browser-year': '2025'
            }
        });

        // Labs Google Response format logic
        console.log("Google Labs Response:", JSON.stringify(response.data, null, 2));

        // EXTRACT IMAGE LOGIC (Normalize Response)
        let foundBase64 = null;

        // Pattern 1: { responses: [ { image: { content: "..." } } ] } (Common Pinhole)
        if (response.data.responses?.[0]?.image?.content) {
            foundBase64 = response.data.responses[0].image.content;
        }
        // Pattern 2: { generatedImages: [ { image: { content: "..." } } ] }
        else if (response.data.generatedImages?.[0]?.image?.content) {
            foundBase64 = response.data.generatedImages[0].image.content;
        }
        // Pattern 3: { images: [ "..." ] }
        else if (response.data.images?.[0]) {
            foundBase64 = typeof response.data.images[0] === 'string'
                ? response.data.images[0]
                : response.data.images[0].content;
        }
        // Pattern 4: Direct image object
        else if (response.data.image?.content) {
            foundBase64 = response.data.image.content;
        }

        if (foundBase64) {
            // Ensure Data URI Prefix
            const finalImage = foundBase64.startsWith('data:image')
                ? foundBase64
                : `data:image/jpeg;base64,${foundBase64}`;

            return res.json({ image: finalImage });
        }

        // If we can't find an image, return raw data for debug, but log warning
        console.warn("❌ Could not extract image from response.");
        res.json(response.data);

    } catch (error) {
        console.error("❌ Labs Google Proxy Error:");
        console.error("   Status:", error.response?.status);
        console.error("   Status Text:", error.response?.statusText);
        console.error("   Error Data:", JSON.stringify(error.response?.data, null, 2));
        console.error("   Error Message:", error.message);

        res.status(500).json({
            error: "Labs Google API Failed",
            status: error.response?.status,
            details: error.response?.data || error.message
        });
    }
});

// --- General Image Proxy (Bypass CORS for Analysis) ---
app.get('/api/proxy/fetch-image', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).send("Missing URL");

    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: {
                // Mimic a browser to avoid some bot protections
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        res.set('Content-Type', response.headers['content-type']);
        res.send(response.data);
    } catch (error) {
        console.error("Image Fetch Proxy Error:", error.message);
        res.status(500).send("Failed to fetch image");
    }
});

// --- Google Veo 3.1 Video Generation Proxy ---

// 1. Start Video Generation (Image-to-Video)
app.post('/api/proxy/google/video/start', async (req, res) => {
    const { token: rawToken, prompt, mediaId, aspectRatio = "VIDEO_ASPECT_RATIO_LANDSCAPE", recaptchaToken } = req.body;
    const token = rawToken?.includes('session-token=') ? rawToken.split('session-token=')[1].split(';')[0].trim() : rawToken;
    if (!token || !mediaId) return res.status(400).json({ error: "Missing Token or MediaId" });

    // Use provided Recaptcha or fallback to hardcoded (likely expired)
    const RECAPTCHA_TOKEN = (recaptchaToken || "0cAFcWeA72-Q4udY92nSYo5u7IrOT_j0i95CNLsnp95Hd44041WFn15bVYwTLWS5HKeolnilFX1a0I90OQ1MTMDI31DlNl8d1yCBi8rGlPxyDIfAXDIzcoBj2j7dm8DFGldWYV7yaL0FhSIwWDUa8akadIFSefpdf6JNHgCdnoUgh3bP9zAmycGKhcQV1X8QSOGEz4OjU6HBBbpMqCozYtFVD8YIhb94ze6reOvjmcjPI9XaJXWyxbsYuHO6CPUd1ezZLQ6hHPbj0st3IPL1dsSaLeeltBzMifUA8QS5Ckw_0xemsOgk4ckJd7CRZIiF-x5fPgKlQtDMOtjba_zIxCh1UiltIBxwBe722koxfUm92G0Rl8D4-kp-q8Ja6J-KFGmIWm9Y82SlrmTLBD7sIsOmkUn6gNZjdw6maIA5dDxjdER99Wad3Uqyb-zagDLcZMBXsVfTozC2vTLTze1M2loblwQT_gFWKHMWTpPw2vZ9Msf1YU7HkyrPzJFizms8eUn3gclsPJj-wCzRRDlj7zWfaKyR3lFOFs8U8h_02vXPqsi7gCnBp8bGkoEgiekJCkIESdayQtWM0UK2Xn00jiWBWUQ-NMR_v-JRgHMrNKbucmogDUUTICPvVjbbdTnFjzgz2VUuOrpeEw8ivYrO3zksPXRdsEy_hhN1RYWd46VXfITnZvNfsCLvyJVOYkYoaaJa12j3UI4zaVfVDwxBzvU8r8EIszHVFkTFYhvVVp0dGJKEeV75bISm90Ba2KKr_-NBZC5gdQUebN_twYI2SmKitmO3CKU7ll0TgYykqc8JyR4jbbxBx-DeyopNbCkZa8rJovkA1JTHooyhxJ-kzmyikK7R_lKcL7KLoZNtPF1m9pdwArA0km-Un8nEzzUA42fDrdDtyIZ-lLvBLBT7qDTYitbHKi_8zdUsrH9ziUJgdo5HN3YI5eW4E-2dYAdvAiQwUhiJS0v98MP6c1VAbHfazwX0kUB-dL4KjPFLUKbxfYwuLGRjRPRyRriwcj5D5uivxrFWWVrgFBUHl3C11-DD31KlkiouExuM4ivadmtYeVgZV7hgwJECdGy5sdpzswh2hf10N-RFmuBuHo54UNQLEvScUlPVd9lfgWNojX_HyAgWFCRQnaHBn37fwvSkhkIwamjxDfbJCNNv-mbpqCejVsNyz3LPcUYF2vcRWZumt391u1iaewEKtWDwEIxoegznjaU34QzVAl0cCEfKVbftzkj91V53EZggNcfigFXhTpf2dCOHxW0TFPKCT3Ik4yfu4T2bW_PCvU9UpHPr3RPxmrOtmoZVHw97DlHQ9gVU7tjgJhvWIbVf_7VaneOD2pk9X3SgdkdsdCtA2lX4s-1iEeavQynj1c8NNTRaSenzBZXUFjJGv-H4OX682RW5ZyJZ40I65sLfBht40SeVfzIvld3Ufk4JER63mgo2R4ZRNbPQjvoXh5JkLIuS6EpN2ohfweorDl3Obcm3Cj1UqM8z5Cs6ih0vfQyn5uy6MBJFMSYPhrx4yEEnnAHEEVFzg9fHDmeH3Hw-w2-gFOFpl4tBI_MPKB2eMAdXeVFiHyFhx1XFpOmBbuGwxmor20FF8jXhwEYoX2KLxP").trim();

    console.log(`[Video Start] Recaptcha: ${recaptchaToken ? 'CUSTOM' : 'FALLBACK'} (${RECAPTCHA_TOKEN.length} chars)`);
    console.log(`[Video Start] Prompt: "${prompt}", MediaID: ${mediaId.substring(0, 30)}...`);

    const payload = {
        "clientContext": {
            "recaptchaToken": RECAPTCHA_TOKEN,
            "sessionId": `;${Date.now()}`,
            "projectId": "07c3d6ef-3305-4196-bcc2-7db5294be436",
            "tool": "PINHOLE",
            "userPaygateTier": "PAYGATE_TIER_TWO"
        },
        "requests": [
            {
                "aspectRatio": aspectRatio,
                "seed": Math.floor(Math.random() * 1000000),
                "textInput": { "prompt": prompt },
                "videoModelKey": "veo_3_1_i2v_s_fast_ultra",
                "startImage": { "mediaId": mediaId },
                "metadata": { "sceneId": `sc-${Date.now()}` }
            }
        ]
    };

    console.log("DEBUG Payload:", JSON.stringify(payload, null, 2)); // DEBUG: Check what we send

    try {
        const response = await axios.post(VIDEO_API, JSON.stringify(payload), {
            headers: {
                'authorization': `Bearer ${token}`,
                'content-type': 'text/plain;charset=UTF-8',
                'origin': 'https://labs.google',
                'user-agent': req.headers['user-agent']
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error("Video Start Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Video Start Failed", details: error.response?.data });
    }
});

// 2. Check Video Status (Polling)
app.post('/api/proxy/google/video/status', async (req, res) => {
    const { token: rawToken, operations } = req.body;
    const token = rawToken?.includes('session-token=') ? rawToken.split('session-token=')[1].split(';')[0].trim() : rawToken;
    if (!token || !operations) return res.status(400).json({ error: "Missing Token or Operations" });

    const STATUS_API = "https://aisandbox-pa.googleapis.com/v1/video:batchCheckAsyncVideoGenerationStatus";
    const RECAPTCHA_TOKEN = "0cAFcWeA72-Q4udY92nSYo5u7IrOT_j0i95CNLsnp95Hd44041WFn15bVYwTLWS5HKeolnilFX1a0I90OQ1MTMDI31DlNl8d1yCBi8rGlPxyDIfAXDIzcoBj2j7dm8DFGldWYV7yaL0FhSIwWDUa8akadIFSefpdf6JNHgCdnoUgh3bP9zAmycGKhcQV1X8QSOGEz4OjU6HBBbpMqCozYtFVD8YIhb94ze6reOvjmcjPI9XaJXWyxbsYuHO6CPUd1ezZLQ6hHPbj0st3IPL1dsSaLeeltBzMifUA8QS5Ckw_0xemsOgk4ckJd7CRZIiF-x5fPgKlQtDMOtjba_zIxCh1UiltIBxwBe722koxfUm92G0Rl8D4-kp-q8Ja6J-KFGmIWm9Y82SlrmTLBD7sIsOmkUn6gNZjdw6maIA5dDxjdER99Wad3Uqyb-zagDLcZMBXsVfTozC2vTLTze1M2loblwQT_gFWKHMWTpPw2vZ9Msf1YU7HkyrPzJFizms8eUn3gclsPJj-wCzRRDlj7zWfaKyR3lFOFs8U8h_02vXPqsi7gCnBp8bGkoEgiekJCkIESdayQtWM0UK2Xn00jiWBWUQ-NMR_v-JRgHMrNKbucmogDUUTICPvVjbbdTnFjzgz2VUuOrpeEw8ivYrO3zksPXRdsEy_hhN1RYWd46VXfITnZvNfsCLvyJVOYkYoaaJa12j3UI4zaVfVDwxBzvU8r8EIszHVFkTFYhvVVp0dGJKEeV75bISm90Ba2KKr_-NBZC5gdQUebN_twYI2SmKitmO3CKU7ll0TgYykqc8JyR4jbbxBx-DeyopNbCkZa8rJovkA1JTHooyhxJ-kzmyikK7R_lKcL7KLoZNtPF1m9pdwArA0km-Un8nEzzUA42fDrdDtyIZ-lLvBLBT7qDTYitbHKi_8zdUsrH9ziUJgdo5HN3YI5eW4E-2dYAdvAiQwUhiJS0v98MP6c1VAbHfazwX0kUB-dL4KjPFLUKbxfYwuLGRjRPRyRriwcj5D5uivxrFWWVrgFBUHl3C11-DD31KlkiouExuM4ivadmtYeVgZV7hgwJECdGy5sdpzswh2hf10N-RFmuBuHo54UNQLEvScUlPVd9lfgWNojX_HyAgWFCRQnaHBn37fwvSkhkIwamjxDfbJCNNv-mbpqCejVsNyz3LPcUYF2vcRWZumt391u1iaewEKtWDwEIxoegznjaU34QzVAl0cCEfKVbftzkj91V53EZggNcfigFXhTpf2dCOHxW0TFPKCT3Ik4yfu4T2bW_PCvU9UpHPr3RPxmrOtmoZVHw97DlHQ9gVU7tjgJhvWIbVf_7VaneOD2pk9X3SgdkdsdCtA2lX4s-1iEeavQynj1c8NNTRaSenzBZXUFjJGv-H4OX682RW5ZyJZ40I65sLfBht40SeVfzIvld3Ufk4JER63mgo2R4ZRNbPQjvoXh5JkLIuS6EpN2ohfweorDl3Obcm3Cj1UqM8z5Cs6ih0vfQyn5uy6MBJFMSYPhrx4yEEnnAHEEVFzg9fHDmeH3Hw-w2-gFOFpl4tBI_MPKB2eMAdXeVFiHyFhx1XFpOmBbuGwxmor20FF8jXhwEYoX2KLxP";

    // Payload matches user provided status check curl
    const payload = {
        "operations": operations // expect array of { operation: {name}, sceneId, status }
    };

    try {
        const response = await axios.post(STATUS_API, payload, {
            headers: {
                'authorization': `Bearer ${token}`,
                'content-type': 'application/json',
                'origin': 'https://labs.google',
                'user-agent': req.headers['user-agent']
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error("Video Status Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Video Status Failed", details: error.response?.data });
    }
});

// 3. Generic Workflow Status (for Character Image Generation)
app.post('/api/proxy/google/workflow/status', async (req, res) => {
    const { token: rawToken, workflowId } = req.body;
    const token = rawToken?.includes('session-token=') ? rawToken.split('session-token=')[1].split(';')[0].trim() : rawToken;
    if (!token || !workflowId) return res.status(400).json({ error: "Missing Token or WorkflowId" });

    const WORKFLOW_STATUS_API = `https://aisandbox-pa.googleapis.com/v1/projects/07c3d6ef-3305-4196-bcc2-7db5294be436/workflows/${workflowId}`;

    try {
        const response = await axios.get(WORKFLOW_STATUS_API, {
            headers: {
                'authorization': `Bearer ${token}`,
                'origin': 'https://labs.google',
                'user-agent': req.headers['user-agent']
            }
        });
        console.log(`[Proxy] Workflow ${workflowId} Status:`, response.data.state);
        res.json(response.data);
    } catch (error) {
        console.error("Workflow Status Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Workflow Status Failed", details: error.response?.data });
    }
});

const PORT = 3001;
const server = app.listen(PORT, () => {
    console.log(`🚀 Proxy running at http://localhost:${PORT}`);
});

// Set timeout to 5 minutes (300000 ms) to handle slow Google Labs API
server.setTimeout(300000);
