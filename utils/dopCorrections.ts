export type RejectReason =
    | 'raccord_error'
    | 'character_mismatch'
    | 'wrong_outfit'
    | 'wrong_pose'
    | 'wrong_angle'
    | 'wrong_lighting'
    | 'wrong_background'
    | 'quality_issue'
    | 'prompt_ignored'
    | 'nsfw_content'
    | 'other';

export interface RetryContext {
    reason: RejectReason;
    userNote?: string;
}

export const DOP_CORRECTIONS: Record<RejectReason, string> = {
    wrong_angle: `[CAMERA LOCK - CRITICAL]: The previous camera angle was INCORRECT. 
    ACTION: IGNORE any inferred camera angles. 
    FORCE ANGLE: {userNote || 'STRICTLY ADHERE TO SPECIFIED SHOT TYPE'}. 
    Do not improvise the camera position.`,

    wrong_outfit: `[OUTFIT RESET - CRITICAL]: The character is wearing the WRONG CLOTHES or ACCESSORIES.
    ACTION: DISCARD all outfit hallucinations. 
    RESET appearence to: {userNote || 'The EXACT outfit in the Master Reference Image'}.
    Ensure NO hat/glasses unless explicitly requested.`,

    character_mismatch: `[IDENTITY FAILURE - CRITICAL]: The generated face was NOT the requested person.
    ACTION: FLUSH previous face cache.
    FORCE IDENTITY: {userNote || 'Re-read the Face Reference Image with MAX PRIORITY'}.
    Maintain facial structure rigidly.`,

    wrong_pose: `[POSE CORRECTION]: The character's action/pose was wrong.
    ACTION: OVERRIDE inferred pose.
    FORCE POSE: {userNote || 'Strictly follow the action verbed in the prompt'}.`,

    wrong_lighting: `[LIGHTING RESET]: The lighting matched the wrong environment.
    ACTION: RESET lighting setup.
    FORCE LIGHTING: {userNote || 'Consistent with Scene Context and Time of Day'}.`,

    wrong_background: `[ENVIRONMENT RESET]: The background location was incorrect.
    ACTION: IGNORE previous background hallucinations.
    FORCE LOCATION: {userNote || 'Strictly adhere to the specific location description'}.`,

    raccord_error: `[CONTINUITY ERROR]: Significant continuity failure detected.
    ACTION: CHECK previous shots.
    FIX: {userNote || 'Maintain consistent object placement (hands, props) from previous scene'}.`,

    prompt_ignored: `[ATTENTION BOOST]: You ignored key elements of the prompt.
    ACTION: INCREASE attention to: {userNote || 'ALL missing details'}.
    EXECUTE EVERY INSTRUCTION.`,

    quality_issue: `[QUALITY BOOST]: Previous generation had artifacts.
    ACTION: Switch to High Fidelity Mode. 
    Focus on anatomy, hands, and texture details.`,

    nsfw_content: `[SAFETY FILTER]: Previous image triggered safety flags.
    ACTION: Generate a SAFE, SFW version of the scene.`,

    other: `[DIRECTOR CORRECTION]: {userNote || 'Please fix the identified issues in the previous shot'}.`
};

export function getCorrectionPrompt(context: RetryContext): string {
    const template = DOP_CORRECTIONS[context.reason] || DOP_CORRECTIONS.other;
    // Simple template replacement
    return template.replace('{userNote || \'', '').replace('\'}', '').replace('{userNote}', context.userNote || '');
}
