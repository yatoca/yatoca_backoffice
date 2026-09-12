export type AdminTopic = {
    id: string;
    name: string;
    description: string;
    keywords: {
        id: string;
        keyword: string;
        weight: number;
    }[];
}
export type UnprocessedRecord = {
    id: string;
    text: string;
    source_table: string;
    keywords: { keyword_norm: string, weight: number }[];
    topic_suggestions: {
        topic_id: number;
        topic_name: string;
        score: number;
    }[];
    date: string;
};
export type TopicProcessedStatement = {
    id: string;
    text: string;
    age_group: string;
    region: string;
    source_table: string;
    gender: string;
    date: string;
};
export type ProcessedStatement = {
    id: string;
    text: string;
    fecha: string;
    created_at: string;
    lang: string;
    topic_name: string;
    topic_id: number;
    date: string;
};