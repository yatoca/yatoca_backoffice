import OpenAI from "openai";
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
});
export const EMBEDDING_MODEL = "text-embedding-3-large";
export const EMBEDDING_PIPELINE_VERSION = "topics-v1.0.0";

export const get_embeddings = async (text: string[]) => {
    const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: text,
    });
    return response.data.map(d => d.embedding);
};

export const openai_transcribe = (model: string, file: any, language?: string, prompt?: string) => {
    return openai.audio.transcriptions.create({
        model,
        file,
        language,
        prompt,
    });
};
export const openai_completions = (model: string, messages: OpenAI.Chat.ChatCompletionCreateParams['messages'], response_format?: OpenAI.Chat.ChatCompletionCreateParams['response_format']) => {
    return openai.chat.completions.create({
        model,
        messages,
        response_format
    });
}